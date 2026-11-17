import { expect, test } from "@playwright/test";
import { bookToCheckout, outbox, uniqueEmail } from "./helpers";

test("duplicate payment webhooks are applied once", async ({ page, request }) => {
  const email = uniqueEmail("webhook");
  const bookingId = await bookToCheckout(page, "noura", email, 1, 0);

  await page.getByRole("button", { name: /^ادفع/ }).click();
  await expect(page).toHaveURL(/\/mock-pay\//);
  const ref = page.url().split("/mock-pay/")[1];

  const send = (eventId: string) =>
    request.post("/api/webhooks/mock", { data: { eventId, paymentRef: ref, status: "PAID" } }).then((r) => r.json());

  const first = `evt-${ref}-1`;
  expect(await send(first)).toMatchObject({ ok: true, result: "confirmed" });
  expect(await send(first)).toMatchObject({ ok: true, duplicate: true });
  expect(await send(`evt-${ref}-2`)).toMatchObject({ ok: true, result: "already_processed" });

  await page.goto(`/checkout/${bookingId}`);
  await expect(page).toHaveURL(new RegExp(`/bookings/${bookingId}$`));
  expect(outbox((m) => m.to === email && m.tag === "booking-confirmed")).toHaveLength(1);
});

test("StreamPay webhook ignores events for unknown payments", async ({ request }) => {
  // No STREAMPAY_WEBHOOK_SECRET in the e2e env → unsigned events are accepted
  // but ignored because no StreamPay payment matches.
  const res = await request.post("/api/webhooks/streampay", {
    data: {
      event_type: "PAYMENT_SUCCEEDED",
      timestamp: new Date().toISOString(),
      data: { custom_metadata: { khatwah_payment_id: `nope-${Date.now()}-${Math.random()}` } },
    },
  });
  expect(res.status()).toBe(200);
  expect(await res.json()).toMatchObject({ ignored: "no matching payment" });
});

test("cron endpoint requires the secret", async ({ request }) => {
  expect((await request.get("/api/cron/maintenance")).status()).toBe(401);
  const ok = await request.get("/api/cron/maintenance", { headers: { Authorization: "Bearer e2e-cron" } });
  expect(ok.status()).toBe(200);
  expect(await ok.json()).toMatchObject({ ok: true });
});
