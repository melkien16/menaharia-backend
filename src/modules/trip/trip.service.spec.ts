import { NotFoundException } from '@nestjs/common';
import { trip_status } from '@prisma/client';
import { TripService } from './trip.service';

describe('TripService', () => {
  const tx = {
    bus: {
      findFirst: jest.fn(),
    },
    trip: {
      create: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    tripSeat: {
      createMany: jest.fn(),
    },
  } as any;

  const prisma = {
    tx,
    runInTransaction: jest.fn(async (callback: () => Promise<any>) => callback()),
    trip: tx.trip,
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates trip seats for each bus seat', async () => {
    tx.bus.findFirst.mockResolvedValue({
      id: 'bus-1',
      seats: [{ id: 'seat-1' }, { id: 'seat-2' }],
    });
    tx.trip.create.mockResolvedValue({ id: 'trip-1' });
    tx.trip.findUniqueOrThrow.mockResolvedValue({ id: 'trip-1', tripSeats: [] });

    const service = new TripService(prisma);
    const result = await service.create({
      routeId: 'route-1',
      busId: 'bus-1',
      departureTime: '2026-01-01T10:00:00.000Z',
      arrivalTime: '2026-01-01T12:00:00.000Z',
      price: 150,
    } as any);

    expect(tx.tripSeat.createMany).toHaveBeenCalledWith({
      data: [
        { tripId: 'trip-1', seatId: 'seat-1', status: expect.any(String) },
        { tripId: 'trip-1', seatId: 'seat-2', status: expect.any(String) },
      ],
    });
    expect(result.id).toBe('trip-1');
  });

  it('throws when the bus is missing', async () => {
    tx.bus.findFirst.mockResolvedValue(null);

    const service = new TripService(prisma);

    await expect(
      service.create({
        routeId: 'route-1',
        busId: 'bus-1',
        departureTime: '2026-01-01T10:00:00.000Z',
        arrivalTime: '2026-01-01T12:00:00.000Z',
        price: 150,
      } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('labels scheduled trips by default', async () => {
    tx.trip.findMany.mockResolvedValue([{ id: 'trip-1', tripSeats: [{ id: '1' }, { id: '2' }] }]);
    tx.trip.count.mockResolvedValue(1);

    const service = new TripService(prisma);
    const result = await service.list({ page: 1, limit: 10 } as any);

    expect(result.items[0].availableSeatCount).toBe(2);
    expect(tx.trip.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deletedAt: null }),
      }),
    );
  });
});
