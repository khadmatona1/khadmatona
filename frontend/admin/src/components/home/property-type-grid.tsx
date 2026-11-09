import Link from "next/link";
import type { ReactElement } from "react";
import { useTranslations } from "next-intl";
import { PROPERTY_TYPES, type PropertyType } from "@/types/property";

function ApartmentIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="M6 20V5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v15" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 20h12M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1" strokeLinecap="round" />
    </svg>
  );
}

function VillaIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="M4 12 12 5l8 7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 11v9h12v-9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 20c1 -1 2 -1 3 0s2 1 3 0 2 -1 3 0" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RiadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="M5 20V11a7 7 0 0 1 14 0v9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 20h14M10 20v-5a2 2 0 0 1 4 0v5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MaisonIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="M4 11.5 12 4l8 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 10v9h12v-9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 19v-5h4v5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TerrainIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="M4 5v3M4 5h3M20 5v3M20 5h-3M4 19v-3M4 19h3M20 19v-3M20 19h-3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m4 16 4-5 3 3 4-6 5 8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BureauIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 6V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1M4 12h16" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LocalIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="M4 9.5 5 5h14l1 4.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 9.5a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 9.5V19h14V9.5M10 19v-5h4v5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const TYPE_ICONS: Record<PropertyType, () => ReactElement> = {
  appartement: ApartmentIcon,
  villa: VillaIcon,
  riad: RiadIcon,
  maison: MaisonIcon,
  terrain: TerrainIcon,
  bureau: BureauIcon,
  local: LocalIcon,
};

// "riad" is left out of this homepage browse-by-type grid only - it stays
// a full property type everywhere else (search, filters, admin form); this
// component just decides what to display here.
const DISPLAYED_TYPES = PROPERTY_TYPES.filter((type) => type !== "riad");

export function PropertyTypeGrid() {
  const propertyType = useTranslations("PropertyType");

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {DISPLAYED_TYPES.map((type) => {
        const Icon = TYPE_ICONS[type];
        return (
          <Link
            key={type}
            href={`/properties?type=${type}`}
            className="group flex flex-col items-center gap-3 rounded-md border border-border bg-surface p-5 text-center shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-gold-primary/40 hover:shadow-lg"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-primary/10 text-gold-primary transition-colors group-hover:bg-gradient-gold group-hover:text-white">
              <Icon />
            </span>
            <span className="text-[0.85rem] font-semibold text-text">{propertyType(type)}</span>
          </Link>
        );
      })}
    </div>
  );
}
