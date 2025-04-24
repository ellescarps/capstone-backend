/*
  Warnings:

  - You are about to drop the column `locationId` on the `Post` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_locationId_fkey";

-- AlterTable
ALTER TABLE "Post" DROP COLUMN "locationId",
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT;
