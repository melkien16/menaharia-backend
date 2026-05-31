import { payment_method, payment_status } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dtos/pagination-query.dto';

export class PaymentQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: payment_status })
  @IsOptional()
  @IsEnum(payment_status)
  status?: payment_status;

  @ApiPropertyOptional({ enum: payment_method })
  @IsOptional()
  @IsEnum(payment_method)
  method?: payment_method;
}

export class PaymentCallbackDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gatewayReference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transactionCode?: string;

  @ApiProperty()
  @IsEnum(payment_status)
  status: payment_status;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  callbackReference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rawPayload?: string;

  @ApiPropertyOptional({ enum: payment_method })
  @IsOptional()
  @IsEnum(payment_method)
  method?: payment_method;
}

export class InitiatePaymentDto {
  @ApiProperty({ enum: payment_method })
  @IsEnum(payment_method)
  method: payment_method;

  @ApiProperty()
  @IsUUID()
  bookingId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerReference?: string;
}

export class PaymentInitializationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  paymentUrl: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  gatewayReference: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  message: string;
}
