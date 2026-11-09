import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { LOCALE_COOKIE, resolveLocale } from "./locales";
import arMessages from "../../messages/ar.json";
import frMessages from "../../messages/fr.json";
import enMessages from "../../messages/en.json";

// Explicit server-side dependencies keep locale edits visible to the dev bundler.
const messagesByLocale = { ar: arMessages, fr: frMessages, en: enMessages };

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;

  const acceptLanguage = (await headers()).get("accept-language") ?? "";
  const locale = resolveLocale(cookieLocale, acceptLanguage);

  return {
    locale,
    messages: messagesByLocale[locale],
  };
});
