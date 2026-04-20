import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { AssignRoleDto, CreateRoleDto, RoleQueryDto } from './dto/role.dto';

@Injectable()
export class RoleService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRoleDto) {
    try {
      return await this.prisma.role.create({
        data: {
          name: dto.name.trim().toUpperCase(),
        },
      });
    } catch {
      throw new ConflictException('Role already exists');
    }
  }

  async list(query: RoleQueryDto) {
    const where: Prisma.RoleWhereInput = query.search
      ? {
          name: {
            contains: query.search.trim(),
            mode: 'insensitive',
          },
        }
      : {};

    return this.prisma.role.findMany({
      where,
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async assignRole(dto: AssignRoleDto) {
    const [user, role] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: dto.userId } }),
      this.prisma.role.findUnique({ where: { id: dto.roleId } }),
    ]);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return this.prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: dto.userId,
          roleId: dto.roleId,
        },
      },
      update: {},
      create: {
        userId: dto.userId,
        roleId: dto.roleId,
      },
    });
  }

  async revokeRole(dto: AssignRoleDto) {
    await this.prisma.userRole.deleteMany({
      where: {
        userId: dto.userId,
        roleId: dto.roleId,
      },
    });

    return { revoked: true };
  }
}
