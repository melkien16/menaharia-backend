import { booking_status, payment_method } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from 'src/common/dtos/pagination-query.dto';

export class BookingTravelerDto {
  @ApiProperty()
  @IsUUID()
  tripSeatId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  emergencyContact: string;
}

export class CreateBookingDto {
  @ApiProperty()
  @IsUUID()
  tripId: string;

  @ApiProperty({ enum: payment_method })
  @IsEnum(payment_method)
  paymentMethod: payment_method;

  @ApiProperty({ type: [BookingTravelerDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BookingTravelerDto)
  travelers: BookingTravelerDto[];
}

export class BookingQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: booking_status })
  @IsOptional()
  @IsEnum(booking_status)
  status?: booking_status;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  userId?: string;
}
