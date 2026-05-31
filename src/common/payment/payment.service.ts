import { Injectable } from '@nestjs/common';
import { payment_method } from '@prisma/client';
import { ChapaService } from './chapa/chapa.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { InitiatePaymentPayload } from './utils/payment.types';
import { selectReturnUrl } from './utils/payment.helpers';

@Injectable()
export class PaymentService {
  constructor(private readonly chapaService: ChapaService) {}

  async initiatePayment(prismaService: PrismaService, payOrder: InitiatePaymentPayload) {
    const intiateTransactionPayload = {
      amount: payOrder.amount,
      type: payOrder.paymentType,
      return_url: selectReturnUrl(payOrder.returnUrl),
    };

    switch (payOrder.paymentMethod) {
      case payment_method.CHAPA:
        return await this.chapaService.initializeTransaction(
          prismaService,
          payOrder.userId,
          intiateTransactionPayload,
        );

      case payment_method.TELEBIRR:
        // TO BE DONE
        return;

      case payment_method.SANTIM:
        // TO BE DONE
        return;

      default:
        throw new Error('Unsupported payment method');
    }
  }

  async getPaymentDetails(txReference: string, paymentMethod: payment_method) {
    switch (paymentMethod) {
      case payment_method.CHAPA:
        return await this.chapaService.getPaymentDetails(txReference);

      case payment_method.TELEBIRR:
        // TO BE DONE
        return;

      case payment_method.SANTIM:
        // TO BE DONE
        return;

      default:
        throw new Error('Unsupported payment method');
    }
  }
}
