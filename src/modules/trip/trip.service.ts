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
          date: new Date(dto.date),
          departureTime: new Date(dto.departureTime),
          arrivalTime: new Date(dto.arrivalTime),
          price: dto.price,
          amenities: dto.amenities ?? ['WiFi', 'AC', 'Snacks'],
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

      return tx.trip
        .findUniqueOrThrow({
          where: { id: trip.id },
          include: {
            route: true,
            bus: {
              include: {
                operator: true,
              },
            },
            tripSeats: {
              include: {
                seat: true,
              },
            },
          },
        })
        .then((createdTrip) => this.formatTripDetail(createdTrip));
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
          bus: {
            include: {
              operator: true,
            },
          },
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
      items: items.map((trip) => this.formatTripSummary(trip)),
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
        bus: {
          include: {
            operator: true,
          },
        },
        tripSeats: {
          include: {
            seat: true,
            bookingSeats: {
              include: {
                booking: {
                  select: {
                    id: true,
                    bookingReference: true,
                    status: true,
                  },
                },
                traveler: {
                  select: {
                    id: true,
                    fullName: true,
                  },
                },
              },
            },
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

    return this.formatTripDetail(trip);
  }

  async update(id: string, dto: UpdateTripDto) {
    await this.ensureExists(id);
    return this.prisma.trip.update({
      where: { id },
      data: {
        ...(dto.routeId ? { routeId: dto.routeId } : {}),
        ...(dto.busId ? { busId: dto.busId } : {}),
        ...(dto.date ? { date: new Date(dto.date) } : {}),
        ...(dto.departureTime ? { departureTime: new Date(dto.departureTime) } : {}),
        ...(dto.arrivalTime ? { arrivalTime: new Date(dto.arrivalTime) } : {}),
        ...(dto.price !== undefined ? { price: dto.price } : {}),
        ...(dto.amenities ? { amenities: dto.amenities } : {}),
        ...(dto.status ? { status: dto.status } : {}),
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

  private formatTripSummary(trip: any) {
    return {
      ...trip,
      routeName: `${trip.route.origin} → ${trip.route.destination}`,
      busName: trip.bus.operator.companyName,
      operatorName: trip.bus.operator.companyName,
      bus: {
        ...trip.bus,
        name: trip.bus.operator.companyName,
      },
      availableSeatCount: trip.tripSeats.length,
    };
  }

  private formatTripDetail(trip: any) {
    const tripSeats = trip.tripSeats.map((tripSeat: any) => ({
      ...tripSeat,
      seatNumber: tripSeat.seat.seatNumber,
      seatType: tripSeat.seat.seatType,
      isBooked: tripSeat.status === 'BOOKED',
      isReserved: tripSeat.status === 'RESERVED',
      isAvailable: tripSeat.status === 'AVAILABLE',
      booking: tripSeat.bookingSeats[0]
        ? {
            id: tripSeat.bookingSeats[0].booking.id,
            bookingReference: tripSeat.bookingSeats[0].booking.bookingReference,
            status: tripSeat.bookingSeats[0].booking.status,
            traveler: tripSeat.bookingSeats[0].traveler,
          }
        : null,
    }));

    return {
      ...trip,
      routeName: `${trip.route.origin} → ${trip.route.destination}`,
      busName: trip.bus.operator.companyName,
      bus: {
        ...trip.bus,
        name: trip.bus.operator.companyName,
        operator: trip.bus.operator,
      },
      route: {
        ...trip.route,
      },
      tripSeats,
    };
  }
}
