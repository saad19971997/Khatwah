import { getTranslations } from "next-intl/server";
import { ButtonLink, Container, card } from "@/components/ui";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <Container width="narrow" className="pt-12 pb-[72px]">
      <section className={`${card} flex flex-col items-center gap-4 p-8 text-center`}>
        <h1 className="m-0 text-2xl font-bold">{t("title")}</h1>
        <p className="m-0 text-ink-body">{t("text")}</p>
        <ButtonLink href="/">{t("home")}</ButtonLink>
      </section>
    </Container>
  );
}
