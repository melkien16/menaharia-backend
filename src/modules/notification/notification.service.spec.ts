import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  it('returns dispatched payloads', async () => {
    const service = new NotificationService();

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
    const service = new NotificationService();

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
  });
});
