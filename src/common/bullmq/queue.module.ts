import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QueueNames } from './bull.constants';
import { QueueService } from './producers/bull-queue.producer';
import { EmailProcessor } from './processors/email.processor';
import { EmailDlqProcessor } from './processors/email-dlq.processor';
import { EmailModule } from '../email/email.module';
import { NotificationModule } from '../../modules/notification/notification.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { PaymentProcessor } from './processors/payment.processor';
import { DispatchModule } from '../../modules/dispatch/dispatch.module';
import { DispatchProcessor } from './processors/dispatch.processor';
import { MarketplaceModule } from '../../modules/marketplace/marketplace.module';

@Module({
  imports: [
    EmailModule,
    NotificationModule,
    PrismaModule,
    DispatchModule,
    forwardRef(() => MarketplaceModule),
    BullModule.registerQueue({
      name: QueueNames.EMAIL,
      defaultJobOptions: {
        attempts: 4,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: { age: 1800, count: 500 },
        removeOnFail: { age: 24 * 3600, count: 1000 },
      },
    }),
    BullModule.registerQueue({
      name: QueueNames.PAYMENT,
      defaultJobOptions: {
        attempts: 4,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: { age: 1800, count: 500 },
        removeOnFail: { age: 24 * 3600, count: 1000 },
      },
    }),
    BullModule.registerQueue({
      name: QueueNames.EMAIL_DLQ,
      defaultJobOptions: {
        removeOnComplete: true,
      },
    }),
    BullModule.registerQueue({
      name: QueueNames.PAYMENT_DLQ,
      defaultJobOptions: {
        removeOnComplete: true,
      },
    }),
    BullModule.registerQueue({
      name: QueueNames.DISPATCH,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: { age: 1800, count: 500 },
        removeOnFail: { age: 24 * 3600, count: 1000 },
      },
    }),
  ],
  providers: [QueueService, EmailProcessor, EmailDlqProcessor, PaymentProcessor, DispatchProcessor],
  exports: [QueueService],
})
export class QueueModule {}
