import path from "node:path";
import fs from "node:fs";
import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/login";

/**
 * Portfolio screenshot capture — run with:
 *   pnpm exec playwright test e2e/portfolio-screenshots.spec.ts
 *
 * Writes PNGs to docs/portfolio/screenshots/ (repo root).
 */
const OUT = path.resolve(process.cwd(), "../../docs/portfolio/screenshots");

async function shot(
  page: import("@playwright/test").Page,
  name: string,
  fullPage = true,
) {
  fs.mkdirSync(OUT, { recursive: true });
  await page.waitForTimeout(400);
  await page.screenshot({
    path: path.join(OUT, `${name}.png`),
    fullPage,
  });
}

test.describe.configure({ mode: "serial" });

test("portfolio screenshots — all main flows", async ({ browser }) => {
  fs.mkdirSync(OUT, { recursive: true });

  // --- Public / auth ---
  const publicCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const publicPage = await publicCtx.newPage();

  await publicPage.goto("/");
  await expect(publicPage.getByText(/Brasa|Staff/i).first()).toBeVisible({
    timeout: 20_000,
  });
  await shot(publicPage, "01-home", false);

  await publicPage.goto("/login");
  await expect(publicPage.getByLabel("Username")).toBeVisible();
  await shot(publicPage, "02-login");

  // --- Admin ---
  await loginAs(publicPage, "admin", "1111");
  await publicPage.goto("/admin");
  await expect(publicPage.getByRole("heading").first()).toBeVisible({
    timeout: 15_000,
  });
  await shot(publicPage, "03-admin-dashboard");

  await publicPage.goto("/admin/waitlist");
  await expect(
    publicPage.getByRole("heading", { name: /Waitlist/i }),
  ).toBeVisible({ timeout: 15_000 });
  await shot(publicPage, "04-admin-waitlist");

  await publicPage.goto("/admin/menu");
  await expect(
    publicPage.getByText(/Menu|Categories|item/i).first(),
  ).toBeVisible({
    timeout: 15_000,
  });
  await shot(publicPage, "05-admin-menu");
  await publicCtx.close();

  // --- Guest QR flow ---
  const guestCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const guest = await guestCtx.newPage();
  await guest.goto("/menu/t-01");
  await expect(guest.getByText(/Table/i).first()).toBeVisible({
    timeout: 20_000,
  });
  await shot(guest, "06-guest-menu");

  const menuItem = guest
    .locator("li")
    .filter({ hasText: "Charred Octopus" })
    .first();
  await menuItem.getByRole("button", { name: "Add" }).click();
  const salad = guest
    .locator("li")
    .filter({ hasText: "Little Gem Salad" })
    .first();
  if (await salad.getByRole("button", { name: "Add" }).isVisible()) {
    await salad.getByRole("button", { name: "Add" }).click();
  }
  await guest.getByRole("button", { name: /Cart/i }).click();
  await expect(
    guest.getByRole("button", { name: /Call waiter with these items/i }),
  ).toBeVisible({ timeout: 10_000 });
  await shot(guest, "07-guest-cart");

  await guest
    .getByRole("button", { name: /Call waiter with these items/i })
    .click();
  await expect(
    guest.getByText(/Waiter called|Added to your waiter request/i),
  ).toBeVisible({ timeout: 10_000 });

  await guest.getByRole("button", { name: /My order/i }).click();
  await expect(guest.getByRole("dialog")).toBeVisible({ timeout: 10_000 });
  await shot(guest, "08-guest-my-order-waiting");
  await guest.keyboard.press("Escape");

  // --- Waiter: calls + POS ---
  const waiterCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const waiter = await waiterCtx.newPage();
  await loginAs(waiter, "maya", "2222");
  await waiter.goto("/waiter");
  await expect(waiter.getByText(/Floor|Tables|Kitchen/i).first()).toBeVisible({
    timeout: 15_000,
  });
  await shot(waiter, "09-waiter-floor");

  await expect
    .poll(
      async () => {
        const res = await waiter.request.get(
          "/backend/waiter/service-requests",
        );
        if (!res.ok()) return null;
        const body = (await res.json()) as {
          data?: {
            requests: { id: string; tableId: string; tableLabel: string }[];
          };
        };
        return (
          body.data?.requests?.find((r) => r.tableLabel === "1") ??
          body.data?.requests?.[0] ??
          null
        );
      },
      { timeout: 20_000 },
    )
    .not.toBeNull();

  const listRes = await waiter.request.get("/backend/waiter/service-requests");
  const listBody = (await listRes.json()) as {
    data?: {
      requests: { id: string; tableId: string; tableLabel: string }[];
    };
  };
  const match =
    listBody.data?.requests?.find((r) => r.tableLabel === "1") ??
    listBody.data?.requests?.[0];
  expect(match).toBeTruthy();

  await waiter.getByRole("button", { name: /Calls/i }).click();
  await expect(waiter.getByRole("dialog")).toBeVisible({ timeout: 10_000 });
  await shot(waiter, "10-waiter-calls-bell");
  await waiter.keyboard.press("Escape");

  await waiter.request.post(
    `/backend/waiter/service-requests/${match!.id}/acknowledge`,
  );
  await waiter.goto(`/waiter/tables/${match!.tableId}?requestId=${match!.id}`);
  await expect(waiter.getByRole("heading", { name: /Table/i })).toBeVisible({
    timeout: 15_000,
  });
  await shot(waiter, "11-waiter-pos-prefill");

  await waiter
    .getByRole("button", { name: /Send to kitchen|Update kitchen/i })
    .click();
  await expect(
    waiter.getByText(
      /Order submitted|Items added|Pending fire updated|cooking fire/i,
    ),
  ).toBeVisible({ timeout: 15_000 });
  await shot(waiter, "12-waiter-pos-after-send");

  // Guest status after kitchen send
  await guest.reload();
  await guest.getByRole("button", { name: /My order/i }).click();
  await expect(guest.getByRole("dialog")).toBeVisible({ timeout: 10_000 });
  await guest.waitForTimeout(1500);
  await shot(guest, "13-guest-my-order-kitchen");
  await guest.keyboard.press("Escape");
  await guestCtx.close();

  // --- Kitchen ---
  const kitchenCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const kitchen = await kitchenCtx.newPage();
  await loginAs(kitchen, "kenji", "4444");
  await kitchen.goto("/kitchen");
  await expect(
    kitchen.getByRole("heading", { name: "Pass", exact: true }),
  ).toBeVisible({
    timeout: 15_000,
  });
  await shot(kitchen, "14-kitchen-board-pending");

  const boardRes = await kitchen.request.get("/backend/kitchen/board");
  expect(boardRes.ok()).toBeTruthy();
  const board = (await boardRes.json()) as {
    data?: {
      pending: {
        fireId: string;
        tableLabel: string;
        items: { id: string }[];
      }[];
      inProgress: { fireId: string; items: { id: string; status: string }[] }[];
    };
  };
  const fire =
    board.data?.pending?.find((f) => f.tableLabel === match!.tableLabel) ??
    board.data?.pending?.[0];
  expect(fire).toBeTruthy();

  for (const line of fire!.items) {
    const start = await kitchen.request.post(
      `/backend/kitchen/items/${line.id}/start`,
      { data: {} },
    );
    expect(start.ok()).toBeTruthy();
  }
  await kitchen.reload();
  await expect(kitchen.getByText(/In progress|Cooking/i).first()).toBeVisible({
    timeout: 10_000,
  });
  await shot(kitchen, "15-kitchen-board-cooking");

  const cookingBoard = await kitchen.request.get("/backend/kitchen/board");
  const cookingData = (await cookingBoard.json()) as {
    data?: {
      inProgress: { fireId: string; items: { id: string; status: string }[] }[];
    };
  };
  const cookingFire =
    cookingData.data?.inProgress?.find((f) => f.fireId === fire!.fireId) ??
    cookingData.data?.inProgress?.[0];
  expect(cookingFire).toBeTruthy();
  for (const line of cookingFire!.items.filter(
    (i) => i.status === "IN_PROGRESS",
  )) {
    const ready = await kitchen.request.post(
      `/backend/kitchen/items/${line.id}/ready`,
      { data: {} },
    );
    expect(ready.ok()).toBeTruthy();
  }
  // any remaining PENDING in that fire
  const board2 = await kitchen.request.get("/backend/kitchen/board");
  const board2Data = (await board2.json()) as {
    data?: {
      inProgress: { fireId: string; items: { id: string; status: string }[] }[];
      pending: { fireId: string; items: { id: string; status: string }[] }[];
    };
  };
  const stillCooking = board2Data.data?.inProgress?.find(
    (f) => f.fireId === fire!.fireId,
  );
  if (stillCooking) {
    for (const line of stillCooking.items) {
      if (line.status === "PENDING") {
        await kitchen.request.post(`/backend/kitchen/items/${line.id}/start`, {
          data: {},
        });
      }
    }
    const board3 = await kitchen.request.get("/backend/kitchen/board");
    const board3Data = (await board3.json()) as {
      data?: {
        inProgress: {
          fireId: string;
          items: { id: string; status: string }[];
        }[];
      };
    };
    const f3 = board3Data.data?.inProgress?.find(
      (f) => f.fireId === fire!.fireId,
    );
    for (const line of f3?.items.filter((i) => i.status === "IN_PROGRESS") ??
      []) {
      await kitchen.request.post(`/backend/kitchen/items/${line.id}/ready`, {
        data: {},
      });
    }
  }

  await kitchen.reload();
  await expect(
    kitchen.getByRole("heading", { name: "Pass", exact: true }),
  ).toBeVisible({ timeout: 15_000 });
  await shot(kitchen, "16-kitchen-board-ready");
  await kitchenCtx.close();

  // --- Waiter Pass + checkout ---
  await waiter.goto("/waiter");
  await waiter.reload();
  await waiter.getByRole("button", { name: /Pass/i }).click();
  await expect(waiter.getByRole("dialog")).toBeVisible({ timeout: 10_000 });
  await waiter.waitForTimeout(800);
  await shot(waiter, "17-waiter-pass-bell");
  await waiter.keyboard.press("Escape");

  await waiter.goto(`/waiter/tables/${match!.tableId}/checkout`);
  await expect(
    waiter.getByRole("button", { name: /Generate bill/i }),
  ).toBeVisible({ timeout: 15_000 });
  await shot(waiter, "18-waiter-checkout");

  await waiter.getByRole("button", { name: "Generate bill" }).click();
  await expect(waiter.getByRole("button", { name: "Mark paid" })).toBeVisible({
    timeout: 10_000,
  });
  await shot(waiter, "19-waiter-bill-generated");

  await waiter.getByRole("button", { name: "Mark paid" }).click();
  await expect(waiter.getByText(/Payment recorded|table is free/i)).toBeVisible(
    {
      timeout: 10_000,
    },
  );
  await shot(waiter, "20-waiter-paid");
  await waiterCtx.close();

  // Index for portfolio README
  const index = `# Portfolio screenshots

Generated by \`apps/web/e2e/portfolio-screenshots.spec.ts\`.

| # | File | Flow |
|---|------|------|
| 01 | \`01-home.png\` | Landing / staff entrance |
| 02 | \`02-login.png\` | Staff PIN login |
| 03 | \`03-admin-dashboard.png\` | Admin home |
| 04 | \`04-admin-waitlist.png\` | Waitlist |
| 05 | \`05-admin-menu.png\` | Menu manager |
| 06 | \`06-guest-menu.png\` | Guest QR menu (mobile) |
| 07 | \`07-guest-cart.png\` | Guest cart → call waiter |
| 08 | \`08-guest-my-order-waiting.png\` | My order — waiting for waiter |
| 09 | \`09-waiter-floor.png\` | Waiter floor + kitchen queue |
| 10 | \`10-waiter-calls-bell.png\` | Calls bell with cart |
| 11 | \`11-waiter-pos-prefill.png\` | POS prefilled from guest |
| 12 | \`12-waiter-pos-after-send.png\` | After send to kitchen |
| 13 | \`13-guest-my-order-kitchen.png\` | Guest queue / ETA |
| 14 | \`14-kitchen-board-pending.png\` | Kitchen pending fires |
| 15 | \`15-kitchen-board-cooking.png\` | Kitchen in progress |
| 16 | \`16-kitchen-board-ready.png\` | Kitchen run food |
| 17 | \`17-waiter-pass-bell.png\` | Pass bell (fire card) |
| 18 | \`18-waiter-checkout.png\` | Checkout |
| 19 | \`19-waiter-bill-generated.png\` | Bill generated |
| 20 | \`20-waiter-paid.png\` | Payment recorded |

Demo logins: \`admin/1111\`, \`maya/2222\`, \`kenji/4444\`. Guest: \`/menu/t-01\`.
`;
  fs.writeFileSync(path.resolve(OUT, "../README.md"), index);
});
