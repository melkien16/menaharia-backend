-- migration.sql
ALTER TABLE "cart_items" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
