import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import { MessageTypeEnum } from '../enums/shared/message-types.enum';

const sendMailMock = jest.fn();

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: sendMailMock,
  })),
}));

describe('EmailService', () => {
  const configService = {
    get: jest.fn((key: string) => {
      const values: Record<string, string | number | boolean | undefined> = {
        'email.smtpHost': 'smtp.example.com',
        'email.smtpPort': 587,
        'email.smtpUser': 'smtp-user',
        'email.smtpPass': 'smtp-pass',
        'email.smtpSecure': false,
        'email.fromEmail': 'no-reply@example.com',
        'email.fromName': 'Menaharia',
        'email.replyTo': 'support@example.com',
        'app.name': 'Menaharia',
      };

      return values[key];
    }),
  } as unknown as ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
    sendMailMock.mockResolvedValue({
      messageId: 'msg-1',
      accepted: ['user@example.com'],
      rejected: [],
    });
  });

  it('sends a welcome email with Nodemailer', async () => {
    const service = new EmailService(configService);
    const result = await service.sendWelcomeEmail({ to: 'user@example.com', name: 'User' });

    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        subject: 'Welcome to Menaharia',
      }),
    );
    expect(result.messageId).toBe('msg-1');
  });

  it('renders booking confirmation emails', async () => {
    const service = new EmailService(configService);

    await service.sendEmail({
      to: 'user@example.com',
      type: MessageTypeEnum.BOOKING_CONFIRMED,
      payload: {
        name: 'User',
        bookingReference: 'BKG-1',
        ticketNumber: 'TKT-1',
      },
    });

    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'Your booking BKG-1 is confirmed',
      }),
    );
  });
});