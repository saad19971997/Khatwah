import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { syncLatestPayment } from "@/lib/payments/service";
import { Stepper } from "@/components/Stepper";
import { Container, btnSecondary, card } from "@/components/ui";
import { AutoRefresh } from "./AutoRefresh";

export const dynamic = "force-dynamic";

/**
 * StreamPay sends the payer here after checkout. We never trust the redirect
 * itself: the provider's API is queried, then we route to the right screen.
 * If the result isn't final yet, the page polls until the webhook/API settles.
 */
export default async function PaymentReturnPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  try {
    await syncLatestPayment(bookingId);
  } catch (e) {
    console.error("[return] status sync failed", e);
  }

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { payments: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!booking) notFound();
  if (booking.status === "CONFIRMED") redirect(`/bookings/${booking.id}`);
  if (booking.payments[0]?.status === "FAILED") redirect(`/checkout/${booking.id}?status=failed`);
  if (!booking.payments[0]) redirect(`/checkout/${booking.id}`);

  const t = await getTranslations("checkout");
  return (
    <>
      <Stepper current={2} />
      <AutoRefresh />
      <Container width="narrow" className="pt-7 pb-[72px]">
        <section role="status" className={`${card} flex flex-col items-center gap-4 px-6 py-8 text-center`}>
          <span aria-hidden="true" className="h-10 w-10 animate-spin rounded-full border-4 border-tint border-t-primary" />
          <h1 className="m-0 text-2xl font-bold">{t("verifying")}</h1>
          <p className="m-0 text-ink-body">{t("verifyingText")}</p>
          <Link href={`/checkout/${booking.id}/return`} className={btnSecondary}>
            {t("refresh")}
          </Link>
        </section>
      </Container>
    </>
  );
}
