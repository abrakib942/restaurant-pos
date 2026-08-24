import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/login";

const MENU_ITEM = "Charred Octopus";

function qrSlugForLabel(label: string) {
  return `t-${label.padStart(2, "0")}`;
}

test.describe("waiter-mediated guest order", () => {
  test("guest cannot send to kitchen; waiter confirms cart call", async ({
    browser,
  }) => {
    const partyName = `E2E Guest Cart ${Date.now()}`;
    let tableLabel = "";

    const adminContext = await browser.newContext();
    const admin = await adminContext.newPage();
    await loginAs(admin, "admin", "1111");
    await admin.goto("/admin/waitlist");
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

    const qrSlug = qrSlugForLabel(tableLabel);

    // --- Guest: build cart and call waiter (not kitchen) ---
    const guestContext = await browser.newContext();
    const guest = await guestContext.newPage();
    await guest.goto(`/menu/${qrSlug}`);
    await expect(guest.getByText(`Table ${tableLabel}`)).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      guest.getByRole("button", { name: /Send to kitchen/i }),
    ).toHaveCount(0);

    const itemRow = guest.locator("li").filter({ hasText: MENU_ITEM }).first();
    await itemRow.getByRole("button", { name: "Add" }).click();
    await guest.getByRole("button", { name: /Cart/i }).click();
    await expect(
      guest.getByRole("button", { name: /Call waiter with these items/i }),
    ).toBeVisible();
    await guest
      .getByRole("button", { name: /Call waiter with these items/i })
      .click();
    await expect(
      guest.getByText(
        /Waiter called with your items|Added to your waiter request/i,
      ),
    ).toBeVisible({ timeout: 10_000 });

    await guest.getByRole("button", { name: /My order/i }).click();
    const myOrder = guest.getByRole("dialog");
    await expect(
      myOrder.getByText(/Waiting for waiter|Waiter on the way/i),
    ).toBeVisible({ timeout: 10_000 });
    await expect(myOrder.getByText(/× Charred Octopus/)).toBeVisible();
    await guest.keyboard.press("Escape");

    const guestStatus = await guest.request.get(
      `/backend/guest/order-status/${qrSlug}`,
    );
    expect(guestStatus.ok()).toBeTruthy();
    const guestStatusBody = (await guestStatus.json()) as {
      data?: { pendingRequest: { lines: { name: string }[] } | null };
    };
    expect(
      guestStatusBody.data?.pendingRequest?.lines?.some(
        (l) => l.name === MENU_ITEM,
      ),
    ).toBe(true);
    await guestContext.close();

    // --- Waiter: take order from Calls → POS → kitchen ---
    const waiterContext = await browser.newContext();
    const waiter = await waiterContext.newPage();
    await loginAs(waiter, "maya", "2222");

    await expect
      .poll(
        async () => {
          const res = await waiter.request.get(
            "/backend/waiter/service-requests",
          );
          if (!res.ok()) return null;
          const body = (await res.json()) as {
            data?: {
              requests: {
                id: string;
                tableId: string;
                tableLabel: string;
                linesPreview: string;
              }[];
            };
          };
          return (
            body.data?.requests?.find(
              (r) =>
                r.tableLabel === tableLabel &&
                (r.linesPreview ?? "").includes(MENU_ITEM),
            ) ?? null
          );
        },
        { timeout: 20_000 },
      )
      .not.toBeNull();

    const listRes = await waiter.request.get(
      "/backend/waiter/service-requests",
    );
    const listBody = (await listRes.json()) as {
      data?: {
        requests: {
          id: string;
          tableId: string;
          tableLabel: string;
          linesPreview: string;
        }[];
      };
    };
    const match = listBody.data?.requests?.find(
      (r) =>
        r.tableLabel === tableLabel &&
        (r.linesPreview ?? "").includes(MENU_ITEM),
    );
    expect(match).toBeTruthy();

    await waiter.request.post(
      `/backend/waiter/service-requests/${match!.id}/acknowledge`,
    );
    await waiter.goto(
      `/waiter/tables/${match!.tableId}?requestId=${match!.id}`,
    );
    await expect(
      waiter.getByRole("heading", { name: new RegExp(`Table ${tableLabel}`) }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(waiter.locator("aside").getByText(MENU_ITEM)).toBeVisible({
      timeout: 10_000,
    });
    await waiter.getByRole("button", { name: /Send to kitchen/i }).click();
    await expect(waiter.getByText(/Order submitted|Items added/i)).toBeVisible({
      timeout: 10_000,
    });

    // --- Kitchen: ticket appears ---
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
    await kitchenContext.close();
    await waiterContext.close();
  });
});
