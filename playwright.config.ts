import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against a production build on port 3100 with an
 * isolated database (reset + seeded in global setup) and the mock payment
 * provider. Requires a local PostgreSQL; see README.
 */
const PORT = 3100;
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL || "postgresql://khatwah:khatwah@localhost:5432/khatwah_test";

export const testEnv = {
  DATABASE_URL: TEST_DATABASE_URL,
  APP_URL: `http://localhost:${PORT}`,
  AUTH_URL: `http://localhost:${PORT}`,
  AUTH_SECRET: "e2e-secret-e2e-secret-e2e-secret-123",
  AUTH_TRUST_HOST: "true",
  PAYMENT_PROVIDER: "mock",
  ALLOW_MOCK_WEBHOOK: "1",
  EMAIL_TRANSPORT: "console",
  GOOGLE_AUTH_MODE: "none",
  CRON_SECRET: "e2e-cron",
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "ar-SA",
    timezoneId: "Asia/Riyadh",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npx next build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 300_000,
    reuseExistingServer: false,
    env: testEnv,
  },
});
