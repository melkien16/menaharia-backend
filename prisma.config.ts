import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';
import { getDatabaseUrl } from './src/prisma/prisma-url';

export default defineConfig({
  schema: './src/prisma/schema',
  datasource: {
    url: getDatabaseUrl() ?? env('DATABASE_URL'),
  },
});
