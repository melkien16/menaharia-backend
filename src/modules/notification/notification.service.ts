import { Injectable, Logger } from '@nestjs/common';
import { SendNotificationDto } from './dto/notification.dto';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  async send(dto: SendNotificationDto) {
    this.logger.log(
      `Dispatching ${dto.channel} notification to ${dto.email ?? dto.phone ?? 'unknown-recipient'}`,
    );

    return {
      dispatched: true,
      ...dto,
    };
  }

  async sendBookingConfirmedNotification(params: {
    email?: string | null;
    phone?: string | null;
    bookingReference: string;
    ticketNumber: string;
  }) {
    return this.send({
      channel: 'BOOKING_CONFIRMATION',
      email: params.email ?? undefined,
      phone: params.phone ?? undefined,
      subject: 'Booking confirmed',
      message: `Booking ${params.bookingReference} has been confirmed. Ticket ${params.ticketNumber} is ready.`,
      metadataKeys: ['booking_reference', 'ticket_number'],
    });
  }
}
