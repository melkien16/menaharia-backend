import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  const emailService = {
    sendBookingConfirmedEmail: jest.fn().mockResolvedValue({ messageId: 'email-1' }),
  } as any;

  it('returns dispatched payloads', async () => {
    const service = new NotificationService(emailService);

    await expect(
      service.send({
        channel: 'SMS',
        phone: '0911000000',
        subject: 'Test',
        message: 'Hello',
      } as any),
    ).resolves.toEqual(
      expect.objectContaining({
        dispatched: true,
        channel: 'SMS',
        phone: '0911000000',
      }),
    );
  });

  it('composes booking confirmation notifications', async () => {
    const service = new NotificationService(emailService);

    await expect(
      service.sendBookingConfirmedNotification({
        email: 'user@example.com',
        bookingReference: 'BKG-1',
        ticketNumber: 'TKT-1',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        channel: 'BOOKING_CONFIRMATION',
        email: 'user@example.com',
        message: expect.stringContaining('BKG-1'),
      }),
    );

    expect(emailService.sendBookingConfirmedEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        bookingReference: 'BKG-1',
        ticketNumber: 'TKT-1',
      }),
    );
  });
});
