"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { ErrorAlert, FieldError, btnPrimary, inputBase } from "@/components/ui";
import { requestMagicLink, type LoginState } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  const t = useTranslations("login");
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={btnPrimary}>
      {pending ? t("submitting") : t("submit")}
    </button>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const t = useTranslations("login");
  const tb = useTranslations("booking.errors");
  const [state, action] = useActionState<LoginState, FormData>(requestMagicLink, { email: "" });
  const fieldError = state.error === "emailRequired" || state.error === "emailInvalid" ? state.error : undefined;

  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      {next && <input type="hidden" name="next" value={next} />}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="login-email" className="font-semibold">
          {t("emailLabel")}
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          dir="ltr"
          required
          defaultValue={state.email}
          aria-invalid={fieldError ? true : undefined}
          aria-describedby={fieldError ? "login-email-error" : "login-hint"}
          placeholder="name@example.com"
          className={`${inputBase} text-right ${fieldError ? "border-[1.5px] border-error" : "border-line-input"}`}
        />
        {fieldError ? (
          <FieldError id="login-email-error">{tb(fieldError)}</FieldError>
        ) : (
          <p id="login-hint" className="m-0 text-sm text-muted">
            {t("hint")}
          </p>
        )}
      </div>
      {state.error === "sendFailed" && <ErrorAlert>{t("error")}</ErrorAlert>}
      <Submit />
    </form>
  );
}
