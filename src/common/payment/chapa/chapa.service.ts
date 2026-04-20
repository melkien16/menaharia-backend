import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InitializeTransactionDto } from './chapa.dto';
import axios from 'axios';
import {
  ChapaInitiateResponse,
  ChapaPaymentDetailsResponse,
  InitializeTransactionPayload,
} from './chapa.types';
import { PaymentConfig } from '../utils/payment.types';
import { PrismaService } from 'src/prisma/prisma.service';
import { generateTransactionReference, selectCallbackUrl } from '../utils/payment.helpers';
import { TransactionStatusEnum } from '@prisma/client';
// import { PaymentWebhookScenariosEnum } from '../../enums/shared/payment.enum';

@Injectable()
export class ChapaService {
  constructor(private readonly configService: ConfigService) {}

  private readonly logger = new Logger('[CHAPA PAYMENT SERVICE]');

  async initializeTransaction(
    prismaService: PrismaService,
    userId: string,
    data: InitializeTransactionDto,
  ): Promise<ChapaInitiateResponse> {
    try {
      const chapaCfg = this.configService.get<PaymentConfig>('payment') ?? {};

      let { apiUrl: url, publicKey, secretKey, encryptionKey } = chapaCfg.chapa ?? {};

      if (!url || !publicKey || !secretKey || !encryptionKey) {
        throw new Error('configuration is not set properly.');
      }

      url = `${url}/transaction/initialize`;

      const headers = {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      };

      const user = await prismaService.user.findUnique({
        where: { id: userId },
        select: { id: true, phone: true, email: true, fullName: true },
      });

      if (!user) {
        throw new Error('User not found for transaction initialization.');
      }

      // comply with chapa's requirement for local phone format (starting with 0 instead of country code)
      if (user.phone.startsWith('+251')) {
        user.phone = user.phone.replace('+251', '0');
      }

      const tx_ref = generateTransactionReference();
      const callbackUrl = `${selectCallbackUrl(data.type)}?trx_ref=${tx_ref}`;

      // Map payment type to transaction type
      const transactionType: any = data.type === 'ORDER_PAYMENT' ? 'ORDER_PAYMENT' : 'WALLET_TOPUP';

      // Create a pending transaction record in the database before calling Chapa API
      await prismaService.transaction.create({
        data: {
          txRef: tx_ref,
          userId,
          amount: data.amount,
          status: TransactionStatusEnum.PENDING,
          type: transactionType,
        },
      });

      const payload: InitializeTransactionPayload = {
        ...data,
        phone_number: user.phone,
        first_name: user.fullName,
        tx_ref,
        callback_url: callbackUrl,
      };

      const response = await axios.post(url, payload, { headers });
      return {
        ...response.data,
        txReference: tx_ref,
      };
    } catch (error) {
      const chapaMessage = error.response?.data?.message;
      const fullResponse = error.response?.data;

      console.error('CHAPA ERROR FULL:', {
        message: error.message,
        status: error.response?.status,
        response: fullResponse,
      });

      throw new BadRequestException(chapaMessage || 'Failed to initialize Chapa transaction');
    }
  }

  async getPaymentDetails(reference: string): Promise<ChapaPaymentDetailsResponse> {
    try {
      const chapaCfg = this.configService.get<PaymentConfig>('payment') ?? {};

      const url = `${chapaCfg.chapa?.apiUrl}/transaction/verify/${reference}`;
      const secretKey = chapaCfg.chapa?.secretKey;

      if (!url || !secretKey) {
        throw new Error('Chapa payment is not properly configured.');
      }

      const headers = {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      };

      const response = await axios.get(url, { headers });
      return response.data;
    } catch (error) {
      this.logger.error('Error fetching payment details:', error.response?.data?.message);
      throw new BadRequestException(
        `Failed to fetch payment details: ${JSON.stringify(error.response?.data?.message)}`,
      );
    }
  }
}
