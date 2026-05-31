import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  Version,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from 'src/common/authorization/decorators/roles.decorator';
import { SystemRolesEnum } from 'src/common/enums/users/roles.enum';
import { CloudinaryStorageService } from './cloudinary-storage.service';
import { UploadImageDto } from './dto/upload-image.dto';

@ApiTags('storage')
@ApiBearerAuth()
@Controller({ path: 'storage', version: '1' })
@Roles(SystemRolesEnum.ADMIN, SystemRolesEnum.SUPER_ADMIN, SystemRolesEnum.BUS_OPERATOR, SystemRolesEnum.USER)
export class StorageController {
  constructor(private readonly cloudinaryStorageService: CloudinaryStorageService) {}

  @Post('images')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload an image to Cloudinary' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        folder: { type: 'string' },
      },
      required: ['file'],
    },
  })
  upload(@UploadedFile() file: Express.Multer.File, @Body() body: UploadImageDto) {
    return this.cloudinaryStorageService.uploadImage(file, {
      folder: body.folder,
    });
  }

  @Delete('images')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an uploaded image from Cloudinary' })
  @ApiQuery({ name: 'publicId', required: true, description: 'Cloudinary public id' })
  remove(@Query('publicId') publicId: string) {
    return this.cloudinaryStorageService.deleteImage(publicId);
  }
}