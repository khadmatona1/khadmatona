import Link from "next/link";
import { useTranslations } from "next-intl";
import { ClipboardList, Clock, Home as HomeIcon, Mail, MapPin, Phone, Tag, Wallet } from "lucide-react";
import { LogoMark } from "@/components/layout/logo-mark";
import { getSettings } from "@/lib/settings";
import type { Settings } from "@/types/settings";

const SOCIAL_NAMES = ["Facebook", "Instagram", "LinkedIn", "WhatsApp"] as const;

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path
        d="M14 21v-7h2.5l.5-3H14V9.5A1.5 1.5 0 0 1 15.5 8H17V5.2A19 19 0 0 0 14.6 5C12 5 10.5 6.6 10.5 9.2V11H8v3h2.5v7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <rect x="4" y="4" width="16" height="16" rx="4.5" />
      <circle cx="12" cy="12" r="3.6" />
      <circle cx="16.2" cy="7.8" r="0.7" fill="currentColor" stroke="none" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <rect x="4" y="4" width="16" height="16" rx="2.5" />
      <path d="M8.2 10.5v5.5" strokeLinecap="round" />
      <circle cx="8.2" cy="7.8" r="0.15" fill="currentColor" stroke="currentColor" strokeWidth={1.4} />
      <path
        d="M11.5 16v-3.3c0-1.4 1-2.2 2.1-2.2 1.1 0 1.9.8 1.9 2.2V16"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path
        d="M12 21c-1.6 0-3.1-.4-4.4-1.1L4 21l1.1-3.5A8.9 8.9 0 1 1 12 21Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 9.3c0-.5.4-1 1-1h.6c.3 0 .5.2.6.4l.6 1.5c.1.2 0 .5-.1.6l-.5.6c.4.9 1.1 1.6 2 2l.6-.5c.2-.1.4-.2.6-.1l1.5.6c.3.1.4.4.4.6v.6c0 .6-.5 1-1 1-3.5 0-6.3-2.8-6.3-6.3Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronLinkIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3 w-3 shrink-0 rtl:-scale-x-100"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      aria-hidden="true"
    >
      <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const SOCIAL_ICONS: Record<(typeof SOCIAL_NAMES)[number], () => React.JSX.Element> = {
  Facebook: FacebookIcon,
  Instagram: InstagramIcon,
  LinkedIn: LinkedInIcon,
  WhatsApp: WhatsAppIcon,
};

/**
 * Each platform's own official brand color - a deliberate exception to the
 * site's own 6-color palette (globals.css), since these badges represent
 * someone else's brand identity, not KHADMATONA's. Instagram uses its real
 * multi-stop brand gradient rather than a flat swatch, same as everywhere
 * Instagram's own badge appears.
 */
const SOCIAL_BACKGROUNDS: Record<(typeof SOCIAL_NAMES)[number], string> = {
  Facebook: "#1877F2",
  Instagram: "radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)",
  LinkedIn: "#0A66C2",
  WhatsApp: "#25D366",
};


export async function SiteFooter() {
  const settings = await getSettings();

  return <SiteFooterContent settings={settings} />;
}

function SiteFooterContent({ settings }: { settings: Settings }) {
  const t = useTranslations("Footer");
  const nav = useTranslations("Nav");
  const services = useTranslations("Services");

  // The former standalone "Liens utiles" column only ever had this one
  // link (the sell/rent anchor - "Nos agences"/"Conditions d'utilisation"/
  // "Politique de confidentialité"/"FAQ" don't have pages yet) - folded in
  // here instead of keeping a whole column for a single item.
  const quickLinks = [
    { href: "/properties", label: t("propertiesLink") },
    { href: "/services", label: nav("services") },
    { href: "/about", label: nav("about") },
    { href: "/contact", label: nav("contact") },
    { href: "/#vendre-louer", label: t("estimateMyProperty") },
  ];

  // Surfaces the site's real service names (same copy as the /services
  // page) rather than inventing new ones - every link points at that one
  // page since there are no individual per-service routes. Icons are
  // decorative-only, one per real service, matching the reference's
  // icon-per-item treatment.
  const serviceLinks = [
    { label: services("service1Title"), icon: Wallet },
    { label: services("service2Title"), icon: Tag },
    { label: services("service3Title"), icon: HomeIcon },
    { label: services("service4Title"), icon: ClipboardList },
  ];

  const socialLinks: Record<(typeof SOCIAL_NAMES)[number], string | null> = {
    Facebook: settings.social_facebook,
    Instagram: settings.social_instagram,
    LinkedIn: settings.social_linkedin,
    WhatsApp: settings.social_whatsapp,
  };

  const address = settings.address ?? "";

  return (
    <footer className="border-t border-border bg-surface-deep">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-12 sm:grid-cols-2 sm:px-5 lg:grid-cols-4 lg:px-6">
        <div className="sm:col-span-2 lg:col-span-1 lg:border-e lg:border-gold-primary/25 lg:pe-8">
          <Link
            href="/"
            aria-label={`${nav("brand")} ${nav("brandSuffix")}`}
            className="flex w-fit shrink-0 items-center transition-opacity hover:opacity-85"
          >
            <LogoMark className="h-16 w-auto shrink-0" />
          </Link>
          <p className="mt-3 text-[0.7rem] font-bold tracking-[0.2em] text-gold-primary uppercase">
            {nav("tagline")}
          </p>
          <p className="mt-3 max-w-xs text-sm text-text-muted">{t("tagline")}</p>

          <p className="mt-5 text-[0.7rem] font-bold tracking-wide text-text-muted uppercase">
            {t("followUs")}
          </p>
          <div className="mt-3 flex items-center gap-2">
            {SOCIAL_NAMES.map((name) => {
              const href = socialLinks[name];
              if (!href) return null;
              const Icon = SOCIAL_ICONS[name];
              return (
                <a
                  key={name}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={name}
                  // `bg-surface-muted` (theme-reactive, not fixed `bg-ink`) -
                  // this footer section itself flips light/dark with the
                  // toggle, so the chip should too: light in light mode,
                  // dark in dark mode, rather than always being a dark
                  // square that reads as a mismatched jarring spot on an
                  // otherwise light page.
                  //
                  // Kept as a CSS custom property, not `style.background`
                  // directly - an inline `background` would always beat the
                  // `hover:[background:...]` class below (inline styles
                  // outrank classes regardless of :hover), which is exactly
                  // the "brand color only on hover" behavior this needs.
                  style={{ "--social-bg": SOCIAL_BACKGROUNDS[name] } as React.CSSProperties}
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-gold-primary bg-surface-muted text-gold-primary shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:text-white hover:shadow-md hover:[background:var(--social-bg)]"
                >
                  <Icon />
                </a>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-3 text-[0.7rem] font-bold tracking-wide text-text-muted uppercase">
            {t("services")}
          </p>
          <ul className="flex flex-col gap-2.5 text-sm">
            {serviceLinks.map(({ label, icon: Icon }) => (
              <li key={label}>
                <Link
                  href="/services"
                  className="flex items-center gap-2 text-text-muted hover:text-gold-primary"
                >
                  <Icon className="h-4 w-4 shrink-0 text-gold-primary" aria-hidden="true" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-3 text-[0.7rem] font-bold tracking-wide text-text-muted uppercase">
            {t("navigation")}
          </p>
          <ul className="flex flex-col gap-2 text-sm">
            {quickLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="flex items-center gap-1.5 text-text-muted hover:text-gold-primary"
                >
                  <ChevronLinkIcon />
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-3 text-[0.7rem] font-bold tracking-wide text-text-muted uppercase">
            {t("contact")}
          </p>
          <ul className="flex flex-col gap-2.5 text-sm text-text-muted">
            {settings.contact_phone && (
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-gold-primary" aria-hidden="true" />
                <a
                  href={`tel:${settings.contact_phone.replace(/\s+/g, "")}`}
                  className="hover:text-gold-primary"
                  dir="ltr"
                >
                  {settings.contact_phone}
                </a>
              </li>
            )}
            {settings.contact_email && (
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-gold-primary" aria-hidden="true" />
                <a href={`mailto:${settings.contact_email}`} className="hover:text-gold-primary" dir="ltr">
                  {settings.contact_email}
                </a>
              </li>
            )}
            <li className="flex items-start gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-gold-primary" aria-hidden="true" />
              {address}
            </li>
            <li className="flex items-start gap-2">
              <Clock className="h-4 w-4 shrink-0 text-gold-primary" aria-hidden="true" />
              <span className="flex flex-col gap-2.5">
                <span>{settings.business_hours_weekdays}</span>
                <span>{settings.business_hours_saturday}</span>
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-3 px-4 py-5 text-[0.78rem] text-text-muted sm:grid-cols-3 sm:px-5 lg:px-6">
          <p>
            © {new Date().getFullYear()} {nav("brand")} {nav("brandSuffix")}. {t("rights")}
          </p>
          <p className="flex items-center justify-center gap-3 text-gold-primary/90 italic">
            <span className="hidden h-px w-10 bg-gold-primary/30 sm:block" aria-hidden="true" />
            {t("madeWith")}
            <span className="hidden h-px w-10 bg-gold-primary/30 sm:block" aria-hidden="true" />
          </p>
          <p className="sm:text-end">{t("location")}</p>
        </div>
      </div>
    </footer>
  );
}
