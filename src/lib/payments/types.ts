export type CheckoutRequest = {
  /** Our Payment row id; echoed back by the provider in metadata. */
  paymentId: string;
  bookingId: string;
  bookingRef: string;
  amountHalalas: number;
  currency: "SAR";
  /** Shown on the provider's checkout page. */
  title: string;
  description: string;
  /** Product line, e.g. "جلسة ٣٠ دقيقة — نورة العتيبي" */
  productName: string;
  customer: { name: string; email: string };
  successUrl: string;
  failureUrl: string;
  /** The checkout must not be payable after this instant (end of slot hold). */
  validUntil: Date;
};

export type CheckoutSession = {
  /** Provider's id for this checkout (StreamPay payment link id). */
  providerRef: string;
  checkoutUrl: string;
  raw?: unknown;
};

export type ProviderStatus = {
  status: "PAID" | "FAILED" | "PENDING";
  /** Human label in Arabic, e.g. "مدى" or "Apple Pay". */
  methodLabel?: string;
  raw?: unknown;
};

export interface PaymentProvider {
  readonly id: "mock" | "streampay";
  createCheckout(req: CheckoutRequest): Promise<CheckoutSession>;
  /** Authoritative status lookup from the provider's API. */
  fetchStatus(providerRef: string): Promise<ProviderStatus>;
}

/** Arabic labels for StreamPay `PaymentMethod` values. */
export const METHOD_LABELS: Record<string, string> = {
  MADA: "مدى",
  VISA: "بطاقة ائتمانية (فيزا)",
  MASTERCARD: "بطاقة ائتمانية (ماستركارد)",
  AMEX: "بطاقة ائتمانية (أمريكان إكسبريس)",
  CARD: "بطاقة بنكية",
  PGW_CARD_UNSPECIFIED: "بطاقة بنكية",
  APPLE_PAY: "Apple Pay",
  SAMSUNG_PAY: "Samsung Pay",
  BANK_TRANSFER: "تحويل بنكي",
  QURRAH: "قرة",
  CASH: "نقدًا",
};
