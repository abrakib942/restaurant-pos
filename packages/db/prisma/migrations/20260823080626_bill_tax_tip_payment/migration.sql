-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'OTHER');

-- AlterTable
ALTER TABLE "Bill" ADD COLUMN     "paymentMethod" "PaymentMethod",
ADD COLUMN     "tax" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "tip" DECIMAL(10,2) NOT NULL DEFAULT 0;
