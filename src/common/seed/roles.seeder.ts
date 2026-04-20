import { Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SystemRolesEnum } from 'src/common/enums/users/roles.enum';
import { RoleTypeEnum } from '@prisma/client';

const SYSTEM_ROLES: SystemRolesEnum[] = [
  SystemRolesEnum.ADMIN,
  SystemRolesEnum.SUPER_ADMIN,
  SystemRolesEnum.USER,
  SystemRolesEnum.VENDOR,
  SystemRolesEnum.DRIVER,
  SystemRolesEnum.HUB_STAFF,
  SystemRolesEnum.AGENT,
];

export async function seedSystemRoles(prisma: PrismaService, logger = new Logger('seed')) {
  const results = await Promise.all(
    SYSTEM_ROLES.map((name) =>
      prisma.role.upsert({
        where: { name, type: RoleTypeEnum.system },
        update: {},
        create: { name },
        select: { id: true, name: true },
      }),
    ),
  );

  logger.log('🌱🌱 System roles seeded 🌱🌱');
  return results;
}
