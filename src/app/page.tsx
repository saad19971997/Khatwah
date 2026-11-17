import { getTranslations } from "next-intl/server";
import { ArrowForward, Chat, Check, Clock } from "@/components/Icons";
import { ButtonLink, Container, card } from "@/components/ui";

export default async function HomePage() {
  const t = await getTranslations("home");

  const benefits = [
    { icon: <Check />, title: t("benefit1Title"), text: t("benefit1Text") },
    { icon: <Chat />, title: t("benefit2Title"), text: t("benefit2Text") },
    { icon: <Clock />, title: t("benefit3Title"), text: t("benefit3Text") },
  ];
  const steps = [
    { n: "١", title: t("how1Title"), text: t("how1Text") },
    { n: "٢", title: t("how2Title"), text: t("how2Text") },
    { n: "٣", title: t("how3Title"), text: t("how3Text") },
  ];

  return (
    <>
      <Container className="flex flex-wrap items-center gap-10 pt-14 pb-8">
        <div className="flex min-w-0 flex-[999_1_460px] flex-col items-start gap-5">
          <span className="inline-block rounded-full bg-tint px-3 py-1 text-sm font-semibold text-primary">
            {t("badge")}
          </span>
          <h1 className="m-0 text-[clamp(30px,4.2vw,46px)] leading-[1.35] font-bold text-ink-strong">{t("title")}</h1>
          <p className="m-0 max-w-[560px] text-lg text-ink-body">{t("lead")}</p>
          <ButtonLink href="/consultants">
            {t("cta")}
            <ArrowForward />
          </ButtonLink>
        </div>
        <aside aria-labelledby="benefits-title" className={`${card} flex min-w-0 flex-[1_1_320px] flex-col gap-[18px] p-7`}>
          <h2 id="benefits-title" className="m-0 text-lg font-bold">
            {t("benefitsTitle")}
          </h2>
          {benefits.map((b) => (
            <div key={b.title} className="flex items-start gap-3">
              <span className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-tint text-primary">
                {b.icon}
              </span>
              <p className="m-0 text-ink-body">
                <strong className="text-ink">{b.title}</strong>
                <br />
                {b.text}
              </p>
            </div>
          ))}
        </aside>
      </Container>

      <Container className="pt-6 pb-[72px]">
        <section aria-labelledby="how-title">
          <h2 id="how-title" className="m-0 mb-5 text-2xl font-bold">
            {t("howTitle")}
          </h2>
          <ol className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4 p-0">
            {steps.map((s) => (
              <li key={s.n} className={`${card} flex flex-col gap-2 p-6`}>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-lg font-bold text-white">
                  {s.n}
                </span>
                <h3 className="m-0 mt-1 text-lg font-bold">{s.title}</h3>
                <p className="m-0 text-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>
      </Container>
    </>
  );
}
