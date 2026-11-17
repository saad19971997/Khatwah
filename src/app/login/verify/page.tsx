import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Mail } from "@/components/Icons";
import { Container, btnLink, card } from "@/components/ui";

export default async function VerifyRequestPage() {
  const t = await getTranslations("login");
  return (
    <Container width="narrow" className="max-w-[520px]! pt-12 pb-[72px]">
      <section role="status" className={`${card} flex flex-col items-center gap-4 p-8 text-center`}>
        <span aria-hidden="true" className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-tint text-primary">
          <Mail size={30} />
        </span>
        <h1 className="m-0 text-2xl font-bold">{t("verifyTitle")}</h1>
        <p className="m-0 text-ink-body">{t("verifyText")}</p>
        <Link href="/login" className={btnLink}>
          {t("verifyBack")}
        </Link>
      </section>
    </Container>
  );
}
