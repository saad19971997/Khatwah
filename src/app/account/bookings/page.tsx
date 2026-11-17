import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime, formatDuration } from "@/lib/format";
import { Video } from "@/components/Icons";
import { Avatar, ButtonLink, Container, btnSecondary, card, pageTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account");
  return { title: t("pageTitle"), robots: { index: false } };
}

type Row = Awaited<ReturnType<typeof load>>[number];

function load(userId: string) {
  return db.booking.findMany({
    where: { userId, status: "CONFIRMED" },
    include: { consultant: true },
    orderBy: { startsAt: "asc" },
  });
}

export default async function MyBookingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/account/bookings");

  const [t, ts, bookings] = await Promise.all([getTranslations("account"), getTranslations("status"), load(session.user.id)]);
  const now = new Date();
  const upcoming = bookings.filter((b) => b.endsAt > now);
  const past = bookings.filter((b) => b.endsAt <= now).reverse();

  function Item({ b, isPast }: { b: Row; isPast?: boolean }) {
    return (
      <li className={`${card} flex flex-wrap items-center gap-4 p-5`}>
        <Avatar initials={b.consultant.initials} bg={b.consultant.avatarBg} fg={b.consultant.avatarFg} size={48} />
        <div className="flex min-w-0 flex-[999_1_240px] flex-col">
          <span className="text-[17px] font-bold">{b.consultant.name}</span>
          <span className="text-[15px] font-semibold text-primary">{b.consultant.role}</span>
          <span className="text-[15px] text-ink-body">
            {formatDateTime(b.startsAt)} · {formatDuration(b.consultant.durationMin)}
          </span>
          <span className="text-sm text-muted">
            <span dir="ltr">{b.ref}</span> · {ts(b.status)}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isPast && b.meetUrl && (
            <a href={b.meetUrl} target="_blank" rel="noopener noreferrer" className={`${btnSecondary} bg-primary! text-white!`}>
              <Video size={18} />
              {t("join")}
            </a>
          )}
          <Link href={`/bookings/${b.id}`} className={btnSecondary}>
            {t("details")}
          </Link>
        </div>
      </li>
    );
  }

  return (
    <Container className="flex flex-col gap-8 pt-10 pb-[72px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className={pageTitle}>{t("title")}</h1>
          <p className="m-0 text-[17px] text-muted">{t("lead")}</p>
        </div>
        <ButtonLink href="/consultants">{t("bookCta")}</ButtonLink>
      </div>

      <section aria-labelledby="upcoming-title" className="flex flex-col gap-3">
        <h2 id="upcoming-title" className="m-0 text-xl font-bold">
          {t("upcoming")}
        </h2>
        {upcoming.length ? (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {upcoming.map((b) => (
              <Item key={b.id} b={b} />
            ))}
          </ul>
        ) : (
          <p className={`${card} m-0 p-5 text-muted`}>{t("noUpcoming")}</p>
        )}
      </section>

      <section aria-labelledby="past-title" className="flex flex-col gap-3">
        <h2 id="past-title" className="m-0 text-xl font-bold">
          {t("past")}
        </h2>
        {past.length ? (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {past.map((b) => (
              <Item key={b.id} b={b} isPast />
            ))}
          </ul>
        ) : (
          <p className={`${card} m-0 p-5 text-muted`}>{t("noPast")}</p>
        )}
      </section>
    </Container>
  );
}
