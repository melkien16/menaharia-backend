import { bus_status } from '@prisma/client';
import { BusService } from './bus.service';

describe('BusService', () => {
  const prisma = {
    bus: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('defaults created buses to active', async () => {
    prisma.bus.create.mockResolvedValue({ id: 'bus-1', status: bus_status.ACTIVE });

    const service = new BusService(prisma);
    await service.create({ plateNumber: 'AAA-123', capacity: 30 } as any);

    expect(prisma.bus.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          plateNumber: 'AAA-123',
          capacity: 30,
          status: bus_status.ACTIVE,
        }),
      }),
    );
  });

  it('soft deletes buses on remove', async () => {
    prisma.bus.findFirst.mockResolvedValueOnce({ id: 'bus-1' });
    prisma.bus.update.mockResolvedValue({ id: 'bus-1' });

    const service = new BusService(prisma);
    await service.remove('bus-1');

    expect(prisma.bus.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'bus-1' },
        data: expect.objectContaining({
          status: bus_status.INACTIVE,
        }),
      }),
    );
  });
});
