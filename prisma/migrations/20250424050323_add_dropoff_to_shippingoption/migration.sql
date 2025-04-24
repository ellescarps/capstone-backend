/*
  Warnings:

  - The values [BOTH] on the enum `ShippingOption` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ShippingOption_new" AS ENUM ('PICKUP', 'SHIPPING', 'DROPOFF');
ALTER TABLE "User" ALTER COLUMN "shippingOption" TYPE "ShippingOption_new" USING ("shippingOption"::text::"ShippingOption_new");
ALTER TABLE "Post" ALTER COLUMN "shippingOption" TYPE "ShippingOption_new" USING ("shippingOption"::text::"ShippingOption_new");
ALTER TYPE "ShippingOption" RENAME TO "ShippingOption_old";
ALTER TYPE "ShippingOption_new" RENAME TO "ShippingOption";
DROP TYPE "ShippingOption_old";
COMMIT;
