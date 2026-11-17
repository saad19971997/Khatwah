import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { formatDuration, formatPrice } from "@/lib/format";
import { Stepper } from "@/components/Stepper";
import { Clock } from "@/components/Icons";
import { Avatar, Chip, Container, btnPrimary, card, pageTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("consultants");
  return { title: t("pageTitle") };
}

export default async function ConsultantsPage() {
  const t = await getTranslations("consultants");
  const consultants = await db.consultant.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return (
    <>
      <Stepper current={0} />
      <Container className="flex flex-col gap-6 pt-7 pb-[72px]">
        <section aria-labelledby="pick-title" className="flex flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <h1 id="pick-title" className={pageTitle}>
              {t("title")}
            </h1>
            <p className="m-0 text-[17px] text-muted">{t("lead")}</p>
          </div>
          {consultants.length === 0 ? (
            <p className={`${card} m-0 p-6 text-muted`}>{t("empty")}</p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-5">
              {consultants.map((c) => (
                <article key={c.id} className={`${card} flex flex-col gap-4 p-6`}>
                  <div className="flex items-center gap-3.5">
                    <Avatar initials={c.initials} bg={c.avatarBg} fg={c.avatarFg} />
                    <div className="flex min-w-0 flex-col">
                      <h2 className="m-0 text-[19px] font-bold">{c.name}</h2>
                      <span className="text-[15px] font-semibold text-primary">{c.role}</span>
                    </div>
                  </div>
                  <p className="m-0 grow text-ink-body">{c.bio}</p>
                  <div className="flex flex-wrap gap-2">
                    <Chip>
                      <Clock size={16} />
                      {formatDuration(c.durationMin)}
                    </Chip>
                    <Chip strong>{formatPrice(c.priceHalalas)}</Chip>
                  </div>
                  <Link
                    href={`/book/${c.slug}`}
                    aria-label={t("chooseLabel", { name: c.name })}
                    className={`${btnPrimary} min-h-[48px]! text-base!`}
                  >
                    {t("choose")}
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>
      </Container>
    </>
  );
}
