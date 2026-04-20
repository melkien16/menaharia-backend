import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, bus_status } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { BusQueryDto, CreateBusDto, UpdateBusDto } from './dto/bus.dto';

@Injectable()
export class BusService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBusDto) {
    return this.prisma.bus.create({
      data: {
        ...dto,
        status: dto.status ?? bus_status.ACTIVE,
      },
    });
  }

  async list(query: BusQueryDto) {
    const where: Prisma.BusWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.operatorId ? { operatorId: query.operatorId } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.bus.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          operator: true,
          seats: true,
        },
      }),
      this.prisma.bus.count({ where }),
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
    const bus = await this.prisma.bus.findFirst({
      where: { id, deletedAt: null },
      include: {
        operator: true,
        seats: true,
      },
    });

    if (!bus) {
      throw new NotFoundException('Bus not found');
    }

    return bus;
  }

  async update(id: string, dto: UpdateBusDto) {
    await this.ensureExists(id);
    return this.prisma.bus.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.bus.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: bus_status.INACTIVE,
      },
    });
  }

  private async ensureExists(id: string) {
    const bus = await this.prisma.bus.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });

    if (!bus) {
      throw new NotFoundException('Bus not found');
    }
  }
}
