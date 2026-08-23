-- CreateEnum
CREATE TYPE "OrderItemPriority" AS ENUM ('NORMAL', 'RUSH');

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "stationId" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "course" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "priority" "OrderItemPriority" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "stationId" TEXT;

-- CreateTable
CREATE TABLE "KitchenStation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "KitchenStation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KitchenStation_name_key" ON "KitchenStation"("name");

-- CreateIndex
CREATE INDEX "Category_stationId_idx" ON "Category"("stationId");

-- CreateIndex
CREATE INDEX "OrderItem_stationId_idx" ON "OrderItem"("stationId");

-- CreateIndex
CREATE INDEX "OrderItem_priority_idx" ON "OrderItem"("priority");

-- CreateIndex
CREATE INDEX "OrderItem_course_idx" ON "OrderItem"("course");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "KitchenStation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "KitchenStation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
