import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { OperatorRatingController } from './operator-rating.controller';
import { OperatorRatingService } from './operator-rating.service';

@Module({
  imports: [PrismaModule],
  controllers: [OperatorRatingController],
  providers: [OperatorRatingService],
  exports: [OperatorRatingService],
})
export class OperatorRatingModule {}
