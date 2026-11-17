import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getBookingForDisplay } from "@/lib/bookings";
import { formatDuration, formatPrice, formatDateTime } from "@/lib/format";
import { Stepper } from "@/components/Stepper";
import { Calendar, Check, Mail, Video } from "@/components/Icons";
import { Container, btnPrimary, btnSecondary, card } from "@/components/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("confirmation");
  return { title: t("pageTitle"), robots: { index: false } };
}

export default async function BookingConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const booking = await getBookingForDisplay(id);
  if (!booking) notFound();
  if (booking.status !== "CONFIRMED") redirect(`/checkout/${booking.id}`);

  const [t, session] = await Promise.all([getTranslations("confirmation"), auth()]);
  const paid = booking.payments.find((p) => p.status === "PAID");
  const c = booking.consultant;

  const rows: { label: string; value: string; ltr?: boolean; tone?: "accent"; shaded?: boolean }[] = [
    { label: t("ref"), value: booking.ref, ltr: true, shaded: true },
    { label: t("amount"), value: formatPrice(paid?.amountHalalas ?? c.priceHalalas), tone: "accent", shaded: true },
    ...(paid?.methodLabel ? [{ label: t("method"), value: paid.methodLabel, shaded: true }] : []),
    { label: t("consultant"), value: c.name },
    { label: t("specialty"), value: c.role },
    { label: t("dateTime"), value: `${formatDateTime(booking.startsAt)} ${t("riyadhTime")}` },
    { label: t("duration"), value: formatDuration(c.durationMin) },
    { label: t("email"), value: booking.user.email, ltr: true },
  ];

  return (
    <>
      <Stepper current={3} />
      <Container width="narrow" className="pt-7 pb-[72px]">
        <section
          aria-labelledby="done-title"
          className={`${card} flex flex-col items-center gap-6 px-6 py-8 text-center`}
        >
          <span aria-hidden="true" className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-tint text-primary">
            <Check size={32} />
          </span>
          <div className="flex flex-col items-center gap-2.5">
            <h1 id="done-title" className="m-0 text-[clamp(26px,3.2vw,32px)] leading-[1.4] font-bold">
              {t("title")}
            </h1>
            <span className="inline-flex items-center gap-2 rounded-full bg-success-bg px-3.5 py-1.5 text-sm font-semibold text-success-ink">
              <Check size={16} />
              {t("paid")}
            </span>
          </div>

          <dl className="m-0 w-full overflow-hidden rounded-[12px] border border-line text-start">
            {rows.map((r, i) => (
              <div
                key={r.label}
                className={`flex flex-wrap justify-between gap-x-4 gap-y-1 px-[18px] py-3.5 ${
                  i < rows.length - 1 ? "border-b border-line-soft" : ""
                } ${r.shaded ? "bg-page" : ""}`}
              >
                <dt className="text-muted">{r.label}</dt>
                <dd
                  dir={r.ltr ? "ltr" : undefined}
                  className={`m-0 ${r.ltr ? "break-all" : ""} ${r.tone === "accent" ? "font-bold text-primary" : r.ltr ? "font-bold" : "font-semibold"}`}
                >
                  {r.value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="box-border flex w-full flex-col gap-3 rounded-[12px] border border-line bg-selected px-[18px] py-4 text-start">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <span className="font-bold">{t("statusLabel")}</span>
              <span className="inline-flex items-center gap-2 rounded-full bg-success-bg px-3.5 py-1.5 text-sm font-semibold text-success-ink">
                <Check size={16} />
                {t("statusConfirmed")}
              </span>
            </div>
            {booking.meetUrl ? (
              <a href={booking.meetUrl} target="_blank" rel="noopener noreferrer" className={`${btnPrimary} min-h-[48px]! text-base!`}>
                <Video />
                {t("joinMeet")}
              </a>
            ) : (
              <p className="m-0 text-ink-chip">{t("meetPending")}</p>
            )}
            <p className="m-0 flex items-start gap-2.5 text-ink-chip">
              <Mail className="mt-1 flex-none" />
              {booking.meetUrl ? t("emailNote") : t("emailNoteNoLink")}
            </p>
            <a href={`/api/bookings/${booking.id}/ics`} className={`${btnSecondary} self-start`}>
              <Calendar size={18} />
              {t("addToCalendar")}
            </a>
          </div>

          <p className="m-0 text-sm text-muted">{t("changeNote")}</p>

          <div className="flex flex-wrap justify-center gap-3">
            <Link href={session?.user ? "/account/bookings" : "/login"} className={btnSecondary}>
              {t("myBookings")}
            </Link>
            <Link href="/" className={btnPrimary}>
              {t("home")}
            </Link>
          </div>
        </section>
      </Container>
    </>
  );
}
