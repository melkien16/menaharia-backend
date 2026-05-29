import { NotFoundException } from '@nestjs/common';
import { TravelerService } from './traveler.service';

describe('TravelerService', () => {
  const prisma = {
    travelerInformation: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
    },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists travelers with pagination', async () => {
    prisma.travelerInformation.findMany.mockResolvedValue([{ id: 'traveler-1' }]);
    prisma.travelerInformation.count.mockResolvedValue(1);

    const service = new TravelerService(prisma);
    const result = await service.list({ page: 1, limit: 10, bookingId: 'booking-1' } as any);

    expect(prisma.travelerInformation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { bookingId: 'booking-1' },
      }),
    );
    expect(result.meta.total).toBe(1);
  });

  it('throws when traveler is missing', async () => {
    prisma.travelerInformation.findUnique.mockResolvedValue(null);

    const service = new TravelerService(prisma);

    await expect(service.getById('traveler-1')).rejects.toBeInstanceOf(NotFoundException);
  });
});
