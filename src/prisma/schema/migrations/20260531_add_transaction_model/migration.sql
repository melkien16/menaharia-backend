-- Create transaction_status enum if it doesn't exist
CREATE TYPE "transaction_status" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- Create transactions table
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tx_ref" TEXT NOT NULL UNIQUE,
    "user_id" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "status" "transaction_status" NOT NULL DEFAULT 'PENDING',
    "type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for transactions
CREATE INDEX "transactions_user_id_idx" ON "transactions"("user_id");
CREATE INDEX "transactions_status_idx" ON "transactions"("status");
