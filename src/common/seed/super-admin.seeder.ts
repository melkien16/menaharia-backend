import { Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { AccountStatusEnum, GenderEnum, UserVerificationStatusEnum } from '@prisma/client';
import { SystemRolesEnum } from '../enums/users/roles.enum';

export async function seedSuperAdmin(prisma: PrismaService, logger = new Logger('seed')) {
  const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL;
  const SUPER_ADMIN_PHONE = process.env.SUPER_ADMIN_PHONE;
  const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD;
  const SUPER_ADMIN_NAME = process.env.SUPER_ADMIN_NAME;
  const SUPER_ADMIN_NATIONAL_ID = process.env.SUPER_ADMIN_NATIONAL_ID;

  if (
    !SUPER_ADMIN_EMAIL ||
    !SUPER_ADMIN_PHONE ||
    !SUPER_ADMIN_PASSWORD ||
    !SUPER_ADMIN_NAME ||
    !SUPER_ADMIN_NATIONAL_ID
  ) {
    throw new Error('Missing required environment variables for Super Admin seeding');
  }

  const hashedPassword = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);

  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { name: SystemRolesEnum.SUPER_ADMIN },
  });

  const superAdmin = await prisma.user.upsert({
    where: { email: SUPER_ADMIN_EMAIL },
    update: {},
    create: {
      phone: SUPER_ADMIN_PHONE,
      email: SUPER_ADMIN_EMAIL,
      nationalIdNo: SUPER_ADMIN_NATIONAL_ID,
      passwordHash: hashedPassword,
      fullName: SUPER_ADMIN_NAME,
      accountStatus: AccountStatusEnum.active,
      verificationStatus: UserVerificationStatusEnum.verified,
      gender: GenderEnum.male, // ohhhh the misogyny, but hey, it's just a seed data, not a real person 🙃
    },
    select: { id: true, email: true },
  });

  await prisma.userRole.upsert({
    where: { id: superAdmin.id },
    update: {},
    create: {
      userId: superAdmin.id,
      roleId: adminRole.id,
    },
  });

  logger.log('🌱🌱 Super Admin seeded 🌱🌱');
  return superAdmin;
}
