import { seat_type } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsEnum, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from 'src/common/dtos/pagination-query.dto';

export class SeatDefinitionDto {
  @ApiProperty()
  @IsString()
  seatNumber: string;

  @ApiProperty({ enum: seat_type })
  @IsEnum(seat_type)
  seatType: seat_type;
}

export class CreateSeatBatchDto {
  @ApiProperty()
  @IsUUID()
  busId: string;

  @ApiProperty({ type: [SeatDefinitionDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SeatDefinitionDto)
  seats: SeatDefinitionDto[];
}

export class SeatQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  busId?: string;
}
