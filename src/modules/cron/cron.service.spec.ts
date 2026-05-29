import { CronService } from './cron.service';
import { seat_status } from '@prisma/client';

describe('CronService', () => {
  const prisma = {
    tripSeat: {
      updateMany: jest.fn(),
    },
  } as any;

  const configService = {
    get: jest.fn(() => 10),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('expires stale seat reservations', async () => {
    prisma.tripSeat.updateMany.mockResolvedValue({ count: 3 });

    const service = new CronService(prisma, configService);
    const result = await service.expireReservedSeats(15);

    expect(prisma.tripSeat.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: seat_status.RESERVED,
        }),
      }),
    );
    expect(result.expiredCount).toBe(3);
  });

  it('starts and stops the sweep interval', () => {
    const setIntervalSpy = jest.spyOn(global, 'setInterval').mockReturnValue(123 as any);
    const clearIntervalSpy = jest
      .spyOn(global, 'clearInterval')
      .mockImplementation(() => undefined as any);

    const service = new CronService(prisma, configService);
    service.onModuleInit();
    service.onModuleDestroy();

    expect(setIntervalSpy).toHaveBeenCalled();
    expect(clearIntervalSpy).toHaveBeenCalledWith(123 as any);

    setIntervalSpy.mockRestore();
    clearIntervalSpy.mockRestore();
  });
});
