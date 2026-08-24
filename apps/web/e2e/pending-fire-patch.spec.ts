import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/login";

test.describe("pending fire patch", () => {
  test("second send patches pending fire; add-only after start", async ({
    browser,
  }) => {
    const waiterContext = await browser.newContext();
    const waiter = await waiterContext.newPage();
    await loginAs(waiter, "maya", "2222");

    const floorRes = await waiter.request.get("/backend/waiter/floor");
    expect(floorRes.ok()).toBeTruthy();
    const floorBody = (await floorRes.json()) as {
      data?: { tables: { id: string; label: string; status: string }[] };
    };
    const table = floorBody.data?.tables?.find((t) => t.status === "AVAILABLE");
    expect(table).toBeTruthy();

    const menuRes = await waiter.request.get(
      `/backend/waiter/tables/${table!.id}/pos`,
    );
    const menuBody = (await menuRes.json()) as {
      data?: {
        menuItems: { id: string; name: string; isAvailable: boolean }[];
      };
    };
    const items = (menuBody.data?.menuItems ?? []).filter((m) => m.isAvailable);
    expect(items.length).toBeGreaterThanOrEqual(2);
    const a = items[0]!;
    const b = items[1]!;

    const first = await waiter.request.post("/backend/waiter/orders", {
      data: {
        tableId: table!.id,
        items: [{ menuItemId: a.id, qty: 1 }],
      },
    });
    expect(first.ok()).toBeTruthy();
    const firstBody = (await first.json()) as {
      data?: { fireId: string; mode: string };
    };
    expect(firstBody.data?.mode).toBe("created");
    const fireId = firstBody.data!.fireId;

    const patch = await waiter.request.post("/backend/waiter/orders", {
      data: {
        tableId: table!.id,
        items: [{ menuItemId: b.id, qty: 1 }],
      },
    });
    expect(patch.ok()).toBeTruthy();
    const patchBody = (await patch.json()) as {
      data?: { fireId: string; mode: string };
    };
    expect(patchBody.data?.mode).toBe("patchedPending");
    expect(patchBody.data?.fireId).toBe(fireId);

    await waiterContext.close();

    const kitchenContext = await browser.newContext();
    const kitchen = await kitchenContext.newPage();
    await loginAs(kitchen, "kenji", "4444");

    const boardRes = await kitchen.request.get("/backend/kitchen/board");
    const board = (await boardRes.json()) as {
      data?: {
        pending: {
          fireId: string;
          items: { id: string; name: string }[];
          queuePosition: number | null;
        }[];
      };
    };
    const fire = board.data?.pending?.find((f) => f.fireId === fireId);
    expect(fire).toBeTruthy();
    expect(fire!.items.length).toBe(2);
    expect(fire!.items.some((i) => i.name === a.name)).toBe(true);
    expect(fire!.items.some((i) => i.name === b.name)).toBe(true);

    const start = await kitchen.request.post(
      `/backend/kitchen/items/${fire!.items[0]!.id}/start`,
      { data: {} },
    );
    expect(start.ok()).toBeTruthy();

    const waiter2 = await browser.newContext();
    const w2 = await waiter2.newPage();
    await loginAs(w2, "maya", "2222");

    const addWhileCooking = await w2.request.post("/backend/waiter/orders", {
      data: {
        tableId: table!.id,
        items: [{ menuItemId: a.id, qty: 1 }],
      },
    });
    expect(addWhileCooking.ok()).toBeTruthy();
    const addBody = (await addWhileCooking.json()) as {
      data?: { fireId: string; mode: string };
    };
    expect(addBody.data?.mode).toBe("addedToInProgress");
    expect(addBody.data?.fireId).toBe(fireId);

    const removeWhileCooking = await w2.request.post("/backend/waiter/orders", {
      data: {
        tableId: table!.id,
        items: [],
        removeItemIds: [fire!.items[1]!.id],
      },
    });
    expect(removeWhileCooking.ok()).toBeFalsy();

    await waiter2.close();
    await kitchenContext.close();
  });
});
