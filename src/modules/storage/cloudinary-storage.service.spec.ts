import { BadRequestException } from '@nestjs/common';
import { PassThrough } from 'stream';
import { CloudinaryStorageService } from './cloudinary-storage.service';

jest.mock('cloudinary', () => {
  const uploadStream = jest.fn();
  const destroy = jest.fn();

  return {
    v2: {
      config: jest.fn(),
      uploader: {
        upload_stream: uploadStream,
        destroy,
      },
    },
  };
});

describe('CloudinaryStorageService', () => {
  const cloudinary = jest.requireMock('cloudinary').v2;

  const configService = {
    get: jest.fn((key: string) => {
      const values: Record<string, string | undefined> = {
        'cloudinary.cloudName': 'demo-cloud',
        'cloudinary.apiKey': 'demo-key',
        'cloudinary.apiSecret': 'demo-secret',
        'cloudinary.uploadFolder': 'demo-folder',
      };

      return values[key];
    }),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects non-image uploads', async () => {
    const service = new CloudinaryStorageService(configService);

    await expect(
      service.uploadImage({ buffer: Buffer.from('x'), mimetype: 'text/plain' } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('uploads images and returns cloudinary metadata', async () => {
    const result = {
      public_id: 'demo-folder/image-1',
      secure_url: 'https://res.cloudinary.com/demo/image/upload/demo-folder/image-1.jpg',
      url: 'http://res.cloudinary.com/demo/image/upload/demo-folder/image-1.jpg',
      asset_id: 'asset-1',
      bytes: 1024,
      format: 'jpg',
      width: 100,
      height: 80,
      resource_type: 'image',
      created_at: '2026-05-31T00:00:00Z',
    };

    cloudinary.uploader.upload_stream.mockImplementation((_options: any, callback: any) => {
      const writable = new PassThrough();
      writable.on('finish', () => callback(null, result));
      return writable;
    });

    const service = new CloudinaryStorageService(configService);
    const response = await service.uploadImage({
      buffer: Buffer.from('image'),
      mimetype: 'image/jpeg',
      originalname: 'photo.jpg',
    } as any);

    expect(cloudinary.config).toHaveBeenCalled();
    expect(response).toEqual(
      expect.objectContaining({
        publicId: 'demo-folder/image-1',
        secureUrl: result.secure_url,
      }),
    );
  });
});