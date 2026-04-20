/**
 * OTP Utility for generating and managing OTP codes
 * FR-09: OTP/QR Verification for Pickup/Drop-off
 */

export interface OtpData {
  otp: string;
  expiresAt: Date;
  attempts: number;
  lastAttemptAt: Date | null;
}

export class OtpUtil {
  /**
   * Generate a 6-digit OTP
   */
  static generateOtpCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Calculate expiration time (default 30 minutes)
   */
  static calculateExpiry(minutes: number = 30): Date {
    return new Date(Date.now() + minutes * 60 * 1000);
  }

  /**
   * Generate QR code data string (legacy format - shipment only)
   */
  static generateQrData(shipmentId: string, otp: string): string {
    return `nl://verify/${shipmentId}/${otp}`;
  }

  /**
   * Generate QR code data string with full order/shipment/leg info
   * Includes orderId, shipmentId, legId for complete tracking
   */
  static generateQrDataWithOrder(
    orderId: string,
    shipmentId: string,
    legId: string,
    otp: string,
  ): string {
    // Format: nl://verify/order/{orderId}/shipment/{shipmentId}/leg/{legId}/otp/{otp}
    return `nl://verify/order/${orderId}/shipment/${shipmentId}/leg/${legId}/${otp}`;
  }

  /**
   * Check if OTP is expired
   */
  static isExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt;
  }

  /**
   * Check if max attempts reached
   */
  static isMaxAttemptsReached(attempts: number, maxAttempts: number = 3): boolean {
    return attempts >= maxAttempts;
  }
}
