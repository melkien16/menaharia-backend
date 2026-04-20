import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, seat_status, trip_status } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateTripDto, TripQueryDto, UpdateTripDto } from './dto/trip.dto';

@Injectable()
export class TripService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTripDto) {
    return this.prisma.runInTransaction(async () => {
      const tx = this.prisma.tx;
      const bus = await tx.bus.findFirst({
        where: { id: dto.busId, deletedAt: null },
        include: { seats: true },
      });

      if (!bus) {
        throw new NotFoundException('Bus not found');
      }

      const trip = await tx.trip.create({
        data: {
          routeId: dto.routeId,
          busId: dto.busId,
          departureTime: new Date(dto.departureTime),
          arrivalTime: new Date(dto.arrivalTime),
          price: dto.price,
          status: dto.status ?? trip_status.SCHEDULED,
        },
      });

      if (bus.seats.length > 0) {
        await tx.tripSeat.createMany({
          data: bus.seats.map((seat) => ({
            tripId: trip.id,
            seatId: seat.id,
            status: seat_status.AVAILABLE,
          })),
        });
      }

      return tx.trip.findUniqueOrThrow({
        where: { id: trip.id },
        include: {
          route: true,
          bus: true,
          tripSeats: {
            include: {
              seat: true,
            },
          },
        },
      });
    });
  }

  async list(query: TripQueryDto) {
    const where: Prisma.TripWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.origin || query.destination
        ? {
            route: {
              ...(query.origin
                ? {
                    origin: {
                      contains: query.origin.trim(),
                      mode: 'insensitive',
                    },
                  }
                : {}),
              ...(query.destination
                ? {
                    destination: {
                      contains: query.destination.trim(),
                      mode: 'insensitive',
                    },
                  }
                : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.trip.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { departureTime: 'asc' },
        include: {
          route: true,
          bus: true,
          tripSeats: {
            where: {
              status: seat_status.AVAILABLE,
            },
            select: {
              id: true,
            },
          },
        },
      }),
      this.prisma.trip.count({ where }),
    ]);

    return {
      items: items.map((trip) => ({
        ...trip,
        availableSeatCount: trip.tripSeats.length,
      })),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
      },
    };
  }

  async getById(id: string) {
    const trip = await this.prisma.trip.findFirst({
      where: { id, deletedAt: null },
      include: {
        route: true,
        bus: true,
        tripSeats: {
          include: {
            seat: true,
          },
          orderBy: {
            seat: {
              seatNumber: 'asc',
            },
          },
        },
      },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    return trip;
  }

  async update(id: string, dto: UpdateTripDto) {
    await this.ensureExists(id);
    return this.prisma.trip.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.departureTime ? { departureTime: new Date(dto.departureTime) } : {}),
        ...(dto.arrivalTime ? { arrivalTime: new Date(dto.arrivalTime) } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.trip.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: trip_status.CANCELLED,
      },
    });
  }

  private async ensureExists(id: string) {
    const trip = await this.prisma.trip.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }
  }
}
