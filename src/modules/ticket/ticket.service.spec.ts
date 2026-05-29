import { NotFoundException } from '@nestjs/common';
import { TicketService } from './ticket.service';

describe('TicketService', () => {
  const prisma = {
    ticket: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
    },
    tx: {
      booking: { findUnique: jest.fn() },
      ticket: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('generates a QR-coded ticket when one does not exist', async () => {
    prisma.tx.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      bookingReference: 'BKG-123',
      user: { fullName: 'Test User', email: 'test@example.com', phone: '0911' },
      trip: {
        departureTime: new Date('2026-01-01T10:00:00.000Z'),
        route: { origin: 'Addis', destination: 'Bahir Dar' },
      },
    });
    prisma.tx.ticket.findUnique.mockResolvedValue(null);
    prisma.tx.ticket.create.mockResolvedValue({ id: 'ticket-1', ticketNumber: 'TKT-BKG-123' });

    const service = new TicketService(prisma);
    const result = await service.generateForBooking('booking-1');

    expect(prisma.tx.ticket.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          bookingId: 'booking-1',
          ticketNumber: 'TKT-BKG-123',
        }),
      }),
    );
    expect(result.ticketNumber).toBe('TKT-BKG-123');
  });

  it('returns an existing ticket without creating a new one', async () => {
    prisma.tx.booking.findUnique.mockResolvedValue({ id: 'booking-1' });
    prisma.tx.ticket.findUnique.mockResolvedValue({ id: 'ticket-1', ticketNumber: 'TKT-EXISTING' });

    const service = new TicketService(prisma);
    const result = await service.generateForBooking('booking-1');

    expect(result.ticketNumber).toBe('TKT-EXISTING');
    expect(prisma.tx.ticket.create).not.toHaveBeenCalled();
  });

  it('throws when booking is missing', async () => {
    prisma.tx.booking.findUnique.mockResolvedValue(null);

    const service = new TicketService(prisma);

    await expect(service.generateForBooking('booking-1')).rejects.toBeInstanceOf(NotFoundException);
  });
});
