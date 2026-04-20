import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { user_status } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  AuthenticatedUser,
  JwtAccessPayload,
  JwtRefreshPayload,
} from 'src/common/authorization/types/auth.types';
import type { AuthJwtConfig } from 'src/common/authorization/types/auth.types';
import { SystemRolesEnum } from 'src/common/enums/users/roles.enum';
import { CurrentUserDto } from 'src/common/dtos/current-user.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    @Inject('AUTH_JWT_CONFIG') private readonly jwtConfig: AuthJwtConfig,
  ) {}

  async register(dto: RegisterDto) {
    const email = this.normalizeOptionalEmail(dto.email);
    const phone = this.normalizePhone(dto.phone);

    await this.ensureUserDoesNotExist({ email, phone });

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const defaultRole = await this.getOrCreateDefaultRole();

    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName.trim(),
        email: email!,
        phone,
        password: passwordHash,
        status: user_status.ACTIVE,
        roles: {
          create: {
            roleId: defaultRole.id,
          },
        },
      },
      select: {
        id: true,
        email: true,
        phone: true,
        fullName: true,
        status: true,
        deletedAt: true,
        roles: {
          select: {
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    return this.buildAuthResponse({
      id: user.id,
      email: user.email,
      phone: user.phone,
      fullName: user.fullName,
      roles: user.roles.map(({ role }) => role.name),
    });
  }

  async login(dto: LoginDto) {
    const identifier = dto.identifier.trim();
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: this.normalizeOptionalEmail(identifier) ?? undefined },
          { phone: this.normalizePhone(identifier) },
        ],
      },
      select: {
        id: true,
        email: true,
        phone: true,
        fullName: true,
        password: true,
        deletedAt: true,
        status: true,
        roles: {
          select: {
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== user_status.ACTIVE) {
      throw new UnauthorizedException('Account is not active');
    }

    return this.buildAuthResponse({
      id: user.id,
      email: user.email,
      phone: user.phone,
      fullName: user.fullName,
      roles: user.roles.map(({ role }) => role.name),
    });
  }

  async refresh(user: CurrentUserDto, refreshToken: string) {
    const payload = await this.verifyRefreshToken(refreshToken);

    if (payload.sub !== user.id || payload.jti !== user.refreshTokenId) {
      throw new UnauthorizedException('Refresh token mismatch');
    }

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { id: payload.jti },
      select: {
        id: true,
        userId: true,
        tokenHash: true,
        expiresAt: true,
        revokedAt: true,
      },
    });

    if (!storedToken || storedToken.userId !== user.id) {
      throw new UnauthorizedException('Refresh token not found');
    }

    if (storedToken.revokedAt || storedToken.expiresAt <= new Date()) {
      throw new UnauthorizedException('Refresh token expired or revoked');
    }

    const tokenMatches = await bcrypt.compare(refreshToken, storedToken.tokenHash);
    if (!tokenMatches) {
      throw new UnauthorizedException('Refresh token not recognized');
    }

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: {
        revokedAt: new Date(),
      },
    });

    const authUser = await this.getAuthUserById(user.id);
    return this.buildAuthResponse(authUser);
  }

  async logout(user: CurrentUserDto, refreshToken: string) {
    const payload = await this.verifyRefreshToken(refreshToken);

    if (payload.sub !== user.id || payload.jti !== user.refreshTokenId) {
      throw new UnauthorizedException('Refresh token mismatch');
    }

    await this.prisma.refreshToken.updateMany({
      where: {
        id: payload.jti,
        userId: user.id,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return {
      message: 'Logged out successfully',
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        fullName: true,
        status: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
        roles: {
          select: {
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('User not found');
    }

    return {
      ...user,
      roles: user.roles.map(({ role }) => role.name),
    };
  }

  private async buildAuthResponse(user: AuthenticatedUser) {
    const accessPayload: JwtAccessPayload = {
      sub: user.id,
      roles: user.roles,
      typ: 'access',
    };

    const refreshTokenId = randomUUID();
    const refreshPayload: JwtRefreshPayload = {
      sub: user.id,
      jti: refreshTokenId,
      typ: 'refresh',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.jwtConfig.secret,
        expiresIn: this.jwtConfig.expiresIn as any,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.jwtConfig.refreshSecret,
        expiresIn: this.jwtConfig.refreshExpiresIn as any,
      }),
    ]);

    const decodedRefreshToken = this.jwtService.decode(refreshToken) as { exp?: number } | null;
    if (!decodedRefreshToken?.exp) {
      throw new BadRequestException('Unable to decode refresh token expiry');
    }

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    await this.prisma.refreshToken.create({
      data: {
        id: refreshTokenId,
        userId: user.id,
        tokenHash: refreshTokenHash,
        expiresAt: new Date(decodedRefreshToken.exp * 1000),
      },
    });

    return {
      user,
      tokens: {
        accessToken,
        refreshToken,
        tokenType: 'Bearer',
        expiresIn: this.jwtConfig.expiresIn,
        refreshExpiresIn: this.jwtConfig.refreshExpiresIn,
      },
    };
  }

  private async verifyRefreshToken(refreshToken: string) {
    try {
      return await this.jwtService.verifyAsync<JwtRefreshPayload>(refreshToken, {
        secret: this.jwtConfig.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async getAuthUserById(userId: string): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        fullName: true,
        deletedAt: true,
        roles: {
          select: {
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      fullName: user.fullName,
      roles: user.roles.map(({ role }) => role.name),
    };
  }

  private async ensureUserDoesNotExist({
    email,
    phone,
  }: {
    email?: string | null;
    phone: string;
  }) {
    if (email) {
      const existingEmail = await this.prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (existingEmail) {
        throw new ConflictException('Email is already registered');
      }
    }

    const existingPhone = await this.prisma.user.findUnique({
      where: { phone },
      select: { id: true },
    });
    if (existingPhone) {
      throw new ConflictException('Phone is already registered');
    }
  }

  private async getOrCreateDefaultRole() {
    return this.prisma.role.upsert({
      where: { name: SystemRolesEnum.USER },
      update: {},
      create: {
        name: SystemRolesEnum.USER,
      },
      select: {
        id: true,
        name: true,
      },
    });
  }

  private normalizeOptionalEmail(value?: string | null) {
    if (!value) {
      return null;
    }

    return value.trim().toLowerCase();
  }

  private normalizePhone(value: string) {
    return value.trim();
  }
}
