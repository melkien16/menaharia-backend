import { Module } from '@nestjs/common';
import { ChapaService } from './chapa/chapa.service';
import { ConfigModule } from '@nestjs/config';
import { PaymentService } from './payment.service';

@Module({
  imports: [ConfigModule],
  providers: [ChapaService, PaymentService],
  exports: [ChapaService, PaymentService],
})
export class PaymentModule {}
