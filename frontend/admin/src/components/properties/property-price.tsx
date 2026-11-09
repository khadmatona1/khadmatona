import { useLocale, useTranslations } from "next-intl";
import type { Property } from "@/types/property";

export function PropertyPrice({ property }: { property: Property }) {
  const locale = useLocale();
  const t = useTranslations("PublicUx");
  const amount = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(property.price);
  return (
    <span className="inline-flex max-w-full flex-col items-end gap-1">
      <span dir="ltr">
        {amount} DH
        {property.transaction_type === "rent" && property.price_period
          ? ` / ${t(property.price_period)}`
          : ""}
      </span>
      <span className="max-w-44 whitespace-normal text-end font-body text-xs font-normal text-text-muted">
        {property.transaction_type === "sale"
          ? t("salePrice")
          : property.transaction_type === "rent" && property.price_period
            ? t("rent")
            : t("priceToConfirm")}
      </span>
    </span>
  );
}
