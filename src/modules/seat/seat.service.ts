import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSeatBatchDto, SeatQueryDto } from './dto/seat.dto';

@Injectable()
export class SeatService {
  constructor(private readonly prisma: PrismaService) {}

  async createBatch(dto: CreateSeatBatchDto) {
    try {
      const result = await this.prisma.seat.createMany({
        data: dto.seats.map((seat) => ({
          busId: dto.busId,
          seatNumber: seat.seatNumber.trim().toUpperCase(),
          seatType: seat.seatType,
        })),
        skipDuplicates: true,
      });

      return {
        createdCount: result.count,
      };
    } catch {
      throw new ConflictException('Unable to create seats for bus');
    }
  }

  async list(query: SeatQueryDto) {
    const where: Prisma.SeatWhereInput = {
      ...(query.busId ? { busId: query.busId } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.seat.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { seatNumber: 'asc' },
      }),
      this.prisma.seat.count({ where }),
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
}
