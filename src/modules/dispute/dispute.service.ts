import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, dispute_status } from '@prisma/client';
import { randomUUID } from 'crypto';
import { CurrentUserDto } from 'src/common/dtos/current-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateDisputeDto, DisputeQueryDto, UpdateDisputeDto } from './dto/dispute.dto';

@Injectable()
export class DisputeService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: CurrentUserDto, dto: CreateDisputeDto) {
    await this.ensureOperatorExists(dto.operatorId);

    if (dto.bookingId) {
      const booking = await this.prisma.booking.findFirst({
        where: {
          id: dto.bookingId,
          deletedAt: null,
          userId: user.id,
        },
        include: {
          trip: {
            include: {
              bus: true,
            },
          },
        },
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      if (booking.trip.bus.operatorId !== dto.operatorId) {
        throw new BadRequestException('Booking does not belong to the selected operator');
      }
    }

    return this.prisma.dispute.create({
      data: {
        reference: this.generateReference(),
        userId: user.id,
        operatorId: dto.operatorId,
        bookingId: dto.bookingId,
        subject: dto.subject.trim(),
        message: dto.message.trim(),
        status: dispute_status.PENDING,
      },
      include: this.disputeInclude(),
    });
  }

  async list(query: DisputeQueryDto, currentUser?: CurrentUserDto) {
    const where: Prisma.DisputeWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.operatorId ? { operatorId: query.operatorId } : {}),
      ...(query.bookingId ? { bookingId: query.bookingId } : {}),
      ...(currentUser && !this.canManageAllDisputes(currentUser) ? { userId: currentUser.id } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.dispute.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: this.disputeInclude(),
      }),
      this.prisma.dispute.count({ where }),
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

  async getById(id: string, currentUser?: CurrentUserDto) {
    const dispute = await this.prisma.dispute.findFirst({
      where: {
        id,
        deletedAt: null,
        ...(currentUser && !this.canManageAllDisputes(currentUser)
          ? { userId: currentUser.id }
          : {}),
      },
      include: this.disputeInclude(),
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    return dispute;
  }

  async update(id: string, dto: UpdateDisputeDto, currentUser?: CurrentUserDto) {
    await this.ensureExists(id, currentUser);

    if (!dto.status && dto.response === undefined) {
      throw new BadRequestException('At least one dispute field must be provided');
    }

    return this.prisma.dispute.update({
      where: { id },
      data: {
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.response !== undefined ? { response: dto.response.trim() } : {}),
        ...(dto.status === dispute_status.IN_REVIEW ? { reviewedAt: new Date() } : {}),
        ...(dto.status === dispute_status.RESOLVED ? { resolvedAt: new Date() } : {}),
      },
      include: this.disputeInclude(),
    });
  }

  async withdraw(id: string, currentUser?: CurrentUserDto) {
    const dispute = await this.ensureExists(id, currentUser);

    if (this.canManageAllDisputes(currentUser)) {
      return this.prisma.dispute.update({
        where: { id },
        data: { deletedAt: new Date() },
        include: this.disputeInclude(),
      });
    }

    if (dispute.status === dispute_status.RESOLVED) {
      throw new BadRequestException('Resolved disputes cannot be withdrawn');
    }

    return this.prisma.dispute.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: this.disputeInclude(),
    });
  }

  private async ensureOperatorExists(operatorId: string) {
    const operator = await this.prisma.operator.findFirst({
      where: { id: operatorId, deletedAt: null },
      select: { id: true },
    });

    if (!operator) {
      throw new NotFoundException('Operator not found');
    }
  }

  private async ensureExists(id: string, currentUser?: CurrentUserDto) {
    const dispute = await this.prisma.dispute.findFirst({
      where: {
        id,
        deletedAt: null,
        ...(currentUser && !this.canManageAllDisputes(currentUser)
          ? { userId: currentUser.id }
          : {}),
      },
      select: { id: true, status: true },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    return dispute;
  }

  private disputeInclude() {
    return {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
        },
      },
      operator: true,
      booking: {
        include: {
          trip: {
            include: {
              route: true,
              bus: true,
            },
          },
        },
      },
    } satisfies Prisma.DisputeInclude;
  }

  private canManageAllDisputes(currentUser?: CurrentUserDto) {
    return Boolean(
      currentUser?.roles?.some((role) => ['ADMIN', 'SUPER_ADMIN', 'BUS_OPERATOR'].includes(role)),
    );
  }

  private generateReference() {
    return `DSP-${randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
  }
}
