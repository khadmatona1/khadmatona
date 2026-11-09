import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PropertyRegistrationForm } from "@/components/leads/property-registration-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PropertyRegistration");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default function RegisterPropertyPage() {
  return <PropertyRegistrationForm />;
}
