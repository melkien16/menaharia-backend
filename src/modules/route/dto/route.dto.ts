import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dtos/pagination-query.dto';

export class CreateRouteDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  origin: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  destination: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  distance: number;
}

export class UpdateRouteDto extends PartialType(CreateRouteDto) {}

export class RouteQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  origin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  destination?: string;
}
