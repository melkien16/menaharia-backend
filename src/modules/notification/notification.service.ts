import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from 'src/common/email/email.service';
import { SendNotificationDto } from './dto/notification.dto';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly emailService: EmailService) {}

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
    name?: string | null;
    bookingReference: string;
    ticketNumber: string;
  }) {
    if (params.email) {
      try {
        await this.emailService.sendBookingConfirmedEmail({
          to: params.email,
          name: params.name ?? undefined,
          bookingReference: params.bookingReference,
          ticketNumber: params.ticketNumber,
        });
      } catch (error) {
        this.logger.warn(
          `Failed to send booking confirmation email to ${params.email}: ${error?.message ?? error}`,
        );
      }
    }

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
