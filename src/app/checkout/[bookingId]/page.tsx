import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getBookingForDisplay } from "@/lib/bookings";
import { PAYMENT_HOLD_MINUTES } from "@/lib/config";
import { formatDate, formatDuration, formatNumber, formatPrice, formatTime, formatWeekday, payLabel } from "@/lib/format";
import { isMockPayments } from "@/lib/payments/service";
import { Stepper } from "@/components/Stepper";
import { ArrowBack, Lock } from "@/components/Icons";
import { Avatar, ButtonLink, Container, ErrorAlert, btnLink, card, pageTitle } from "@/components/ui";
import { backToDetails, payNow } from "./actions";
import { PayButton } from "./PayButton";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("checkout");
  return { title: t("pageTitle"), robots: { index: false } };
}

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ bookingId: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const [{ bookingId }, { status }] = await Promise.all([params, searchParams]);
  const booking = await getBookingForDisplay(bookingId);
  if (!booking) notFound();
  if (booking.status === "CONFIRMED") redirect(`/bookings/${booking.id}`);

  const t = await getTranslations("checkout");
  const c = booking.consultant;
  const expired =
    booking.status !== "PENDING_PAYMENT" || !booking.holdExpiresAt || booking.holdExpiresAt <= new Date();

  if (expired) {
    return (
      <>
        <Stepper current={2} />
        <Container width="narrow" className="pt-7 pb-[72px]">
          <section className={`${card} flex flex-col items-center gap-4 px-6 py-8 text-center`}>
            <h1 className="m-0 text-2xl font-bold">{t("expiredTitle")}</h1>
            <p className="m-0 text-ink-body">{t("expiredText")}</p>
            <ButtonLink href={`/book/${c.slug}`}>{t("expiredCta")}</ButtonLink>
          </section>
        </Container>
      </>
    );
  }

  const methods = [
    { label: t("methodMada"), desc: t("methodMadaDesc") },
    { label: t("methodCard"), desc: t("methodCardDesc") },
    { label: t("methodApple"), desc: t("methodAppleDesc") },
  ];

  return (
    <>
      <Stepper current={2} />
      <Container width="pay" className="flex flex-col gap-6 pt-7 pb-[72px]">
        <section aria-labelledby="pay-title" className="flex flex-col gap-6">
          <h1 id="pay-title" className={pageTitle}>
            {t("title")}
          </h1>
          <div className="flex flex-wrap items-start gap-6">
            <aside aria-labelledby="sum-title" className={`${card} flex min-w-0 flex-[1_1_300px] flex-col gap-4 p-6`}>
              <h2 id="sum-title" className="m-0 text-lg font-bold">
                {t("summaryTitle")}
              </h2>
              <div className="flex items-center gap-3">
                <Avatar initials={c.initials} bg={c.avatarBg} fg={c.avatarFg} size={48} />
                <div className="flex min-w-0 flex-col">
                  <span className="text-[17px] font-bold">{c.name}</span>
                  <span className="text-[15px] font-semibold text-primary">{c.role}</span>
                </div>
              </div>
              <dl className="m-0 flex flex-col gap-2.5 text-[15px]">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">{t("date")}</dt>
                  <dd className="m-0 font-semibold">
                    {formatWeekday(booking.startsAt)} {formatDate(booking.startsAt)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">{t("time")}</dt>
                  <dd className="m-0 font-semibold">
                    {formatTime(booking.startsAt)} <span className="font-normal text-muted">{t("riyadhTime")}</span>
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">{t("duration")}</dt>
                  <dd className="m-0 font-semibold">{formatDuration(c.durationMin)}</dd>
                </div>
                <div className="flex justify-between gap-3 border-t border-line-soft pt-3 text-[17px]">
                  <dt className="font-bold">{t("total")}</dt>
                  <dd className="m-0 font-bold text-primary">{formatPrice(c.priceHalalas)}</dd>
                </div>
              </dl>
              <p className="m-0 text-sm text-muted">
                {t("bookedFor", { name: booking.user.name ?? "" })} · <span dir="ltr">{booking.user.email}</span>
              </p>
            </aside>

            <div className={`${card} flex min-w-0 flex-[999_1_460px] flex-col gap-[22px] p-6`}>
              <div className="flex flex-col gap-2.5">
                <h2 className="m-0 text-base font-semibold">{t("methodsTitle")}</h2>
                <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3 p-0">
                  {methods.map((m) => (
                    <li key={m.label} className="flex flex-col rounded-[12px] border border-line-input px-4 py-3.5 leading-normal">
                      <span className="font-semibold">{m.label}</span>
                      <span className="text-sm text-muted">{m.desc}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="m-0 flex items-start gap-2 text-sm text-muted">
                <Lock size={16} className="mt-1 flex-none" />
                {t("secureNote")}
              </p>
              <p className="m-0 rounded-[12px] bg-info px-4 py-3 text-sm text-ink-chip">
                {t("holdNote", { minutes: formatNumber(PAYMENT_HOLD_MINUTES) })}
                {isMockPayments() && <> {t("mockNote")}</>}
              </p>

              {status === "failed" && <ErrorAlert>{t("payError")}</ErrorAlert>}
              {status === "error" && <ErrorAlert>{t("providerError")}</ErrorAlert>}

              <form action={payNow.bind(null, booking.id)} className="flex items-center gap-4 pt-1">
                <div className="flex flex-none flex-col leading-[1.4]">
                  <span className="text-sm text-muted">{t("total")}</span>
                  <span className="text-xl font-bold text-ink">{formatPrice(c.priceHalalas)}</span>
                </div>
                <PayButton label={payLabel(c.priceHalalas)} />
              </form>
              <form action={backToDetails.bind(null, booking.id)}>
                <button type="submit" className={btnLink}>
                  <ArrowBack size={18} />
                  {t("back")}
                </button>
              </form>
            </div>
          </div>
        </section>
      </Container>
    </>
  );
}
