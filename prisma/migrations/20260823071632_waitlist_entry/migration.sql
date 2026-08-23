-- CreateEnum
CREATE TYPE "WaitlistStatus" AS ENUM ('WAITING', 'NOTIFIED', 'SEATED', 'CANCELLED', 'NO_SHOW');

-- CreateTable
CREATE TABLE "WaitlistEntry" (
    "id" TEXT NOT NULL,
    "partyName" TEXT NOT NULL,
    "partySize" INTEGER NOT NULL,
    "phone" TEXT,
    "status" "WaitlistStatus" NOT NULL DEFAULT 'WAITING',
    "quotedMinutes" INTEGER,
    "seatedTableId" TEXT,
    "seatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WaitlistEntry_status_idx" ON "WaitlistEntry"("status");

-- CreateIndex
CREATE INDEX "WaitlistEntry_createdAt_idx" ON "WaitlistEntry"("createdAt");

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_seatedTableId_fkey" FOREIGN KEY ("seatedTableId") REFERENCES "Table"("id") ON DELETE SET NULL ON UPDATE CASCADE;
