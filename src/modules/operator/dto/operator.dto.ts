import { partner_status } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dtos/pagination-query.dto';

export class CreateOperatorDto {
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
}

export class UpdateOperatorDto extends PartialType(CreateOperatorDto) {}

export class OperatorQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: partner_status })
  @IsOptional()
  @IsEnum(partner_status)
  status?: partner_status;
}
