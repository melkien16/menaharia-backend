import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { BusController } from './bus.controller';
import { BusService } from './bus.service';

@Module({
  imports: [PrismaModule],
  controllers: [BusController],
  providers: [BusService],
  exports: [BusService],
})
export class BusModule {}
