-- Ensure audit columns exist for user_addresses and wishlist_items.
-- This migration is idempotent and safe for already-deployed environments.

ALTER TABLE "user_addresses"
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

UPDATE "user_addresses"
SET "updatedAt" = COALESCE("updatedAt", CURRENT_TIMESTAMP);

ALTER TABLE "user_addresses"
  ALTER COLUMN "updatedAt" SET NOT NULL;

ALTER TABLE "wishlist_items"
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

UPDATE "wishlist_items"
SET "updatedAt" = COALESCE("updatedAt", CURRENT_TIMESTAMP);

ALTER TABLE "wishlist_items"
  ALTER COLUMN "updatedAt" SET NOT NULL;
