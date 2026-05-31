import { Module } from '@nestjs/common';
import { TicketService } from './ticket.service';
import { TicketController } from './ticket.controller';
import { StorageModule } from '../storage/storage.module';
import { EmailModule } from 'src/common/email/email.module';

@Module({
  imports: [StorageModule, EmailModule],
  controllers: [TicketController],
  providers: [TicketService],
  exports: [TicketService],
})
export class TicketModule {}
