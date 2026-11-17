import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { testEnv } from "../playwright.config";

/**
 * Prepares the isolated e2e database non-destructively: applies pending
 * migrations and (re)seeds consultants. Tests use unique emails and pick
 * whatever slots are free, so they do not need an empty database.
 *
 * To wipe the test database first, run with E2E_RESET_DB=1
 * (uses `prisma migrate reset`; never point TEST_DATABASE_URL at real data).
 */
export default function globalSetup() {
  const env = { ...process.env, DATABASE_URL: testEnv.DATABASE_URL };
  const run = (cmd: string) => execSync(cmd, { stdio: "inherit", env });

  if (process.env.E2E_RESET_DB === "1") {
    run("npx prisma migrate reset --force --skip-generate");
  } else {
    run("npx prisma migrate deploy");
    run("npx prisma db seed");
  }
  fs.rmSync(path.join(process.cwd(), ".outbox"), { recursive: true, force: true });
}
