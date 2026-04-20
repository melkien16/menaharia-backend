import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SeatController } from './seat.controller';
import { SeatService } from './seat.service';

@Module({
  imports: [PrismaModule],
  controllers: [SeatController],
  providers: [SeatService],
  exports: [SeatService],
})
export class SeatModule {}
