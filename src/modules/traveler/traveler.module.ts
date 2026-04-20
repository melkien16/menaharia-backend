import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TravelerController } from './traveler.controller';
import { TravelerService } from './traveler.service';

@Module({
  imports: [PrismaModule],
  controllers: [TravelerController],
  providers: [TravelerService],
  exports: [TravelerService],
})
export class TravelerModule {}
