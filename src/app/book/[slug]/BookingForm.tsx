"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { FIELD_ORDER, validateBooking, type BookingErrors } from "@/lib/validation";
import { ArrowForward } from "@/components/Icons";
import { ErrorAlert, FieldError, btnPrimary, card, inputBase } from "@/components/ui";
import { submitBooking, type BookingFormState } from "./actions";

export type DayOption = {
  key: string;
  weekday: string;
  shortDate: string;
  date: string;
  slots: { value: string; time: string }[];
};

const errBorder = "border-[1.5px] border-error";
const okBorder = "border-line-input";

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("booking");
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={`${btnPrimary} flex-[1_1_240px]`}>
      {pending ? t("submitting") : t("submit")}
      {!pending && <ArrowForward />}
    </button>
  );
}

export function BookingForm({
  consultantSlug,
  days,
  defaultName,
  defaultEmail,
}: {
  consultantSlug: string;
  days: DayOption[];
  defaultName: string;
  defaultEmail: string;
}) {
  const t = useTranslations("booking");
  const initial: BookingFormState = {
    errors: {},
    values: { slot: "", name: defaultName, email: defaultEmail, topic: "" },
  };
  const [state, formAction] = useActionState(submitBooking, initial);

  const [values, setValues] = useState(state.values);
  const [errors, setErrors] = useState<BookingErrors>({});
  const [attempted, setAttempted] = useState(false);
  const [dayKey, setDayKey] = useState(days[0]?.key ?? "");
  const formRef = useRef<HTMLFormElement>(null);

  function focusFirstError(errs: BookingErrors) {
    const first = FIELD_ORDER.find((f) => errs[f]);
    if (!first) return;
    const el =
      first === "slot"
        ? (formRef.current?.querySelector<HTMLInputElement>('input[type="radio"][name="slot"]') ??
          formRef.current?.querySelector<HTMLInputElement>('input[name="day"]'))
        : document.getElementById(`f-${first}`);
    el?.focus();
  }

  // Server responded (validation or slot-taken): adopt its errors and values.
  useEffect(() => {
    if (state === initial) return;
    setValues(state.values);
    setErrors(state.errors);
    setAttempted(true);
    focusFirstError(state.errors);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function update(field: keyof typeof values, value: string) {
    const next = { ...values, [field]: value };
    setValues(next);
    // As in the prototype: once the user has tried to submit, re-validate live.
    if (attempted) setErrors(validateBooking(next));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    const found = validateBooking(values);
    if (Object.keys(found).length) {
      e.preventDefault();
      setErrors(found);
      setAttempted(true);
      focusFirstError(found);
    }
  }

  const day = days.find((d) => d.key === dayKey) ?? days[0];
  const hasErrors = attempted && Object.keys(errors).length > 0;
  const slotErrorKey = errors.slot;

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={onSubmit}
      noValidate
      className={`${card} flex flex-col gap-6 p-6`}
    >
      <input type="hidden" name="consultant" value={consultantSlug} />

      <fieldset aria-describedby={slotErrorKey ? "slot-error" : undefined} className="m-0 flex min-w-0 flex-col gap-2.5 border-0 p-0">
        <legend className="mb-1 p-0 text-base font-semibold">
          {t("slotLegend")} <span className="text-sm font-normal text-muted">{t("slotLegendHint")}</span>
        </legend>

        {days.length === 0 ? (
          <p className="m-0 rounded-[12px] bg-info px-4 py-3 text-ink-chip">{t("noSlots")}</p>
        ) : (
          <>
            {/* Day picker */}
            <div role="radiogroup" aria-label={t("slotLegend")} className="relative flex gap-2 overflow-x-auto pb-1">
              {days.map((d) => (
                <label
                  key={d.key}
                  className="relative flex min-h-[44px] flex-none cursor-pointer flex-col items-center rounded-[12px] border border-line-input bg-white px-3.5 py-2 leading-tight has-[:checked]:border-2 has-[:checked]:border-primary has-[:checked]:bg-selected has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-primary/50"
                >
                  <input
                    type="radio"
                    name="day"
                    value={d.key}
                    checked={d.key === day?.key}
                    onChange={() => setDayKey(d.key)}
                    className="sr-only"
                  />
                  <span className="text-sm font-semibold">{d.weekday}</span>
                  <span className="text-[13px] text-muted">{d.shortDate}</span>
                </label>
              ))}
            </div>

            {day && <p className="m-0 text-[15px] font-semibold text-ink-body">{day.weekday} {day.date}</p>}
            {/* Times for the selected day */}
            {day && (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
                {day.slots.map((s, i) => (
                  <label
                    key={s.value}
                    htmlFor={`slot-${i}`}
                    className={`flex min-h-[44px] cursor-pointer items-start gap-2.5 rounded-[12px] border bg-white px-4 py-3.5 has-[:checked]:border-2 has-[:checked]:border-primary has-[:checked]:bg-selected ${
                      slotErrorKey ? errBorder : okBorder
                    }`}
                  >
                    <input
                      type="radio"
                      id={`slot-${i}`}
                      name="slot"
                      value={s.value}
                      checked={values.slot === s.value}
                      onChange={() => update("slot", s.value)}
                      className="mt-[5px] h-[18px] w-[18px] flex-none"
                    />
                    <span className="flex flex-col leading-normal">
                      <span className="text-[17px] font-semibold text-primary">{s.time}</span>
                      <span className="text-sm text-muted">{day.weekday}</span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </>
        )}
        {/* Keep the chosen slot submitted even if the user browses another day. */}
        {values.slot && !day?.slots.some((s) => s.value === values.slot) && (
          <input type="hidden" name="slot" value={values.slot} />
        )}
        {slotErrorKey && <FieldError id="slot-error">{t(`errors.${slotErrorKey}`)}</FieldError>}
      </fieldset>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="f-name" className="font-semibold">
            {t("nameLabel")}
          </label>
          <input
            id="f-name"
            name="name"
            type="text"
            autoComplete="name"
            value={values.name}
            onChange={(e) => update("name", e.target.value)}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? "name-error" : undefined}
            placeholder={t("namePlaceholder")}
            className={`${inputBase} ${errors.name ? errBorder : okBorder}`}
          />
          {errors.name && <FieldError id="name-error">{t(`errors.${errors.name}`)}</FieldError>}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="f-email" className="font-semibold">
            {t("emailLabel")}
          </label>
          <input
            id="f-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            dir="ltr"
            value={values.email}
            onChange={(e) => update("email", e.target.value)}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "email-error" : undefined}
            placeholder={t("emailPlaceholder")}
            className={`${inputBase} text-right ${errors.email ? errBorder : okBorder}`}
          />
          {errors.email && <FieldError id="email-error">{t(`errors.${errors.email}`)}</FieldError>}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="f-topic" className="font-semibold">
          {t("topicLabel")} <span className="text-sm font-normal text-muted">{t("optional")}</span>
        </label>
        <textarea
          id="f-topic"
          name="topic"
          rows={4}
          value={values.topic}
          onChange={(e) => update("topic", e.target.value)}
          aria-invalid={errors.topic ? true : undefined}
          aria-describedby={errors.topic ? "topic-error" : undefined}
          placeholder={t("topicPlaceholder")}
          className={`${inputBase} min-h-[112px] resize-y py-3 ${errors.topic ? errBorder : okBorder}`}
        />
        {errors.topic && <FieldError id="topic-error">{t(`errors.${errors.topic}`)}</FieldError>}
      </div>

      {hasErrors && <ErrorAlert>{t("summaryError")}</ErrorAlert>}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <SubmitButton />
        <span className="flex-[1_1_220px] text-sm text-muted">{t("submitHint")}</span>
      </div>
    </form>
  );
}
