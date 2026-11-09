import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import clsx from "clsx";
import {
  ArrowRight,
  Building2,
  ClipboardCheck,
  Handshake,
  Headset,
  Home as HomeIcon,
  Key,
  Landmark,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
  Sofa,
  Star,
  Users,
} from "lucide-react";
import { Hero } from "@/components/home/hero";
import { PropertyTypeGrid } from "@/components/home/property-type-grid";
import { SellRentSection } from "@/components/home/sell-rent-section";
import { SocialProofBadge } from "@/components/home/social-proof-badge";
import { TestimonialsSection } from "@/components/home/testimonials-section";
import { CtaBand } from "@/components/layout/cta-band";
import { PropertyCard } from "@/components/properties/property-card";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { listProperties } from "@/lib/properties";
import { getSettings } from "@/lib/settings";
import type { Settings } from "@/types/settings";

const SELL_RENT_IMAGE =
  "https://res.cloudinary.com/udflrhgq/image/upload/v1785339657/Gemini_Generated_Image_34qjdo34qjdo34qj_apkvcr.png";

// Small ornamental divider for section headings that don't carry their own
// eyebrow copy (Featured Properties/Browse by Type) - the same hairline-◆-
// hairline mark already used in the footer, kept in one place instead of
// hand-copied per section so the three headings stay visually consistent.
function SectionDivider({ className }: { className?: string }) {
  return (
    <span
      className={clsx("flex items-center gap-3 text-gold-primary", className)}
      aria-hidden="true"
    >
      <span className="h-px w-8 bg-gold-primary/40" />
      <span className="text-xs">◆</span>
      <span className="h-px w-8 bg-gold-primary/40" />
    </span>
  );
}

// Otherwise this page would be prerendered once at build time and the
// featured listings would never reflect new/updated properties without a
// full rebuild.
export const revalidate = 60;

export async function generateMetadata() {
  const settings = await getSettings();
  return {
    title: `${settings.hero_title_before} ${settings.hero_title_accent} ${settings.hero_title_after}`,
    description: settings.hero_subtitle,
  };
}

export default async function HomePage() {
  const [sale, rent, settings] = await Promise.all([
    listProperties({ perPage: 6, sort: "-created_at", transactionType: "sale" }),
    listProperties({ perPage: 6, sort: "-created_at", transactionType: "rent" }),
    getSettings(),
  ]);

  return <HomeContent saleProperties={sale.properties} rentProperties={rent.properties} settings={settings} />;
}

function HomeContent({
  saleProperties,
  rentProperties,
  settings,
}: {
  saleProperties: Awaited<ReturnType<typeof listProperties>>["properties"];
  rentProperties: Awaited<ReturnType<typeof listProperties>>["properties"];
  settings: Settings;
}) {
  const t = useTranslations("Home");
  const booking = useTranslations("Booking");
  // The Arabic question mark "؟" was previously hardcoded here regardless
  // of locale, which rendered as a broken/tofu glyph in the French and
  // English serif display font (no Arabic glyph coverage in an LTR
  // context). French/English also put a space before "?" (standard
  // typographic convention in both), which Arabic's "؟" doesn't.
  const locale = useLocale();
  const questionMark = locale === "ar" ? "؟" : " ?";

  const pillars = [
    {
      title: t("pillar1Title"),
      description: t("pillar1Description"),
      icon: <Search />,
    },
    {
      title: t("pillar2Title"),
      description: t("pillar2Description"),
      icon: <ClipboardCheck />,
    },
    {
      title: t("pillar3Title"),
      description: t("pillar3Description"),
      icon: <Headset />,
    },
    {
      title: t("pillar4Title"),
      description: t("pillar4Description"),
      icon: <ShieldCheck />,
    },
    {
      title: t("pillar5Title"),
      description: t("pillar5Description"),
      icon: <Landmark />,
    },
    {
      title: t("pillar6Title"),
      description: t("pillar6Description"),
      icon: <Handshake />,
    },
  ];

  // The site's 6 real-estate service categories (buy/sell/rent/manage/
  // design/consult) - distinct from `pillars` above, which are "why choose
  // us" value props, not transaction types.
  const realEstateServices = [
    {
      title: t("realEstate1Title"),
      description: t("realEstate1Description"),
      icon: <Building2 />,
    },
    {
      title: t("realEstate2Title"),
      description: t("realEstate2Description"),
      icon: <HomeIcon />,
    },
    {
      title: t("realEstate3Title"),
      description: t("realEstate3Description"),
      icon: <Key />,
    },
    {
      title: t("realEstate4Title"),
      description: t("realEstate4Description"),
      icon: <SettingsIcon />,
    },
    {
      title: t("realEstate5Title"),
      description: t("realEstate5Description"),
      icon: <Sofa />,
    },
    {
      title: t("realEstate6Title"),
      description: t("realEstate6Description"),
      icon: <Handshake />,
    },
  ];

  const stats = [
    {
      value: settings.cta_stat1_value ?? "",
      label: settings.cta_stat1_label ?? "",
      icon: <Building2 />,
    },
    {
      value: settings.cta_stat2_value ?? "",
      label: settings.cta_stat2_label ?? "",
      icon: <Users />,
    },
    {
      value: settings.cta_stat3_value ?? "",
      label: settings.cta_stat3_label ?? "",
      icon: <Star />,
    },
    {
      value: settings.cta_stat4_value ?? "",
      label: settings.cta_stat4_label ?? "",
      icon: <ShieldCheck />,
    },
  ];

  return (
    <div className="flex flex-col">
      <Hero
        eyebrow={settings.hero_eyebrow ?? ""}
        titleBefore={settings.hero_title_before ?? ""}
        titleAccent={settings.hero_title_accent ?? ""}
        titleAfter={settings.hero_title_after ?? ""}
        subtitle={settings.hero_subtitle ?? ""}
        clientsCount={settings.hero_clients_count ?? ""}
      />

      <section className="border-y border-border bg-surface px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5">
          <div>
            <h2 className="font-display text-2xl font-semibold text-text">
              {booking("homeTitle")}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-text-muted">
              {booking("homeHint")}
            </p>
          </div>
          <Link
            href="/reserver"
            className="inline-flex items-center gap-3 rounded-md bg-gradient-gold px-6 py-3 font-bold text-ink"
          >
            {booking("title")}
            <ArrowRight size={18} className="rtl:rotate-180" />
          </Link>
        </div>
      </section>

      <section className="bg-surface-deep px-4 py-10 sm:px-5 sm:py-14 lg:px-6">
        <div className="mx-auto max-w-7xl">
          <Reveal className="grid grid-cols-2 gap-3 sm:flex sm:flex-nowrap sm:items-center sm:justify-center sm:gap-0">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className={clsx(
                  "flex items-center gap-2.5 rounded-md border border-border px-4 py-3 sm:rounded-none sm:border-0 sm:px-12 sm:py-0",
                  index > 0 && "sm:border-s sm:border-border",
                )}
              >
                {/* Forces every stat icon to the same size regardless of its
                    own authored className - Shield/Building/People/Star were
                    each drawn at slightly different sizes, which read as
                    inconsistent side by side. */}
                <span className="flex shrink-0 items-center justify-center text-gold-primary [&>svg]:h-8 [&>svg]:w-8">
                  {stat.icon}
                </span>
                <span className="flex flex-col">
                  <span className="font-mono text-xl font-bold text-text tabular-nums">
                    <AnimatedCounter value={stat.value} />
                  </span>
                  <span className="text-[0.75rem] text-text-muted">
                    {stat.label}
                  </span>
                </span>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {([
        { purpose: "sale", properties: saleProperties, title: t("saleTitle"), subtitle: t("saleSubtitle"), linkLabel: t("seeAllSale") },
        { purpose: "rent", properties: rentProperties, title: t("rentTitle"), subtitle: t("rentSubtitle"), linkLabel: t("seeAllRent") },
      ] as const).map(({ purpose, properties, title, subtitle, linkLabel }) => (
      <section key={purpose} className="px-4 py-14 sm:px-5 sm:py-14 lg:px-6">
        <div className="mx-auto max-w-7xl">
          <Reveal className="mb-10 sm:mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <SectionDivider className="mb-3" />
              <h2 className="font-display text-3xl font-semibold text-text sm:text-4xl">
                {title}
              </h2>
              <p className="mt-1 text-text-muted">{subtitle}</p>
            </div>
            <Link href={`/properties?transaction_type=${purpose}`}>
              <Button variant="secondary" size="sm">
                {linkLabel}
                <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
              </Button>
            </Link>
          </Reveal>

          {properties.length === 0 ? (
            <p className="text-text-muted">{t("noPropertiesYet")}</p>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {properties.map((property, index) => (
                <Reveal key={property.id} delayMs={index * 60}>
                  <PropertyCard property={property} showStatus />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>
      ))}

      {/* Real-estate services. */}
      <section className="bg-surface-deep px-4 py-14 sm:px-5 sm:py-14 lg:px-6">
        <div className="mx-auto max-w-7xl">


          {/* Our 6 real-estate service categories (buy/sell/rent/manage/
              design/consult) - the "why choose us" pillars used to repeat
              here too; that heading + its cards now live in their own
              section near the footer instead (see below). */}
          <Reveal className="mb-10 sm:mb-10 flex flex-col items-center text-center">
            <SectionDivider className="mb-3" />
            <h2 className="font-display text-3xl font-semibold text-text sm:text-4xl">
              {t("pillarsTitleAccent")} {t("pillarsTitleAfter")}
            </h2>
          </Reveal>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {realEstateServices.map((service, index) => (
              <Reveal key={service.title} delayMs={index * 100}>
                <div className="flex h-full flex-col items-center justify-between rounded-md border border-border bg-surface p-4 text-center transition-all duration-200 hover:border-gold-primary hover:shadow-gold">
                  <div className="flex flex-col items-center">
                    <span className="flex items-center justify-center text-gold-primary [&>svg]:h-10 [&>svg]:w-10">
                      {service.icon}
                    </span>
                    <h3 className="mt-3 font-display text-base font-semibold text-text">
                      {service.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
                      {service.description}
                    </p>
                  </div>
                  <span className="mt-4 font-mono text-3xl font-bold text-text/10">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <TestimonialsSection />

      <section className="bg-surface-deep px-4 py-14 sm:px-5 sm:py-14 lg:px-6">
        <div className="mx-auto max-w-7xl">
          <Reveal className="mb-10 sm:mb-10 flex flex-col items-center text-center">
            <SectionDivider className="mb-3" />
            <h2 className="font-display text-3xl font-semibold text-text sm:text-4xl">
              {t("browseByTypeTitle")}
            </h2>
          </Reveal>
          <Reveal>
            <PropertyTypeGrid />
          </Reveal>
        </div>
      </section>

      {/* Fixed-dark full-bleed photo section, same reasoning as the Hero -
          a photo backdrop can't sensibly follow the light/dark toggle. On
          large screens the form is an absolutely-positioned panel flush
          against the section's end edge, covering exactly half the width
          and the section's full height (matching the reference exactly,
          not just a padded card inside the grid) - below `lg` there isn't
          room for that, so it falls back to a normal stacked card. */}
      <section
        id="vendre-louer"
        className="relative isolate scroll-mt-20 overflow-hidden lg:min-h-[640px]"
      >
        <div className="absolute inset-0 -z-10">
          <Image
            src={SELL_RENT_IMAGE}
            alt=""
            fill
            unoptimized
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-ink/40 via-transparent to-ink/60" />
        </div>

        <div className="hidden lg:z-10 lg:block lg:absolute lg:inset-y-0 lg:end-0 lg:w-1/2">
          <SellRentSection className="flex h-full w-full flex-col justify-start overflow-y-auto bg-surface p-10 xl:p-14" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-5 sm:py-14 lg:px-6 lg:py-24">
          <Reveal className="relative isolate flex flex-col justify-center lg:max-w-[46%]">
            <div
              className="absolute inset-0 -z-10 -m-6 rounded-2xl bg-ink/60 blur-2xl sm:-m-8"
              aria-hidden="true"
            />
            <p className="hero-reveal mb-3 flex items-center gap-3 text-[0.72rem] font-bold tracking-[0.28em] text-gold-secondary uppercase">
              <span
                className="h-px w-8 bg-gold-secondary/60"
                aria-hidden="true"
              />
              {t("sellRentEyebrow")}
            </p>
            <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
              {t("sellRentTitle")}
            </h2>
            <p className="mt-3 max-w-md text-white/80">
              {t("sellRentSubtitle")}
            </p>
            <SocialProofBadge
              clientsCount={settings.hero_clients_count ?? ""}
              className="mt-6"
            />
          </Reveal>

          <Reveal className="mt-10 lg:hidden">
            <SellRentSection />
          </Reveal>
        </div>
      </section>

      {/* "Why choose us" - the original pillars (search/visit/support/
          guarantee/expertise/partnership) reasons, relocated here (between
          the sell/rent form and the footer's own CTA band) instead of
          repeating the real-estate service categories shown earlier. */}
      <section className="bg-surface-deep px-4 py-14 sm:px-5 sm:py-14 lg:px-6">
        <div className="mx-auto max-w-7xl">
          <Reveal className="mb-10 sm:mb-10 flex flex-col items-center text-center">
            <SectionDivider className="mb-3" />
            <h2 className="font-display text-3xl font-semibold text-text sm:text-4xl">
              {t("pillarsTitleBefore")}{" "}
              <span className="text-gradient-gold">
                {t("pillarsTitleAccent")}
              </span>
              {t("pillarsTitleAfter") && ` ${t("pillarsTitleAfter")}`}
              {questionMark}
            </h2>
          </Reveal>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {pillars.map((pillar, index) => (
              <Reveal key={pillar.title} delayMs={index * 100}>
                <div className="flex h-full flex-col items-center justify-between rounded-md border border-border bg-surface p-4 text-center transition-all duration-200 hover:border-gold-primary hover:shadow-gold">
                  <div className="flex flex-col items-center">
                    <span className="flex items-center justify-center text-gold-primary [&>svg]:h-10 [&>svg]:w-10">
                      {pillar.icon}
                    </span>
                    <h3 className="mt-3 font-display text-base font-semibold text-text">
                      {pillar.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
                      {pillar.description}
                    </p>
                  </div>
                  <span className="mt-4 font-mono text-3xl font-bold text-text/10">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* "Become a partner" - a distinct, simpler CTA than CtaBand below
          (which is the general "contact us" band): targets real-estate
          professionals specifically, linking to the standalone
          CommercialLeadForm page rather than opening a contact form here. */}
      <section className="px-4 py-14 sm:px-5 sm:py-14 lg:px-6">
        <Reveal className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gold-primary/12 text-gold-primary">
            <Handshake className="h-7 w-7" />
          </span>
          <h2 className="font-display text-3xl font-semibold text-text sm:text-4xl">
            {t("partnerTitle")}
          </h2>
          <p className="max-w-xl text-text-muted">{t("partnerSubtitle")}</p>
          <Link href="/partner-with-us" className="mt-2">
            <Button>
              {t("partnerButton")}
              <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
            </Button>
          </Link>
        </Reveal>
      </section>

      <CtaBand settings={settings} />
    </div>
  );
}
