import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { isMockPayments, markPaymentFailed, markPaymentPaid } from "@/lib/payments/service";
import { Container, btnPrimary, btnSecondary, card } from "@/components/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("mockPay");
  return { title: t("pageTitle"), robots: { index: false } };
}

/** Development-only stand-in for StreamPay's hosted checkout page. */
export default async function MockPayPage({ params }: { params: Promise<{ ref: string }> }) {
  if (!isMockPayments()) notFound();
  const { ref } = await params;
  const payment = await db.payment.findUnique({ where: { providerRef: ref }, include: { booking: true } });
  if (!payment || payment.provider !== "mock") notFound();
  if (payment.status !== "PENDING") redirect(`/checkout/${payment.bookingId}/return`);

  const t = await getTranslations("mockPay");

  async function succeed() {
    "use server";
    await markPaymentPaid(payment!.id, { methodLabel: "مدى (تجريبي)" });
    redirect(`/checkout/${payment!.bookingId}/return`);
  }
  async function fail() {
    "use server";
    await markPaymentFailed(payment!.id);
    redirect(`/checkout/${payment!.bookingId}?status=failed`);
  }

  return (
    <Container width="narrow" className="pt-10 pb-[72px]">
      <section className={`${card} flex flex-col gap-5 border-2 border-dashed border-line-dashed p-7`}>
        <h1 className="m-0 text-2xl font-bold">{t("title")}</h1>
        <p className="m-0 text-ink-body">{t("text")}</p>
        <p className="m-0 text-lg">
          {t("amount")}: <strong>{formatPrice(payment.amountHalalas)}</strong> ·{" "}
          <span dir="ltr">{payment.booking.ref}</span>
        </p>
        <div className="flex flex-wrap gap-3">
          <form action={succeed}>
            <button type="submit" className={btnPrimary}>
              {t("succeed")}
            </button>
          </form>
          <form action={fail}>
            <button type="submit" className={`${btnSecondary} min-h-[52px]`}>
              {t("fail")}
            </button>
          </form>
        </div>
      </section>
    </Container>
  );
}
