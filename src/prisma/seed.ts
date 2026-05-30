import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import { SystemRolesEnum } from 'src/common/enums/users/roles.enum';
import { getDatabaseUrl } from './prisma-url';

loadEnvFile('.env.local');
loadEnvFile('.env');

const connectionString = getDatabaseUrl();

if (!connectionString) {
  throw new Error('DATABASE_URL is required to run the seed');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
} as Prisma.PrismaClientOptions);

function loadEnvFile(fileName: string) {
  const envPath = path.resolve(process.cwd(), fileName);

  if (!fs.existsSync(envPath)) {
    return;
  }

  const content = fs.readFileSync(envPath, 'utf8');

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

async function seedRoles() {
  const roles = Object.values(SystemRolesEnum);

  for (const name of roles) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    console.log(`Seeded role: ${name}`);
  }
}

async function seedUsersForRoles() {
  const defaultPassword = process.env.SEED_DEFAULT_PASSWORD || 'Password123!';
  const hashed = await bcrypt.hash(defaultPassword, 10);

  const roles = Object.values(SystemRolesEnum);

  for (const roleName of roles) {
    const prefix = roleName; // e.g. SUPER_ADMIN
    const envEmail = process.env[`${prefix}_EMAIL`];
    const envPhone = process.env[`${prefix}_PHONE`];
    const envPassword = process.env[`${prefix}_PASSWORD`];
    const envName = process.env[`${prefix}_NAME`];
    const envNid = process.env[`${prefix}_NATIONAL_ID`];

    const email = envEmail || `${roleName.toLowerCase()}@example.com`;
    const phone = envPhone || `+2519${Math.floor(10000000 + Math.random() * 90000000)}`;
    const fullName = envName || `${roleName.replace(/_/g, ' ')} Seed`;
    const nationalId = envNid || `NID-${Math.floor(100000 + Math.random() * 900000)}`;

    const passwordToUse = envPassword || process.env.SEED_DEFAULT_PASSWORD || 'Password123!';
    const hashedPwd = await bcrypt.hash(passwordToUse, 10);

    // upsert user
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        phone,
        email,
        // schema has `password` field mapped to `password_hash`
        password: hashedPwd,
        fullName,
        // schema has `status` field (user_status enum)
        status: 'ACTIVE',
      },
      select: { id: true, email: true },
    });

    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) {
      console.warn(`Role not found when assigning user: ${roleName}`);
      continue;
    }

    // remove existing roles for this user (avoid duplicates)
    await prisma.userRole.deleteMany({ where: { userId: user.id } });

    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: role.id,
      },
    });

    console.log(`Seeded user ${user.email} with role ${roleName}`);
  }
}

async function main() {
  await seedRoles();
  await seedUsersForRoles();
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
