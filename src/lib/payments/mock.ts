import "server-only";
import { randomBytes } from "node:crypto";
import { appUrl } from "../config";
import { db } from "../db";
import type { CheckoutSession, PaymentProvider, ProviderStatus } from "./types";

/**
 * Local stand-in for StreamPay used in development and tests
 * (PAYMENT_PROVIDER=mock). Its "hosted checkout" is /mock-pay/[ref], where the
 * tester chooses success or failure, like the prototype's demo-mode toggle.
 * The mock's source of truth is our own Payment row.
 */
export const mockProvider: PaymentProvider = {
  id: "mock",

  async createCheckout(): Promise<CheckoutSession> {
    const providerRef = `mock_${randomBytes(9).toString("hex")}`;
    return { providerRef, checkoutUrl: appUrl(`/mock-pay/${providerRef}`) };
  },

  async fetchStatus(providerRef: string): Promise<ProviderStatus> {
    const p = await db.payment.findUnique({ where: { providerRef } });
    if (!p) return { status: "PENDING" };
    if (p.status === "PAID") return { status: "PAID", methodLabel: p.methodLabel ?? undefined };
    if (p.status === "FAILED") return { status: "FAILED" };
    return { status: "PENDING" };
  },
};
