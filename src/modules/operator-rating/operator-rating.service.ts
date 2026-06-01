import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateOperatorRatingDto,
  OperatorRatingQueryDto,
  UpdateOperatorRatingDto,
} from './dto/operator-rating.dto';
import { CurrentUserDto } from 'src/common/dtos/current-user.dto';

@Injectable()
export class OperatorRatingService {
  constructor(private readonly prisma: PrismaService) {}

  // Create a rating
  async create(user: CurrentUserDto, dto: CreateOperatorRatingDto) {
    await this.ensureOperatorExists(dto.operatorId);

    if (dto.bookingId) {
      const booking = await this.prisma.booking.findFirst({
        where: { id: dto.bookingId, deletedAt: null, userId: user.id },
        include: { trip: { include: { bus: true } } },
      });

      if (!booking) throw new NotFoundException('Booking not found');

      if (booking.trip.bus.operatorId !== dto.operatorId) {
        throw new BadRequestException('Booking does not belong to the selected operator');
      }
    }

    const existing = await (this.prisma as any).operatorRating.findFirst({
      where: { operatorId: dto.operatorId, userId: user.id, deletedAt: null },
    });

    if (existing) throw new BadRequestException('You have already rated this operator');

    const created = await (this.prisma as any).operatorRating.create({
      data: {
        operatorId: dto.operatorId,
        userId: user.id,
        bookingId: dto.bookingId,
        rating: dto.rating,
        comment: dto.comment?.trim(),
      },
    });

    await this.recalculateOperatorAggregate(dto.operatorId);

    return created;
  }

  // List ratings
  async list(query: OperatorRatingQueryDto, currentUser?: CurrentUserDto) {
    const where: any = {
      deletedAt: null,
      ...(query.operatorId ? { operatorId: query.operatorId } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.bookingId ? { bookingId: query.bookingId } : {}),
    };

    if (currentUser && !this.canManageAllRatings(currentUser)) {
      where.userId = currentUser.id;
    }

    const [items, total] = await Promise.all([
      (this.prisma as any).operatorRating.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, fullName: true, email: true, phone: true } } },
      }),
      (this.prisma as any).operatorRating.count({ where }),
    ]);

    return { items, meta: { page: query.page, limit: query.limit, total } };
  }

  // Get by id
  async getById(id: string, currentUser?: CurrentUserDto) {
    const rating = await (this.prisma as any).operatorRating.findFirst({
      where: {
        id,
        deletedAt: null,
        ...(currentUser && !this.canManageAllRatings(currentUser)
          ? { userId: currentUser.id }
          : {}),
      },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        operator: true,
        booking: true,
      },
    });

    if (!rating) throw new NotFoundException('Rating not found');
    return rating;
  }

  // Update by id
  async update(id: string, dto: UpdateOperatorRatingDto, currentUser?: CurrentUserDto) {
    const existing = await (this.prisma as any).operatorRating.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Rating not found');

    if (existing.userId !== currentUser?.id && !this.canManageAllRatings(currentUser)) {
      throw new ForbiddenException('Not allowed to update this rating');
    }

    const updated = await (this.prisma as any).operatorRating.update({
      where: { id },
      data: {
        ...(dto.rating !== undefined ? { rating: dto.rating } : {}),
        ...(dto.comment !== undefined ? { comment: dto.comment?.trim() } : {}),
      },
    });

    await this.recalculateOperatorAggregate(updated.operatorId);

    return updated;
  }

  // Remove (soft delete)
  async remove(id: string, currentUser?: CurrentUserDto) {
    const existing = await (this.prisma as any).operatorRating.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Rating not found');

    if (existing.userId !== currentUser?.id && !this.canManageAllRatings(currentUser)) {
      throw new ForbiddenException('Not allowed to delete this rating');
    }

    const removed = await (this.prisma as any).operatorRating.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.recalculateOperatorAggregate(removed.operatorId);

    return removed;
  }

  // Helpers
  private async ensureOperatorExists(operatorId: string) {
    const operator = await this.prisma.operator.findFirst({
      where: { id: operatorId, deletedAt: null },
      select: { id: true },
    });
    if (!operator) throw new NotFoundException('Operator not found');
  }

  private canManageAllRatings(currentUser?: CurrentUserDto) {
    return Boolean(
      currentUser?.roles?.some((role) => ['ADMIN', 'SUPER_ADMIN', 'BUS_OPERATOR'].includes(role)),
    );
  }

  private async recalculateOperatorAggregate(operatorId: string) {
    const agg = await (this.prisma as any).operatorRating.aggregate({
      where: { operatorId, deletedAt: null },
      _avg: { rating: true },
    });
    const avg = agg._avg?.rating ?? null;
    await this.prisma.operator.update({ where: { id: operatorId }, data: { rating: avg } });
  }
}
