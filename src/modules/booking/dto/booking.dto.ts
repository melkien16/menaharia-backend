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
  declare tripSeatId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  declare fullName: string;

  @ApiProperty()
  @IsEmail()
  declare email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  declare phone: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  declare emergencyContact: string;
}

export class CreateBookingDto {
  @ApiProperty()
  @IsUUID()
  declare tripId: string;

  @ApiProperty({ enum: payment_method })
  @IsEnum(payment_method)
  declare paymentMethod: payment_method;

  @ApiProperty({ type: [BookingTravelerDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BookingTravelerDto)
  declare travelers: BookingTravelerDto[];
}

export class CreateBookingForUserDto extends CreateBookingDto {
  @ApiProperty()
  @IsUUID()
  declare userId: string;
}

export class CreateBookingWithAccountDto extends CreateBookingDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  declare fullName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  declare phone: string;

  @ApiProperty()
  @IsEmail()
  declare email: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @IsNotEmpty()
  declare password: string;
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
