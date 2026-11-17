"use client";

import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { btnPrimary } from "@/components/ui";

export function PayButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  const t = useTranslations("checkout");
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={`${btnPrimary} min-w-0 flex-auto px-5!`}>
      {pending ? t("processing") : label}
    </button>
  );
}
