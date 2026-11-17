import { getTranslations } from "next-intl/server";
import { ButtonLink, Container, card } from "@/components/ui";

export default async function LoginErrorPage() {
  const t = await getTranslations("login");
  return (
    <Container width="narrow" className="max-w-[520px]! pt-12 pb-[72px]">
      <section role="alert" className={`${card} flex flex-col items-center gap-4 p-8 text-center`}>
        <h1 className="m-0 text-2xl font-bold">{t("errorTitle")}</h1>
        <p className="m-0 text-ink-body">{t("errorText")}</p>
        <ButtonLink href="/login">{t("submit")}</ButtonLink>
      </section>
    </Container>
  );
}
