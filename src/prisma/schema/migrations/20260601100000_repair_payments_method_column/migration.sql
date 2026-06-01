DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'payment_method'
  ) THEN
    EXECUTE 'CREATE TYPE "payment_method" AS ENUM (''CHAPA'', ''TELEBIRR'', ''SANTIM'')';
  ELSE
    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
        AND t.typname = 'payment_method'
        AND e.enumlabel = 'CHAPA'
    ) THEN
      EXECUTE 'ALTER TYPE "payment_method" ADD VALUE ''CHAPA''';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
        AND t.typname = 'payment_method'
        AND e.enumlabel = 'CBE'
    ) THEN
      EXECUTE 'ALTER TYPE "payment_method" RENAME VALUE ''CBE'' TO ''SANTIM''';
    END IF;
  END IF;
END $$;

ALTER TABLE "payments"
  ALTER COLUMN "method" TYPE "payment_method"
  USING (CASE
    WHEN "method"::text = 'CBE' THEN 'SANTIM'
    ELSE "method"::text
  END)::"payment_method";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'payment_method_old'
  ) THEN
    EXECUTE 'DROP TYPE "payment_method_old"';
  END IF;
END $$;
