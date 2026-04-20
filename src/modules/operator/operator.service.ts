import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, partner_status } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOperatorDto, OperatorQueryDto, UpdateOperatorDto } from './dto/operator.dto';

@Injectable()
export class OperatorService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOperatorDto) {
    return this.prisma.operator.create({
      data: {
        ...dto,
        status: dto.status ?? partner_status.ACTIVE,
      },
    });
  }

  async list(query: OperatorQueryDto) {
    const where: Prisma.OperatorWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.operator.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.operator.count({ where }),
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
    const operator = await this.prisma.operator.findFirst({
      where: { id, deletedAt: null },
      include: {
        buses: true,
      },
    });

    if (!operator) {
      throw new NotFoundException('Operator not found');
    }

    return operator;
  }

  async update(id: string, dto: UpdateOperatorDto) {
    await this.ensureExists(id);
    return this.prisma.operator.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.operator.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: partner_status.INACTIVE,
      },
    });
  }

  private async ensureExists(id: string) {
    const operator = await this.prisma.operator.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });

    if (!operator) {
      throw new NotFoundException('Operator not found');
    }
  }
}
