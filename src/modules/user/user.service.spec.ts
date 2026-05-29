import { NotFoundException } from '@nestjs/common';
import { user_status } from '@prisma/client';
import { UserService } from './user.service';

describe('UserService', () => {
  const prisma = {
    user: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  } as any;

  const roleService = {
    assignRole: jest.fn(),
    revokeRole: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists users with roles included', async () => {
    prisma.user.findMany.mockResolvedValue([{ id: 'user-1' }]);
    prisma.user.count.mockResolvedValue(1);

    const service = new UserService(prisma, roleService);
    const result = await service.list({ page: 1, limit: 10, status: user_status.ACTIVE } as any);

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: user_status.ACTIVE }),
      }),
    );
    expect(result.meta.total).toBe(1);
  });

  it('delegates role mutations', async () => {
    roleService.assignRole.mockResolvedValue({ assigned: true });
    roleService.revokeRole.mockResolvedValue({ revoked: true });

    const service = new UserService(prisma, roleService);

    await expect(service.addRole('user-1', { roleId: 'role-1' } as any)).resolves.toEqual({
      assigned: true,
    });
    await expect(service.removeRole('user-1', { roleId: 'role-1' } as any)).resolves.toEqual({
      revoked: true,
    });
  });

  it('rejects missing users on getById', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const service = new UserService(prisma, roleService);

    await expect(service.getById('user-1')).rejects.toBeInstanceOf(NotFoundException);
  });
});
