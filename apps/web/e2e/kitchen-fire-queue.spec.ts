import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/login";

/**
 * Multi-item send shares one kitchen fire queue slot.
 * Uses API where possible so the assert is about queue semantics, not flaky UI.
 */
test.describe("kitchen fire queue", () => {
  test("two-item send shares one queue #; second fire is #2", async ({
    browser,
  }) => {
    const waiterContext = await browser.newContext();
    const waiter = await waiterContext.newPage();
    await loginAs(waiter, "maya", "2222");

    const floorRes = await waiter.request.get("/backend/waiter/floor");
    expect(floorRes.ok()).toBeTruthy();
    const floorBody = (await floorRes.json()) as {
      data?: {
        tables: { id: string; label: string; status: string }[];
      };
    };
    const available = floorBody.data?.tables?.filter(
      (t) => t.status === "AVAILABLE",
    );
    expect(available?.length).toBeGreaterThanOrEqual(2);
    const tableA = available![0]!;
    const tableB = available![1]!;

    const menuRes = await waiter.request.get(
      `/backend/waiter/tables/${tableA.id}/pos`,
    );
    expect(menuRes.ok()).toBeTruthy();
    const menuBody = (await menuRes.json()) as {
      data?: {
        menuItems: { id: string; name: string; isAvailable: boolean }[];
      };
    };
    const items = (menuBody.data?.menuItems ?? []).filter((m) => m.isAvailable);
    expect(items.length).toBeGreaterThanOrEqual(2);
    const item1 = items[0]!;
    const item2 = items[1]!;

    const submitA = await waiter.request.post("/backend/waiter/orders", {
      data: {
        tableId: tableA.id,
        items: [
          { menuItemId: item1.id, qty: 1 },
          { menuItemId: item2.id, qty: 1 },
        ],
      },
    });
    expect(submitA.ok()).toBeTruthy();

    const submitB = await waiter.request.post("/backend/waiter/orders", {
      data: {
        tableId: tableB.id,
        items: [{ menuItemId: item1.id, qty: 1 }],
      },
    });
    expect(submitB.ok()).toBeTruthy();
    await waiterContext.close();

    const kitchenContext = await browser.newContext();
    const kitchen = await kitchenContext.newPage();
    await loginAs(kitchen, "kenji", "4444");

    const kitchenBoard = await kitchen.request.get("/backend/kitchen/board");
    expect(kitchenBoard.ok()).toBeTruthy();
    const board = (await kitchenBoard.json()) as {
      data?: {
        pending: {
          fireId: string;
          tableLabel: string;
          queuePosition: number | null;
          items: { name: string }[];
        }[];
      };
    };

    const fireA = board.data?.pending?.find(
      (f) =>
        f.tableLabel === tableA.label &&
        f.items.length === 2 &&
        f.items.some((i) => i.name === item1.name) &&
        f.items.some((i) => i.name === item2.name),
    );
    const fireB = board.data?.pending?.find(
      (f) =>
        f.tableLabel === tableB.label &&
        f.items.length === 1 &&
        f.items.some((i) => i.name === item1.name),
    );

    expect(fireA).toBeTruthy();
    expect(fireB).toBeTruthy();
    expect(fireA!.items).toHaveLength(2);
    expect(fireA!.queuePosition).not.toBeNull();
    expect(fireB!.queuePosition).not.toBeNull();
    // Same fire for both dishes — one serial for table A
    expect(fireA!.queuePosition).toBeLessThan(fireB!.queuePosition!);

    const guestSlug = `t-${tableA.label.padStart(2, "0")}`;
    const guestStatus = await kitchen.request.get(
      `/backend/guest/order-status/${guestSlug}`,
    );
    expect(guestStatus.ok()).toBeTruthy();
    const guestBody = (await guestStatus.json()) as {
      data?: {
        items: {
          name: string;
          fireId: string;
          queuePosition: number | null;
        }[];
      };
    };
    const guestLines = (guestBody.data?.items ?? []).filter(
      (i) => i.name === item1.name || i.name === item2.name,
    );
    expect(guestLines.length).toBeGreaterThanOrEqual(2);
    const positions = new Set(guestLines.map((l) => l.queuePosition));
    const fireIds = new Set(guestLines.map((l) => l.fireId));
    expect(fireIds.size).toBe(1);
    expect(positions.size).toBe(1);

    await kitchenContext.close();
  });

  test("ready two-item fire appears as one Pass card", async ({ browser }) => {
    const waiterContext = await browser.newContext();
    const waiter = await waiterContext.newPage();
    await loginAs(waiter, "maya", "2222");

    const floorRes = await waiter.request.get("/backend/waiter/floor");
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
    const item1 = items[0]!;
    const item2 = items[1]!;

    const submit = await waiter.request.post("/backend/waiter/orders", {
      data: {
        tableId: table!.id,
        items: [
          { menuItemId: item1.id, qty: 1 },
          { menuItemId: item2.id, qty: 1 },
        ],
      },
    });
    expect(submit.ok()).toBeTruthy();
    const submitBody = (await submit.json()) as {
      data?: { fireId: string };
    };
    const fireId = submitBody.data!.fireId;

    const kitchenContext = await browser.newContext();
    const kitchen = await kitchenContext.newPage();
    await loginAs(kitchen, "kenji", "4444");

    const boardRes = await kitchen.request.get("/backend/kitchen/board");
    const board = (await boardRes.json()) as {
      data?: {
        pending: { fireId: string; items: { id: string }[] }[];
      };
    };
    const fire = board.data?.pending?.find((f) => f.fireId === fireId);
    expect(fire?.items.length).toBe(2);

    for (const line of fire!.items) {
      const start = await kitchen.request.post(
        `/backend/kitchen/items/${line.id}/start`,
        { data: {} },
      );
      expect(start.ok()).toBeTruthy();
      const ready = await kitchen.request.post(
        `/backend/kitchen/items/${line.id}/ready`,
        { data: {} },
      );
      expect(ready.ok()).toBeTruthy();
    }

    const notes = await waiter.request.get("/backend/waiter/notifications");
    expect(notes.ok()).toBeTruthy();
    const notesBody = (await notes.json()) as {
      data?: {
        ready: {
          fireId: string;
          itemCount: number;
          items: { name: string }[];
        }[];
      };
    };
    const pass = notesBody.data?.ready?.filter((f) => f.fireId === fireId);
    expect(pass).toHaveLength(1);
    expect(pass![0]!.itemCount).toBe(2);
    expect(pass![0]!.items).toHaveLength(2);

    const served = await waiter.request.post(
      `/backend/waiter/fires/${fireId}/served`,
      { data: {} },
    );
    expect(served.ok()).toBeTruthy();

    await kitchenContext.close();
    await waiterContext.close();
  });
});
