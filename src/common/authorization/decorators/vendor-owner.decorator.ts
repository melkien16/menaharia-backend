import { SetMetadata } from '@nestjs/common';

export const VENDOR_OWNER_PARAM_KEY = 'vendorOwner:paramKey';

/**
 * Ensures the authenticated user is the owner of the vendor referenced by a route param.
 */
export const VendorOwner = (paramKey: string = 'vendorId') =>
  SetMetadata(VENDOR_OWNER_PARAM_KEY, paramKey);
