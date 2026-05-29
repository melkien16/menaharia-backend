import { RouteService } from './route.service';

describe('RouteService', () => {
  const prisma = {
    route: {
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

  it('normalizes route fields on create', async () => {
    prisma.route.create.mockResolvedValue({ id: 'route-1' });

    const service = new RouteService(prisma);
    await service.create({ code: ' ab12 ', origin: ' Addis ', destination: ' Bahir Dar ' } as any);

    expect(prisma.route.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          code: 'AB12',
          origin: 'Addis',
          destination: 'Bahir Dar',
        }),
      }),
    );
  });

  it('soft deletes routes on remove', async () => {
    prisma.route.findFirst.mockResolvedValueOnce({ id: 'route-1' });
    prisma.route.update.mockResolvedValue({ id: 'route-1' });

    const service = new RouteService(prisma);
    await service.remove('route-1');

    expect(prisma.route.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'route-1' },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      }),
    );
  });
});
