"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { ArrowRightLeft, BadgeCheck, Banknote, Building2, CalendarDays, MapPin, Pencil, RotateCcw, Ruler, Search, SlidersHorizontal, X, type LucideIcon } from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import { FilterCombobox } from "@/components/ui/filter-combobox";
import { RangeSlider } from "@/components/ui/range-slider";
import { listCities } from "@/lib/lookup";
import {
  PROPERTY_TYPES,
  type PropertyStatus,
  type PropertyType,
} from "@/types/property";
import type { City } from "@/types/lookup";

const PRICE_MAX = 6_000_000;
const budgetFormatter = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

function FilterCaption({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return <span className="flex items-center gap-2"><Icon size={16} className="shrink-0 text-gold-primary" aria-hidden="true" />{children}</span>;
}

export interface PropertyFiltersValue {
  search: string;
  type: PropertyType | "";
  status: PropertyStatus | "";
  cityId: string;
  transactionType: "sale" | "rent" | "";
  pricePeriod: "month" | "night" | "";
  priceMin: string;
  priceMax: string;
  surfaceMin: string;
  surfaceMax: string;
}
export const EMPTY_PROPERTY_FILTERS: PropertyFiltersValue = {
  search: "",
  type: "",
  status: "",
  cityId: "",
  transactionType: "",
  pricePeriod: "",
  priceMin: "",
  priceMax: "",
  surfaceMin: "",
  surfaceMax: "",
};

export function PropertyFilters({
  initialValue = EMPTY_PROPERTY_FILTERS,
  onApply,
}: {
  initialValue?: PropertyFiltersValue;
  onApply: (value: PropertyFiltersValue) => void;
}) {
  const t = useTranslations("Properties");
  const ux = useTranslations("PublicUx");
  const pt = useTranslations("PropertyType");
  const ps = useTranslations("PropertyStatus");
  const [value, setValue] = useState(initialValue);
  const [open, setOpen] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState<[string, string]>(["", ""]);
  const validBudget = budgetDraft.every((amount) => amount === "" || (Number.isFinite(Number(amount)) && Number(amount) >= 0))
    && (!budgetDraft[0] || !budgetDraft[1] || Number(budgetDraft[0]) <= Number(budgetDraft[1]));
  function applyBudget() {
    if (!validBudget) return;
    setValue((current) => ({ ...current, priceMin: budgetDraft[0], priceMax: budgetDraft[1] }));
    setBudgetOpen(false);
  }
  const sliderMax = Math.max(PRICE_MAX, Number(value.priceMax) || 0, (Number(value.priceMin) || 0) + 50_000);
  const budgetLabel = !value.priceMin && !value.priceMax
    ? t("budget")
    : `${budgetFormatter.format(Number(value.priceMin) || 0)} - ${value.priceMax ? `${budgetFormatter.format(Number(value.priceMax))} DH` : ux("noMaximum")}`;
  const [cities, setCities] = useState<City[]>([]);
  const [cityError, setCityError] = useState(false);
  useEffect(() => {
    let active = true;
    listCities()
      .then((data) => {
        if (active) setCities(data);
      })
      .catch(() => {
        if (active) setCityError(true);
      });
    return () => {
      active = false;
    };
  }, []);
  function set<K extends keyof PropertyFiltersValue>(
    key: K,
    next: PropertyFiltersValue[K],
  ) {
    setValue((current) => ({ ...current, [key]: next }));
  }
  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onApply(value);
    setOpen(false);
  }
  const advanced = Object.entries(initialValue).filter(
    ([key, val]) => key !== "search" && val !== "",
  );
  const field =
    "min-h-12 w-full min-w-0 rounded-xl border border-border-strong bg-surface px-3 text-base text-text transition-colors hover:border-gold-primary/60 focus-visible:outline-2 focus-visible:outline-gold-primary";
  const label = "flex min-w-0 flex-col gap-2 text-sm font-semibold text-text";
  const chips: { key: keyof PropertyFiltersValue; text: string }[] =
    advanced.map(([key, val]) => ({
      key: key as keyof PropertyFiltersValue,
      text:
        key === "type"
          ? pt(val as PropertyType)
          : key === "status"
            ? ps(val as PropertyStatus)
            : key === "cityId"
              ? (cities.find((c) => String(c.id) === val)?.name ??
                t("location"))
              : key === "transactionType"
                ? ux(val === "sale" ? "buy" : "rent")
                : key === "pricePeriod"
                  ? ux(val as "month" | "night")
                  : `${ux(key as "priceMin" | "priceMax" | "surfaceMin" | "surfaceMax")}: ${val}`,
    }));
  return (
    <form
      onSubmit={apply}
      className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5"
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className={`${label} min-w-40 flex-1`} htmlFor="filter-search">
          <FilterCaption icon={Search}>{t("search")}</FilterCaption>
          <input
            id="filter-search"
            name="search"
            type="search"
            value={value.search}
            onChange={(e) => set("search", e.target.value)}
            placeholder={t("searchPlaceholder")}
            className={field}
          />
        </label>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="advanced-property-filters"
          onClick={() => setOpen(!open)}
          className="flex min-h-12 items-center gap-2 rounded-xl border border-border-strong px-4 text-sm font-semibold text-text lg:hidden"
        >
          <SlidersHorizontal size={18} />
          {ux("filters")}
          {advanced.length > 0 && <span>({advanced.length})</span>}
        </button>
        <button
          type="submit"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-gold px-5 font-semibold text-ink transition-opacity hover:opacity-90"
        >
          <Search size={18} aria-hidden="true" />
          {t("search")}
        </button>
      </div>
      <div
        id="advanced-property-filters"
        className={`${open ? "grid" : "hidden"} mt-5 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid lg:grid-cols-4`}
      >
        <label className={label}>
          <FilterCaption icon={ArrowRightLeft}>{ux("transaction")}</FilterCaption>
          <FilterCombobox
            className={field}
            value={value.transactionType}
            onChange={(e) =>
              setValue((v) => ({
                ...v,
                transactionType: e.target
                  .value as PropertyFiltersValue["transactionType"],
                pricePeriod: e.target.value === "rent" ? "month" : "",
                priceMin: "",
                priceMax: "",
              }))
            }
          >
            <option value="">{ux("allTransactions")}</option>
            <option value="sale">{ux("buy")}</option>
            <option value="rent">{ux("rent")}</option>
          </FilterCombobox>
        </label>
        <label className={label}>
          <FilterCaption icon={MapPin}>{t("location")}</FilterCaption>
          <FilterCombobox
            className={field}
            value={value.cityId}
            onChange={(e) => set("cityId", e.target.value)}
          >
            <option value="">{t("allLocations")}</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </FilterCombobox>
        </label>
        <label className={label}>
          <FilterCaption icon={Building2}>{t("propertyType")}</FilterCaption>
          <FilterCombobox
            className={field}
            value={value.type}
            onChange={(e) => set("type", e.target.value as PropertyType)}
          >
            <option value="">{t("allTypes")}</option>
            {PROPERTY_TYPES.map((type) => (
              <option key={type} value={type}>
                {pt(type)}
              </option>
            ))}
          </FilterCombobox>
        </label>
        <div className={label}>
          <FilterCaption icon={BadgeCheck}>{t("status")}</FilterCaption>
          <div className="flex min-h-12 items-center gap-2 rounded-xl border border-gold-primary/30 bg-gold-primary/10 px-3 text-sm font-semibold text-text">
            <BadgeCheck size={18} className="text-gold-primary" aria-hidden="true" />
            {ps("disponible")}
          </div>
        </div>
        {value.transactionType === "rent" && (
          <label className={label}>
            <FilterCaption icon={CalendarDays}>{ux("pricePeriod")}</FilterCaption>
            <FilterCombobox
              value={value.pricePeriod}
              onChange={(e) =>
                setValue((v) => ({
                  ...v,
                  pricePeriod: e.target
                    .value as PropertyFiltersValue["pricePeriod"],
                  priceMin: "",
                  priceMax: "",
                }))
              }
              className={field}
            >
              <option value="">{ux("allPeriods")}</option>
              <option value="month">{ux("month")}</option>
              <option value="night">{ux("night")}</option>
            </FilterCombobox>
          </label>
        )}
        <div className={`${label} rounded-2xl border border-border bg-gold-primary/5 p-4 sm:col-span-2`}>
          <FilterCaption icon={Banknote}>{t("budget")}</FilterCaption>
          <div className="flex min-h-12 flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Popover.Root open={budgetOpen} onOpenChange={(next) => {
              if (next) setBudgetDraft([value.priceMin, value.priceMax]);
              setBudgetOpen(next);
            }}>
              <Popover.Trigger asChild>
                <button type="button" aria-label={t("priceRange")} className="flex min-w-0 shrink-0 items-center justify-between gap-2 rounded-lg border border-border-strong bg-surface px-3 py-2 text-start text-xs font-bold text-gold-primary transition-colors hover:border-gold-primary focus-visible:outline-2 focus-visible:outline-gold-primary sm:max-w-[55%]">
                  <span className="break-words">{budgetLabel}</span>
                  <Pencil size={13} className="shrink-0" aria-hidden="true" />
                </button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content align="start" sideOffset={12} collisionPadding={16} className="z-50 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-border-strong bg-surface p-4 text-text shadow-2xl outline-none">
                  <div className="grid grid-cols-2 gap-3" onKeyDown={(event) => {
                    if (event.key === "Enter") { event.preventDefault(); applyBudget(); }
                  }}>
                    {([0, 1] as const).map((index) => (
                      <label key={index} className="flex min-w-0 flex-col gap-2 text-xs font-semibold text-text-muted">
                        {ux(index === 0 ? "priceMin" : "priceMax")}
                        <input type="number" min="0" step="any" inputMode="decimal" value={budgetDraft[index]} placeholder={index === 0 ? "0" : ux("noMaximum")} onChange={(event) => setBudgetDraft((current) => index === 0 ? [event.target.value, current[1]] : [current[0], event.target.value])} className={field} />
                      </label>
                    ))}
                  </div>
                  <button type="button" className="mt-4 min-h-11 w-full rounded-xl bg-gradient-gold px-4 font-semibold text-ink disabled:opacity-50" disabled={!validBudget} onClick={applyBudget}>{ux("applyFilters")}</button>
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
            <div className="min-w-0 flex-1">
              <RangeSlider label={t("priceRange")} compact min={0} max={sliderMax} step={50_000} value={[Number(value.priceMin) || 0, Number(value.priceMax) || sliderMax]} onChange={([min, max]) => setValue((current) => ({ ...current, priceMin: min === 0 ? "" : String(min), priceMax: max === sliderMax ? "" : String(max) }))} formatValue={(amount) => `${budgetFormatter.format(amount)} DH`} />
            </div>
          </div>
        </div>
        <fieldset className="min-w-0 rounded-2xl border border-border bg-gold-primary/5 p-4 sm:col-span-2">
          <legend className="sr-only">{ux("surfaceMin")} / {ux("surfaceMax")}</legend>
          <div className="grid grid-cols-2 gap-3">
        {(["surfaceMin", "surfaceMax"] as const).map(
          (key) => (
            <label key={key} className={label}>
              <FilterCaption icon={Ruler}>{ux(key)}</FilterCaption>
              <input
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                value={value[key]}
                onChange={(e) => set(key, e.target.value)}
                max={
                  key === "surfaceMin"
                      ? value.surfaceMax || undefined
                      : undefined
                }
                placeholder={key.endsWith("Max") ? ux("noMaximum") : "0"}
                className={field}
              />
            </label>
          ),
        )}
          </div>
        </fieldset>
        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4 sm:col-span-2 lg:col-span-4">
          <button
            type="submit"
            className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-gold px-5 font-semibold text-ink transition-opacity hover:opacity-90 sm:flex-none"
          >
            <Search size={18} aria-hidden="true" />
            {ux("applyFilters")}
          </button>
          <button
            type="button"
            onClick={() => {
              setValue(EMPTY_PROPERTY_FILTERS);
              onApply(EMPTY_PROPERTY_FILTERS);
              setOpen(false);
            }}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold text-text-muted transition-colors hover:bg-gold-primary/10 hover:text-text focus-visible:outline-2 focus-visible:outline-gold-primary"
          >
            <RotateCcw size={16} aria-hidden="true" />
            {t("resetFilters")}
          </button>
        </div>
        {cityError && (
          <p className="text-sm text-text-muted sm:col-span-2">
            {ux("citiesUnavailable")}
          </p>
        )}
      </div>
      {(chips.length > 0 || initialValue.search) && (
        <div
          className="mt-4 flex flex-wrap items-center gap-2"
          aria-label={ux("activeFilters")}
        >
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              aria-label={ux("removeFilter", { filter: chip.text })}
              onClick={() => {
                const next = { ...initialValue, [chip.key]: "" };
                if (chip.key === "transactionType") next.pricePeriod = "";
                setValue(next);
                onApply(next);
              }}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-gold-primary/30 bg-gold-primary/10 px-3 text-sm text-text transition-colors hover:bg-gold-primary/20 focus-visible:outline-2 focus-visible:outline-gold-primary"
            >
              {(() => {
                const Icon = chip.key === "cityId" ? MapPin : chip.key === "type" ? Building2 : chip.key === "status" ? BadgeCheck : chip.key === "transactionType" ? ArrowRightLeft : chip.key === "pricePeriod" ? CalendarDays : chip.key.startsWith("surface") ? Ruler : Banknote;
                return <Icon size={14} className="shrink-0 text-gold-primary" aria-hidden="true" />;
              })()}
              {chip.text}
              <X size={14} />
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setValue(EMPTY_PROPERTY_FILTERS);
              onApply(EMPTY_PROPERTY_FILTERS);
            }}
            className="min-h-10 px-2 text-sm text-gold-primary underline"
          >
            {t("resetFilters")}
          </button>
        </div>
      )}
    </form>
  );
}
