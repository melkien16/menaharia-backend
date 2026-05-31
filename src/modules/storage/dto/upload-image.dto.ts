import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UploadImageDto {
  @ApiPropertyOptional({ description: 'Optional Cloudinary folder override' })
  @IsOptional()
  @IsString()
  declare folder?: string;
}