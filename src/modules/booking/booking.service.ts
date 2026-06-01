import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { Prisma, booking_status, payment_status, seat_status, user_status } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { CurrentUserDto } from 'src/common/dtos/current-user.dto';
import { SystemRolesEnum } from 'src/common/enums/users/roles.enum';
import { PrismaService } from 'src/prisma/prisma.service';
import { PaymentService } from '../payment/payment.service';
import {
  BookingQueryDto,
  CreateBookingDto,
  CreateBookingForUserDto,
  CreateBookingWithAccountDto,
} from './dto/booking.dto';

@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly paymentService: PaymentService,
  ) {}

  async createBooking(user: CurrentUserDto, dto: CreateBookingDto) {
    return this.createBookingForTargetUser(user.id, dto, false);
  }

  async createBookingForUser(dto: CreateBookingForUserDto) {
    return this.createBookingForTargetUser(dto.userId, dto, true);
  }

  async createBookingWithAccount(dto: CreateBookingWithAccountDto) {
    const email = dto.email.trim().toLowerCase();
    const phone = dto.phone.trim();

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { phone }],
      },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException('An account with this email or phone already exists');
    }

    const defaultRole = await this.prisma.role.findUnique({
      where: { name: SystemRolesEnum.USER },
      select: { id: true },
    });

    if (!defaultRole) {
      throw new NotFoundException('Default user role not found');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const account = await this.prisma.user.create({
      data: {
        fullName: dto.fullName.trim(),
        email,
        phone,
        password: passwordHash,
        status: user_status.ACTIVE,
        roles: {
          create: {
            roleId: defaultRole.id,
          },
        },
      },
      select: {
        id: true,
        email: true,
        phone: true,
        fullName: true,
      },
    });

    const booking = await this.createBookingForTargetUser(account.id, dto, false);

    return {
      account,
      ...booking,
    };
  }

  private async createBookingForTargetUser(
    userId: string,
    dto: CreateBookingDto,
    validateTargetUser = false,
  ) {
    if (validateTargetUser) {
      await this.ensureTargetUserExists(userId);
    }

    const reservationMinutes = this.configService.get<number>('booking.seatReservationMinutes', 10);
    const requestedSeatReferences = dto.travelers.map((traveler) => traveler.tripSeatId);

    const result = await this.prisma.runInTransaction(async () => {
      const tx = this.prisma.tx;

      const now = new Date();
      const reservationExpiry = new Date(now.getTime() + reservationMinutes * 60_000);

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

      const availableTripSeats = await tx.tripSeat.findMany({
        where: {
          tripId: dto.tripId,
          OR: requestedSeatReferences.flatMap((seatReference) => [
            { id: seatReference },
            { seatId: seatReference },
          ]),
        },
        select: {
          id: true,
          seatId: true,
        },
      });

      const resolvedTripSeats = requestedSeatReferences.map((seatReference) => {
        const tripSeat = availableTripSeats.find(
          (item) => item.id === seatReference || item.seatId === seatReference,
        );

        if (!tripSeat) {
          throw new ConflictException(`Trip seat ${seatReference} is no longer available`);
        }

        return tripSeat;
      });

      const uniqueResolvedTripSeatIds = new Set(resolvedTripSeats.map((tripSeat) => tripSeat.id));

      if (uniqueResolvedTripSeatIds.size !== resolvedTripSeats.length) {
        throw new BadRequestException('Each traveler must map to a unique trip seat');
      }

      await tx.tripSeat.updateMany({
        where: {
          id: {
            in: [...uniqueResolvedTripSeatIds],
          },
          status: seat_status.RESERVED,
          reservationExpiry: {
            lte: now,
          },
        },
        data: {
          status: seat_status.AVAILABLE,
          reservedAt: null,
          reservationExpiry: null,
        },
      });

      for (const tripSeat of resolvedTripSeats) {
        const updated = await tx.tripSeat.updateMany({
          where: {
            id: tripSeat.id,
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
          throw new ConflictException(`Trip seat ${tripSeat.id} is no longer available`);
        }
      }

      const bookingReference = this.generateBookingReference();
      const totalAmount = trip.price * dto.travelers.length;

      const booking = await tx.booking.create({
        data: {
          bookingReference,
          userId,
          tripId: dto.tripId,
          reservedUntil: reservationExpiry,
          status: booking_status.PENDING,
          totalAmount,
        },
      });

      for (const [index, traveler] of dto.travelers.entries()) {
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
            tripSeatId: resolvedTripSeats[index].id,
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
    };
  }

  private async ensureTargetUserExists(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
        status: user_status.ACTIVE,
      },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }
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
          tickets: true,
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
        tickets: true,
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

  async cancelBooking(id: string, currentUser?: CurrentUserDto) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        id,
        deletedAt: null,
        ...(currentUser && !this.isAdmin(currentUser) ? { userId: currentUser.id } : {}),
      },
      include: {
        payment: true,
        bookingSeats: {
          include: {
            tripSeat: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status === booking_status.CANCELLED) {
      return booking;
    }

    const cancelledBooking = await this.prisma.runInTransaction(async () => {
      const tx = this.prisma.tx;

      await tx.tripSeat.updateMany({
        where: {
          id: {
            in: booking.bookingSeats.map((bookingSeat) => bookingSeat.tripSeatId),
          },
        },
        data: {
          status: seat_status.AVAILABLE,
          reservedAt: null,
          reservationExpiry: null,
          bookedAt: null,
        },
      });

      const updatedBooking = await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: booking_status.CANCELLED,
          reservedUntil: null,
        },
      });

      if (booking.payment?.status === payment_status.PENDING) {
        await tx.payment.update({
          where: { bookingId: booking.id },
          data: {
            status: payment_status.FAILED,
          },
        });
      }

      return updatedBooking;
    });

    return cancelledBooking;
  }

  private generateBookingReference() {
    return `BKG-${randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
  }

  private isAdmin(user: CurrentUserDto) {
    return user.roles.some((role) => ['ADMIN', 'SUPER_ADMIN'].includes(role));
  }
}
