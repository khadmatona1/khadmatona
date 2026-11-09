"use client";

import { useTranslations } from "next-intl";
import { Select } from "@/components/ui/select";
import type { PublishMode, SocialPreferences } from "@/types/social";

/** Shared by the new-listing form and the existing-listing panel. */
export function SocialPreferencesFields({
  value,
  onChange,
}: {
  value: SocialPreferences;
  onChange: (value: SocialPreferences) => void;
}) {
  const t = useTranslations("SocialPublishing");

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          checked={value.facebook}
          onChange={(event) => onChange({ ...value, facebook: event.target.checked })}
          className="h-4 w-4 accent-gold-primary"
        />
        {t("publishToFacebook")}
      </label>
      <label className="flex items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          checked={value.instagram}
          onChange={(event) => onChange({ ...value, instagram: event.target.checked })}
          className="h-4 w-4 accent-gold-primary"
        />
        {t("publishToInstagram")}
      </label>
      <Select
        label={t("mode")}
        value={value.mode}
        onChange={(event) => onChange({ ...value, mode: event.target.value as PublishMode })}
      >
        <option value="manual">{t("modeManual")}</option>
        <option value="auto">{t("modeAuto")}</option>
      </Select>
    </div>
  );
}
