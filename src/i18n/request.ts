import { getRequestConfig } from "next-intl/server";

/**
 * Single-locale setup (Arabic). To add English later: add messages/en.json,
 * resolve the locale here (cookie or path segment), and set `dir` in the
 * root layout from the locale.
 */
export const LOCALE = "ar";
export const DIR = "rtl";

export default getRequestConfig(async () => ({
  locale: LOCALE,
  timeZone: "Asia/Riyadh",
  messages: (await import(`../../messages/${LOCALE}.json`)).default,
}));
