import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { auth, signOut } from "@/lib/auth";
import { Logo } from "./Icons";

export async function Header() {
  const t = await getTranslations("header");
  const session = await auth();

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-4 px-5 py-3.5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
          <Link
            href="/"
            aria-label={t("homeLabel")}
            className="inline-flex min-h-[44px] items-center gap-2.5 text-ink! no-underline"
          >
            <Logo />
            <span className="text-[22px] font-bold">خطوة</span>
          </Link>
          <span className="text-sm text-muted">{t("tagline")}</span>
        </div>
        <nav className="flex items-center gap-2 text-[15px] font-semibold">
          {session?.user ? (
            <>
              <Link href="/account/bookings" className="inline-flex min-h-[44px] items-center px-2 no-underline">
                {t("myBookings")}
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  type="submit"
                  className="min-h-[44px] cursor-pointer border-0 bg-transparent px-2 font-[inherit] text-[15px] font-semibold text-muted hover:text-ink"
                >
                  {t("logout")}
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className="inline-flex min-h-[44px] items-center px-2 no-underline">
              {t("login")}
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
