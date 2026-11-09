"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { getFinanceOptions, saveFinancialEntry } from "@/lib/finance";
import { modal } from "@/lib/modal";
import type { EntryKind, FinanceOptions, FinancialEntry } from "@/types/finance";

export function financeToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Casablanca", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function FinanceEntryForm({ entry, onSaved, fixedKind }: { entry?: FinancialEntry; onSaved: () => void; fixedKind?: EntryKind }) {
  const t = useTranslations("Finance");
  const [kind, setKind] = useState<EntryKind>(fixedKind ?? entry?.kind ?? "fee");
  const [propertyId, setPropertyId] = useState(String(entry?.property_id ?? ""));
  const [options, setOptions] = useState<FinanceOptions>({ properties: [], commercials: [] });
  const [search, setSearch] = useState("");
  const [optionError, setOptionError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState("");
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  const [selectedProperty, setSelectedProperty] = useState(entry?.property_id ? { id: entry.property_id, title: entry.property_title ?? `#${entry.property_id}` } : null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      getFinanceOptions(search).then((value) => {
        if (!cancelled) { setOptions(value); setOptionError(""); }
      }).catch(() => { if (!cancelled) setOptionError(t("loadError")); });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [search, t]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "").trim();
    submitting.current = true;
    setSaving(true); setErrors({}); setFailure("");
    try {
      await saveFinancialEntry({
        kind, label: value("label"), amount: value("amount"), occurred_on: value("occurred_on"), paid_on: value("paid_on") || null,
        property_id: propertyId ? Number(propertyId) : null,
        commercial_id: value("commercial_id") ? Number(value("commercial_id")) : null,
        notes: value("notes") || null,
      }, entry?.id);
      onSaved(); modal.close();
    } catch (error) {
      if (error instanceof ApiError) setErrors(Object.fromEntries(Object.entries(error.errors).map(([key, values]) => [key, values[0]])));
      setFailure(error instanceof ApiError ? error.message : t("saveError"));
    } finally { submitting.current = false; setSaving(false); }
  }

  const properties = selectedProperty && !options.properties.some((p) => p.id === selectedProperty.id) ? [selectedProperty, ...options.properties] : options.properties;
  return <form onSubmit={submit} className="space-y-5" aria-busy={saving}>
    <p className="text-sm text-text-muted">{t("entryHelp")}</p>
    <fieldset disabled={saving} className="grid min-w-0 gap-4 sm:grid-cols-2">
      <Select disabled={!!fixedKind} label={t("kind")} value={kind} onChange={(e) => setKind(e.target.value as EntryKind)} error={errors.kind}>
        {(["fee", "commission", "expense"] as const).map((value) => <option key={value} value={value}>{t(`kinds.${value}`)}</option>)}
      </Select>
      <Field name="amount" label={t("amount")} type="number" min="0.01" max="9999999999.99" step="0.01" required defaultValue={entry ? (entry.amount_cents / 100).toFixed(2) : ""} error={errors.amount} />
      <div className="sm:col-span-2"><Field name="label" label={t("label")} required maxLength={255} defaultValue={entry?.label} error={errors.label} /></div>
      <Field name="occurred_on" label={t("occurredOn")} type="date" required max={financeToday()} defaultValue={entry?.occurred_on ?? financeToday()} error={errors.occurred_on} />
      <Field name="paid_on" label={t("paidOn")} type="date" max={financeToday()} defaultValue={entry?.paid_on ?? ""} hint={t("paidHint")} error={errors.paid_on} />
      <div className="sm:col-span-2"><Field label={t("searchProperty")} type="search" value={search} onChange={(e) => setSearch(e.target.value)} hint={t("searchHint")} /></div>
      <Select label={t("property")} value={propertyId} onChange={(e) => { setPropertyId(e.target.value); setSelectedProperty(properties.find((p) => p.id === Number(e.target.value)) ?? null); }} error={errors.property_id}>
        <option value="">{t("unassigned")}</option>
        {properties.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
      </Select>
      <Select name="commercial_id" label={t("commercial")} required={kind === "commission"} defaultValue={entry?.commercial_id ?? ""} error={errors.commercial_id}>
        <option value="">{t("unassigned")}</option>
        {entry?.commercial_id && !options.commercials.some((c) => c.id === entry.commercial_id) && <option value={entry.commercial_id}>{entry.commercial_name ?? `#${entry.commercial_id}`}</option>}
        {options.commercials.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </Select>
      <div className="sm:col-span-2"><Textarea name="notes" label={t("notes")} maxLength={2000} defaultValue={entry?.notes ?? ""} error={errors.notes} /></div>
    </fieldset>
    {optionError && <p role="alert" className="text-sm text-error">{optionError}</p>}
    {failure && <p role="alert" className="text-sm text-error">{failure}</p>}
    <div className="flex justify-end gap-3"><Button type="button" variant="secondary" disabled={saving} onClick={() => modal.close()}>{t("cancel")}</Button><Button type="submit" isLoading={saving}>{t("save")}</Button></div>
  </form>;
}
