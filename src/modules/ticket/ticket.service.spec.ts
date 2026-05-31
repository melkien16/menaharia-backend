import { NotFoundException } from '@nestjs/common';
import { TicketService } from './ticket.service';

describe('TicketService', () => {
  const mockTraveler = { id: 'traveler-1', fullName: 'Test User', email: 'test@example.com', phone: '0911' };

  const makePrisma = (travelers: any[], existingTickets: any[]) => ({
    booking: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'booking-1',
        bookingReference: 'BKG-123',
        travelers,
        tickets: existingTickets,
      }),
    },
    ticket: {
      create: jest.fn().mockResolvedValue({ id: 'ticket-1', bookingId: 'booking-1', travelerId: 'traveler-1', ticketNumber: 'TKT-XX', qrCode: 'qr', issuedAt: new Date(), pdfUrl: null }),
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn(),
    },
  } as any);

  const storage = { uploadPdfBuffer: jest.fn() } as any;
  const email = { sendTicketEmail: jest.fn() } as any;

  beforeEach(() => jest.clearAllMocks());

  it('creates one ticket per traveler when none exist', async () => {
    const prisma = makePrisma([mockTraveler], []);
    const service = new TicketService(prisma, storage, email);

    await service.generateForBooking('booking-1');

    expect(prisma.ticket.create).toHaveBeenCalledTimes(1);
    expect(prisma.ticket.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ travelerId: 'traveler-1' }) }),
    );
  });

  it('skips travelers that already have a ticket', async () => {
    const prisma = makePrisma([mockTraveler], [{ travelerId: 'traveler-1' }]);
    const service = new TicketService(prisma, storage, email);

    await service.generateForBooking('booking-1');

    expect(prisma.ticket.create).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when booking is missing', async () => {
    const prisma = { booking: { findUnique: jest.fn().mockResolvedValue(null) }, ticket: {} } as any;
    const service = new TicketService(prisma, storage, email);

    await expect(service.generateForBooking('missing-id')).rejects.toBeInstanceOf(NotFoundException);
  });
});
