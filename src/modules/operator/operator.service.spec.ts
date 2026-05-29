import { partner_status } from '@prisma/client';
import { OperatorService } from './operator.service';

describe('OperatorService', () => {
  const prisma = {
    operator: {
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

  it('defaults new operators to active', async () => {
    prisma.operator.create.mockResolvedValue({ id: 'operator-1' });

    const service = new OperatorService(prisma);
    await service.create({ name: 'Transit Co' } as any);

    expect(prisma.operator.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Transit Co',
          status: partner_status.ACTIVE,
        }),
      }),
    );
  });

  it('soft deletes operators on remove', async () => {
    prisma.operator.findFirst.mockResolvedValueOnce({ id: 'operator-1' });
    prisma.operator.update.mockResolvedValue({ id: 'operator-1' });

    const service = new OperatorService(prisma);
    await service.remove('operator-1');

    expect(prisma.operator.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'operator-1' },
        data: expect.objectContaining({ status: partner_status.INACTIVE }),
      }),
    );
  });
});
