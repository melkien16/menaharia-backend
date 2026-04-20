import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost, OnWorkerEvent, InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { JobNames, QueueNames } from '../bull.constants';
import { EmailService, SendEmailInput } from 'src/common/email/email.service';
import { MessageTypeEnum } from 'src/common/enums/shared/message-types.enum';

@Processor(QueueNames.EMAIL)
@Injectable()
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    @InjectQueue(QueueNames.EMAIL_DLQ) private readonly dlq: Queue,
    private readonly emailService: EmailService,
  ) {
    super();
  }

  // Main work
  async process(
    job: Job<{
      userId: string;
      email: string;
      name: string;
      emailType: MessageTypeEnum;
      payload: any;
    }>,
  ): Promise<any> {
    this.logger.log(`Processing job ${job.id} for ${job.data.email}`);
    await job.updateProgress(10);

    // send email
    await this.emailService.sendEmail({
      to: job.data.email,
      type: job.data.emailType,
      payload: job.data.payload,
    } as SendEmailInput);

    await job.updateProgress(100);
    this.logger.log(`Completed job ${job.id}`);
    return { ok: true };
  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    this.logger.log(`Event: active jobId=${job?.id}`);
  }

  @OnWorkerEvent('stalled')
  onStalled(job: Job) {
    this.logger.warn(`Event: stalled jobId=${job?.id}`);
  }

  @OnWorkerEvent('paused')
  onPaused() {
    this.logger.warn('Event: worker paused');
  }

  @OnWorkerEvent('resumed')
  onResumed() {
    this.logger.log('Event: worker resumed');
  }

  @OnWorkerEvent('drained')
  onDrained() {
    this.logger.log('Event: worker drained');
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job | undefined, err: Error) {
    const id = job?.id ?? 'unknown';
    const attemptsMade = job?.attemptsMade ?? 0;
    const maxAttempts = job?.opts?.attempts ?? 1; // we set attempts on each job in the producer

    this.logger.error(
      `Event: failed jobId=${id} attemptsMade=${attemptsMade}/${maxAttempts} err=${err?.message}`,
    );

    // **DLQ routing**: only when attempts exhausted (poison job)
    if (job && attemptsMade >= maxAttempts) {
      await this.routeToDLQ(job, err);
    }
  }

  private async routeToDLQ(job: Job, err: Error) {
    try {
      await this.dlq.add(
        JobNames.DEAD_LETTER,
        {
          originalJobId: job.id,
          name: job.name,
          queue: QueueNames.EMAIL,
          data: job.data,
          reason: err?.message ?? 'unknown',
          attemptsMade: job.attemptsMade,
          maxAttempts: job.opts.attempts ?? null,
          failedAt: new Date().toISOString(),
        },
        { removeOnComplete: true },
      );

      this.logger.warn(`Job ${job.id} moved to DLQ (${QueueNames.EMAIL_DLQ})`);
    } catch (dlqErr) {
      this.logger.error(`Failed to push job ${job.id} to DLQ: ${dlqErr?.message}`);
    }
  }
}
