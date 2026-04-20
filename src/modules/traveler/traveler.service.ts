import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { TravelerQueryDto } from './dto/traveler.dto';

@Injectable()
export class TravelerService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: TravelerQueryDto) {
    const where: Prisma.TravelerInformationWhereInput = {
      ...(query.bookingId ? { bookingId: query.bookingId } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.travelerInformation.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          bookingSeats: true,
        },
      }),
      this.prisma.travelerInformation.count({ where }),
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
    const traveler = await this.prisma.travelerInformation.findUnique({
      where: { id },
      include: {
        booking: true,
        bookingSeats: {
          include: {
            tripSeat: {
              include: {
                seat: true,
              },
            },
          },
        },
      },
    });

    if (!traveler) {
      throw new NotFoundException('Traveler not found');
    }

    return traveler;
  }
}
