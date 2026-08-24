-- CreateTable
CREATE TABLE "KitchenFire" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "waiterId" TEXT NOT NULL,
    "priority" "OrderItemPriority" NOT NULL DEFAULT 'NORMAL',
    "courseMin" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "readyAt" TIMESTAMP(3),

    CONSTRAINT "KitchenFire_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KitchenFire_orderId_idx" ON "KitchenFire"("orderId");

-- CreateIndex
CREATE INDEX "KitchenFire_tableId_idx" ON "KitchenFire"("tableId");

-- CreateIndex
CREATE INDEX "KitchenFire_waiterId_idx" ON "KitchenFire"("waiterId");

-- CreateIndex
CREATE INDEX "KitchenFire_createdAt_idx" ON "KitchenFire"("createdAt");

-- CreateIndex
CREATE INDEX "KitchenFire_priority_idx" ON "KitchenFire"("priority");

-- CreateIndex
CREATE INDEX "KitchenFire_courseMin_idx" ON "KitchenFire"("courseMin");

-- AddForeignKey
ALTER TABLE "KitchenFire" ADD CONSTRAINT "KitchenFire_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KitchenFire" ADD CONSTRAINT "KitchenFire_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KitchenFire" ADD CONSTRAINT "KitchenFire_waiterId_fkey" FOREIGN KEY ("waiterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add nullable fireId, backfill, then require it
ALTER TABLE "OrderItem" ADD COLUMN "fireId" TEXT;

-- Backfill: group items by orderId + 30s createdAt window into KitchenFire rows
DO $$
DECLARE
  rec RECORD;
  fire_id TEXT;
  window_start TIMESTAMPTZ;
  prev_order TEXT := NULL;
  fire_priority "OrderItemPriority";
  fire_course INT;
  fire_started TIMESTAMPTZ;
  fire_ready TIMESTAMPTZ;
  all_ready BOOLEAN;
  any_started BOOLEAN;
BEGIN
  FOR rec IN
    SELECT oi.id, oi."orderId", oi."createdAt", oi.priority, oi.course,
           oi.status, oi."startedAt", oi."readyAt", oi."voidedAt",
           o."tableId", o."waiterId"
    FROM "OrderItem" oi
    JOIN "Order" o ON o.id = oi."orderId"
    WHERE oi."fireId" IS NULL
    ORDER BY oi."orderId", oi."createdAt", oi.id
  LOOP
    IF prev_order IS DISTINCT FROM rec."orderId"
       OR window_start IS NULL
       OR rec."createdAt" > window_start + INTERVAL '30 seconds' THEN
      fire_id := md5(random()::text || clock_timestamp()::text || rec.id);
      window_start := rec."createdAt";
      prev_order := rec."orderId";

      SELECT
        CASE WHEN bool_or(i.priority = 'RUSH') THEN 'RUSH'::"OrderItemPriority" ELSE 'NORMAL'::"OrderItemPriority" END,
        COALESCE(min(i.course), 2),
        min(i."startedAt") FILTER (WHERE i."startedAt" IS NOT NULL),
        CASE
          WHEN count(*) FILTER (WHERE i."voidedAt" IS NULL) > 0
           AND count(*) FILTER (WHERE i."voidedAt" IS NULL AND i.status = 'READY') =
               count(*) FILTER (WHERE i."voidedAt" IS NULL)
          THEN max(i."readyAt") FILTER (WHERE i."readyAt" IS NOT NULL)
          ELSE NULL
        END
      INTO fire_priority, fire_course, fire_started, fire_ready
      FROM "OrderItem" i
      WHERE i."orderId" = rec."orderId"
        AND i."fireId" IS NULL
        AND i."createdAt" >= window_start
        AND i."createdAt" < window_start + INTERVAL '30 seconds';

      INSERT INTO "KitchenFire" ("id", "orderId", "tableId", "waiterId", "priority", "courseMin", "createdAt", "startedAt", "readyAt")
      VALUES (fire_id, rec."orderId", rec."tableId", rec."waiterId", fire_priority, fire_course, window_start, fire_started, fire_ready);
    END IF;

    UPDATE "OrderItem" SET "fireId" = fire_id WHERE id = rec.id;
  END LOOP;
END $$;

-- Any remaining orphans (should be none) get a per-item fire
DO $$
DECLARE
  rec RECORD;
  fire_id TEXT;
BEGIN
  FOR rec IN
    SELECT oi.id, oi."orderId", oi."createdAt", oi.priority, oi.course,
           oi."startedAt", oi."readyAt", oi.status, oi."voidedAt",
           o."tableId", o."waiterId"
    FROM "OrderItem" oi
    JOIN "Order" o ON o.id = oi."orderId"
    WHERE oi."fireId" IS NULL
  LOOP
    fire_id := md5(random()::text || clock_timestamp()::text || rec.id);
    INSERT INTO "KitchenFire" ("id", "orderId", "tableId", "waiterId", "priority", "courseMin", "createdAt", "startedAt", "readyAt")
    VALUES (
      fire_id,
      rec."orderId",
      rec."tableId",
      rec."waiterId",
      rec.priority,
      rec.course,
      rec."createdAt",
      rec."startedAt",
      CASE WHEN rec.status = 'READY' AND rec."voidedAt" IS NULL THEN rec."readyAt" ELSE NULL END
    );
    UPDATE "OrderItem" SET "fireId" = fire_id WHERE id = rec.id;
  END LOOP;
END $$;

ALTER TABLE "OrderItem" ALTER COLUMN "fireId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "OrderItem_fireId_idx" ON "OrderItem"("fireId");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_fireId_fkey" FOREIGN KEY ("fireId") REFERENCES "KitchenFire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
