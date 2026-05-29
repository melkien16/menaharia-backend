import { OtpUtil } from './otp.util';

describe('OtpUtil', () => {
  const dateNow = 1_700_000_000_000;

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(dateNow);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('generates a 6-digit OTP code', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.123456);

    expect(OtpUtil.generateOtpCode()).toMatch(/^\d{6}$/);
  });

  it('calculates the expiry time using the default window', () => {
    expect(OtpUtil.calculateExpiry()).toEqual(new Date(dateNow + 30 * 60 * 1000));
  });

  it('calculates the expiry time for a custom window', () => {
    expect(OtpUtil.calculateExpiry(10)).toEqual(new Date(dateNow + 10 * 60 * 1000));
  });

  it('formats QR payloads', () => {
    expect(OtpUtil.generateQrData('shipment-1', '123456')).toBe('nl://verify/shipment-1/123456');
    expect(OtpUtil.generateQrDataWithOrder('order-1', 'shipment-1', 'leg-1', '123456')).toBe(
      'nl://verify/order/order-1/shipment/shipment-1/leg/leg-1/123456',
    );
  });

  it('detects expiration and attempt limits', () => {
    const now = new Date();

    expect(OtpUtil.isExpired(new Date(now.getTime() - 1))).toBe(true);
    expect(OtpUtil.isExpired(new Date(now.getTime() + 60_000))).toBe(false);
    expect(OtpUtil.isMaxAttemptsReached(3)).toBe(true);
    expect(OtpUtil.isMaxAttemptsReached(2)).toBe(false);
  });
});
