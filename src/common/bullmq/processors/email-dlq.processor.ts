import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { QueueNames } from '../bull.constants';

@Processor(QueueNames.EMAIL_DLQ)
@Injectable()
export class EmailDlqProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailDlqProcessor.name);

  async process(
    job: Job<{
      originalJobId: string;
      name: string;
      queue: string;
      data: any;
      reason: string;
      attemptsMade: number;
      maxAttempts: number | null;
      failedAt: string;
    }>,
  ) {
    this.logger.warn(
      `🚨 Critical: Job ${job.id} in ${QueueNames.EMAIL} failed after max retries. Reason: ${job.data.reason}. DLQ: jobId=${job.id} original=${job.data.originalJobId} reason="${job.data.reason}"`,
    );

    // TODO:
    // - Persist to DB for triage
    // - Create an incident/alert

    return { handled: true };
  }
}
