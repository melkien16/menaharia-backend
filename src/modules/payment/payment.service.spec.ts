import { BadRequestException, NotFoundException } from '@nestjs/common';
import { booking_status, payment_status, seat_status } from '@prisma/client';
import { PaymentService } from './payment.service';

describe('PaymentService', () => {
  const tx = {
    payment: {
      update: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    booking: {
      update: jest.fn(),
    },
    tripSeat: {
      updateMany: jest.fn(),
    },
  } as any;

  const prisma = {
    tx,
    runInTransaction: jest.fn(async (callback: () => Promise<any>) => callback()),
    payment: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
  } as any;

  const ticketService = {
    generateForBooking: jest.fn(),
  } as any;

  const notificationService = {
    sendBookingConfirmedNotification: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds payment checkout payloads', () => {
    const service = new PaymentService(prisma, ticketService, notificationService);

    expect(service.buildInitializationPayload('payment-1', 'BKG-123')).toEqual(
      expect.objectContaining({
        paymentUrl: 'https://payments.menaharia.local/checkout/payment-1',
        gatewayReference: 'PAY-BKG-123',
      }),
    );
  });

  it('handles successful callbacks by confirming the booking', async () => {
    prisma.payment.findFirst.mockResolvedValue({
      id: 'payment-1',
      booking: {
        id: 'booking-1',
        bookingReference: 'BKG-123',
        status: booking_status.PENDING,
        user: { email: 'user@example.com', phone: '0911' },
      },
    });
    tx.payment.update.mockResolvedValue({ id: 'payment-1' });
    tx.booking.update.mockResolvedValue({ id: 'booking-1' });
    tx.tripSeat.updateMany.mockResolvedValue({ count: 2 });
    ticketService.generateForBooking.mockResolvedValue({ ticketNumber: 'TKT-BKG-123' });

    const service = new PaymentService(prisma, ticketService, notificationService);
    const result = await service.handleCallback({
      bookingId: 'booking-1',
      status: payment_status.SUCCESS,
      transactionCode: 'TX-1',
      callbackReference: 'CB-1',
    } as any);

    expect(tx.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'payment-1' },
        data: expect.objectContaining({ status: payment_status.SUCCESS }),
      }),
    );
    expect(ticketService.generateForBooking).toHaveBeenCalledWith('booking-1', tx);
    expect(notificationService.sendBookingConfirmedNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'user@example.com',
        bookingReference: 'BKG-123',
        ticketNumber: 'TKT-BKG-123',
      }),
    );
    expect(result).toEqual({ id: 'payment-1' });
  });

  it('rejects payment initiation for non-pending bookings', async () => {
    prisma.payment.findUnique.mockResolvedValue({
      id: 'payment-1',
      booking: { id: 'booking-1', bookingReference: 'BKG-123', status: booking_status.CONFIRMED },
    });

    const service = new PaymentService(prisma, ticketService, notificationService);

    await expect(service.initiatePayment({ bookingId: 'booking-1' } as any)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws when payment records are missing', async () => {
    prisma.payment.findFirst.mockResolvedValue(null);

    const service = new PaymentService(prisma, ticketService, notificationService);

    await expect(
      service.handleCallback({ bookingId: 'booking-1', status: payment_status.SUCCESS } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
