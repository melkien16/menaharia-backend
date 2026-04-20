import { Injectable } from '@nestjs/common';
import { booking_status, payment_status, seat_status } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { AdminDashboardQueryDto } from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(query: AdminDashboardQueryDto) {
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
      users,
      operators,
      buses,
      routes,
      trips,
      pendingBookings,
      confirmedBookings,
      successfulPayments,
      reservedSeats,
      bookedSeats,
    ] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null, ...createdAtFilter } }),
      this.prisma.operator.count({ where: { deletedAt: null, ...createdAtFilter } }),
      this.prisma.bus.count({ where: { deletedAt: null, ...createdAtFilter } }),
      this.prisma.route.count({ where: { deletedAt: null, ...createdAtFilter } }),
      this.prisma.trip.count({ where: { deletedAt: null, ...createdAtFilter } }),
      this.prisma.booking.count({
        where: { deletedAt: null, status: booking_status.PENDING, ...createdAtFilter },
      }),
      this.prisma.booking.count({
        where: { deletedAt: null, status: booking_status.CONFIRMED, ...createdAtFilter },
      }),
      this.prisma.payment.count({
        where: { status: payment_status.SUCCESS, ...createdAtFilter },
      }),
      this.prisma.tripSeat.count({ where: { status: seat_status.RESERVED } }),
      this.prisma.tripSeat.count({ where: { status: seat_status.BOOKED } }),
    ]);

    return {
      users,
      operators,
      buses,
      routes,
      trips,
      bookings: {
        pending: pendingBookings,
        confirmed: confirmedBookings,
      },
      payments: {
        successful: successfulPayments,
      },
      seats: {
        reserved: reservedSeats,
        booked: bookedSeats,
      },
    };
  }
}
