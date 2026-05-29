import { partner_status } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from 'src/common/dtos/pagination-query.dto';

export class CreateOperatorDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  businessLicenseNo: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  tinNo: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiPropertyOptional({ enum: partner_status })
  @IsOptional()
  @IsEnum(partner_status)
  status?: partner_status;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  responsibleName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  companyPhone: string;

  @ApiProperty()
  @IsEmail()
  companyEmail: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  established?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  rating?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  reliabilityScore?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  badge?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  about?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  safetyInfo?: string;
}

export class UpdateOperatorDto extends PartialType(CreateOperatorDto) {}

export class OperatorQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: partner_status })
  @IsOptional()
  @IsEnum(partner_status)
  status?: partner_status;
}
