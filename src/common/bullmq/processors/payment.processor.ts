import { InjectQueue, OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { QueueNames } from '../bull.constants';
import { Injectable, Logger } from '@nestjs/common';
import { OrderService } from 'src/modules/marketplace/service/order.service';
import { Job, Queue } from 'bullmq';

@Processor(QueueNames.PAYMENT)
@Injectable()
export class PaymentProcessor extends WorkerHost {
  private readonly logger = new Logger(PaymentProcessor.name);

  constructor(
    @InjectQueue(QueueNames.PAYMENT_DLQ) private readonly dlq: Queue,
    private readonly orderService: OrderService,
  ) {
    super();
  }

  async process(job: Job<{ orderId: string; txReference: string }>): Promise<any> {
    // const { orderId, txReference } = job.data;
    // this.logger.log(`Processing chores for Order: ${orderId}`);
    // // Call the heavy logic
    // await this.orderService.postPaymentChores(orderId);
    // return { completed: true };
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job | undefined, err: Error) {
    if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
      await this.dlq.add(QueueNames.PAYMENT_DLQ, {
        orderId: job.data.orderId,
        reason: err.message,
        data: job.data,
      });
      this.logger.error(`Order ${job.data.orderId} chores failed and moved to DLQ`);
    }
  }
}
