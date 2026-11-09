import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, Building2, Clock, MapPin, Phone, ShieldCheck } from "lucide-react";
import type { Settings } from "@/types/settings";

const CTA_BACKGROUND_IMAGE =
  "https://res.cloudinary.com/udflrhgq/image/upload/v1785510674/ChatGPT_Image_31_%D9%8A%D9%88%D9%84%D9%8A%D9%88_2026_04_57_13_%D9%85_1_ese5b7.png";

/**
 * Full-bleed "Nous contacter" band - its own section, not part of
 * <SiteFooter>, sitting between the page content and the real footer. One
 * photo fills the whole section edge to edge (no framed/bordered image
 * card); the left side reads as a dark editorial panel built purely from
 * gradients over that photo, not as a separate box. The photo's own
 * composition (tower weighted right) is fixed - it never mirrors for
 * Arabic, so every position below is physical (mr-auto, text-left,
 * object-right, right-*), never logical (start/end).
 */
export function CtaBand({ settings }: { settings: Settings }) {
  const t = useTranslations("Footer");
  const nav = useTranslations("Nav");
  const home = useTranslations("Home");

  // Admin-editable (settings.cta_stat1-4), not the static Footer.stat*
  // translation strings this used to read - those had already drifted out
  // of sync across locales (fr/ar said "1h", en still said "48h") since
  // editing a message file per-locale has no single source of truth the
  // way one admin-editable field does. Independent from the homepage's own
  // settings.stat1-4 "Trust band" grid.
  const footerStats = [
    { value: settings.cta_stat1_value ?? "", label: settings.cta_stat1_label ?? "", icon: Building2 },
    { value: settings.cta_stat2_value ?? "", label: settings.cta_stat2_label ?? "", icon: Clock },
    { value: settings.cta_stat3_value ?? "", label: settings.cta_stat3_label ?? "", icon: ShieldCheck },
    { value: settings.cta_stat4_value ?? "", label: settings.cta_stat4_label ?? "", icon: MapPin },
  ];

  // Same brand line shown small under the logo in the footer's info grid
  // (nav("tagline") = "L'immobilier autrement") - reused as the big
  // two-line headline instead of inventing new copy. Split on the last
  // word so it colors like the Hero's own accent word.
  const taglineWords = nav("tagline").trim().split(" ");
  const taglineAccent = taglineWords.pop() ?? "";
  const taglineLead = taglineWords.join(" ");

  return (
    <section className="relative isolate overflow-hidden border-b border-white/10 bg-ink">
      <div className="absolute inset-0 -z-10">
        {/* Vertical position biased toward the top (22%, not center) so the
            crop - unavoidable on very wide viewports given this photo's own
            aspect ratio - eats into the plaza at the bottom rather than the
            tower's crown at the top. */}
        <Image
          src={CTA_BACKGROUND_IMAGE}
          alt=""
          fill
          unoptimized
          sizes="100vw"
          className="object-cover object-[68%_22%]"
        />
        {/* The dark "panel" on the left is built entirely from this one
            gradient over the live photo - there is no separate card/box
            drawn behind the text. Strong (90%) at the far left for text
            contrast, explicit stops so it's fully back to 0% opacity by
            56% width - well before the tower (~68%, matching the photo's
            own object-position above) - so the tower and the plaza around
            it show through with no tint/filter over them at all. */}
        <div className="absolute inset-0 bg-gradient-to-r from-ink/90 from-0% via-ink/75 via-28% to-transparent to-56%" />
      </div>

      {/* Decorative gold curves, bottom-left corner only. Sized/positioned
          to stay clear of the text column above it rather than underlying
          any content. */}
      <svg
        className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 text-gold-primary/15 sm:h-72 sm:w-72"
        viewBox="0 0 200 200"
        fill="none"
        aria-hidden="true"
      >
        <path d="M0 140 C 60 140, 60 60, 140 60" stroke="currentColor" strokeWidth="1" />
        <path d="M0 170 C 90 170, 90 30, 170 30" stroke="currentColor" strokeWidth="1" />
        <path d="M0 110 C 40 110, 40 80, 90 80" stroke="currentColor" strokeWidth="1" />
      </svg>

      {/* Top-anchored, not vertically centered - the logo sits near the
          top edge and the rest of the content flows underneath it, same
          as the reference. The section's generous bottom padding is what
          keeps it tall enough for the tower to read in full, with the
          leftover room reserved for the floating button below. */}
      <div className="relative mx-auto w-full max-w-7xl px-4 pt-12 pb-28 sm:px-5 sm:pt-14 sm:pb-32 lg:px-6 lg:pt-16 lg:pb-40 xl:pb-44">
        <div className="mr-auto flex max-w-2xl flex-col text-left">
          <h2 className="font-display text-4xl leading-[1.05] font-bold text-paper sm:text-5xl lg:text-6xl">
            <span className="block text-balance">{taglineLead}</span>
            <span className="font-accent text-gradient-gold block text-balance">{taglineAccent}</span>
          </h2>

          <p className="mt-5 mr-auto max-w-md text-base leading-relaxed text-white/75">{t("tagline")}</p>

          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {footerStats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label ?? index}
                  className="group flex flex-col items-center rounded-md border border-gold-primary/40 bg-ink/50 px-3 py-5 text-center backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-gold-primary hover:shadow-gold"
                >
                  <Icon
                    className="h-10 w-10 text-gold-primary transition-colors group-hover:text-gold-secondary"
                    aria-hidden="true"
                  />
                  <p className="mt-2 font-mono text-2xl font-bold text-paper tabular-nums">{stat.value}</p>
                  <p className="mt-1 text-[0.72rem] text-white/70">{stat.label}</p>
                </div>
              );
            })}
          </div>

          <p className="mt-10 mr-auto max-w-md text-paper">{home("ctaText")}</p>

          {/* Mobile-only CTA, in normal flow right after the text - the
              same link re-appears floated over the photo at sm+ below, so
              only one of the two is ever visible at a time. */}
          <Link
            href="/contact"
            data-analytics-cta="footer_contact"
            className="mt-8 mr-auto inline-flex w-fit items-center gap-2 rounded-md border border-gold-primary bg-ink/80 px-8 py-4 text-sm font-semibold text-gold-primary shadow-gold backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-gradient-gold hover:text-white hover:shadow-lg sm:hidden"
          >
            <Phone className="h-4 w-4" />
            {home("ctaButton")}
            <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
          </Link>
        </div>
      </div>

      {/* Desktop CTA - floats right at the foot of the tower, low on the
          photo, matching the reference. `left-[68%] -translate-x-1/2`
          centers it on the same focal point the background image itself
          is cropped around (`object-[68%_22%]` below) so it tracks the
          tower exactly regardless of viewport width, rather than an
          eyeballed `right-*` offset that only lined up at one width.
          Physical `left-*`/`bottom-*` (not logical `start-*`/`end-*`):
          this stays over the same part of the fixed photo in every
          language. */}
      <Link
        href="/contact"
        data-analytics-cta="footer_contact"
        className="hidden items-center gap-2 rounded-md border border-gold-primary bg-ink/80 px-8 py-4 text-sm font-semibold text-gold-primary shadow-gold backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-gradient-gold hover:text-white hover:shadow-lg sm:absolute sm:bottom-8 sm:left-[68%] sm:inline-flex sm:-translate-x-1/2 lg:bottom-10"
      >
        <Phone className="h-4 w-4" />
        {home("ctaButton")}
        <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
      </Link>
    </section>
  );
}
