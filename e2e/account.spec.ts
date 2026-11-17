import { expect, test } from "@playwright/test";
import { bookToCheckout, outbox, uniqueEmail } from "./helpers";

test("magic-link sign-in shows the client's bookings", async ({ page }) => {
  const email = uniqueEmail("account");
  await bookToCheckout(page, "fahad", email, 1, 0);
  await page.getByRole("button", { name: /^ادفع/ }).click();
  await page.getByRole("button", { name: "إتمام الدفع بنجاح" }).click();
  await expect(page).toHaveURL(/\/bookings\//);

  await page.goto("/account/bookings");
  await expect(page).toHaveURL(/\/login\?next=/);
  await page.getByRole("button", { name: "أرسل رابط الدخول" }).click();
  await expect(page.locator("#login-email-error")).toHaveText("أدخل بريدك الإلكتروني");

  await page.fill("#login-email", email.toUpperCase());
  await page.getByRole("button", { name: "أرسل رابط الدخول" }).click();
  await expect(page).toHaveURL(/\/login\/verify$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("تحقق من بريدك الإلكتروني");

  const mail = outbox((m) => m.to === email && m.tag === "magic-link").pop();
  expect(mail).toBeTruthy();
  const link = mail!.text.match(/https?:\/\/\S+/)![0];
  await page.goto(link);

  await expect(page).toHaveURL(/\/account\/bookings$/);
  await expect(page.getByRole("heading", { name: "المواعيد القادمة" })).toBeVisible();
  await expect(page.getByText("فهد الشمري")).toBeVisible();
  await expect(page.getByRole("link", { name: "حجوزاتي" })).toBeVisible();

  await page.getByRole("button", { name: "تسجيل الخروج" }).click();
  await expect(page.getByRole("link", { name: "تسجيل الدخول" })).toBeVisible();
});
