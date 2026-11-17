import Link from "next/link";
import { AlertCircle } from "./Icons";

/** Shared class strings so links and buttons look identical. */
export const btnPrimary =
  "inline-flex items-center justify-center gap-2.5 min-h-[52px] px-7 rounded-[12px] border-0 bg-primary text-white! text-[17px] font-semibold cursor-pointer no-underline hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-primary-busy transition-colors";
export const btnSecondary =
  "inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-[12px] border border-line-input bg-white text-primary! text-[15px] font-semibold cursor-pointer no-underline hover:bg-selected";
export const btnLink =
  "inline-flex items-center gap-1.5 min-h-[44px] px-1 border-0 bg-transparent text-[15px] font-semibold text-primary underline underline-offset-4 cursor-pointer";
export const card = "bg-surface border border-line rounded-[16px]";
export const pageTitle = "m-0 text-[clamp(26px,3.2vw,34px)] leading-[1.4] font-bold";
export const inputBase =
  "w-full box-border min-h-[48px] px-3.5 py-2.5 rounded-[12px] bg-white text-ink text-base font-[inherit] border placeholder:text-[#8A9A97]";

export function ButtonLink({ href, children, className = "" }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href} className={`${btnPrimary} ${className}`}>
      {children}
    </Link>
  );
}

export function Avatar({ initials, bg, fg, size = 56 }: { initials: string; bg: string; fg: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex flex-none items-center justify-center rounded-full font-bold"
      style={{ width: size, height: size, background: bg, color: fg, fontSize: Math.round(size * 0.36) }}
    >
      {initials}
    </span>
  );
}

export function Chip({ children, strong }: { children: React.ReactNode; strong?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-chip px-3 py-1 text-sm text-ink-chip ${strong ? "font-semibold" : ""}`}
    >
      {children}
    </span>
  );
}

export function ErrorAlert({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <div
      role="alert"
      id={id}
      className="flex items-start gap-2.5 rounded-[12px] border border-error-line bg-error-bg px-4 py-3 text-[15px] font-medium text-error-ink"
    >
      <AlertCircle size={20} className="mt-0.5 flex-none" />
      <span>{children}</span>
    </div>
  );
}

export function FieldError({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} className="m-0 flex items-center gap-1.5 text-sm font-medium text-error">
      <AlertCircle size={16} className="flex-none" />
      {children}
    </p>
  );
}

export function Container({
  children,
  width = "wide",
  className = "",
}: {
  children: React.ReactNode;
  width?: "wide" | "form" | "pay" | "narrow";
  className?: string;
}) {
  const max = { wide: "max-w-[1120px]", form: "max-w-[760px]", pay: "max-w-[1040px]", narrow: "max-w-[680px]" }[width];
  return <div className={`${max} mx-auto px-5 ${className}`}>{children}</div>;
}
