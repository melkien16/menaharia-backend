import { IsNotEmpty, IsString, IsOptional, IsEmail, IsUrl, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentWebhookScenariosEnum } from 'src/common/enums/shared/payment.enum';

export class InitializeTransactionDto {
  @ApiProperty({ description: 'The amount for the transaction' })
  @IsNotEmpty()
  @IsString()
  amount: string;

  @ApiProperty({ description: 'The intent for this transaction' })
  @IsEnum(PaymentWebhookScenariosEnum)
  type: PaymentWebhookScenariosEnum;

  @ApiProperty({ description: 'The return URL after the transaction', required: false })
  @IsOptional()
  @IsUrl()
  return_url?: string;

  @ApiProperty({ description: 'The title for customization', required: false })
  @IsOptional()
  @IsString()
  'customization[title]'?: string;

  @ApiProperty({ description: 'The description for customization', required: false })
  @IsOptional()
  @IsString()
  'customization[description]'?: string;

  @ApiProperty({ description: 'Meta information to hide the receipt', required: false })
  @IsOptional()
  @IsString()
  'meta[hide_receipt]'?: string;

  @ApiProperty({ description: 'Meta information for invoices', required: false })
  @IsOptional()
  @IsString()
  'meta[invoices]'?: string;
}
