import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { groupByDate } from "@/lib/availability";
import { getAvailableSlots } from "@/lib/slots";
import { formatDate, formatDuration, formatPrice, formatShortDate, formatTime, formatWeekday } from "@/lib/format";
import { Stepper } from "@/components/Stepper";
import { Avatar, Container, btnSecondary, card, pageTitle } from "@/components/ui";
import { BookingForm, type DayOption } from "./BookingForm";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("booking");
  return { title: t("pageTitle") };
}

export default async function BookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const consultant = await db.consultant.findUnique({ where: { slug } });
  if (!consultant || !consultant.active) notFound();

  const [t, session, slots] = await Promise.all([
    getTranslations("booking"),
    auth(),
    getAvailableSlots(consultant.id),
  ]);

  const days: DayOption[] = groupByDate(slots).map((g) => ({
    key: g.localDate,
    weekday: formatWeekday(g.slots[0].startsAt),
    shortDate: formatShortDate(g.slots[0].startsAt),
    date: formatDate(g.slots[0].startsAt),
    slots: g.slots.map((s) => ({ value: s.startsAt.toISOString(), time: formatTime(s.startsAt) })),
  }));

  return (
    <>
      <Stepper current={1} />
      <Container width="form" className="flex flex-col gap-6 pt-7 pb-[72px]">
        <section aria-labelledby="book-title" className="flex flex-col gap-6">
          <h1 id="book-title" className={pageTitle}>
            {t("title")}
          </h1>

          <div className={`${card} flex flex-wrap items-center gap-4 px-6 py-5`}>
            <Avatar initials={consultant.initials} bg={consultant.avatarBg} fg={consultant.avatarFg} size={52} />
            <div className="flex min-w-0 flex-[999_1_200px] flex-col">
              <span className="text-lg font-bold">{consultant.name}</span>
              <span className="text-[15px] font-semibold text-primary">{consultant.role}</span>
              <span className="text-sm text-muted">
                {t("session", {
                  duration: formatDuration(consultant.durationMin),
                  price: formatPrice(consultant.priceHalalas),
                })}
              </span>
            </div>
            <Link href="/consultants" className={btnSecondary}>
              {t("changeConsultant")}
            </Link>
          </div>

          <BookingForm
            consultantSlug={consultant.slug}
            days={days}
            defaultName={session?.user?.name ?? ""}
            defaultEmail={session?.user?.email ?? ""}
          />
        </section>
      </Container>
    </>
  );
}
