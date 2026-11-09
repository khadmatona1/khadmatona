import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import { Reveal } from "@/components/ui/reveal";

export async function generateMetadata() {
  const t = await getTranslations("About");
  return { title: t("title"), description: t("paragraph1") };
}

export default function AboutPage() {
  const t = useTranslations("About");

  const values = [
    { title: t("value1Title"), description: t("value1Description") },
    { title: t("value2Title"), description: t("value2Description") },
    { title: t("value3Title"), description: t("value3Description") },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <Reveal>
        <p className="mb-2 text-[0.72rem] font-bold tracking-[0.16em] text-gold-primary uppercase">
          {t("eyebrow")}
        </p>
        <h1 className="font-display text-3xl font-semibold text-text sm:text-4xl">
          {t("title")}
        </h1>
      </Reveal>

      <Reveal className="mt-6 flex flex-col gap-4 text-[0.98rem] leading-relaxed text-text-muted">
        <p>{t("paragraph1")}</p>
        <p>{t("paragraph2")}</p>
        <p>{t("paragraph3")}</p>
      </Reveal>

      <Reveal className="mt-12">
        <h2 className="font-display text-2xl font-semibold text-text">{t("valuesTitle")}</h2>
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {values.map((value) => (
            <div key={value.title} className="rounded-md border border-border bg-surface p-5 shadow-sm">
              <h3 className="font-display text-lg font-semibold text-text">{value.title}</h3>
              <p className="mt-2 text-[0.9rem] text-text-muted">{value.description}</p>
            </div>
          ))}
        </div>
      </Reveal>
    </div>
  );
}
