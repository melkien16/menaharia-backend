/*
  Warnings:

  - A unique constraint covering the columns `[managerId]` on the table `hubs` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "hubs" ADD COLUMN     "managerId" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "hubs_managerId_key" ON "hubs"("managerId");

-- AddForeignKey
ALTER TABLE "hubs" ADD CONSTRAINT "hubs_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
