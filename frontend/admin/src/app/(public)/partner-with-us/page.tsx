import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import { CommercialLeadForm } from "@/components/commercial-leads/commercial-lead-form";
import { Card } from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";

export async function generateMetadata() {
  const t = await getTranslations("CommercialLeadForm");
  return { title: t("pageTitle"), description: t("pageSubtitle") };
}

export default function PartnerWithUsPage() {
  const t = useTranslations("CommercialLeadForm");

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <Reveal>
        <h1 className="font-display text-3xl font-semibold text-text sm:text-4xl">
          {t("pageTitle")}
        </h1>
        <p className="mt-3 max-w-2xl text-text-muted">{t("pageSubtitle")}</p>
      </Reveal>

      <Reveal className="mt-10">
        <Card radius="md">
          <CommercialLeadForm />
        </Card>
      </Reveal>
    </div>
  );
}
