import { defineConfig, devices } from "@playwright/test";

const apiDatabaseUrl =
  process.env.POSTGRES_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "postgresql://brasa:brasa@localhost:5433/brasa";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  timeout: 120_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    ...devices["Desktop Chrome"],
  },
  webServer: [
    {
      command: "pnpm --filter @repo/api dev",
      cwd: "../..",
      url: "http://localhost:5002/health/ping",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...process.env,
        JWT_SECRET:
          process.env.JWT_SECRET ??
          "playwright-test-jwt-secret-min-32-chars",
        POSTGRES_DATABASE_URL: apiDatabaseUrl,
        CORS_ORIGINS: "http://localhost:3000",
      },
    },
    {
      command: process.env.CI ? "pnpm start" : "pnpm dev",
      url: "http://localhost:3000/login",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...process.env,
        NEXT_PUBLIC_API_BASE_URL: "http://localhost:5002",
      },
    },
  ],
});
