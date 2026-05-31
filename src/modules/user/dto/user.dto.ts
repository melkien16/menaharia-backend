import { user_status } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dtos/pagination-query.dto';

export class UserQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: user_status })
  @IsOptional()
  @IsEnum(user_status)
  status?: user_status;
}

export class SearchUserQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  phone?: string;
}

export class UpdateUserStatusDto {
  @ApiProperty({ enum: user_status })
  @IsEnum(user_status)
  status: user_status;
}

export class UserRoleMutationDto {
  @ApiProperty()
  @IsUUID()
  roleId: string;
}
