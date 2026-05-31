import { payment_method } from '@prisma/client';
import { PaymentWebhookScenariosEnum } from 'src/common/enums/shared/payment.enum';

export type PaymentConfig = {
  chapa?: {
    apiUrl?: string;
    publicKey?: string;
    secretKey?: string;
    encryptionKey?: string;
  };
};

export type InitiatePaymentPayload = {
  orderId?: string;
  courierRequestId?: string;
  userId: string;
  amount: string;
  paymentMethod: payment_method;
  paymentType: PaymentWebhookScenariosEnum;
  returnUrl?: string;
};
