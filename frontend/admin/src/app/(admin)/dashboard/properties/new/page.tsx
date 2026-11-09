"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { modal } from "@/lib/modal";
import { Card } from "@/components/ui/card";
import { PropertyForm } from "@/components/properties/property-form";
import { createProperty } from "@/lib/properties";
import type { PropertyFormValues } from "@/types/property";

export default function NewPropertyPage() {
  const router = useRouter();
  const t = useTranslations("DashboardProperties");

  async function handleSubmit(values: PropertyFormValues) {
    const property = await createProperty(values);
    modal.success(t("createSuccess"));
    router.push(`/dashboard/properties/${property.id}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text sm:text-3xl">
          {t("newTitle")}
        </h1>
        <p className="mt-1 text-sm text-text-muted">{t("newSubtitle")}</p>
      </div>

      <Card className="w-full max-w-3xl">
        <PropertyForm submitLabel={t("createSubmit")} onSubmit={handleSubmit} />
      </Card>
    </div>
  );
}
