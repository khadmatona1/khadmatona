import { useTranslations } from "next-intl";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const t = useTranslations("Auth");
  const nav = useTranslations("Nav");

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-8 sm:px-6 sm:py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="mb-1 text-[0.7rem] font-bold tracking-[0.16em] text-gold-primary uppercase">
            {t("backOfficeEyebrow")}
          </p>
          <h1 className="text-balance font-display text-3xl font-semibold text-text sm:text-4xl">
            {nav("brand")} <em className="text-gold-primary not-italic">{nav("brandSuffix")}</em>
          </h1>
        </div>
        <div className="rounded-lg border border-border bg-surface p-6 shadow-md sm:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
