import Link from "next/link";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import { PropertyImage } from "@/components/properties/property-image";
import { PropertyPrice } from "@/components/properties/property-price";
import { MapPin } from "lucide-react";
import { CARD_INTERACTIVE_CLASSES } from "@/components/ui/card";
import { PropertyStatusBadge } from "@/components/properties/status-badge";
import type { Property } from "@/types/property";

function BedIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[15px] w-[15px]"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
    >
      <path
        d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 18v2M21 18v2M3 12V8a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BathIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[15px] w-[15px]"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
    >
      <path
        d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-3Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M6 12V6a2 2 0 0 1 3.2-1.6" strokeLinecap="round" />
    </svg>
  );
}

function SurfaceIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[15px] w-[15px]"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
    >
      <path
        d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PropertyCard({
  property,
  showStatus = true,
}: {
  property: Property;
  showStatus?: boolean;
}) {
  const propertyType = useTranslations("PropertyType");

  return (
    <Link
      href={`/properties/${property.id}`}
      className={clsx(
        "group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm",
        CARD_INTERACTIVE_CLASSES,
      )}
    >
      <div className="relative mx-3 mt-3 aspect-[4/3] overflow-hidden rounded-xl bg-gradient-to-br from-charcoal to-ink">
        <PropertyImage
          src={property.cover_image}
          alt={property.title}
          className="transition-transform duration-300 group-hover:scale-105"
        />
        {showStatus && (
          <div className="absolute top-2 start-2">
            <PropertyStatusBadge status={property.status} />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 px-5 pt-4 pb-5">
        <div className="flex flex-wrap items-start justify-between gap-2 text-sm font-medium text-text-muted">
          <span className="flex min-w-0 items-center gap-1.5">
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="truncate">{property.city_name}</span>
          </span>
          <span
            className="shrink-0 font-mono text-base font-bold text-gold-primary"
            dir="ltr"
          >
            <PropertyPrice property={property} />
          </span>
        </div>

        <p className="truncate font-display text-lg font-semibold text-text">
          {property.title}
        </p>

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.76rem] text-text-muted">
          <span className="flex items-center gap-1.5">
            <BedIcon />
            {property.bedrooms}
          </span>
          <span className="flex items-center gap-1.5">
            <BathIcon />
            {property.bathrooms}
          </span>
          <span className="flex items-center gap-1.5">
            <SurfaceIcon />
            {property.surface} m²
          </span>
          <span className="text-[0.7rem] font-semibold text-gold-primary uppercase">
            {propertyType(property.type)}
          </span>
        </div>
      </div>
    </Link>
  );
}
