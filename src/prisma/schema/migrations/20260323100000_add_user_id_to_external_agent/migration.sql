-- Add userId column to external_agents for agent login
ALTER TABLE "external_agents" ADD COLUMN "userId" UUID;

-- Create foreign key constraint
ALTER TABLE "external_agents" ADD CONSTRAINT "external_agents_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create index for faster lookups
CREATE INDEX "external_agents_userId_idx" ON "external_agents"("userId");
