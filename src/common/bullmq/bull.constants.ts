export enum QueueNames {
  EMAIL = 'EMAIL',
  EMAIL_DLQ = 'EMAIL-DLQ',
  DISPATCH = 'DISPATCH',
  PAYMENT = 'payment-queue',
  PAYMENT_DLQ = 'payment-dlq',
  PUSH_NOTIFICATION = 'PUSH_NOTIFICATION',
  PUSH_NOTIFICATION_DLQ = 'PUSH_NOTIFICATION_DLQ',
}

export const JobNames = {
  SEND_EMAIL: 'send-email',
  POST_PAYMENT_CHORES: 'post-payment-chores',
  DEAD_LETTER: 'dead-letter',
  AUTO_ASSIGN_DRIVER: 'auto-assign-driver',
  SEND_PUSH_NOTIFICATION: 'send-push-notification',
};
