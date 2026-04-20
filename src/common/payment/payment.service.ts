import { Injectable } from '@nestjs/common';
import { PaymentMethodEnum } from '@prisma/client';
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
      case PaymentMethodEnum.chapa:
        return await this.chapaService.initializeTransaction(
          prismaService,
          payOrder.userId,
          intiateTransactionPayload,
        );

      case PaymentMethodEnum.telebirr:
        // TO BE DONE
        return;

      case PaymentMethodEnum.santim:
        // TO BE DONE
        return;

      default:
        throw new Error('Unsupported payment method');
    }
  }

  async getPaymentDetails(txReference: string, paymentMethod: PaymentMethodEnum) {
    switch (paymentMethod) {
      case PaymentMethodEnum.chapa:
        return await this.chapaService.getPaymentDetails(txReference);

      case PaymentMethodEnum.telebirr:
        // TO BE DONE
        return;

      case PaymentMethodEnum.santim:
        // TO BE DONE
        return;

      default:
        throw new Error('Unsupported payment method');
    }
  }
}
