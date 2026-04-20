import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, JobsOptions } from 'bullmq';
import { JobNames, QueueNames } from '../bull.constants';
import { MessageTypeEnum } from 'src/common/enums/shared/message-types.enum';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue(QueueNames.EMAIL) private readonly emailQueue: Queue,
    @InjectQueue(QueueNames.PAYMENT) private readonly paymentQueue: Queue,
  ) {}

  async addSendEmailJob(
    data: { userId: string; email: string; name: string; emailType: MessageTypeEnum; payload: any },
    opts?: JobsOptions,
  ) {
    // Idempotency via jobId (prevents duplicates)
    const jobId = opts?.jobId ?? `${JobNames.SEND_EMAIL}_${uuidv4()}`;

    return this.emailQueue.add(JobNames.SEND_EMAIL, data, {
      jobId,
      attempts: 4,
      backoff: { type: 'exponential', delay: 3000 },
      ...opts,
    });
  }

  async addPostPaymentJob(data: { orderId: string; txReference: string }, opts?: JobsOptions) {
    // Use orderId in jobId to prevent processing the same order twice if webhooks double-fire
    const jobId = opts?.jobId ?? `${JobNames.POST_PAYMENT_CHORES}_${data.orderId}`;

    return this.paymentQueue.add(JobNames.POST_PAYMENT_CHORES, data, {
      jobId,
      attempts: 5,
      backoff: { type: 'exponential', delay: 5000 }, // Wait 5s, 10s, 20s...
      ...opts,
    });
  }
}
