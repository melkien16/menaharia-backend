import { trip_status } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from 'src/common/dtos/pagination-query.dto';

export class CreateTripDto {
  @ApiProperty()
  @IsUUID()
  routeId: string;

  @ApiProperty()
  @IsUUID()
  busId: string;

  @ApiProperty()
  @IsDateString()
  departureTime: string;

  @ApiProperty()
  @IsDateString()
  arrivalTime: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ enum: trip_status })
  @IsOptional()
  @IsEnum(trip_status)
  status?: trip_status;
}

export class UpdateTripDto extends PartialType(CreateTripDto) {}

export class TripQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  origin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  destination?: string;

  @ApiPropertyOptional({ enum: trip_status })
  @IsOptional()
  @IsEnum(trip_status)
  status?: trip_status;
}
