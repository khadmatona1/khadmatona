import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Calendar, Search } from "lucide-react";
import { HeroSearch } from "@/components/home/hero-search";
import { SocialProofBadge } from "@/components/home/social-proof-badge";
import { Button } from "@/components/ui/button";

const HERO_IMAGE =
  "https://res.cloudinary.com/udflrhgq/image/upload/v1785339657/Gemini_Generated_Image_34qjdo34qjdo34qj_apkvcr.png";

export function Hero({
  eyebrow,
  titleBefore,
  titleAccent,
  titleAfter,
  subtitle,
  clientsCount,
}: {
  eyebrow: string;
  titleBefore: string;
  titleAccent: string;
  titleAfter: string;
  subtitle: string;
  clientsCount: string;
}) {
  const t = useTranslations("Home");

  return (
    <section className="relative isolate flex min-h-[440px] flex-col overflow-hidden bg-ink sm:min-h-[480px] lg:min-h-[560px] xl:min-h-[600px]">
      {/* Background photograph - slow one-way zoom for a cinematic,
          unobtrusive sense of motion (holds at the zoomed frame, no loop). */}
      <div className="absolute inset-0">
        {/* This is the page's LCP element - `priority` makes next/image emit
           a <link rel="preload"> for it and skip lazy-loading; `unoptimized`
           skips Next's own re-encode pass since a hotlinked photo doesn't
           benefit from it the way a self-hosted asset would. */}
        <Image
          src={HERO_IMAGE}
          alt=""
          fill
          priority
          unoptimized
          sizes="100vw"
          className="object-cover animate-hero-zoom"
        />
      </div>

      {/* Mobile: one flat, uniform dark tint - simple and predictable at
          narrow widths where the gradient bands below would need their own
          separate sizing. Desktop (sm+): the flat tint is dropped in favor
          of the radial gradient bands, which read as a more deliberate,
          soft-edged dark core rather than a uniform wash. */}
      <div className="absolute inset-0 bg-ink/45 sm:hidden" />
      <div className="absolute inset-0 hidden bg-gradient-to-b from-transparent via-transparent to-ink/80 sm:block" />
      <div className="absolute inset-0 hidden bg-[radial-gradient(ellipse_30%_100%_at_center,var(--color-ink)_0%,var(--color-ink)_35%,transparent_88%)] sm:block" />

      {/* Text block centers in the space above the search bar, rather than
          the whole hero content being one vertically-centered group - the
          search bar is anchored near the bottom edge instead (matches the
          reference layout: headline upper/middle, search bar pinned low). */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pt-10 text-center sm:px-5 sm:pt-12 lg:px-6">
        {/* Contained dark backdrop behind just the headline/subtitle block
            (desktop only - mobile's flat tint above already darkens the
            whole hero, so this extra layer isn't needed there). */}
        <div
          className="absolute inset-0 -z-10 hidden bg-[radial-gradient(ellipse_40%_100%_at_center,var(--color-ink)_0%,transparent_72%)] opacity-75 sm:block"
          aria-hidden="true"
        />
        <p
          className="hero-reveal mb-5 flex items-center justify-center gap-3 text-[0.72rem] font-bold tracking-[0.28em] text-gold-secondary uppercase"
          style={{ animationDelay: "0ms" }}
        >
          <span className="h-px w-8 bg-gold-secondary/60" aria-hidden="true" />
          {eyebrow}
          <span className="h-px w-8 bg-gold-secondary/60" aria-hidden="true" />
        </p>
        <h1
          className="hero-reveal font-display text-4xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl"
          style={{ animationDelay: "120ms" }}
        >
          <span className="block text-balance">{titleBefore}</span>
          <span className="font-accent text-gradient-gold block text-balance">
            {titleAccent} {titleAfter}
          </span>
        </h1>
        <p
          className="hero-reveal mx-auto mt-6 max-w-2xl text-balance text-lg leading-relaxed text-white/85"
          style={{ animationDelay: "260ms" }}
        >
          {subtitle}
        </p>

        <div
          className="hero-reveal mt-8 flex flex-wrap items-center justify-center gap-5"
          style={{ animationDelay: "330ms" }}
        >
          <Link href="/properties" className="w-full sm:w-auto" data-analytics-cta="hero_explore">
            <Button size="lg" className="w-full sm:w-auto">
              <Search className="h-4 w-4" />
              {t("exploreProperties")}
            </Button>
          </Link>
          <Link href="/contact" className="w-full sm:w-auto" data-analytics-cta="hero_contact">
            <Button
              size="lg"
              variant="secondary"
              className="w-full !border-white/30 !text-white hover:!border-gold-primary hover:!text-gold-secondary sm:w-auto"
            >
              <Calendar className="h-4 w-4" />
              {t("bookConsultation")}
            </Button>
          </Link>
        </div>
      </div>

      <div className="relative z-10 w-full px-4 pt-8 pb-4 sm:px-5 sm:pt-10 sm:pb-5 lg:px-6">
        <div className="hero-reveal mx-auto max-w-4xl" style={{ animationDelay: "400ms" }}>
          <HeroSearch />
        </div>
      </div>

      <SocialProofBadge
        clientsCount={clientsCount}
        className="hero-reveal mx-auto mt-2 mb-6 sm:mb-8"
        style={{ animationDelay: "450ms" }}
      />
    </section>
  );
}
