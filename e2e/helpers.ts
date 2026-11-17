import fs from "node:fs";
import path from "node:path";
import { expect, type Page } from "@playwright/test";

export const OUTBOX = path.join(process.cwd(), ".outbox");

export type OutboxMessage = { to: string; subject: string; text: string; html: string; tag?: string; attachments?: { filename: string }[] };

export function outbox(filter: (m: OutboxMessage) => boolean = () => true): OutboxMessage[] {
  if (!fs.existsSync(OUTBOX)) return [];
  return fs
    .readdirSync(OUTBOX)
    .sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(OUTBOX, f), "utf8")) as OutboxMessage)
    .filter(filter);
}

export function uniqueEmail(prefix: string) {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;
}

/** The page never scrolls horizontally (RTL overflow regressions). */
export async function expectNoHorizontalScroll(page: Page) {
  const { sw, cw } = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
  }));
  expect(sw).toBeLessThanOrEqual(cw);
}

/** Picks the first time slot of the n-th available day; returns its value. */
export async function pickSlot(page: Page, dayIndex = 0, slotIndex = 0): Promise<string> {
  const days = page.locator('label:has(input[name="day"])');
  await days.nth(dayIndex).click();
  const slot = page.locator('input[type="radio"][name="slot"]').nth(slotIndex);
  await slot.check();
  return (await slot.getAttribute("value"))!;
}

export async function fillDetails(page: Page, name: string, email: string, topic = "") {
  await page.fill("#f-name", name);
  await page.fill("#f-email", email);
  if (topic) await page.fill("#f-topic", topic);
}

/** Books `slug` up to the checkout page; returns the booking id. */
export async function bookToCheckout(page: Page, slug: string, email: string, dayIndex = 0, slotIndex = 0) {
  await page.goto(`/book/${slug}`);
  await pickSlot(page, dayIndex, slotIndex);
  await fillDetails(page, "عميل تجريبي", email);
  await page.getByRole("button", { name: "متابعة إلى الدفع" }).click();
  await page.waitForURL(/\/checkout\/[^/?]+$/);
  return page.url().split("/checkout/")[1];
}
