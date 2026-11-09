"use client";

import { useState, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { Select } from "@/components/ui/select";
import {
  COMMERCIAL_LEAD_STATUSES,
  PROFESSIONAL_TYPES,
  type CommercialLeadStatus,
  type ProfessionalType,
} from "@/types/commercial-lead";

export interface CommercialLeadFiltersValue {
  professionalType: ProfessionalType | "";
  status: CommercialLeadStatus | "";
  city: string;
  createdFrom: string;
  createdTo: string;
}

export const EMPTY_COMMERCIAL_LEAD_FILTERS: CommercialLeadFiltersValue = {
  professionalType: "",
  status: "",
  city: "",
  createdFrom: "",
  createdTo: "",
};

export function CommercialLeadFilters({
  value,
  onChange,
}: {
  value: CommercialLeadFiltersValue;
  onChange: (next: CommercialLeadFiltersValue) => void;
}) {
  const t = useTranslations("DashboardCommercialLeads");
  const professionalType = useTranslations("ProfessionalType");
  const status = useTranslations("CommercialLeadStatus");
  // City applies on blur/Enter rather than every keystroke (like the list's
  // own search box) so typing a city name doesn't refetch on every letter.
  const [cityDraft, setCityDraft] = useState(value.city);

  function applyCity() {
    if (cityDraft !== value.city) onChange({ ...value, city: cityDraft });
  }

  function handleCityKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      applyCity();
    }
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Select
        label={t("filterProfessionalType")}
        value={value.professionalType}
        onChange={(event) =>
          onChange({ ...value, professionalType: event.target.value as ProfessionalType | "" })
        }
      >
        <option value="">{t("filterAllProfessionalTypes")}</option>
        {PROFESSIONAL_TYPES.map((type) => (
          <option key={type} value={type}>
            {professionalType(type)}
          </option>
        ))}
      </Select>

      <Select
        label={t("filterStatus")}
        value={value.status}
        onChange={(event) =>
          onChange({ ...value, status: event.target.value as CommercialLeadStatus | "" })
        }
      >
        <option value="">{t("filterAllStatuses")}</option>
        {COMMERCIAL_LEAD_STATUSES.map((s) => (
          <option key={s} value={s}>
            {status(s)}
          </option>
        ))}
      </Select>

      <div className="flex flex-col gap-2">
        <label htmlFor="filter-city" className="text-sm font-bold text-text">
          {t("filterCity")}
        </label>
        <input
          id="filter-city"
          type="text"
          value={cityDraft}
          onChange={(event) => setCityDraft(event.target.value)}
          onBlur={applyCity}
          onKeyDown={handleCityKeyDown}
          placeholder={t("filterCityPlaceholder")}
          className="w-full rounded-sm border-[1.5px] border-border-strong bg-surface px-3.5 py-2.5 text-[0.95rem] text-text focus-visible:border-gold-primary"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="filter-created-from" className="text-sm font-bold text-text">
            {t("filterDateFrom")}
          </label>
          <input
            id="filter-created-from"
            type="date"
            value={value.createdFrom}
            onChange={(event) => onChange({ ...value, createdFrom: event.target.value })}
            className="w-full rounded-sm border-[1.5px] border-border-strong bg-surface px-3 py-2.5 text-[0.9rem] text-text focus-visible:border-gold-primary"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="filter-created-to" className="text-sm font-bold text-text">
            {t("filterDateTo")}
          </label>
          <input
            id="filter-created-to"
            type="date"
            value={value.createdTo}
            onChange={(event) => onChange({ ...value, createdTo: event.target.value })}
            className="w-full rounded-sm border-[1.5px] border-border-strong bg-surface px-3 py-2.5 text-[0.9rem] text-text focus-visible:border-gold-primary"
          />
        </div>
      </div>
    </div>
  );
}
