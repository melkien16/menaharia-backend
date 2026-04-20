import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CheckoutDto, DeliveryLocationDto } from '../../modules/marketplace/dto/order.dto';

@Injectable()
export class PriceEngineService {
  private readonly BASE_DELIVERY_FEE = 30; // Base fee in ETB
  private readonly PRICE_PER_KM = 5; // Price per km

  async computeDeliveryFee(
    dto: CheckoutDto,
    vendorLocation?: { lat: number; lng: number },
  ): Promise<number> {
    // If no delivery location provided, return base fee
    if (!dto.deliveryLocation) {
      return this.BASE_DELIVERY_FEE;
    }

    // Use vendor location if provided, otherwise use default Addis Ababa center
    // TODO: Fetch actual vendor coordinates from vendor profile when available
    const vendorLat = vendorLocation?.lat ?? 9.032;
    const vendorLng = vendorLocation?.lng ?? 38.746;

    const distance = this.calculateDistance(
      vendorLat,
      vendorLng,
      dto.deliveryLocation.lat,
      dto.deliveryLocation.lng,
    );

    // Calculate fee: base fee + (distance * price per km)
    const fee = this.BASE_DELIVERY_FEE + distance * this.PRICE_PER_KM;

    // Round to 2 decimal places
    return Math.round(fee * 100) / 100;
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * Returns distance in kilometers
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  async computeVat(total: Prisma.Decimal, vatRate: number = 0.15): Promise<number> {
    return parseFloat((total.toNumber() * vatRate).toFixed(2));
  }
}
