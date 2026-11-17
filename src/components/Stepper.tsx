import { getTranslations } from "next-intl/server";

const KEYS = ["consultant", "details", "payment", "confirmation"] as const;
const NUMS = ["١", "٢", "٣", "٤"];

/** 4-step booking progress. `current` is 0-based; 3 (confirmation) marks all done. */
export async function Stepper({ current }: { current: 0 | 1 | 2 | 3 }) {
  const t = await getTranslations("stepper");
  return (
    <nav aria-label={t("label")} className="mx-auto max-w-[1120px] px-5 pt-6">
      <ol className="m-0 flex list-none flex-wrap gap-2 p-0">
        {KEYS.map((key, i) => {
          const done = i < current || current === 3;
          const active = i === current && current !== 3;
          return (
            <li
              key={key}
              aria-current={active ? "step" : undefined}
              className={`flex items-center gap-2 rounded-full py-1.5 ps-2.5 pe-3.5 text-sm font-medium ${
                active ? "bg-primary text-white" : done ? "bg-tint text-primary" : "bg-white text-muted"
              }`}
            >
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[13px] font-bold ${
                  active ? "bg-white text-primary" : done ? "bg-primary text-white" : "bg-line-soft text-muted"
                }`}
              >
                {done ? "✓" : NUMS[i]}
              </span>
              {t(key)}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
