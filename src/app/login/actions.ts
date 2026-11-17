"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { EMAIL_RE, normalizeEmail } from "@/lib/validation";

export type LoginState = { error?: "emailRequired" | "emailInvalid" | "sendFailed"; email: string };

function safeRedirect(path: string | null): string {
  return path && path.startsWith("/") && !path.startsWith("//") ? path : "/account/bookings";
}

export async function requestMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "emailRequired", email };
  if (!EMAIL_RE.test(email)) return { error: "emailInvalid", email };
  try {
    await signIn("email", {
      email: normalizeEmail(email),
      redirectTo: safeRedirect(formData.get("next") as string | null),
      redirect: false,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      console.error("[login] magic link failed", e);
      return { error: "sendFailed", email };
    }
    throw e;
  }
  // Our own Arabic "check your email" page (Auth.js would show its default one).
  redirect("/login/verify");
}
