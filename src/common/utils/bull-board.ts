import { ExpressAdapter } from '@bull-board/express';
import { getQueueToken } from '@nestjs/bullmq';
import { QueueNames } from '../bullmq/bull.constants';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { INestApplication } from '@nestjs/common';

export function setupBullBoard(app: INestApplication) {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/bull-board');

  // Get queues from Nest DI
  const emailQueue = app.get(getQueueToken(QueueNames.EMAIL));
  const emailDlqQueue = app.get(getQueueToken(QueueNames.EMAIL_DLQ));
  const paymentQueue = app.get(getQueueToken(QueueNames.PAYMENT));
  const paymentDlqQueue = app.get(getQueueToken(QueueNames.PAYMENT_DLQ));

  createBullBoard({
    queues: [
      new BullMQAdapter(emailQueue),
      new BullMQAdapter(emailDlqQueue),

      new BullMQAdapter(paymentQueue),
      new BullMQAdapter(paymentDlqQueue),
    ],
    serverAdapter,
  });

  app.use('/bull-board', serverAdapter.getRouter());
}
