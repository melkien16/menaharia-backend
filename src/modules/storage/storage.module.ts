import { Module } from '@nestjs/common';
import { CloudinaryStorageService } from './cloudinary-storage.service';
import { StorageController } from './storage.controller';

@Module({
  controllers: [StorageController],
  providers: [CloudinaryStorageService],
  exports: [CloudinaryStorageService],
})
export class StorageModule {}