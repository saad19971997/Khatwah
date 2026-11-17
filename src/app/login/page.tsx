import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { Container, card } from "@/components/ui";
import { LoginForm } from "./LoginForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("login");
  return { title: t("pageTitle") };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [{ next }, session, t] = await Promise.all([searchParams, auth(), getTranslations("login")]);
  if (session?.user) redirect(next?.startsWith("/") && !next.startsWith("//") ? next : "/account/bookings");
  return (
    <Container width="narrow" className="max-w-[520px]! pt-12 pb-[72px]">
      <section aria-labelledby="login-title" className={`${card} flex flex-col gap-5 p-7`}>
        <div className="flex flex-col gap-1.5">
          <h1 id="login-title" className="m-0 text-[28px] font-bold">
            {t("title")}
          </h1>
          <p className="m-0 text-ink-body">{t("lead")}</p>
        </div>
        <LoginForm next={next} />
      </section>
    </Container>
  );
}
