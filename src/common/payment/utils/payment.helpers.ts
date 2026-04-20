import { BadRequestException } from '@nestjs/common';
import { PaymentMethodEnum } from '@prisma/client';
import { PaymentWebhookScenariosEnum } from 'src/common/enums/shared/payment.enum';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

export function generateTransactionReference(): string {
  const timestamp = Date.now();
  const uniqueId = uuidv4().slice(0, 8);
  return `TXN-${timestamp}-${uniqueId}`;
}

export function selectCallbackUrl(type: PaymentWebhookScenariosEnum): string {
  const BASE_URL = process.env.BASE_URL;

  if (!BASE_URL) throw new BadRequestException('BASE_URL not set in enviornment');

  switch (type) {
    case PaymentWebhookScenariosEnum.ORDER_CHECKOUT:
      return `${BASE_URL}/orders/verify/payment`;
    case PaymentWebhookScenariosEnum.COURIER_REQUEST:
      return `${BASE_URL}/courier/requests/verify/payment`;
    default:
      throw new Error('Invalid payment webhook scenario');
  }
}

export function selectReturnUrl(explicitReturnUrl?: string): string {
  if (explicitReturnUrl) return explicitReturnUrl;

  const BASE_URL = process.env.BASE_URL;

  if (!BASE_URL) throw new BadRequestException('BASE_URL not set in enviornment');

  return BASE_URL;
}

/**
 * Verify Chapa webhook signature
 * @param body - The webhook request body
 * @param headers - The request headers
 * @returns The verified webhook body
 * @throws Error if signature verification fails
 */
export function verifyChapaWebhookSignature(body: any, headers: any): any {
  const secret = process.env.CHAPA_SECRET_KEY || '';

  if (!secret) {
    throw new Error('CHAPA_SECRET_KEY not configured');
  }

  // Calculate HMAC SHA256 signature
  const hash = crypto.createHmac('sha256', secret).update(JSON.stringify(body)).digest('hex');

  // Check for signature in either header (Chapa supports both)
  const chapaSignature = headers['x-chapa-signature'];
  const chapaSignatureAlt = headers['chapa-signature'];

  if (!chapaSignature && !chapaSignatureAlt) {
    throw new Error('Webhook signature missing from headers');
  }

  // Verify signature matches
  const isValidSignature =
    (chapaSignature && hash === chapaSignature) ||
    (chapaSignatureAlt && hash === chapaSignatureAlt);

  if (!isValidSignature) {
    throw new Error('Webhook signature verification failed');
  }

  return body;
}

/**
 * Verify payment webhook (legacy function for backward compatibility)
 * @deprecated Use verifyChapaWebhookSignature instead
 */
export function verifyPaymentWebhook(paymentMethod: PaymentMethodEnum, req: any) {
  switch (paymentMethod) {
    case PaymentMethodEnum.chapa:
      return verifyChapaWebhookSignature(req.body, req.headers);
    default:
      throw new Error('PAYMENT METHOD NOT SUPPORTED');
  }
}
