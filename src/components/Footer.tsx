import { getTranslations } from "next-intl/server";

export async function Footer() {
  const t = await getTranslations("footer");
  return (
    <footer className="border-t border-line bg-surface">
      <p className="mx-auto my-0 max-w-[1120px] p-5 text-sm text-muted">
        {t("text")} · © {new Date().getFullYear().toLocaleString("ar-SA-u-nu-arab", { useGrouping: false })}
      </p>
    </footer>
  );
}
