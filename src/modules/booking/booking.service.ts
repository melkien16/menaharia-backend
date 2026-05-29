import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma, booking_status, payment_status, seat_status } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { CurrentUserDto } from 'src/common/dtos/current-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { PaymentService } from '../payment/payment.service';
import { BookingQueryDto, CreateBookingDto } from './dto/booking.dto';

@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly paymentService: PaymentService,
  ) {}

  async createBooking(user: CurrentUserDto, dto: CreateBookingDto) {
    const reservationMinutes = this.configService.get<number>('booking.seatReservationMinutes', 10);
    const now = new Date();
    const reservationExpiry = new Date(now.getTime() + reservationMinutes * 60_000);
    const tripSeatIds = dto.travelers.map((traveler) => traveler.tripSeatId);
    const uniqueTripSeatIds = new Set(tripSeatIds);

    if (uniqueTripSeatIds.size !== tripSeatIds.length) {
      throw new BadRequestException('Each traveler must map to a unique trip seat');
    }

    const result = await this.prisma.runInTransaction(async () => {
      const tx = this.prisma.tx;

      const trip = await tx.trip.findFirst({
        where: {
          id: dto.tripId,
          deletedAt: null,
        },
        include: {
          route: true,
        },
      });

      if (!trip) {
        throw new NotFoundException('Trip not found');
      }

      await tx.tripSeat.updateMany({
        where: {
          id: {
            in: tripSeatIds,
          },
          status: seat_status.RESERVED,
          reservationExpiry: {
            lt: now,
          },
        },
        data: {
          status: seat_status.AVAILABLE,
          reservedAt: null,
          reservationExpiry: null,
        },
      });

      for (const tripSeatId of tripSeatIds) {
        const updated = await tx.tripSeat.updateMany({
          where: {
            id: tripSeatId,
            tripId: dto.tripId,
            status: seat_status.AVAILABLE,
          },
          data: {
            status: seat_status.RESERVED,
            reservedAt: now,
            reservationExpiry,
            bookedAt: null,
          },
        });

        if (updated.count !== 1) {
          throw new ConflictException(`Trip seat ${tripSeatId} is no longer available`);
        }
      }

      const bookingReference = this.generateBookingReference();
      const totalAmount = trip.price * dto.travelers.length;

      const booking = await tx.booking.create({
        data: {
          bookingReference,
          userId: user.id,
          tripId: dto.tripId,
          reservedUntil: reservationExpiry,
          status: booking_status.PENDING,
          totalAmount,
        },
      });

      for (const traveler of dto.travelers) {
        const createdTraveler = await tx.travelerInformation.create({
          data: {
            bookingId: booking.id,
            fullName: traveler.fullName.trim(),
            email: traveler.email.trim().toLowerCase(),
            phone: traveler.phone.trim(),
            emergencyContact: traveler.emergencyContact.trim(),
          },
        });

        await tx.bookingSeat.create({
          data: {
            bookingId: booking.id,
            tripSeatId: traveler.tripSeatId,
            travelerId: createdTraveler.id,
          },
        });
      }

      const gatewayReference = `PAY-${bookingReference}`;
      const payment = await tx.payment.create({
        data: {
          bookingId: booking.id,
          method: dto.paymentMethod,
          amount: totalAmount,
          status: payment_status.PENDING,
          gatewayReference,
        },
      });

      return {
        booking,
        payment,
      };
    });

    return {
      ...result,
      paymentInitialization: this.paymentService.buildInitializationPayload(
        result.payment.id,
        result.booking.bookingReference,
      ),
    };
  }

  async list(query: BookingQueryDto, currentUser?: CurrentUserDto) {
    const where: Prisma.BookingWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
      ...(currentUser && !this.isAdmin(currentUser)
        ? {
            userId: currentUser.id,
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          payment: true,
          ticket: true,
          trip: {
            include: {
              route: true,
              bus: {
                include: {
                  operator: true,
                },
              },
            },
          },
          bookingSeats: {
            include: {
              tripSeat: {
                include: {
                  seat: true,
                },
              },
              traveler: true,
            },
          },
        },
      }),
      this.prisma.booking.count({ where }),
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

  async getById(id: string, currentUser?: CurrentUserDto) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        id,
        deletedAt: null,
        ...(currentUser && !this.isAdmin(currentUser) ? { userId: currentUser.id } : {}),
      },
      include: {
        payment: true,
        ticket: true,
        trip: {
          include: {
            route: true,
            bus: {
              include: {
                operator: true,
              },
            },
          },
        },
        travelers: true,
        bookingSeats: {
          include: {
            tripSeat: {
              include: {
                seat: true,
              },
            },
            traveler: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  private generateBookingReference() {
    return `BKG-${randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
  }

  private isAdmin(user: CurrentUserDto) {
    return user.roles.some((role) => ['ADMIN', 'SUPER_ADMIN'].includes(role));
  }
}
