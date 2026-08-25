import path from "node:path";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { test, expect } from "@playwright/test";
import { loginAs, logout } from "./helpers/login";

/**
 * Portfolio walkthrough video — run with:
 *   pnpm exec playwright test e2e/portfolio-video.spec.ts
 *
 * Writes docs/portfolio/brasa-walkthrough.webm (+ .mp4 if ffmpeg is available).
 */
const OUT_DIR = path.resolve(process.cwd(), "../../docs/portfolio");
const VIDEO_DIR = path.join(OUT_DIR, "video-raw");
const VIEWPORT = { width: 1440, height: 900 };

async function beat(page: import("@playwright/test").Page, ms = 700) {
  await page.waitForTimeout(ms);
}

/** Guest routes hide staff chrome — land on a staff page before logout. */
async function staffLogout(
  page: import("@playwright/test").Page,
  via: "/waiter" | "/kitchen" | "/admin" = "/waiter",
) {
  await page.goto(via);
  await logout(page);
}

function findFfmpeg(): string | null {
  const candidates = [
    process.env.FFMPEG_PATH,
    "/tmp/ffmpeg-static/ffmpeg-*-amd64-static/ffmpeg",
    "ffmpeg",
  ].filter(Boolean) as string[];

  for (const c of candidates) {
    if (c.includes("*")) {
      const globbed = fs
        .readdirSync("/tmp/ffmpeg-static", { withFileTypes: true })
        .filter((d) => d.isDirectory() && d.name.startsWith("ffmpeg-"))
        .map((d) => path.join("/tmp/ffmpeg-static", d.name, "ffmpeg"));
      for (const g of globbed) {
        if (fs.existsSync(g)) return g;
      }
      continue;
    }
    try {
      if (c === "ffmpeg") {
        execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
        return "ffmpeg";
      }
      if (fs.existsSync(c)) return c;
    } catch {
      /* try next */
    }
  }
  return null;
}

test.describe.configure({ mode: "serial" });

test("portfolio video — full service walkthrough", async ({ browser }) => {
  test.setTimeout(300_000);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.rmSync(VIDEO_DIR, { recursive: true, force: true });
  fs.mkdirSync(VIDEO_DIR, { recursive: true });

  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: { dir: VIDEO_DIR, size: VIEWPORT },
  });
  const page = await ctx.newPage();

  // --- Landing + admin ---
  await page.goto("/");
  await expect(page.getByText(/Brasa|Staff/i).first()).toBeVisible({
    timeout: 20_000,
  });
  await beat(page, 1100);

  await page.goto("/login");
  await expect(page.getByLabel("Username")).toBeVisible();
  await beat(page, 600);
  await loginAs(page, "admin", "1111");

  await page.goto("/admin");
  await expect(page.getByRole("heading").first()).toBeVisible({
    timeout: 15_000,
  });
  await beat(page, 1200);

  await page.goto("/admin/waitlist");
  await expect(page.getByRole("heading", { name: /Waitlist/i })).toBeVisible({
    timeout: 15_000,
  });
  await beat(page, 1100);

  await page.goto("/admin/menu");
  await expect(page.getByText(/Menu|Categories|item/i).first()).toBeVisible({
    timeout: 15_000,
  });
  await beat(page, 1100);
  await staffLogout(page, "/admin");

  // --- Guest QR: cart → call waiter ---
  await page.goto("/menu/t-01");
  await expect(page.getByText(/Table/i).first()).toBeVisible({
    timeout: 20_000,
  });
  await beat(page, 1200);

  const octopus = page
    .locator("li")
    .filter({ hasText: "Charred Octopus" })
    .first();
  await octopus.scrollIntoViewIfNeeded();
  await beat(page, 500);
  await octopus.getByRole("button", { name: "Add" }).click();
  await beat(page, 600);

  const salad = page
    .locator("li")
    .filter({ hasText: "Little Gem Salad" })
    .first();
  if (await salad.getByRole("button", { name: "Add" }).isVisible()) {
    await salad.scrollIntoViewIfNeeded();
    await salad.getByRole("button", { name: "Add" }).click();
    await beat(page, 600);
  }

  await page.getByRole("button", { name: /Cart/i }).click();
  await expect(
    page.getByRole("button", { name: /Call waiter with these items/i }),
  ).toBeVisible({ timeout: 10_000 });
  await beat(page, 1200);

  await page
    .getByRole("button", { name: /Call waiter with these items/i })
    .click();
  await expect(
    page.getByText(/Waiter called|Added to your waiter request/i),
  ).toBeVisible({ timeout: 10_000 });
  await beat(page, 800);

  await page.getByRole("button", { name: /My order/i }).click();
  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 10_000 });
  await beat(page, 1600);
  await page.keyboard.press("Escape");
  await beat(page, 400);

  // --- Waiter: calls + POS send ---
  await loginAs(page, "maya", "2222");
  await page.goto("/waiter");
  await expect(page.getByText(/Floor|Tables|Kitchen/i).first()).toBeVisible({
    timeout: 15_000,
  });
  await beat(page, 1400);

  await expect
    .poll(
      async () => {
        const res = await page.request.get("/backend/waiter/service-requests");
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

  const listRes = await page.request.get("/backend/waiter/service-requests");
  const listBody = (await listRes.json()) as {
    data?: {
      requests: { id: string; tableId: string; tableLabel: string }[];
    };
  };
  const match =
    listBody.data?.requests?.find((r) => r.tableLabel === "1") ??
    listBody.data?.requests?.[0];
  expect(match).toBeTruthy();

  await page.getByRole("button", { name: /Calls/i }).click();
  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 10_000 });
  await beat(page, 1600);
  await page.keyboard.press("Escape");

  await page.request.post(
    `/backend/waiter/service-requests/${match!.id}/acknowledge`,
  );
  await page.goto(`/waiter/tables/${match!.tableId}?requestId=${match!.id}`);
  await expect(page.getByRole("heading", { name: /Table/i })).toBeVisible({
    timeout: 15_000,
  });
  await beat(page, 1600);

  await page
    .getByRole("button", { name: /Send to kitchen|Update kitchen/i })
    .click();
  await expect(
    page.getByText(
      /Order submitted|Items added|Pending fire updated|cooking fire/i,
    ),
  ).toBeVisible({ timeout: 15_000 });
  await beat(page, 1400);

  // Guest My order with queue/ETA
  await page.goto("/menu/t-01");
  await page.getByRole("button", { name: /My order/i }).click();
  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 10_000 });
  await beat(page, 1600);
  await page.keyboard.press("Escape");

  await staffLogout(page, "/waiter");

  // --- Kitchen: start → ready (UI) ---
  await loginAs(page, "kenji", "4444");
  await page.goto("/kitchen");
  await expect(
    page.getByRole("heading", { name: "Pass", exact: true }),
  ).toBeVisible({ timeout: 15_000 });
  await beat(page, 1200);

  const boardRes = await page.request.get("/backend/kitchen/board");
  expect(boardRes.ok()).toBeTruthy();
  const board = (await boardRes.json()) as {
    data?: {
      pending: {
        fireId: string;
        tableLabel: string;
        items: { id: string }[];
      }[];
    };
  };
  const fire =
    board.data?.pending?.find((f) => f.tableLabel === match!.tableLabel) ??
    board.data?.pending?.[0];
  expect(fire).toBeTruthy();

  // Prefer clicking Start / Mark ready so the board animates on camera
  const startButtons = page.getByRole("button", { name: "Start" });
  const startCount = await startButtons.count();
  for (let i = 0; i < Math.min(startCount, fire!.items.length); i++) {
    await startButtons.first().click();
    await beat(page, 700);
  }
  await beat(page, 1200);

  const readyButtons = page.getByRole("button", { name: "Mark ready" });
  let readyCount = await readyButtons.count();
  let guard = 0;
  while (readyCount > 0 && guard < 12) {
    await readyButtons.first().click();
    await beat(page, 700);
    readyCount = await readyButtons.count();
    guard += 1;
  }

  // Clear any leftover PENDING in this fire via API if UI missed them
  const board2 = await page.request.get("/backend/kitchen/board");
  const board2Data = (await board2.json()) as {
    data?: {
      inProgress: { fireId: string; items: { id: string; status: string }[] }[];
      pending: { fireId: string; items: { id: string; status: string }[] }[];
    };
  };
  for (const col of [
    ...(board2Data.data?.inProgress ?? []),
    ...(board2Data.data?.pending ?? []),
  ]) {
    if (col.fireId !== fire!.fireId) continue;
    for (const line of col.items) {
      if (line.status === "PENDING") {
        await page.request.post(`/backend/kitchen/items/${line.id}/start`, {
          data: {},
        });
      }
    }
  }
  const board3 = await page.request.get("/backend/kitchen/board");
  const board3Data = (await board3.json()) as {
    data?: {
      inProgress: { fireId: string; items: { id: string; status: string }[] }[];
    };
  };
  const f3 = board3Data.data?.inProgress?.find(
    (f) => f.fireId === fire!.fireId,
  );
  for (const line of f3?.items.filter((i) => i.status === "IN_PROGRESS") ??
    []) {
    await page.request.post(`/backend/kitchen/items/${line.id}/ready`, {
      data: {},
    });
  }

  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Pass", exact: true }),
  ).toBeVisible({ timeout: 15_000 });
  await beat(page, 1200);
  await staffLogout(page, "/kitchen");

  // --- Waiter Pass + checkout ---
  await loginAs(page, "maya", "2222");
  await page.goto("/waiter");
  await beat(page, 700);
  await page.getByRole("button", { name: /Pass/i }).click();
  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 10_000 });
  await beat(page, 1200);

  const served = page.getByRole("button", { name: /^Served$/i });
  if (
    await served
      .first()
      .isVisible()
      .catch(() => false)
  ) {
    await served.first().click();
    await beat(page, 1000);
  } else {
    await page.request.post(`/backend/waiter/fires/${fire!.fireId}/served`);
    await page.keyboard.press("Escape");
  }

  await page.goto(`/waiter/tables/${match!.tableId}/checkout`);
  await expect(
    page.getByRole("button", { name: /Generate bill/i }),
  ).toBeVisible({ timeout: 15_000 });
  await beat(page, 1400);

  await page.getByRole("button", { name: "Generate bill" }).click();
  await expect(page.getByRole("button", { name: "Mark paid" })).toBeVisible({
    timeout: 10_000,
  });
  await beat(page, 1400);

  await page.getByRole("button", { name: "Mark paid" }).click();
  await expect(page.getByText(/Payment recorded|table is free/i)).toBeVisible({
    timeout: 10_000,
  });
  await beat(page, 2000);

  await ctx.close();

  // Playwright writes one webm per page; pick the newest / only file
  const raw = fs
    .readdirSync(VIDEO_DIR)
    .filter((f) => f.endsWith(".webm"))
    .map((f) => ({
      f,
      m: fs.statSync(path.join(VIDEO_DIR, f)).mtimeMs,
    }))
    .sort((a, b) => b.m - a.m);
  expect(raw.length).toBeGreaterThan(0);

  const destWebm = path.join(OUT_DIR, "brasa-walkthrough.webm");
  fs.copyFileSync(path.join(VIDEO_DIR, raw[0]!.f), destWebm);

  const ffmpeg = findFfmpeg();
  let mp4Note = "";
  if (ffmpeg) {
    const destMp4 = path.join(OUT_DIR, "brasa-walkthrough.mp4");
    execFileSync(
      ffmpeg,
      [
        "-y",
        "-i",
        destWebm,
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        destMp4,
      ],
      { stdio: "inherit" },
    );
    mp4Note = `\nAlso: \`brasa-walkthrough.mp4\` (H.264).`;
  }

  fs.rmSync(VIDEO_DIR, { recursive: true, force: true });

  const readmePath = path.join(OUT_DIR, "README.md");
  let readme = fs.existsSync(readmePath)
    ? fs.readFileSync(readmePath, "utf8")
    : "# Portfolio\n";
  if (!readme.includes("brasa-walkthrough")) {
    readme += `

## Walkthrough video

Generated by \`apps/web/e2e/portfolio-video.spec.ts\`.

- \`brasa-walkthrough.webm\` — full guest → waiter → kitchen → Pass → pay flow.${mp4Note}

\`\`\`bash
cd apps/web && pnpm exec playwright test e2e/portfolio-video.spec.ts
\`\`\`
`;
    fs.writeFileSync(readmePath, readme);
  }
});
