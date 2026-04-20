import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { seat_status } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CronService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CronService.name);
  private interval?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    const intervalMs = this.configService.get<number>(
      'booking.seatSweepIntervalMs',
      60_000,
    );

    this.interval = setInterval(() => {
      void this.expireReservedSeats();
    }, intervalMs);
  }

  onModuleDestroy() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  async expireReservedSeats(olderThanMinutes?: number) {
    const reservationMinutes = olderThanMinutes ??
      this.configService.get<number>('booking.seatReservationMinutes', 10);
    const threshold = new Date(Date.now() - reservationMinutes * 60_000);

    const result = await this.prisma.tripSeat.updateMany({
      where: {
        status: seat_status.RESERVED,
        reservedAt: {
          lt: threshold,
        },
      },
      data: {
        status: seat_status.AVAILABLE,
        reservedAt: null,
        reservationExpiry: null,
        bookedAt: null,
      },
    });

    if (result.count > 0) {
      this.logger.log(`Expired ${result.count} stale seat reservations`);
    }

    return {
      expiredCount: result.count,
      threshold,
    };
  }
}
