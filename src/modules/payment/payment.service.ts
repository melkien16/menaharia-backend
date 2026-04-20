import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  booking_status,
  payment_status,
  seat_status,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  InitiatePaymentDto,
  PaymentCallbackDto,
  PaymentQueryDto,
} from './dto/payment.dto';
import { TicketService } from '../ticket/ticket.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ticketService: TicketService,
    private readonly notificationService: NotificationService,
  ) {}

  async list(query: PaymentQueryDto) {
    const where: Prisma.PaymentWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.method ? { method: query.method } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          booking: {
            select: {
              bookingReference: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.payment.count({ where }),
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
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        booking: {
          select: {
            id: true,
            bookingReference: true,
            status: true,
            totalAmount: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async initiatePayment(dto: InitiatePaymentDto) {
    const payment = await this.prisma.payment.findUnique({
      where: { bookingId: dto.bookingId },
      include: {
        booking: {
          select: {
            id: true,
            bookingReference: true,
            status: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment record not found for booking');
    }

    if (payment.booking.status !== booking_status.PENDING) {
      throw new BadRequestException('Only pending bookings can be paid');
    }

    return this.buildInitializationPayload(payment.id, payment.booking.bookingReference);
  }

  async handleCallback(dto: PaymentCallbackDto) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        OR: [
          ...(dto.bookingId ? [{ bookingId: dto.bookingId }] : []),
          ...(dto.gatewayReference
            ? [{ gatewayReference: dto.gatewayReference }]
            : []),
        ],
      },
      include: {
        booking: {
          select: {
            id: true,
            user: {
              select: {
                email: true,
                phone: true,
              },
            },
            bookingReference: true,
            status: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    let ticketNumber: string | null = null;

    const updatedPayment = await this.prisma.runInTransaction(async () => {
      const tx = this.prisma.tx;

      if (dto.status === payment_status.SUCCESS) {
        const updated = await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: payment_status.SUCCESS,
            transactionCode: dto.transactionCode,
            callbackReference: dto.callbackReference,
            paidAt: new Date(),
          },
        });

        await tx.booking.update({
          where: { id: payment.booking.id },
          data: {
            status: booking_status.CONFIRMED,
            reservedUntil: null,
          },
        });

        await tx.tripSeat.updateMany({
          where: {
            bookingSeats: {
              some: {
                bookingId: payment.booking.id,
              },
            },
          },
          data: {
            status: seat_status.BOOKED,
            reservedAt: null,
            reservationExpiry: null,
            bookedAt: new Date(),
          },
        });

        const ticket = await this.ticketService.generateForBooking(
          payment.booking.id,
          tx,
        );
        ticketNumber = ticket.ticketNumber;

        return updated;
      }

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: dto.status,
          transactionCode: dto.transactionCode,
          callbackReference: dto.callbackReference,
        },
      });

      await tx.booking.update({
        where: { id: payment.booking.id },
        data: {
          status: booking_status.CANCELLED,
          reservedUntil: null,
        },
      });

      await tx.tripSeat.updateMany({
        where: {
          bookingSeats: {
            some: {
              bookingId: payment.booking.id,
            },
          },
          status: seat_status.RESERVED,
        },
        data: {
          status: seat_status.AVAILABLE,
          reservedAt: null,
          reservationExpiry: null,
          bookedAt: null,
        },
      });

      return tx.payment.findUniqueOrThrow({
        where: { id: payment.id },
      });
    });

    if (ticketNumber && dto.status === payment_status.SUCCESS) {
      await this.notificationService.sendBookingConfirmedNotification({
        email: payment.booking.user.email,
        phone: payment.booking.user.phone,
        bookingReference: payment.booking.bookingReference,
        ticketNumber,
      });
    }

    return updatedPayment;
  }

  buildInitializationPayload(paymentId: string, bookingReference: string) {
    const gatewayReference = `PAY-${bookingReference}`;

    return {
      paymentUrl: `https://payments.menaharia.local/checkout/${paymentId}`,
      gatewayReference,
      message:
        'Redirect the customer to the payment provider and use the callback endpoint to confirm the booking.',
    };
  }
}
