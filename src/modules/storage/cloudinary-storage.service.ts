import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

type UploadOptions = {
  folder?: string;
};

@Injectable()
export class CloudinaryStorageService {
  private readonly defaultFolder: string;

  constructor(private readonly configService: ConfigService) {
    const cloudName = this.configService.get<string>('cloudinary.cloudName');
    const apiKey = this.configService.get<string>('cloudinary.apiKey');
    const apiSecret = this.configService.get<string>('cloudinary.apiSecret');
    const uploadFolder = this.configService.get<string>('cloudinary.uploadFolder') || 'menaharia';

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error('Cloudinary configuration is required');
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    this.defaultFolder = uploadFolder;
  }

  async uploadImage(file: Express.Multer.File, options: UploadOptions = {}) {
    this.ensureImageFile(file);

    const uploadResult = await this.uploadBuffer(file.buffer, {
      folder: this.normalizeFolder(options.folder),
    });

    return this.toUploadResponse(uploadResult);
  }

  async uploadPdfBuffer(
    buffer: Buffer,
    filename: string,
    options: UploadOptions = {},
  ) {
    if (!buffer?.length) {
      throw new BadRequestException('PDF buffer is required');
    }

    const folder = this.normalizeFolder(options.folder);

    const uploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: filename,
          resource_type: 'raw',
          use_filename: true,
          unique_filename: false,
          overwrite: true,
          format: 'pdf',
        },
        (error, result) => {
          if (error) { reject(error); return; }
          if (!result) { reject(new InternalServerErrorException('Cloudinary did not return a result')); return; }
          resolve(result);
        },
      );

      Readable.from(buffer).pipe(stream);
    });

    return {
      publicId: uploadResult.public_id,
      secureUrl: uploadResult.secure_url,
      url: uploadResult.url,
      bytes: uploadResult.bytes,
      format: uploadResult.format,
    };
  }

  async deleteImage(publicId: string) {
    const normalizedPublicId = publicId?.trim();

    if (!normalizedPublicId) {
      throw new BadRequestException('publicId is required');
    }

    const result = await cloudinary.uploader.destroy(normalizedPublicId);

    if (result.result !== 'ok' && result.result !== 'not found') {
      throw new InternalServerErrorException('Failed to delete image from Cloudinary');
    }

    return {
      publicId: normalizedPublicId,
      result: result.result,
    };
  }

  private uploadBuffer(
    buffer: Buffer,
    options: { folder: string },
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: options.folder,
          resource_type: 'image',
          use_filename: true,
          unique_filename: true,
          overwrite: false,
        },
        (error, result) => {
          if (error) {
            reject(error);
            return;
          }

          if (!result) {
            reject(new InternalServerErrorException('Cloudinary did not return an upload result'));
            return;
          }

          resolve(result);
        },
      );

      Readable.from(buffer).pipe(stream);
    });
  }

  private ensureImageFile(file: Express.Multer.File) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Image file is required');
    }

    if (!file.mimetype?.startsWith('image/')) {
      throw new BadRequestException('Only image files are supported');
    }
  }

  private normalizeFolder(folder?: string) {
    return (folder?.trim() || this.defaultFolder).replace(/^\/+|\/+$/g, '');
  }

  private toUploadResponse(result: UploadApiResponse) {
    return {
      publicId: result.public_id,
      secureUrl: result.secure_url,
      url: result.url,
      assetId: result.asset_id,
      bytes: result.bytes,
      format: result.format,
      width: result.width,
      height: result.height,
      resourceType: result.resource_type,
      createdAt: result.created_at,
    };
  }
}