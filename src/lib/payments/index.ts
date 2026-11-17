import "server-only";
import { mockProvider } from "./mock";
import { streamPayProvider } from "./streampay";
import type { PaymentProvider } from "./types";

export function paymentProviderId(): "mock" | "streampay" {
  return process.env.PAYMENT_PROVIDER === "streampay" ? "streampay" : "mock";
}

export function getPaymentProvider(id: string = paymentProviderId()): PaymentProvider {
  if (id === "streampay") return streamPayProvider;
  if (id === "mock") return mockProvider;
  throw new Error(`Unknown payment provider: ${id}`);
}
