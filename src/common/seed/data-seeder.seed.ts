import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { seedSystemRoles } from './roles.seeder';
import { seedSuperAdmin } from './super-admin.seeder';
import { HubSeeder } from './hub.seeder';
import * as bcrypt from 'bcrypt';
import {
  AccountStatusEnum,
  GenderEnum,
  UserVerificationStatusEnum,
  VendorStatusEnum,
  VendorVerificationStatusEnum,
  Prisma,
} from '@prisma/client';
import { SystemRolesEnum } from '../enums/users/roles.enum';

@Injectable()
export class DataSeeder {
  private readonly logger = new Logger(DataSeeder.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly hubSeeder: HubSeeder,
  ) {}

  async run() {
    // ADD CALLS TO OTHER SEED FUNCTIONS HERE AS NEEDED
    await seedSystemRoles(this.prisma, this.logger);
    await seedSuperAdmin(this.prisma, this.logger);

    // Seed Vendor (if VENDOR credentials are set in .env)
    await this.seedVendorUser();

    // Seed Admin User (if ADMIN credentials are set in .env)
    await this.seedAdminUser();

    // Seed Driver User (if DRIVER credentials are set in .env)
    await this.seedDriverUser();

    // Seed Customer User (if CUSTOMER credentials are set in .env)
    await this.seedCustomerUser();

    // Seed Hubs
    await this.hubSeeder.run();

    // Seed Commission Rates
    await this.seedCommissionRates();
  }

  private async seedCommissionRates() {
    // Seed default commission rates if they don't exist
    const commissionTypes = [
      { type: 'driver_commission', amount: 15, description: 'External driver platform commission' },
      { type: 'agent_commission', amount: 10, description: 'External agent commission' },
      { type: 'vendor_commission', amount: 10, description: 'Vendor platform commission' },
    ];

    for (const comm of commissionTypes) {
      const existing = await this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
        SELECT "id" FROM "pricing_configs"
        WHERE "type" = ${comm.type}::"PricingTypeEnum"
        LIMIT 1
      `);

      if (!existing[0]) {
        await this.prisma.$executeRaw(Prisma.sql`
          INSERT INTO "pricing_configs"
          ("id", "type", "vehicleCategory", "zoneCode", "amount", "minAmount", "maxAmount", "priorityMultiplier", "isActive", "createdAt", "updatedAt")
          VALUES
          (gen_random_uuid(), ${comm.type}::"PricingTypeEnum", NULL, NULL, ${comm.amount}::numeric, NULL, NULL, NULL, true, NOW(), NOW())
        `);
        this.logger.log(`🌱 Seeded ${comm.type} commission rate: ${comm.amount}%`);
      }
    }
  }

  private async seedVendorUser() {
    const VENDOR_EMAIL = process.env.VENDOR_EMAIL;
    const VENDOR_PHONE = process.env.VENDOR_PHONE;
    const VENDOR_PASSWORD = process.env.VENDOR_PASSWORD;
    const VENDOR_NAME = process.env.VENDOR_NAME;
    const VENDOR_NATIONAL_ID = process.env.VENDOR_NATIONAL_ID;

    if (!VENDOR_EMAIL || !VENDOR_PHONE || !VENDOR_PASSWORD || !VENDOR_NAME || !VENDOR_NATIONAL_ID) {
      this.logger.warn('⚠️ Vendor credentials not configured, skipping vendor seed');
      return;
    }

    const hashedPassword = await bcrypt.hash(VENDOR_PASSWORD, 10);
    const vendorRole = await this.prisma.role.findUnique({
      where: { name: SystemRolesEnum.VENDOR },
    });

    if (!vendorRole) {
      this.logger.warn('⚠️ VENDOR role not found, skipping vendor seed');
      return;
    }

    const vendor = await this.prisma.user.upsert({
      where: { email: VENDOR_EMAIL },
      update: {},
      create: {
        phone: VENDOR_PHONE,
        email: VENDOR_EMAIL,
        nationalIdNo: VENDOR_NATIONAL_ID,
        passwordHash: hashedPassword,
        fullName: VENDOR_NAME,
        accountStatus: AccountStatusEnum.active,
        verificationStatus: UserVerificationStatusEnum.verified,
        gender: GenderEnum.male,
      },
      select: { id: true, email: true },
    });

    // First delete any existing user roles for this user to avoid duplicates
    await this.prisma.userRole.deleteMany({
      where: { userId: vendor.id },
    });

    await this.prisma.userRole.create({
      data: {
        userId: vendor.id,
        roleId: vendorRole.id,
      },
    });

    // Create vendor profile
    await this.prisma.vendor.upsert({
      where: { userId: vendor.id },
      update: {},
      create: {
        userId: vendor.id,
        storeName: VENDOR_NAME + ' Store',
        businessType: 'Retail',
        category: 'General',
        region: 'Addis Ababa',
        status: VendorStatusEnum.active,
        verificationStatus: VendorVerificationStatusEnum.approved,
        isActive: true,
      },
    });

    this.logger.log('🌱🌱 Vendor user seeded 🌱🌱');
  }

  private async seedAdminUser() {
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
    const ADMIN_PHONE = process.env.ADMIN_PHONE;
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
    const ADMIN_NAME = process.env.ADMIN_NAME;
    const ADMIN_NATIONAL_ID = process.env.ADMIN_NATIONAL_ID;

    if (!ADMIN_EMAIL || !ADMIN_PHONE || !ADMIN_PASSWORD || !ADMIN_NAME || !ADMIN_NATIONAL_ID) {
      this.logger.warn('⚠️ Admin credentials not configured, skipping admin seed');
      return;
    }

    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
    const adminRole = await this.prisma.role.findUnique({ where: { name: SystemRolesEnum.ADMIN } });

    if (!adminRole) {
      this.logger.warn('⚠️ ADMIN role not found, skipping admin seed');
      return;
    }

    const admin = await this.prisma.user.upsert({
      where: { email: ADMIN_EMAIL },
      update: {},
      create: {
        phone: ADMIN_PHONE,
        email: ADMIN_EMAIL,
        nationalIdNo: ADMIN_NATIONAL_ID,
        passwordHash: hashedPassword,
        fullName: ADMIN_NAME,
        accountStatus: AccountStatusEnum.active,
        verificationStatus: UserVerificationStatusEnum.verified,
        gender: GenderEnum.male,
      },
      select: { id: true, email: true },
    });

    // First delete any existing user roles for this user to avoid duplicates
    await this.prisma.userRole.deleteMany({
      where: { userId: admin.id },
    });

    await this.prisma.userRole.create({
      data: {
        userId: admin.id,
        roleId: adminRole.id,
      },
    });

    this.logger.log('🌱🌱 Admin user seeded 🌱🌱');
  }

  private async seedDriverUser() {
    const DRIVER_EMAIL = process.env.DRIVER_EMAIL;
    const DRIVER_PHONE = process.env.DRIVER_PHONE;
    const DRIVER_PASSWORD = process.env.DRIVER_PASSWORD;
    const DRIVER_NAME = process.env.DRIVER_NAME;
    const DRIVER_NATIONAL_ID = process.env.DRIVER_NATIONAL_ID;

    if (!DRIVER_EMAIL || !DRIVER_PHONE || !DRIVER_PASSWORD || !DRIVER_NAME || !DRIVER_NATIONAL_ID) {
      this.logger.warn('⚠️ Driver credentials not configured, skipping driver seed');
      return;
    }

    const hashedPassword = await bcrypt.hash(DRIVER_PASSWORD, 10);
    const driverRole = await this.prisma.role.findUnique({
      where: { name: SystemRolesEnum.DRIVER },
    });

    if (!driverRole) {
      this.logger.warn('⚠️ DRIVER role not found, skipping driver seed');
      return;
    }

    const driver = await this.prisma.user.upsert({
      where: { email: DRIVER_EMAIL },
      update: {},
      create: {
        phone: DRIVER_PHONE,
        email: DRIVER_EMAIL,
        nationalIdNo: DRIVER_NATIONAL_ID,
        passwordHash: hashedPassword,
        fullName: DRIVER_NAME,
        accountStatus: AccountStatusEnum.active,
        verificationStatus: UserVerificationStatusEnum.verified,
        gender: GenderEnum.male,
      },
      select: { id: true, email: true },
    });

    // First delete any existing user roles for this user to avoid duplicates
    await this.prisma.userRole.deleteMany({
      where: { userId: driver.id },
    });

    await this.prisma.userRole.create({
      data: {
        userId: driver.id,
        roleId: driverRole.id,
      },
    });

    this.logger.log('🌱🌱 Driver user seeded 🌱🌱');
  }

  private async seedCustomerUser() {
    const CUSTOMER_EMAIL = process.env.CUSTOMER_EMAIL;
    const CUSTOMER_PHONE = process.env.CUSTOMER_PHONE;
    const CUSTOMER_PASSWORD = process.env.CUSTOMER_PASSWORD;
    const CUSTOMER_NAME = process.env.CUSTOMER_NAME;
    const CUSTOMER_NATIONAL_ID = process.env.CUSTOMER_NATIONAL_ID;

    if (
      !CUSTOMER_EMAIL ||
      !CUSTOMER_PHONE ||
      !CUSTOMER_PASSWORD ||
      !CUSTOMER_NAME ||
      !CUSTOMER_NATIONAL_ID
    ) {
      this.logger.warn('⚠️ Customer credentials not configured, skipping customer seed');
      return;
    }

    const hashedPassword = await bcrypt.hash(CUSTOMER_PASSWORD, 10);

    // Customer is a regular user - no special role needed
    const customer = await this.prisma.user.upsert({
      where: { email: CUSTOMER_EMAIL },
      update: {},
      create: {
        phone: CUSTOMER_PHONE,
        email: CUSTOMER_EMAIL,
        nationalIdNo: CUSTOMER_NATIONAL_ID,
        passwordHash: hashedPassword,
        fullName: CUSTOMER_NAME,
        accountStatus: AccountStatusEnum.active,
        verificationStatus: UserVerificationStatusEnum.verified,
        gender: GenderEnum.male,
      },
    });

    this.logger.log('🌱🌱 Customer user seeded 🌱🌱');
  }
}
