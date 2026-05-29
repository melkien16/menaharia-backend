import { ConflictException } from '@nestjs/common';
import { SeatService } from './seat.service';

describe('SeatService', () => {
  const prisma = {
    seat: {
      createMany: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes seat data in batches', async () => {
    prisma.seat.createMany.mockResolvedValue({ count: 2 });

    const service = new SeatService(prisma);
    const result = await service.createBatch({
      busId: 'bus-1',
      seats: [
        { seatNumber: ' a1 ', seatType: 'VIP' },
        { seatNumber: ' b2 ', seatType: 'REGULAR' },
      ],
    } as any);

    expect(prisma.seat.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          { busId: 'bus-1', seatNumber: 'A1', seatType: 'VIP' },
          { busId: 'bus-1', seatNumber: 'B2', seatType: 'REGULAR' },
        ],
        skipDuplicates: true,
      }),
    );
    expect(result).toEqual({ createdCount: 2 });
  });

  it('wraps batch errors as conflict exceptions', async () => {
    prisma.seat.createMany.mockRejectedValue(new Error('boom'));

    const service = new SeatService(prisma);

    await expect(service.createBatch({ busId: 'bus-1', seats: [] } as any)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
