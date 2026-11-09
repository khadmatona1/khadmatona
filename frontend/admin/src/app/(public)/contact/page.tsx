import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import { LeadForm } from "@/components/leads/lead-form";
import { Card } from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";
import { getSettings } from "@/lib/settings";
import type { Settings } from "@/types/settings";

export async function generateMetadata() {
  const t = await getTranslations("Contact");
  return { title: t("title"), description: t("subtitle") };
}

function PinIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 shrink-0 text-gold-primary"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="9.5" r="2.2" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 shrink-0 text-gold-primary"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        d="M4 5c0 8.284 6.716 15 15 15l2-4-5-3-2 2a11.05 11.05 0 0 1-5-5l2-2-3-5Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 shrink-0 text-gold-primary"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default async function ContactPage() {
  const settings = await getSettings();

  return <ContactPageContent settings={settings} />;
}

function ContactPageContent({ settings }: { settings: Settings }) {
  const t = useTranslations("Contact");
  const leads = useTranslations("Leads");
  const ux = useTranslations("PublicUx");

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <Reveal>
        <h1 className="font-display text-3xl font-semibold text-text sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-3 max-w-xl text-text-muted">{t("subtitle")}</p>
        <p className="mt-3 max-w-xl text-sm text-text-muted">
          {ux("contactHint")}
        </p>
      </Reveal>

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <Reveal className="lg:col-span-2">
          <Card radius="md">
            <LeadForm type="contact" submitLabel={leads("sendMessage")} />
          </Card>
        </Reveal>

        <Reveal>
          <Card radius="md" className="flex flex-col gap-5">
            <div className="flex items-start gap-3">
              <PinIcon />
              <div>
                <p className="font-semibold text-text">{t("address")}</p>
                <p className="text-[0.9rem] text-text-muted">
                  {settings.address}
                </p>
              </div>
            </div>
            {settings.contact_phone && (
              <div className="flex items-start gap-3">
                <PhoneIcon />
                <div>
                  <p className="font-semibold text-text">{t("phone")}</p>
                  <a
                    href={`tel:${settings.contact_phone.replace(/\s+/g, "")}`}
                    className="text-[0.9rem] text-text-muted hover:text-gold-primary"
                    dir="ltr"
                  >
                    {settings.contact_phone}
                  </a>
                </div>
              </div>
            )}
            {settings.contact_email && (
              <div className="flex items-start gap-3">
                <MailIcon />
                <div>
                  <p className="font-semibold text-text">{t("email")}</p>
                  <a
                    href={`mailto:${settings.contact_email}`}
                    className="text-[0.9rem] text-text-muted hover:text-gold-primary"
                    dir="ltr"
                  >
                    {settings.contact_email}
                  </a>
                </div>
              </div>
            )}
            <div className="border-t border-border pt-4 text-[0.85rem] text-text-muted">
              <p>{settings.business_hours_weekdays}</p>
              <p>{settings.business_hours_saturday}</p>
            </div>
          </Card>
        </Reveal>
      </div>
    </div>
  );
}
