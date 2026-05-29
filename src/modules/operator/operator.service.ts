import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  booking_status,
  payment_status,
  partner_status,
  seat_status,
  trip_status,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { AdminDashboardQueryDto } from '../admin/dto/admin.dto';
import { CreateOperatorDto, OperatorQueryDto, UpdateOperatorDto } from './dto/operator.dto';

@Injectable()
export class OperatorService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOperatorDto) {
    return this.prisma.operator.create({
      data: {
        companyName: dto.name?.trim() ?? dto.companyName.trim(),
        logo: dto.logo?.trim(),
        established: dto.established,
        rating: dto.rating,
        reliabilityScore: dto.reliabilityScore,
        badge: dto.badge ?? [],
        about: dto.about?.trim(),
        safetyInfo: dto.safetyInfo?.trim(),
        businessLicenseNo: dto.businessLicenseNo.trim(),
        tinNo: dto.tinNo.trim(),
        phone: dto.phone.trim(),
        address: dto.address.trim(),
        responsibleName: dto.responsibleName.trim(),
        companyPhone: dto.companyPhone.trim(),
        companyEmail: dto.companyEmail.trim(),
        status: dto.status ?? partner_status.ACTIVE,
      },
    });
  }

  async list(query: OperatorQueryDto) {
    const where: Prisma.OperatorWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.operator.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.operator.count({ where }),
    ]);

    return {
      items,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
      },
    };
  }

  async getById(id: string) {
    const operator = await this.prisma.operator.findFirst({
      where: { id, deletedAt: null },
      include: {
        buses: {
          where: { deletedAt: null },
          include: {
            trips: {
              where: { deletedAt: null },
              include: {
                route: true,
                tripSeats: {
                  where: {
                    status: 'AVAILABLE',
                  },
                  select: { id: true },
                },
              },
              orderBy: { departureTime: 'asc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!operator) {
      throw new NotFoundException('Operator not found');
    }

    const now = new Date();
    const previousRoutes = Array.from(
      new Set(
        operator.buses.flatMap((bus) =>
          bus.trips
            .filter((trip) => trip.departureTime < now)
            .map((trip) => `${trip.route.origin} → ${trip.route.destination}`),
        ),
      ),
    );

    const upcomingTrips = operator.buses
      .flatMap((bus) =>
        bus.trips
          .filter((trip) => trip.departureTime >= now)
          .map((trip) => ({
            id: trip.id,
            route: `${trip.route.origin} → ${trip.route.destination}`,
            departure: trip.departureTime.toISOString().slice(11, 16),
            busType: bus.make,
            seatsLeft: trip.tripSeats.length,
            price: trip.price,
          })),
      )
      .sort((left, right) => left.departure.localeCompare(right.departure));

    return {
      ...operator,
      previousRoutes,
      upcomingTrips,
    };
  }

  async dashboard(operatorId: string, query: AdminDashboardQueryDto) {
    await this.ensureExists(operatorId);

    const createdAtFilter =
      query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {};

    const [
      buses,
      trips,
      pendingBookings,
      confirmedBookings,
      cancelledBookings,
      successfulPayments,
      totalSeats,
      bookedSeats,
      reservedSeats,
      completedTrips,
      cancelledTrips,
    ] = await Promise.all([
      this.prisma.bus.count({ where: { operatorId, deletedAt: null, ...createdAtFilter } }),
      this.prisma.trip.count({
        where: {
          deletedAt: null,
          bus: { operatorId },
          ...createdAtFilter,
        },
      }),
      this.prisma.booking.count({
        where: {
          deletedAt: null,
          status: booking_status.PENDING,
          trip: { bus: { operatorId } },
          ...createdAtFilter,
        },
      }),
      this.prisma.booking.count({
        where: {
          deletedAt: null,
          status: booking_status.CONFIRMED,
          trip: { bus: { operatorId } },
          ...createdAtFilter,
        },
      }),
      this.prisma.booking.count({
        where: {
          deletedAt: null,
          status: booking_status.CANCELLED,
          trip: { bus: { operatorId } },
          ...createdAtFilter,
        },
      }),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: payment_status.SUCCESS,
          booking: {
            trip: { bus: { operatorId } },
          },
          ...createdAtFilter,
        },
      }),
      this.prisma.bus.aggregate({
        _sum: { totalSeats: true },
        where: { operatorId, deletedAt: null },
      }),
      this.prisma.tripSeat.count({
        where: {
          status: seat_status.BOOKED,
          trip: { bus: { operatorId } },
        },
      }),
      this.prisma.tripSeat.count({
        where: {
          status: seat_status.RESERVED,
          trip: { bus: { operatorId } },
        },
      }),
      this.prisma.trip.count({
        where: {
          deletedAt: null,
          status: trip_status.COMPLETED,
          bus: { operatorId },
          ...createdAtFilter,
        },
      }),
      this.prisma.trip.count({
        where: {
          deletedAt: null,
          status: trip_status.CANCELLED,
          bus: { operatorId },
          ...createdAtFilter,
        },
      }),
    ]);

    const totalSeatsCount = totalSeats._sum.totalSeats ?? 0;
    const seatsBooked = bookedSeats;
    const occupancyRate = totalSeatsCount > 0 ? (seatsBooked / totalSeatsCount) * 100 : 0;

    return {
      operatorId,
      overview: {
        buses,
        trips,
        completedTrips,
        cancelledTrips,
        bookings: {
          pending: pendingBookings,
          confirmed: confirmedBookings,
          cancelled: cancelledBookings,
        },
        revenue: successfulPayments._sum.amount ?? 0,
        seats: {
          total: totalSeatsCount,
          booked: seatsBooked,
          reserved: reservedSeats,
          occupancyRate,
        },
      },
    };
  }

  async update(id: string, dto: UpdateOperatorDto) {
    await this.ensureExists(id);
    return this.prisma.operator.update({
      where: { id },
      data: {
        ...(dto.name || dto.companyName
          ? { companyName: dto.name?.trim() ?? dto.companyName?.trim() }
          : {}),
        ...(dto.logo ? { logo: dto.logo.trim() } : {}),
        ...(dto.established !== undefined ? { established: dto.established } : {}),
        ...(dto.rating !== undefined ? { rating: dto.rating } : {}),
        ...(dto.reliabilityScore !== undefined ? { reliabilityScore: dto.reliabilityScore } : {}),
        ...(dto.badge ? { badge: dto.badge } : {}),
        ...(dto.about ? { about: dto.about.trim() } : {}),
        ...(dto.safetyInfo ? { safetyInfo: dto.safetyInfo.trim() } : {}),
        ...(dto.businessLicenseNo ? { businessLicenseNo: dto.businessLicenseNo.trim() } : {}),
        ...(dto.tinNo ? { tinNo: dto.tinNo.trim() } : {}),
        ...(dto.phone ? { phone: dto.phone.trim() } : {}),
        ...(dto.address ? { address: dto.address.trim() } : {}),
        ...(dto.responsibleName ? { responsibleName: dto.responsibleName.trim() } : {}),
        ...(dto.companyPhone ? { companyPhone: dto.companyPhone.trim() } : {}),
        ...(dto.companyEmail ? { companyEmail: dto.companyEmail.trim() } : {}),
        ...(dto.status ? { status: dto.status } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.operator.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: partner_status.INACTIVE,
      },
    });
  }

  private async ensureExists(id: string) {
    const operator = await this.prisma.operator.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });

    if (!operator) {
      throw new NotFoundException('Operator not found');
    }
  }
}
