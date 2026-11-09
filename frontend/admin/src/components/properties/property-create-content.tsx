"use client";

import { useTranslations } from "next-intl";
import { PropertyForm } from "@/components/properties/property-form";
import { modal } from "@/lib/modal";
import { createProperty } from "@/lib/properties";
import type { DashboardProperty, PropertyFormValues } from "@/types/property";

export function PropertyCreateContent({ onCreated }: { onCreated?: (property: DashboardProperty) => void }) {
  const t = useTranslations("DashboardProperties");

  async function handleSubmit(values: PropertyFormValues) {
    const property = await createProperty(values);
    onCreated?.(property);
    modal.success(t("createSuccess"));
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-xl font-semibold text-text">{t("newTitle")}</h2>
        <p className="mt-1 text-sm text-text-muted">{t("newSubtitle")}</p>
      </div>

      <PropertyForm submitLabel={t("createSubmit")} onSubmit={handleSubmit} />
    </div>
  );
}
