import { ConflictException, NotFoundException } from '@nestjs/common';
import { RoleService } from './role.service';

describe('RoleService', () => {
  const prisma = {
    role: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    userRole: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes role names on create', async () => {
    prisma.role.create.mockResolvedValue({ id: 'role-1', name: 'ADMIN' });

    const service = new RoleService(prisma);
    await service.create({ name: ' admin ' } as any);

    expect(prisma.role.create).toHaveBeenCalledWith({
      data: { name: 'ADMIN' },
    });
  });

  it('assigns and revokes roles', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
    prisma.role.findUnique.mockResolvedValue({ id: 'role-1' });
    prisma.userRole.upsert.mockResolvedValue({ userId: 'user-1', roleId: 'role-1' });

    const service = new RoleService(prisma);
    const assigned = await service.assignRole({ userId: 'user-1', roleId: 'role-1' } as any);

    expect(assigned).toEqual({ userId: 'user-1', roleId: 'role-1' });
    expect(prisma.userRole.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_roleId: {
            userId: 'user-1',
            roleId: 'role-1',
          },
        },
      }),
    );

    await expect(
      service.revokeRole({ userId: 'user-1', roleId: 'role-1' } as any),
    ).resolves.toEqual({
      revoked: true,
    });
    expect(prisma.userRole.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', roleId: 'role-1' },
    });
  });

  it('rejects missing users when assigning', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.role.findUnique.mockResolvedValue({ id: 'role-1' });

    const service = new RoleService(prisma);

    await expect(
      service.assignRole({ userId: 'user-1', roleId: 'role-1' } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
