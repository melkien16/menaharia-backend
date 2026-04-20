import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { TicketQueryDto } from './dto/ticket.dto';

type TicketDbClient = Prisma.TransactionClient | PrismaClient;

@Injectable()
export class TicketService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: TicketQueryDto) {
    const where: Prisma.TicketWhereInput = query.bookingId
      ? { bookingId: query.bookingId }
      : {};

    const [items, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { issuedAt: 'desc' },
        include: {
          booking: {
            select: {
              bookingReference: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.ticket.count({ where }),
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
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
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

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return ticket;
  }

  async getByBookingId(bookingId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { bookingId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found for booking');
    }

    return ticket;
  }

  async generateForBooking(
    bookingId: string,
    db: TicketDbClient = this.prisma.tx,
  ) {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
            phone: true,
          },
        },
        trip: {
          include: {
            route: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const existing = await db.ticket.findUnique({
      where: { bookingId },
    });

    if (existing) {
      return existing;
    }

    const ticketNumber = `TKT-${booking.bookingReference}`;
    const qrCode = JSON.stringify({
      bookingReference: booking.bookingReference,
      ticketNumber,
      passenger: booking.user.fullName,
      route: `${booking.trip.route.origin}-${booking.trip.route.destination}`,
      departureTime: booking.trip.departureTime.toISOString(),
    });

    return db.ticket.create({
      data: {
        bookingId,
        ticketNumber,
        qrCode,
      },
    });
  }
}
