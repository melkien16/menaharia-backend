/*
  Warnings:

  - You are about to drop the column `role_id` on the `user_roles` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `user_roles` table. All the data in the column will be lost.
  - Added the required column `roleId` to the `user_roles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `user_roles` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "user_roles" DROP CONSTRAINT "user_roles_role_id_fkey";

-- DropForeignKey
ALTER TABLE "user_roles" DROP CONSTRAINT "user_roles_user_id_fkey";

-- AlterTable
ALTER TABLE "user_roles" DROP COLUMN "role_id",
DROP COLUMN "user_id",
ADD COLUMN     "roleId" UUID NOT NULL,
ADD COLUMN     "userId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "vendors" ALTER COLUMN "isActive" SET DEFAULT false;

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "originalName" TEXT NOT NULL,
    "size" INTEGER,
    "version" INTEGER NOT NULL,
    "itemId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "bucketName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "isUploaded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
