import { dispute_status } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dtos/pagination-query.dto';

export class CreateDisputeDto {
  @ApiProperty()
  @IsUUID()
  operatorId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  subject: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  message: string;
}

export class UpdateDisputeDto {
  @ApiPropertyOptional({ enum: dispute_status })
  @IsOptional()
  @IsEnum(dispute_status)
  status?: dispute_status;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  response?: string;
}

export class DisputeQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: dispute_status })
  @IsOptional()
  @IsEnum(dispute_status)
  status?: dispute_status;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  operatorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  bookingId?: string;
}

export class ResolveDisputeDto extends PartialType(UpdateDisputeDto) {}
