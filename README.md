# خطوة · Khatwah

An Arabic, right-to-left platform where entrepreneurs book **paid online consultation sessions**. Clients choose a consultant, pick a time (Riyadh time), pay with **StreamPay**, and get a **Google Meet** link by email right away.

Built with Next.js 15 (App Router), TypeScript, Tailwind CSS v4, PostgreSQL + Prisma, Auth.js (magic link) and next-intl.

## Features

| Area | What it does |
|---|---|
| Booking flow | Home → choose consultant → choose time + details → pay → confirmation. The four-step stepper, copy, colors and validation states follow the design prototype. |
| Arabic / RTL | `<html lang="ar" dir="rtl">`, IBM Plex Sans Arabic, Arabic-Indic digits, Gregorian dates in Asia/Riyadh, correct number agreement ("ادفع ١٥٠ ريالًا" / "ادفع ٢٠٠ ريال"). All UI text is in `messages/ar.json`. |
| Scheduling | Weekly availability rules per consultant, blocked dates, minimum notice (12h), 14-day booking window. Slots are held for 15 minutes during payment. A partial unique index in PostgreSQL makes double booking impossible. |
| Payments | StreamPay hosted checkout through the official `@streamsdk/typescript` SDK. Supports mada, Visa/Mastercard and Apple Pay, depending on what is enabled on the merchant account. Card data never touches this server. Webhooks are signature-checked, deduplicated, and **re-verified against the StreamPay API** before a booking is confirmed. |
| Confirmation | Paying confirms the booking immediately. A Google Calendar event with a Meet link is created and both the client and the consultant are invited. RTL confirmation emails include an `.ics` attachment. |
| Client accounts | Passwordless email sign-in (magic link) and a "حجوزاتي" page with upcoming and past sessions. Guests are matched to their account by email. |
| Reliability | A cron job reconciles payments whose webhook was missed, expires stale holds, and retries failed Meet links or emails. |

## Getting started

Requirements: Node 20+ and PostgreSQL 14+.

```bash
npm install
```

```bash
cp .env.example .env    # then edit as needed
```

```bash
npx prisma migrate dev  # creates tables (+ the double-booking index)
```

```bash
npm run db:seed         # loads consultants from config/consultants.ts
```

```bash
npm run dev
```

Open http://localhost:3000.

By default `PAYMENT_PROVIDER=mock` and `EMAIL_TRANSPORT=console`:
- Clicking **ادفع** opens a local fake checkout page (`/mock-pay/…`) where you choose success or failure.
- Emails, including magic links, are written as JSON files to `.outbox/`.

## Managing consultants

There is no admin UI in v1. Consultants, prices (in halalas) and weekly availability live in [`config/consultants.ts`](config/consultants.ts). Edit the file, then run:

```bash
npm run db:seed
```

The seed updates consultants by `slug`. A consultant removed from the file is deactivated (hidden from the site) rather than deleted, so their past bookings are kept.

## Going live

### 1. StreamPay
1. Create API credentials in the StreamPay dashboard.
2. Set the payment variables:
   ```
   PAYMENT_PROVIDER=streampay
   STREAMPAY_API_KEY=...
   STREAMPAY_API_SECRET=...      # the app sends base64("key:secret") in x-api-key
   ```
3. Add a webhook pointing to `{APP_URL}/api/webhooks/streampay` and set its signing secret as `STREAMPAY_WEBHOOK_SECRET`.
   - The signature header `x-webhook-signature: t=…,v1=…` is checked as HMAC-SHA256, the same scheme as `@streamsdk/express`.
4. Run one sandbox payment end to end before launch.

Each checkout attempt creates a single-use StreamPay payment link with these settings:
- `max_number_of_payments: 1`
- `valid_until` set to the end of the slot hold
- `custom_metadata` carrying our payment id

The product shown on StreamPay's page ("جلسة ٤٥ دقيقة — فهد الشمري") is reused across bookings.

> If a payment succeeds after its slot was given to someone else (only possible if the hold expired mid-payment), the booking is **not** confirmed and an error is logged. Refund that payment from the StreamPay dashboard.

### 2. Google Meet
Meet links are created on one platform calendar, which invites the client and the consultant. Choose one of two setups:

- **OAuth (any Google account):** create an OAuth client with the Calendar API enabled and obtain a refresh token for the `calendar.events` scope. Then set `GOOGLE_AUTH_MODE=oauth`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `GOOGLE_REFRESH_TOKEN`.
- **Service account (Google Workspace):** enable domain-wide delegation for the `calendar.events` scope. Then set `GOOGLE_AUTH_MODE=service_account`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_KEY` and `GOOGLE_IMPERSONATE_USER`.

`GOOGLE_CALENDAR_ID` selects the calendar (default `primary`). With `GOOGLE_AUTH_MODE=none`, bookings still confirm, but without a Meet link.

### 3. Email
Use one of the transports:
- `EMAIL_TRANSPORT=resend` with `RESEND_API_KEY`
- `EMAIL_TRANSPORT=smtp` with `SMTP_URL`

In both cases set `EMAIL_FROM` to an address on a verified domain.

### 4. Deploy (e.g. Vercel + Neon/Supabase)
- Set every variable from `.env.example`, including `APP_URL`, `AUTH_SECRET` and `CRON_SECRET`.
- Build: `npm run build`. Apply migrations with `npm run db:deploy`, then `npm run db:seed`.
- `vercel.json` schedules `/api/cron/maintenance` every 10 minutes. Vercel Hobby only allows daily cron jobs; elsewhere, call the URL with `Authorization: Bearer $CRON_SECRET`.

## Tests

| Command | Runs |
|---|---|
| `npm test` | Vitest unit tests (41): slot generation and time zones, Arabic formatting, validation, StreamPay signatures and payload parsing, `.ics` output, Google Meet request |
| `npm run test:e2e` | Playwright tests on desktop (1280px) and mobile (Pixel 7) against a production build on port 3100 |
| `npm run lint && npm run typecheck` | ESLint and TypeScript |

The e2e tests cover:
- the full journey, including validation errors and focus, a failed payment followed by a successful retry, the confirmation page, the `.ics` file and the emails
- a race where two clients pick the same slot
- releasing a held slot by going back from the payment page
- webhook idempotency
- magic-link sign-in and "my bookings"
- no horizontal scrolling at mobile width

The e2e tests use a separate database, `TEST_DATABASE_URL` (default `postgresql://khatwah:khatwah@localhost:5432/khatwah_test`). Global setup applies migrations and re-seeds without deleting data. To wipe that test database first, run `E2E_RESET_DB=1 npm run test:e2e`.

## Project layout

```
config/consultants.ts        consultants, prices, availability (the v1 "admin")
messages/ar.json             all UI copy (add en.json later for English)
prisma/                      schema, migrations (incl. double-booking index), seed
src/app/                     routes: / · /consultants · /book/[slug] · /checkout/[id] · /bookings/[id]
                             /login · /account/bookings · /mock-pay/[ref] (dev) · /api/{auth,webhooks,cron,bookings}
src/components/              header, footer, stepper, icons, UI primitives
src/lib/availability.ts      pure slot generation (Asia/Riyadh)
src/lib/bookings.ts          slot hold with race protection
src/lib/payments/            provider interface, StreamPay + mock providers, confirmation pipeline
src/lib/google/calendar.ts   Meet event creation
src/lib/email/               transports + RTL email templates
e2e/                         Playwright specs
```

## Not in v1
- Self-service cancellation, rescheduling and refunds. The confirmation page and email ask clients to reply to the email; refunds are issued from the StreamPay dashboard.
- Admin dashboard and consultant portal.
- English UI. The text is already separated into `messages/ar.json`, so adding English means adding `en.json` and switching `dir` per locale.
