"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import * as Popover from "@radix-ui/react-popover";
import clsx from "clsx";
import { ChevronDown, Home, MapPin, Pencil, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RangeSlider } from "@/components/ui/range-slider";
import { listCities } from "@/lib/lookup";
import { PROPERTY_TYPES, type PropertyType } from "@/types/property";
import type { City } from "@/types/lookup";

// Matches property-filters.tsx's budget slider bounds - keeps the two price
// filtering UIs (hero quick-search, full filters panel) in sync.
const PRICE_MIN = 0;
const PRICE_MAX = 6_000_000;
const PRICE_STEP = 50_000;

const budgetFormatter = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

// Chevron leads, value follows, category icon trails at the segment's far
// end - matches the reference's "⌄ value 🔧" order within each field. Built
// as a Radix popover instead of a native <select> - the native element's
// dropdown panel is themed by the OS/browser, not by this site's CSS, so it
// could render pale text on a pale background (or the reverse) depending on
// the visitor's system light/dark setting. This popover only ever uses the
// site's own ink/gold tokens, so it reads the same regardless of the
// visitor's OS theme, and the whole trigger row (chevron, text, icon) is one
// button, so every part of it is clickable.
function SelectField({
  icon,
  value,
  onChange,
  ariaLabel,
  displayLabel,
  options,
}: {
  icon: ReactNode;
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  displayLabel: string;
  options: { value: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          className="flex h-14 w-full flex-1 items-center gap-2.5 rounded-md px-6 py-4 text-start transition-colors hover:bg-white/5 sm:h-16"
        >
          <ChevronDown
            className={clsx(
              "h-4 w-4 shrink-0 text-white/60 transition-transform duration-200",
              open && "rotate-180",
            )}
          />
          <span className="min-w-0 flex-1 truncate text-[0.95rem] font-bold text-white">
            {displayLabel}
          </span>
          <span className="shrink-0 text-gold-secondary">{icon}</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          side="bottom"
          collisionPadding={16}
          sideOffset={8}
          className="z-50 w-[max(var(--radix-popover-trigger-width),20rem)] max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-gold-primary/25 bg-ink shadow-2xl outline-none"
        >
          <div className="max-h-64 overflow-y-auto py-1 [-webkit-overflow-scrolling:touch] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={clsx(
                  "flex w-full items-center px-4 py-2.5 text-start text-[0.9rem] transition-colors hover:bg-white/10",
                  option.value === value ? "font-semibold text-gold-primary" : "text-white/85",
                )}
              >
                <span className="whitespace-normal break-words">{option.label}</span>
              </button>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function HeroSearch() {
  const router = useRouter();
  const t = useTranslations("Properties");
  const ux = useTranslations("PublicUx");
  const propertyType = useTranslations("PropertyType");
  const [cities, setCities] = useState<City[]>([]);
  const [cityId, setCityId] = useState<string>("");
  const [type, setType] = useState<PropertyType | "">("");
  const [priceRange, setPriceRange] = useState<[number, number]>([PRICE_MIN, PRICE_MAX]);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState<[string, string]>([String(PRICE_MIN), String(PRICE_MAX)]);
  const draftMin = Number(budgetDraft[0]);
  const draftMax = Number(budgetDraft[1]);
  const validBudget = budgetDraft.every((amount) => amount.trim() !== "") && Number.isFinite(draftMin) && Number.isFinite(draftMax) && draftMin >= PRICE_MIN && draftMax <= PRICE_MAX && draftMin < draftMax;
  function applyBudget() {
    if (!validBudget) return;
    setPriceRange([draftMin, draftMax]);
    setBudgetOpen(false);
  }

  useEffect(() => {
    let cancelled = false;
    listCities()
      .then((result) => {
        if (!cancelled) setCities(result);
      })
      .catch(() => {
        // Non-blocking - the search still works without the city list,
        // it just falls back to "all cities".
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = new URLSearchParams();
    if (cityId) query.set("city_id", cityId);
    if (type) query.set("type", type);
    if (priceRange[0] !== PRICE_MIN) query.set("price_min", String(priceRange[0]));
    if (priceRange[1] !== PRICE_MAX) query.set("price_max", String(priceRange[1]));
    router.push(`/properties${query.toString() ? `?${query.toString()}` : ""}`);
  }

  // Desktop shows the selected range in place of the static label (single
  // line, same trick the city/type fields already use) - the compact
  // slider's own value row only ever fits comfortably on mobile, where each
  // field is its own stacked row instead of sharing one line with the rest.
  const isDefaultBudget = priceRange[0] === PRICE_MIN && priceRange[1] === PRICE_MAX;
  const desktopBudgetLabel = isDefaultBudget
    ? t("budget")
    : `${budgetFormatter.format(priceRange[0])} - ${budgetFormatter.format(priceRange[1])} DH`;

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-3 sm:gap-0 sm:flex-row sm:items-stretch sm:overflow-hidden sm:rounded-full sm:border sm:border-white/10 sm:bg-ink/80 sm:shadow-2xl sm:backdrop-blur-xl"
    >
      <div className="rounded-md bg-ink/95 shadow-lg backdrop-blur-xl sm:rounded-none sm:bg-transparent sm:shadow-none sm:backdrop-blur-none sm:border-e sm:border-gold-primary/15">
        <SelectField
          icon={<MapPin className="h-[17px] w-[17px] text-gold-secondary" />}
          value={cityId}
          onChange={setCityId}
          ariaLabel={t("location")}
          displayLabel={cities.find((city) => String(city.id) === cityId)?.name ?? t("allLocations")}
          options={[
            { value: "", label: t("allLocations") },
            ...cities.map((city) => ({ value: String(city.id), label: city.name })),
          ]}
        />
      </div>

      <div className="rounded-md bg-ink/95 shadow-lg backdrop-blur-xl sm:rounded-none sm:bg-transparent sm:shadow-none sm:backdrop-blur-none sm:border-e sm:border-gold-primary/15">
        <SelectField
          icon={<Home className="h-[17px] w-[17px] text-gold-secondary" />}
          value={type}
          onChange={(next) => setType(next as PropertyType | "")}
          ariaLabel={t("propertyType")}
          displayLabel={type ? propertyType(type) : t("allTypesLong")}
          options={[
            { value: "", label: t("allTypesLong") },
            ...PROPERTY_TYPES.map((value) => ({ value, label: propertyType(value) })),
          ]}
        />
      </div>

      <div className="rounded-md bg-ink/95 shadow-lg backdrop-blur-xl sm:min-w-[17rem] sm:flex-[1.4] sm:rounded-none sm:bg-transparent sm:shadow-none sm:backdrop-blur-none sm:border-e sm:border-gold-primary/15">
        <div className="flex h-14 items-center gap-2.5 px-6 py-4 sm:h-16">
          <Popover.Root open={budgetOpen} onOpenChange={(next) => {
            if (next) setBudgetDraft([String(priceRange[0]), String(priceRange[1])]);
            setBudgetOpen(next);
          }}>
            <Popover.Trigger asChild>
              <button type="button" aria-label={t("priceRange")} className="flex max-w-[9.5rem] min-w-0 shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-2 text-start text-[0.72rem] font-extrabold tracking-wide text-gold-secondary uppercase underline decoration-dashed underline-offset-4 transition-colors hover:bg-gold-primary/15 hover:decoration-solid focus-visible:outline-2 focus-visible:outline-gold-secondary">
                <span className="sm:hidden">{t("budget")}</span>
                <span className="hidden truncate sm:inline">{desktopBudgetLabel}</span>
                <Pencil size={13} className="shrink-0" aria-hidden="true" />
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content align="start" sideOffset={12} collisionPadding={16} className="z-50 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-gold-primary/30 bg-ink p-4 text-white shadow-2xl outline-none">
                <div className="grid grid-cols-2 gap-3" onKeyDown={(event) => {
                  if (event.key === "Enter") { event.preventDefault(); applyBudget(); }
                }}>
                  {([0, 1] as const).map((index) => (
                    <label key={index} className="flex min-w-0 flex-col gap-2 text-xs font-semibold text-white/80">
                      {ux(index === 0 ? "priceMin" : "priceMax")}
                      <input type="number" min={index === 0 ? PRICE_MIN : draftMin} max={index === 0 ? draftMax : PRICE_MAX} step="any" inputMode="decimal" value={budgetDraft[index]} onChange={(event) => setBudgetDraft((current) => index === 0 ? [event.target.value, current[1]] : [current[0], event.target.value])} className="min-h-11 w-full min-w-0 rounded-lg border border-white/20 bg-white/5 px-3 text-sm text-white [color-scheme:dark] focus-visible:outline-2 focus-visible:outline-gold-secondary" />
                    </label>
                  ))}
                </div>
                <Button type="button" className="mt-4 w-full" disabled={!validBudget} onClick={applyBudget}>{ux("applyFilters")}</Button>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
          <div className="min-w-0 flex-1">
            <RangeSlider
              label={t("priceRange")}
              compact
              min={PRICE_MIN}
              max={PRICE_MAX}
              step={PRICE_STEP}
              value={priceRange}
              onChange={setPriceRange}
              formatValue={(amount) => `${budgetFormatter.format(amount)} DH`}
              variant="onDark"
            />
          </div>
        </div>
      </div>

      {/* Plain DOM order (no `order` override) - in the bar's own writing
          direction this lands at the trailing/end edge (visual right in
          ltr, visual left in rtl), matching the reference in both cases. */}
      <Button
        type="submit"
        data-analytics-cta="hero_search"
        size="lg"
        className="h-14 w-full shrink-0 !rounded-md !text-base sm:h-16 sm:w-auto"
      >
        <Search className="h-4 w-4" />
        {t("search")}
      </Button>
    </form>
  );
}
