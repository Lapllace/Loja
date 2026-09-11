-- CreateEnum
CREATE TYPE "OrderOrigin" AS ENUM ('ONLINE', 'PHYSICAL');

-- CreateEnum
CREATE TYPE "PaymentSource" AS ENUM ('ONLINE', 'PHYSICAL');

-- AlterTable
ALTER TABLE "Order"
ADD COLUMN "origin" "OrderOrigin" NOT NULL DEFAULT 'ONLINE';

-- AlterTable
ALTER TABLE "Payment"
ADD COLUMN "source" "PaymentSource" NOT NULL DEFAULT 'ONLINE';
