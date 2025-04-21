/*
  Warnings:

  - You are about to drop the column `instagramUrl` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `tiktokUrl` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `youtubeUrl` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "instagramUrl",
DROP COLUMN "tiktokUrl",
DROP COLUMN "youtubeUrl",
ADD COLUMN     "socialLinks" JSONB;
