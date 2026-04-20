import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateRouteDto, RouteQueryDto, UpdateRouteDto } from './dto/route.dto';

@Injectable()
export class RouteService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRouteDto) {
    return this.prisma.route.create({
      data: {
        ...dto,
        code: dto.code.trim().toUpperCase(),
        origin: dto.origin.trim(),
        destination: dto.destination.trim(),
      },
    });
  }

  async list(query: RouteQueryDto) {
    const where: Prisma.RouteWhereInput = {
      deletedAt: null,
      ...(query.origin
        ? {
            origin: {
              contains: query.origin.trim(),
              mode: 'insensitive',
            },
          }
        : {}),
      ...(query.destination
        ? {
            destination: {
              contains: query.destination.trim(),
              mode: 'insensitive',
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.route.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.route.count({ where }),
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

  async getById(id: string) {
    const route = await this.prisma.route.findFirst({
      where: { id, deletedAt: null },
      include: {
        trips: true,
      },
    });

    if (!route) {
      throw new NotFoundException('Route not found');
    }

    return route;
  }

  async update(id: string, dto: UpdateRouteDto) {
    await this.ensureExists(id);
    return this.prisma.route.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.route.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  private async ensureExists(id: string) {
    const route = await this.prisma.route.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });

    if (!route) {
      throw new NotFoundException('Route not found');
    }
  }
}
