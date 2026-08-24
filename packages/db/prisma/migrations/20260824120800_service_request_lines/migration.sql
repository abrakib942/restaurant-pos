-- CreateTable
CREATE TABLE "ServiceRequestLine" (
    "id" TEXT NOT NULL,
    "serviceRequestId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "note" TEXT,

    CONSTRAINT "ServiceRequestLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceRequestLine_serviceRequestId_idx" ON "ServiceRequestLine"("serviceRequestId");

-- CreateIndex
CREATE INDEX "ServiceRequestLine_menuItemId_idx" ON "ServiceRequestLine"("menuItemId");

-- AddForeignKey
ALTER TABLE "ServiceRequestLine" ADD CONSTRAINT "ServiceRequestLine_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequestLine" ADD CONSTRAINT "ServiceRequestLine_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
