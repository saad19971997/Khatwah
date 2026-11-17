import { expect, test } from "@playwright/test";
import { bookToCheckout, expectNoHorizontalScroll, fillDetails, outbox, pickSlot, uniqueEmail } from "./helpers";

test.describe("booking journey", () => {
  test("home → consultant → details (with errors) → failed payment → paid → confirmed", async ({ page }) => {
    const email = uniqueEmail("sara");

    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("احجز جلسة مع مستشار يساعدك في تطوير مشروعك");
    await expectNoHorizontalScroll(page);

    await page.getByRole("link", { name: "استعرض المستشارين" }).click();
    await expect(page).toHaveURL(/\/consultants$/);
    await expect(page.locator('nav[aria-label="مراحل الحجز"] [aria-current="step"]')).toContainText("اختيار المستشار");
    await expect(page.getByText("١٥٠ ريال سعودي")).toBeVisible();
    await expectNoHorizontalScroll(page);

    await page.getByRole("link", { name: "اختر المستشار نورة العتيبي" }).click();
    await expect(page).toHaveURL(/\/book\/noura$/);
    await expectNoHorizontalScroll(page);

    // Submit with a missing slot/name and an invalid email (prototype's error board).
    await page.fill("#f-email", "sara@mail");
    await page.getByRole("button", { name: "متابعة إلى الدفع" }).click();
    await expect(page.locator("main").getByRole("alert")).toHaveText("أكمل الحقول المحددة لإرسال طلب الحجز.");
    await expect(page.locator("#slot-error")).toHaveText("اختر موعدًا للمتابعة");
    await expect(page.locator("#name-error")).toHaveText("أدخل اسمك للمتابعة");
    await expect(page.locator("#email-error")).toHaveText("أدخل بريدًا إلكترونيًا صحيحًا");
    await expect(page.locator("#f-email")).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator('input[name="slot"]').first()).toBeFocused();

    // Errors clear live as fields are fixed.
    const chosenSlot = await pickSlot(page, 0, 0);
    await expect(page.locator("#slot-error")).toHaveCount(0);
    await fillDetails(page, "سارة القحطاني", email, "أريد معرفة أفضل قناة للوصول إلى أول ١٠٠ عميل");
    await expect(page.locator("main").getByRole("alert")).toHaveCount(0);

    await page.getByRole("button", { name: "متابعة إلى الدفع" }).click();
    await expect(page).toHaveURL(/\/checkout\//);
    await expect(page.getByRole("heading", { name: "ملخص الطلب" })).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();
    await expectNoHorizontalScroll(page);

    // First attempt fails.
    await page.getByRole("button", { name: "ادفع ١٥٠ ريالًا" }).click();
    await expect(page).toHaveURL(/\/mock-pay\//);
    await page.getByRole("button", { name: "محاكاة فشل الدفع" }).click();
    await expect(page).toHaveURL(/status=failed/);
    await expect(page.locator("main").getByRole("alert")).toContainText("تعذّر إتمام الدفع");

    // Retry succeeds.
    await page.getByRole("button", { name: "ادفع ١٥٠ ريالًا" }).click();
    await page.getByRole("button", { name: "إتمام الدفع بنجاح" }).click();
    await expect(page).toHaveURL(/\/bookings\//);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("تم الدفع وتأكيد الحجز");
    await expect(page.getByText("مدفوع", { exact: true })).toBeVisible();
    await expect(page.getByText("نورة العتيبي")).toBeVisible();
    await expect(page.getByText(/^KH-\d{6}$/)).toBeVisible();
    await expectNoHorizontalScroll(page);

    // Calendar file.
    const icsUrl = await page.getByRole("link", { name: "أضف إلى التقويم" }).getAttribute("href");
    const ics = await page.request.get(icsUrl!);
    expect(ics.status()).toBe(200);
    expect(await ics.text()).toContain("BEGIN:VEVENT");

    // Confirmation emails: one to the client, one to the consultant.
    const toClient = outbox((m) => m.to === email && m.tag === "booking-confirmed");
    expect(toClient).toHaveLength(1);
    expect(toClient[0].attachments?.[0].filename).toMatch(/\.ics$/);
    expect(outbox((m) => m.to === "noura@example.com" && m.text.includes(email))).toHaveLength(1);

    // The booked slot is no longer offered.
    await page.goto("/book/noura");
    await expect(page.locator('label:has(input[name="day"])').first()).toBeVisible();
    await expect(page.locator(`input[name="slot"][value="${chosenSlot}"]`)).toHaveCount(0);
    const html = await (await page.request.get("/book/noura")).text();
    expect(html).not.toContain(chosenSlot);
  });

  test("two clients racing for the same slot: only one gets it", async ({ browser }) => {
    const a = await (await browser.newContext()).newPage();
    const b = await (await browser.newContext()).newPage();
    await a.goto("/book/fahad");
    await b.goto("/book/fahad");
    const slotA = await pickSlot(a, 0, 0);
    const slotB = await pickSlot(b, 0, 0);
    expect(slotA).toBe(slotB);
    await fillDetails(a, "العميل أ", uniqueEmail("a"));
    await fillDetails(b, "العميل ب", uniqueEmail("b"));

    await a.getByRole("button", { name: "متابعة إلى الدفع" }).click();
    await expect(a).toHaveURL(/\/checkout\//);

    await b.getByRole("button", { name: "متابعة إلى الدفع" }).click();
    await expect(b.locator("#slot-error")).toHaveText("حُجز هذا الموعد للتو. اختر موعدًا آخر.");
    await expect(b).toHaveURL(/\/book\/fahad$/);
  });

  test("going back from payment releases the held slot", async ({ page }) => {
    await bookToCheckout(page, "reem", uniqueEmail("back"));
    await page.getByRole("button", { name: "العودة إلى تفاصيل الحجز" }).click();
    await expect(page).toHaveURL(/\/book\/reem$/);
    // The same slot can be booked again immediately.
    await pickSlot(page, 0, 0);
    await fillDetails(page, "عميل تجريبي", uniqueEmail("again"));
    await page.getByRole("button", { name: "متابعة إلى الدفع" }).click();
    await expect(page).toHaveURL(/\/checkout\//);
  });
});
