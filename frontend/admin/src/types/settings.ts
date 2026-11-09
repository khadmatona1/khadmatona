import type { Locale } from "@/i18n/locales";

/** Public shape (GET /settings) - flat, already resolved to one locale. */
export interface Settings {
  contact_phone: string | null;
  contact_email: string | null;
  contact_whatsapp: string | null;
  address: string | null;
  business_hours_weekdays: string | null;
  business_hours_saturday: string | null;

  social_facebook: string | null;
  social_instagram: string | null;
  social_linkedin: string | null;
  social_whatsapp: string | null;

  hero_eyebrow: string | null;
  hero_title_before: string | null;
  hero_title_accent: string | null;
  hero_title_after: string | null;
  hero_subtitle: string | null;
  /** Feeds only the Hero's own social-proof badge (avatars + "N clients" +
   * stars) - independent from stat2_value, which feeds the separate stats
   * grid further down the page. */
  hero_clients_count: string | null;

  stat1_value: string | null;
  stat1_label: string | null;
  stat2_value: string | null;
  stat2_label: string | null;
  stat3_value: string | null;
  stat3_label: string | null;
  stat4_value: string | null;
  stat4_label: string | null;

  /** Footer "Nous contacter" CTA band's own 4 stat cards - independent from
   * stat1-4 above, which feed the homepage's own "Trust band" stats grid. */
  cta_stat1_value: string | null;
  cta_stat1_label: string | null;
  cta_stat2_value: string | null;
  cta_stat2_label: string | null;
  cta_stat3_value: string | null;
  cta_stat3_label: string | null;
  cta_stat4_value: string | null;
  cta_stat4_label: string | null;
}

/** One translatable field's value across every supported locale. */
export type LocalizedValue = Partial<Record<Locale, string | null>>;

export const TRANSLATABLE_SETTING_FIELDS = [
  "address",
  "business_hours_weekdays",
  "business_hours_saturday",
  "hero_eyebrow",
  "hero_title_before",
  "hero_title_accent",
  "hero_title_after",
  "hero_subtitle",
  "hero_clients_count",
  "stat1_value",
  "stat1_label",
  "stat2_value",
  "stat2_label",
  "stat3_value",
  "stat3_label",
  "stat4_value",
  "stat4_label",
  "cta_stat1_value",
  "cta_stat1_label",
  "cta_stat2_value",
  "cta_stat2_label",
  "cta_stat3_value",
  "cta_stat3_label",
  "cta_stat4_value",
  "cta_stat4_label",
] as const;

export type TranslatableSettingField = (typeof TRANSLATABLE_SETTING_FIELDS)[number];

/** Admin shape (GET /settings/edit) - plain columns plus every
 * translatable field as a per-locale map, for the dashboard's
 * locale-tabbed editor. */
export interface SettingsEdit {
  contact_phone: string | null;
  contact_email: string | null;
  contact_whatsapp: string | null;
  social_facebook: string | null;
  social_instagram: string | null;
  social_linkedin: string | null;
  social_whatsapp: string | null;
  translations: Record<TranslatableSettingField, LocalizedValue>;
}

export interface UpdateSettingsPayload {
  contact_phone?: string | null;
  contact_email?: string | null;
  contact_whatsapp?: string | null;
  social_facebook?: string | null;
  social_instagram?: string | null;
  social_linkedin?: string | null;
  social_whatsapp?: string | null;
  translations?: Partial<Record<Locale, Partial<Record<TranslatableSettingField, string>>>>;
}
