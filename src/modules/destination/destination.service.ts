import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateDestinationDto,
  DestinationQueryDto,
  UpdateDestinationDto,
} from './dto/destination.dto';

@Injectable()
export class DestinationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDestinationDto) {
    return this.prisma.destination.create({
      data: {
        name: dto.name.trim(),
        description: dto.description.trim(),
        image: dto.image.trim(),
        highlights: dto.highlights ?? [],
      },
    });
  }

  async list(query: DestinationQueryDto) {
    const where: Prisma.DestinationWhereInput = {
      deletedAt: null,
      ...(query.name
        ? {
            name: {
              contains: query.name.trim(),
              mode: 'insensitive',
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.destination.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.destination.count({ where }),
    ]);

    const data = await Promise.all(items.map((item) => this.enrichDestination(item)));

    return {
      items: data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
      },
    };
  }

  async getById(id: string) {
    const destination = await this.prisma.destination.findFirst({
      where: { id, deletedAt: null },
    });

    if (!destination) {
      throw new NotFoundException('Destination not found');
    }

    const [summary, routes, trips] = await Promise.all([
      this.enrichDestination(destination),
      this.prisma.route.findMany({
        where: {
          deletedAt: null,
          destination: {
            equals: destination.name,
            mode: 'insensitive',
          },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          trips: {
            where: { deletedAt: null },
            orderBy: { departureTime: 'asc' },
          },
        },
      }),
      this.prisma.trip.findMany({
        where: {
          deletedAt: null,
          route: {
            destination: {
              equals: destination.name,
              mode: 'insensitive',
            },
          },
        },
        orderBy: { departureTime: 'asc' },
        include: {
          route: true,
          bus: true,
        },
      }),
    ]);

    return {
      ...summary,
      routes,
      trips,
    };
  }

  async update(id: string, dto: UpdateDestinationDto) {
    await this.ensureExists(id);
    return this.prisma.destination.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.description ? { description: dto.description.trim() } : {}),
        ...(dto.image ? { image: dto.image.trim() } : {}),
        ...(dto.highlights ? { highlights: dto.highlights } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.destination.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  private async enrichDestination(destination: {
    id: string;
    name: string;
    description: string;
    image: string;
    highlights: string[];
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }) {
    const [routeCount, tripCount] = await Promise.all([
      this.prisma.route.count({
        where: {
          deletedAt: null,
          destination: {
            equals: destination.name,
            mode: 'insensitive',
          },
        },
      }),
      this.prisma.trip.count({
        where: {
          deletedAt: null,
          route: {
            destination: {
              equals: destination.name,
              mode: 'insensitive',
            },
          },
        },
      }),
    ]);

    return {
      ...destination,
      routeCount,
      tripCount,
    };
  }

  private async ensureExists(id: string) {
    const destination = await this.prisma.destination.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });

    if (!destination) {
      throw new NotFoundException('Destination not found');
    }
  }
}
