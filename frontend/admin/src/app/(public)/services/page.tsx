import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import { ServiceCard } from "@/components/properties/service-card";
import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";

export async function generateMetadata() {
  const t = await getTranslations("Services");
  return { title: t("title"), description: t("subtitle") };
}

export default function ServicesPage() {
  const t = useTranslations("Services");

  const services = [
    { title: t("service1Title"), description: t("service1Description") },
    { title: t("service2Title"), description: t("service2Description") },
    { title: t("service3Title"), description: t("service3Description") },
    { title: t("service4Title"), description: t("service4Description") },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <Reveal>
        <h1 className="font-display text-3xl font-semibold text-text sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-3 max-w-2xl text-text-muted">{t("subtitle")}</p>
      </Reveal>

      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {services.map((service, index) => (
          <Reveal key={service.title} delayMs={index * 80}>
            <ServiceCard
              index={index + 1}
              title={service.title}
              description={service.description}
              highlight={index === 0}
            />
          </Reveal>
        ))}
      </div>

      <Reveal className="mt-12 rounded-md border border-border bg-surface-muted p-8 text-center">
        <h2 className="font-display text-2xl font-semibold text-text">{t("ctaTitle")}</h2>
        <p className="mx-auto mt-2 max-w-xl text-text-muted">{t("ctaSubtitle")}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link href="/properties">
            <Button>{t("ctaSeeProperties")}</Button>
          </Link>
          <Link href="/contact">
            <Button variant="secondary">{t("ctaContact")}</Button>
          </Link>
        </div>
      </Reveal>
    </div>
  );
}
