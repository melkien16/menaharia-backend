import { BadRequestException } from '@nestjs/common';
import { BookingService } from './booking.service';

describe('BookingService', () => {
  const tx = {
    trip: {
      findFirst: jest.fn(),
    },
    tripSeat: {
      updateMany: jest.fn(),
    },
    booking: {
      create: jest.fn(),
    },
    travelerInformation: {
      create: jest.fn(),
    },
    bookingSeat: {
      create: jest.fn(),
    },
    payment: {
      create: jest.fn(),
    },
  } as any;

  const prisma = {
    tx,
    runInTransaction: jest.fn(async (callback: () => Promise<any>) => callback()),
  } as any;

  const configService = {
    get: jest.fn(() => 10),
  } as any;

  const paymentService = {
    buildInitializationPayload: jest.fn(() => ({
      paymentUrl: 'https://payments.example/checkout/payment-1',
      gatewayReference: 'PAY-BKG-123456789ABC',
      message:
        'Redirect the customer to the payment provider and use the callback endpoint to confirm the booking.',
    })),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects duplicate traveler seat assignments', async () => {
    const service = new BookingService(prisma, configService, paymentService);

    await expect(
      service.createBooking(
        { id: 'user-1', roles: ['USER'] } as any,
        {
          tripId: 'trip-1',
          paymentMethod: 'CASH',
          travelers: [
            {
              tripSeatId: 'seat-1',
              fullName: 'A',
              email: 'a@example.com',
              phone: '1',
              emergencyContact: '2',
            },
            {
              tripSeatId: 'seat-1',
              fullName: 'B',
              email: 'b@example.com',
              phone: '3',
              emergencyContact: '4',
            },
          ],
        } as any,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates a booking and payment initialization payload', async () => {
    tx.trip.findFirst.mockResolvedValue({ id: 'trip-1', price: 100, route: { id: 'route-1' } });
    tx.tripSeat.updateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 });
    tx.booking.create.mockResolvedValue({ id: 'booking-1', bookingReference: 'BKG-123456789ABC' });
    tx.travelerInformation.create
      .mockResolvedValueOnce({ id: 'traveler-1' })
      .mockResolvedValueOnce({ id: 'traveler-2' });
    tx.bookingSeat.create.mockResolvedValue({});
    tx.payment.create.mockResolvedValue({ id: 'payment-1' });

    const service = new BookingService(prisma, configService, paymentService);
    const result = await service.createBooking(
      { id: 'user-1', roles: ['USER'] } as any,
      {
        tripId: 'trip-1',
        paymentMethod: 'CASH',
        travelers: [
          {
            tripSeatId: 'seat-1',
            fullName: 'Alice',
            email: 'alice@example.com',
            phone: '0911',
            emergencyContact: '0912',
          },
          {
            tripSeatId: 'seat-2',
            fullName: 'Bob',
            email: 'bob@example.com',
            phone: '0913',
            emergencyContact: '0914',
          },
        ],
      } as any,
    );

    expect(tx.booking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          tripId: 'trip-1',
          totalAmount: 200,
        }),
      }),
    );
    expect(paymentService.buildInitializationPayload).toHaveBeenCalledWith(
      'payment-1',
      'BKG-123456789ABC',
    );
    expect(result.paymentInitialization).toEqual(
      expect.objectContaining({
        gatewayReference: 'PAY-BKG-123456789ABC',
      }),
    );
  });
});
