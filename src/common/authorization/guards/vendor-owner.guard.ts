import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from 'src/prisma/prisma.service';
import { CurrentUserDto } from 'src/common/dtos/current-user.dto';
import { VENDOR_OWNER_PARAM_KEY } from '../decorators/vendor-owner.decorator';

@Injectable()
export class VendorOwnerGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const paramKey = this.reflector.getAllAndOverride<string>(VENDOR_OWNER_PARAM_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If decorator isn't present, let it through.
    if (!paramKey) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as CurrentUserDto | undefined;
    if (!user?.id) throw new ForbiddenException('Missing user');

    const vendorId = request?.params?.[paramKey];
    if (!vendorId) return false;

    const vendor = await this.prisma.vendor.findFirst({
      where: { id: vendorId },
      select: { id: true, userId: true },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');

    if (vendor.userId !== user.id) throw new ForbiddenException('Not vendor owner');

    return true;
  }
}
