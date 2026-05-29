import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

jest.mock(
  'src/prisma/prisma.service',
  () => ({
    PrismaService: class PrismaService {},
  }),
  { virtual: true },
);

jest.mock(
  'src/common/enums/users/roles.enum',
  () => ({
    SystemRolesEnum: {
      USER: 'USER',
    },
  }),
  { virtual: true },
);

jest.mock(
  'src/common/dtos/current-user.dto',
  () => ({
    CurrentUserDto: class CurrentUserDto {},
  }),
  { virtual: true },
);

jest.mock('src/common/authorization/types/auth.types', () => ({}), { virtual: true });

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock('crypto', () => ({
  randomUUID: () => 'refresh-token-id',
}));

describe('AuthService', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    role: {
      upsert: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  } as unknown as PrismaService;

  const jwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
    decode: jest.fn(),
  } as unknown as JwtService;

  const jwtConfig = {
    secret: 'access-secret-123',
    expiresIn: '15m',
    refreshSecret: 'refresh-secret-123',
    refreshExpiresIn: '7d',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers a new user and returns tokens', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    (prisma.role.upsert as jest.Mock).mockResolvedValue({ id: 'role-1', name: 'USER' });
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    (jwtService.signAsync as jest.Mock)
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');
    (jwtService.decode as jest.Mock).mockReturnValue({ exp: 1_700_000_100 });
    (prisma.user.create as jest.Mock).mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      phone: '0911000000',
      fullName: 'Test User',
      roles: [{ role: { name: 'USER' } }],
    });

    const service = new AuthService(prisma, jwtService, jwtConfig);
    const result = await service.register({
      fullName: '  Test User  ',
      email: 'User@Example.com',
      phone: ' 0911000000 ',
      password: 'Password123',
    });

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fullName: 'Test User',
          email: 'user@example.com',
          phone: '0911000000',
          password: 'hashed-password',
        }),
      }),
    );
    expect(result.tokens).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      tokenType: 'Bearer',
      expiresIn: '15m',
      refreshExpiresIn: '7d',
    });
  });

  it('rejects duplicate registration identifiers', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'user-1' });

    const service = new AuthService(prisma, jwtService, jwtConfig);

    await expect(
      service.register({
        fullName: 'Test User',
        email: 'user@example.com',
        phone: '0911000000',
        password: 'Password123',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('logs in with a valid password', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      phone: '0911000000',
      fullName: 'Test User',
      password: 'hashed-password',
      deletedAt: null,
      status: 'ACTIVE',
      roles: [{ role: { name: 'USER' } }],
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (jwtService.signAsync as jest.Mock)
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');
    (jwtService.decode as jest.Mock).mockReturnValue({ exp: 1_700_000_100 });

    const service = new AuthService(prisma, jwtService, jwtConfig);
    const result = await service.login({
      identifier: ' user@example.com ',
      password: 'Password123',
    });

    expect(prisma.user.findFirst).toHaveBeenCalled();
    expect(result.tokens.accessToken).toBe('access-token');
  });

  it('rejects invalid login credentials', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

    const service = new AuthService(prisma, jwtService, jwtConfig);

    await expect(
      service.login({ identifier: 'user@example.com', password: 'Password123' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refreshes tokens for the current user', async () => {
    (jwtService.verifyAsync as jest.Mock).mockResolvedValue({
      sub: 'user-1',
      jti: 'refresh-token-id',
      typ: 'refresh',
    });
    (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({
      id: 'refresh-token-id',
      userId: 'user-1',
      tokenHash: 'hashed-refresh-token',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      phone: '0911000000',
      fullName: 'Test User',
      deletedAt: null,
      roles: [{ role: { name: 'USER' } }],
    });

    const service = new AuthService(prisma, jwtService, jwtConfig);
    const result = await service.refresh(
      { id: 'user-1', roles: ['USER'], refreshTokenId: 'refresh-token-id' },
      'refresh-token',
    );

    expect(prisma.refreshToken.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'refresh-token-id' },
      }),
    );
    expect(result.user.id).toBe('user-1');
  });

  it('logs out the current refresh token', async () => {
    (jwtService.verifyAsync as jest.Mock).mockResolvedValue({
      sub: 'user-1',
      jti: 'refresh-token-id',
      typ: 'refresh',
    });

    const service = new AuthService(prisma, jwtService, jwtConfig);
    const result = await service.logout(
      { id: 'user-1', roles: ['USER'], refreshTokenId: 'refresh-token-id' },
      'refresh-token',
    );

    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'refresh-token-id',
          userId: 'user-1',
          revokedAt: null,
        },
      }),
    );
    expect(result).toEqual({ message: 'Logged out successfully' });
  });

  it('returns the current user profile', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      phone: '0911000000',
      fullName: 'Test User',
      status: 'ACTIVE',
      deletedAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      roles: [{ role: { name: 'USER' } }],
    });

    const service = new AuthService(prisma, jwtService, jwtConfig);
    const result = await service.getMe('user-1');

    expect(result.roles).toEqual(['USER']);
    expect(result.id).toBe('user-1');
  });
});
