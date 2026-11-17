"use client";

import { useTranslations } from "next-intl";
import { Container, btnPrimary, card } from "@/components/ui";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations("errorPage");
  return (
    <Container width="narrow" className="pt-12 pb-[72px]">
      <section role="alert" className={`${card} flex flex-col items-center gap-4 p-8 text-center`}>
        <h1 className="m-0 text-2xl font-bold">{t("title")}</h1>
        <p className="m-0 text-ink-body">{t("text")}</p>
        <button type="button" onClick={reset} className={btnPrimary}>
          {t("retry")}
        </button>
      </section>
    </Container>
  );
}
