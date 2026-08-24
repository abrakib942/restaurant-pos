import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/login";

const MENU_ITEM = "Charred Octopus";

test.describe("full service flow", () => {
  test("waitlist → order → kitchen → expo → pay", async ({ browser }) => {
    const partyName = `E2E Walk-in ${Date.now()}`;
    let tableLabel = "";

    // --- Admin: seat a walk-in ---
    const adminContext = await browser.newContext();
    const admin = await adminContext.newPage();
    await loginAs(admin, "admin", "1111");
    await admin.goto("/admin/waitlist");
    await expect(
      admin.getByRole("heading", { name: "Waitlist" }),
    ).toBeVisible();
    await admin.getByRole("button", { name: /Add party/i }).click();
    await admin.getByLabel("Party name").fill(partyName);
    await admin.getByLabel("Party size").fill("2");
    await admin.getByRole("button", { name: "Add to line" }).click();
    await expect(
      admin.getByRole("row").filter({ hasText: partyName }),
    ).toBeVisible({
      timeout: 10_000,
    });

    const row = admin.getByRole("row").filter({ hasText: partyName });
    await row.getByRole("button", { name: "Seat" }).click();
    await admin.locator("#seatTable").click();
    const firstTableOption = admin.locator("[role=option]").first();
    const tableText = (await firstTableOption.textContent()) ?? "";
    tableLabel = tableText.replace(/^Table\s+/i, "").trim();
    await firstTableOption.click();
    await admin.getByRole("button", { name: "Confirm seat" }).click();
    await expect(admin.getByText(`Seated at table ${tableLabel}`)).toBeVisible({
      timeout: 10_000,
    });
    await adminContext.close();

    // --- Waiter: take order ---
    const waiterContext = await browser.newContext();
    const waiter = await waiterContext.newPage();
    await loginAs(waiter, "maya", "2222");
    await waiter.goto("/waiter");
    await waiter
      .getByRole("link", { name: `${tableLabel} occupied 0 tickets` })
      .click();
    await expect(
      waiter.getByRole("heading", { name: new RegExp(`Table ${tableLabel}`) }),
    ).toBeVisible({ timeout: 10_000 });
    await waiter.getByRole("button", { name: "All", exact: true }).click();
    await waiter.getByRole("button", { name: new RegExp(MENU_ITEM) }).click();
    await waiter.getByRole("button", { name: /Send to kitchen/i }).click();
    await expect(waiter.getByText(/Order submitted|Items added/i)).toBeVisible({
      timeout: 10_000,
    });

    // --- Kitchen: fire and plate ---
    const kitchenContext = await browser.newContext();
    const kitchen = await kitchenContext.newPage();
    await loginAs(kitchen, "kenji", "4444");
    await kitchen.goto("/kitchen");

    const pendingCard = kitchen
      .locator("article")
      .filter({ hasText: MENU_ITEM })
      .filter({ hasText: `Table ${tableLabel}` })
      .first();
    await expect(pendingCard).toBeVisible({ timeout: 15_000 });

    const boardRes = await kitchen.request.get("/backend/kitchen/board");
    expect(boardRes.ok()).toBeTruthy();
    const board = (await boardRes.json()) as {
      data?: {
        pending: {
          fireId: string;
          tableLabel: string;
          items: { id: string; name: string }[];
        }[];
        inProgress: {
          fireId: string;
          items: { id: string; status: string }[];
        }[];
      };
    };
    const fire = board.data?.pending?.find(
      (f) =>
        f.tableLabel === tableLabel &&
        f.items.some((i) => i.name === MENU_ITEM),
    );
    expect(fire).toBeTruthy();
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
    await kitchenContext.close();

    // --- Waiter: run food from pass ---
    await waiter.reload();
    const passItem = waiter
      .getByRole("dialog")
      .locator("li")
      .filter({ hasText: `Table ${tableLabel}` })
      .filter({ hasText: MENU_ITEM })
      .first();

    await expect(async () => {
      if (!(await waiter.getByRole("dialog").isVisible())) {
        await waiter.getByRole("button", { name: /Pass/ }).click();
      }
      await expect(passItem).toBeVisible({ timeout: 3000 });
    }).toPass({ timeout: 30_000 });

    await passItem.getByRole("button", { name: "Served" }).click();
    await expect(
      waiter.getByText(/Fire marked served|Marked served/i),
    ).toBeVisible({
      timeout: 10_000,
    });

    // --- Waiter: checkout ---
    await waiter.keyboard.press("Escape");
    await waiter.goto("/waiter");
    await waiter
      .getByRole("link", { name: new RegExp(`${tableLabel} occupied`) })
      .click();
    await waiter.getByRole("link", { name: "Checkout" }).click();
    await waiter.getByRole("button", { name: "Generate bill" }).click();
    await expect(waiter.getByRole("button", { name: "Mark paid" })).toBeVisible(
      { timeout: 10_000 },
    );
    await waiter.getByRole("button", { name: "Mark paid" }).click();
    await expect(
      waiter.getByText(/Payment recorded|table is free/),
    ).toBeVisible({
      timeout: 10_000,
    });
    await waiterContext.close();
  });
});
