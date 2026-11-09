import type { Metadata } from "next";
import { Aref_Ruqaa, Cairo, IBM_Plex_Mono, Inter, Playfair_Display } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { AuthProvider } from "@/lib/auth-context";
import { ModalRoot } from "@/components/ui/modal-root";
import "./globals.css";

// Elegant high-contrast serif headline face for a premium/luxury real-estate
// feel (matches the heavy-weight display treatment headings/logo/hero text
// need). Body text (Inter) stays a clean, highly-readable sans so the serif
// display face is what carries the "luxury" impression, not the paragraphs.
const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

// Arabic has no serif/sans split the way Latin does (one shared face for
// both --font-display and --font-body under dir="rtl", see globals.css) -
// a clean modern Arabic sans matching the reference's nav/body/button text.
const cairo = Cairo({
  variable: "--font-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700", "800"],
});

// Flowing calligraphic Ruqaa-style face for the hero's single accent word
// (matches the reference's decorative treatment of "يناسبك") - reserved for
// that one emphasized word, not general Arabic body/heading text.
const arefRuqaa = Aref_Ruqaa({
  variable: "--font-arabic-accent",
  subsets: ["arabic"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "KHADMATONA Group — Biens immobiliers premium à Marrakech",
    template: "%s · KHADMATONA Group",
  },
  description:
    "KHADMATONA Group vous accompagne dans l'achat, la vente et la location de biens immobiliers premium à Marrakech.",
};

// Reads localStorage synchronously before first paint and applies the
// theme immediately - without this, the page would flash the wrong theme
// for a frame before React hydrates and corrects it. Dark is the site's
// actual default (a product choice, not "whatever the OS prefers") - a
// first-time visitor with no stored choice gets dark regardless of their
// system preference; light only applies once they explicitly pick it via
// the toggle, which is what gets stored from then on.
const NO_FLASH_THEME_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("khadmatona-theme");
    var theme = stored === "dark" || stored === "light" ? stored : "dark";
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "dark");
  }
})();
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={dir}
      // Server-rendered default, ahead of the no-flash script below - dark
      // is correct even for the sliver of time (or a no-JS visitor) before
      // that script can run; the script only needs to override this to
      // "light" when that's what's actually stored.
      data-theme="dark"
      className={`${playfairDisplay.variable} ${inter.variable} ${ibmPlexMono.variable} ${cairo.variable} ${arefRuqaa.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* A plain inline <script> in <head>, deliberately NOT next/script:
            - Outside <head> (it used to sit between </body> and </html>),
              React reports "<html> cannot contain a nested <script>" and
              "Cannot render a sync or defer <script> outside the main
              document" - a synchronous script is only valid in <head>.
            - next/script's beforeInteractive, in the App Router, only
              queues the code for Next's runtime (self.__next_s), so it runs
              after first paint and the wrong theme flashes; its client
              re-render is also what produced React's "Encountered a script
              tag while rendering React component" warning.
            This root layout is a Server Component, so the tag is only ever
            server-rendered and hydrated, never re-created on the client, and
            the browser runs it synchronously before painting <body>. CSP
            already allows it ('unsafe-inline', see next.config.ts). */}
        <script id="no-flash-theme" dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME_SCRIPT }} />
      </head>
      {/* Browser extensions (grammar checkers, security/ad-block tools)
          commonly inject attributes into <html>/<body> before React
          hydrates, which otherwise trips a false-positive hydration
          mismatch warning here - see https://react.dev/link/hydration-mismatch */}
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            {children}
            <ModalRoot />
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
