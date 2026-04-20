import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { FilterOperators } from '../enums/shared/filter-operators.enum';

export class Where {
  @ApiProperty()
  @IsString()
  column: string;

  @ApiProperty()
  @IsString()
  value: any;

  @IsEnum(FilterOperators, {
    message: `Operator must be one of ${Object.keys(FilterOperators).toString()}`,
  })
  operator: string;
}

export class Order {
  @ApiProperty()
  @IsString()
  column: string;

  @ApiProperty()
  @IsEnum(['ASC', 'DESC'], {
    message: 'Direction must be either ASC or DESC',
  })
  direction?: 'ASC' | 'DESC';
}

export class FetchQuery {
  @ApiProperty()
  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  // horizontal filtering like selecting only certain columns
  select?: string[] = [];

  @ApiProperty()
  @ApiPropertyOptional()
  @IsOptional()
  // outer array  'and' inner array 'or'
  where: Where[][] = [];

  @ApiProperty()
  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  orderBy?: Order[] = [];

  @ApiPropertyOptional({ description: 'Page number (1-based)', default: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 10, maximum: 100 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

export class PaginatedResult<T> {
  @ApiProperty()
  total!: number;
  @ApiProperty({ isArray: true })
  items!: T[];
}
