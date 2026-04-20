import { bus_status } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dtos/pagination-query.dto';

export class CreateBusDto {
  @ApiProperty()
  @IsUUID()
  operatorId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  plateNumber: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  totalSeats: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  make: string;

  @ApiPropertyOptional({ enum: bus_status })
  @IsOptional()
  @IsEnum(bus_status)
  status?: bus_status;
}

export class UpdateBusDto extends PartialType(CreateBusDto) {}

export class BusQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: bus_status })
  @IsOptional()
  @IsEnum(bus_status)
  status?: bus_status;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  operatorId?: string;
}
