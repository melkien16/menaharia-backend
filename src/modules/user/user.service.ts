import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, user_status } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { RoleService } from '../role/role.service';
import { SearchUserQueryDto, UpdateUserStatusDto, UserQueryDto, UserRoleMutationDto } from './dto/user.dto';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roleService: RoleService,
  ) {}

  async list(query: UserQueryDto) {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
      },
    };
  }

  async search(query: SearchUserQueryDto) {
    const email = query.email?.trim().toLowerCase();
    const phone = query.phone?.trim();

    if (!email && !phone) {
      throw new BadRequestException('Email or phone is required');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        deletedAt: null,
        OR: [
          ...(email ? [{ email }] : []),
          ...(phone ? [{ phone }] : []),
        ],
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async getById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateStatus(id: string, dto: UpdateUserStatusDto) {
    await this.ensureUserExists(id);
    return this.prisma.user.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  async softDelete(id: string) {
    await this.ensureUserExists(id);
    return this.prisma.user.update({
      where: { id },
      data: {
        status: user_status.INACTIVE,
        deletedAt: new Date(),
      },
    });
  }

  async addRole(userId: string, dto: UserRoleMutationDto) {
    return this.roleService.assignRole({
      userId,
      roleId: dto.roleId,
    });
  }

  async removeRole(userId: string, dto: UserRoleMutationDto) {
    return this.roleService.revokeRole({
      userId,
      roleId: dto.roleId,
    });
  }

  private async ensureUserExists(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, deletedAt: true },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }
  }
}
