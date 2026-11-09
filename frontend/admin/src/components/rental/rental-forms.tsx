"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { modal } from "@/lib/modal";
import { listDashboardProperties } from "@/lib/properties";
import {
  checkInReservation,
  checkOutReservation,
  createCleaning,
  createExpense,
  createMaintenance,
  createManagedProperty,
  createReservation,
  updateCleaning,
  updateExpense,
  updateMaintenance,
  updateManagedProperty,
  updateReservation,
} from "@/lib/rental";
import { businessToday, propertyLabel, useManagedProperties, useRentalFormat } from "@/components/rental/rental-ui";
import {
  CHARGED_TO,
  CLEANING_STATUSES,
  EXPENSE_CATEGORIES,
  MAINTENANCE_PRIORITIES,
  MAINTENANCE_STATUSES,
  RESERVATION_CHANNELS,
  type Cleaning,
  type CleaningValues,
  type Expense,
  type ExpenseValues,
  type MaintenanceRequest,
  type MaintenanceValues,
  type ManagedProperty,
  type ManagedPropertyValues,
  type Reservation,
  type ReservationValues,
} from "@/types/rental";

// --- Shared plumbing -------------------------------------------------------------

/** Submit handler with the app's usual error handling: field errors inline, anything else in a modal. */
function useSave<T>(save: () => Promise<T>, onSaved: (saved: T) => void) {
  const t = useTranslations("Rental");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setErrors({});
    setSaving(true);
    try {
      const saved = await save();
      modal.close();
      onSaved(saved);
    } catch (caught) {
      if (caught instanceof ApiError && Object.keys(caught.errors).length > 0) {
        setErrors(Object.fromEntries(Object.entries(caught.errors).map(([field, messages]) => [field, messages[0]])));
      } else {
        modal.error(caught instanceof ApiError ? caught.message : t("genericError"));
      }
    } finally {
      setSaving(false);
    }
  }

  return { errors, saving, submit };
}

function FormShell({ title, saving, onSubmit, children }: { title: string; saving: boolean; onSubmit: (event: FormEvent) => void; children: ReactNode }) {
  const t = useTranslations("Rental");
  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-2xl flex-col gap-4" noValidate>
      <h2 className="font-display text-xl font-semibold text-text">{title}</h2>
      {children}
      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => modal.close()}>
          {t("cancel")}
        </Button>
        <Button type="submit" isLoading={saving}>
          {t("save")}
        </Button>
      </div>
    </form>
  );
}

/** Picker of properties under management (active ones only for new records). */
function ManagedPropertyPicker({ value, onChange, error }: { value: number | undefined; onChange: (id: number | undefined) => void; error?: string }) {
  const t = useTranslations("Rental");
  const { items } = useManagedProperties(true);
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-bold text-text">{t("fields.property")}</span>
      <Combobox
        value={value ? String(value) : ""}
        onChange={(next) => onChange(next ? Number(next) : undefined)}
        options={items.map((item) => ({ value: String(item.id), label: propertyLabel(item) }))}
        placeholder={t("fields.propertyPlaceholder")}
        ariaLabel={t("fields.property")}
        error={error}
      />
    </div>
  );
}

function ChargedToSelect({ value, onChange, error, label }: { value: string; onChange: (value: (typeof CHARGED_TO)[number]) => void; error?: string; label?: string }) {
  const t = useTranslations("Rental");
  return (
    <Select label={label ?? t("fields.chargedTo")} value={value} onChange={(event) => onChange(event.target.value as (typeof CHARGED_TO)[number])} error={error}>
      {CHARGED_TO.map((payer) => (
        <option key={payer} value={payer}>
          {t(`chargedTo.${payer}`)}
        </option>
      ))}
    </Select>
  );
}

function MoneyField({ label, value, onChange, error, required }: { label: string; value: number; onChange: (value: number) => void; error?: string; required?: boolean }) {
  return (
    <Field
      label={label}
      type="number"
      min={0}
      step="0.01"
      dir="ltr"
      required={required}
      value={Number.isFinite(value) ? value : 0}
      onChange={(event) => onChange(event.target.value === "" ? 0 : Number(event.target.value))}
      error={error}
    />
  );
}

// --- Managed property ---------------------------------------------------------------

export function ManagedPropertyForm({ existing, onSaved }: { existing?: ManagedProperty; onSaved: (saved: ManagedProperty) => void }) {
  const t = useTranslations("Rental");
  const approval = useTranslations("RentalApproval");
  const { user } = useAuth();
  const needsApproval = !user?.roles?.some((role) => role === "Admin" || role === "SeniorCommercial");
  const canActivate = existing ? existing.approval_status === "approved" : !needsApproval;
  const [catalog, setCatalog] = useState<Array<{ id: number; title: string }>>([]);
  const [values, setValues] = useState<ManagedPropertyValues>({
    property_id: existing?.property_id,
    commission_rate: existing?.commission_rate ?? 20,
    cleaning_fee: existing?.cleaning_fee ?? 0,
    cleaning_charged_to: existing?.cleaning_charged_to ?? "owner",
    is_active: existing?.is_active ?? true,
    notes: existing?.notes ?? "",
  });
  const set = <K extends keyof ManagedPropertyValues>(key: K, value: ManagedPropertyValues[K]) => setValues((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    if (existing) return;
    let cancelled = false;
    // The properties API only sorts by date/price - alphabetize here.
    listDashboardProperties({ perPage: 100, status: "disponible" })
      .then((page) => {
        if (cancelled) return;
        setCatalog(
          page.properties
            .map((p) => ({ id: p.id, title: p.title }))
            .sort((a, b) => a.title.localeCompare(b.title)),
        );
      })
      .catch(() => {
        // Non-blocking: the picker stays empty.
      });
    return () => {
      cancelled = true;
    };
  }, [existing]);

  const { errors, saving, submit } = useSave(
    () => {
      if (existing) {
        const { property_id: _propertyId, ...terms } = values;
        void _propertyId;
        return updateManagedProperty(existing.id, terms);
      }
      return createManagedProperty(values);
    },
    onSaved,
  );

  return (
    <FormShell title={existing ? t("forms.editManaged") : t("forms.newManaged")} saving={saving} onSubmit={submit}>
      {!canActivate && <p className="rounded-md bg-surface-muted p-3 text-sm text-text-muted">{approval("hint")}</p>}
      {existing ? (
        <p className="text-sm font-semibold text-text">{propertyLabel(existing)}</p>
      ) : (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-bold text-text">{t("fields.catalogProperty")}</span>
          <Combobox
            value={values.property_id ? String(values.property_id) : ""}
            onChange={(next) => set("property_id", next ? Number(next) : undefined)}
            options={catalog.map((p) => ({ value: String(p.id), label: `#${p.id} ${p.title}` }))}
            placeholder={t("fields.propertyPlaceholder")}
            ariaLabel={t("fields.catalogProperty")}
            error={errors.property_id}
          />
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label={t("fields.commissionRate")}
          type="number"
          min={0}
          max={100}
          step="0.01"
          dir="ltr"
          required
          value={values.commission_rate}
          onChange={(event) => set("commission_rate", Number(event.target.value))}
          error={errors.commission_rate}
          hint={t("fields.commissionRateHint")}
        />
        <MoneyField label={t("fields.cleaningFee")} value={values.cleaning_fee} onChange={(v) => set("cleaning_fee", v)} error={errors.cleaning_fee} />
        <ChargedToSelect label={t("fields.cleaningChargedTo")} value={values.cleaning_charged_to} onChange={(v) => set("cleaning_charged_to", v)} error={errors.cleaning_charged_to} />
        {canActivate && <label className="flex items-center gap-2 self-end pb-3 text-sm font-semibold text-text">
          <input type="checkbox" checked={values.is_active} onChange={(event) => set("is_active", event.target.checked)} className="h-4 w-4 accent-[var(--color-gold-primary)]" />
          {t("fields.isActive")}
        </label>}
      </div>
      <Textarea label={t("fields.notes")} value={values.notes} onChange={(event) => set("notes", event.target.value)} error={errors.notes} />
    </FormShell>
  );
}

// --- Reservation ----------------------------------------------------------------------

export function ReservationForm({ existing, onSaved }: { existing?: Reservation; onSaved: (saved: Reservation) => void }) {
  const t = useTranslations("Rental");
  const format = useRentalFormat();
  const [values, setValues] = useState<ReservationValues>({
    rental_property_id: existing?.rental_property_id,
    guest_name: existing?.guest_name ?? "",
    guest_phone: existing?.guest_phone ?? "",
    guest_email: existing?.guest_email ?? "",
    guests_count: existing?.guests_count ?? 1,
    channel: existing?.channel ?? "direct",
    check_in_date: existing?.check_in_date ?? "",
    check_out_date: existing?.check_out_date ?? "",
    total_amount: existing?.total_amount ?? 0,
    platform_fee: existing?.platform_fee ?? 0,
    notes: existing?.notes ?? "",
  });
  const set = <K extends keyof ReservationValues>(key: K, value: ReservationValues[K]) => setValues((current) => ({ ...current, [key]: value }));

  const { errors, saving, submit } = useSave(
    () => {
      if (existing) {
        const { rental_property_id: _rentalPropertyId, ...stay } = values;
        void _rentalPropertyId;
        return updateReservation(existing.id, stay);
      }
      return createReservation(values);
    },
    onSaved,
  );

  const nights =
    values.check_in_date && values.check_out_date
      ? Math.round((Date.parse(values.check_out_date) - Date.parse(values.check_in_date)) / 86_400_000)
      : 0;

  return (
    <FormShell title={existing ? t("forms.editReservation") : t("forms.newReservation")} saving={saving} onSubmit={submit}>
      {existing ? (
        <p className="text-sm font-semibold text-text">{propertyLabel(existing)}</p>
      ) : (
        <ManagedPropertyPicker value={values.rental_property_id} onChange={(id) => set("rental_property_id", id)} error={errors.rental_property_id} />
      )}
      <div className="flex flex-col gap-1">
        <DateRangePicker
          label={t("fields.stayDates")}
          value={values.check_in_date && values.check_out_date ? { from: values.check_in_date, to: values.check_out_date } : null}
          initialMonth={businessToday()}
          onChange={(range) => {
            set("check_in_date", range?.from ?? "");
            set("check_out_date", range?.to ?? "");
          }}
        />
        {nights > 0 && <p className="text-[0.78rem] text-text-muted">{t("fields.nightsCount", { count: nights })}</p>}
        {(errors.check_in_date || errors.check_out_date) && (
          <p role="alert" className="text-[0.76rem] font-semibold text-error">{errors.check_in_date ?? errors.check_out_date}</p>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t("fields.guestName")} required value={values.guest_name} onChange={(event) => set("guest_name", event.target.value)} error={errors.guest_name} />
        <Field label={t("fields.guestsCount")} type="number" min={1} max={50} value={values.guests_count} onChange={(event) => set("guests_count", Number(event.target.value))} error={errors.guests_count} />
        <Field label={t("fields.guestPhone")} type="tel" dir="ltr" value={values.guest_phone} onChange={(event) => set("guest_phone", event.target.value)} error={errors.guest_phone} />
        <Field label={t("fields.guestEmail")} type="email" dir="ltr" value={values.guest_email} onChange={(event) => set("guest_email", event.target.value)} error={errors.guest_email} />
        <Select label={t("fields.channel")} value={values.channel} onChange={(event) => set("channel", event.target.value as ReservationValues["channel"])} error={errors.channel}>
          {RESERVATION_CHANNELS.map((channel) => (
            <option key={channel} value={channel}>
              {t(`channel.${channel}`)}
            </option>
          ))}
        </Select>
        <MoneyField label={t("fields.totalAmount")} required value={values.total_amount} onChange={(v) => set("total_amount", v)} error={errors.total_amount} />
        <MoneyField label={t("fields.platformFee")} value={values.platform_fee} onChange={(v) => set("platform_fee", v)} error={errors.platform_fee} />
        <div className="flex flex-col justify-end pb-2 text-sm text-text-muted">
          {t("fields.netPreview")} <span className="font-mono font-semibold text-text tabular-nums">{format.money(Math.max(0, values.total_amount - values.platform_fee))}</span>
        </div>
      </div>
      <Textarea label={t("fields.notes")} value={values.notes} onChange={(event) => set("notes", event.target.value)} error={errors.notes} />
    </FormShell>
  );
}

/** Check-in / check-out confirmation with an optional note. */
export function ReservationStepForm({ reservation, step, onSaved }: { reservation: Reservation; step: "check_in" | "check_out"; onSaved: (saved: Reservation) => void }) {
  const t = useTranslations("Rental");
  const [notes, setNotes] = useState("");
  const { errors, saving, submit } = useSave(
    () => (step === "check_in" ? checkInReservation(reservation.id, notes) : checkOutReservation(reservation.id, notes)),
    onSaved,
  );

  return (
    <FormShell title={t(step === "check_in" ? "forms.checkIn" : "forms.checkOut", { guest: reservation.guest_name })} saving={saving} onSubmit={submit}>
      <p className="text-sm text-text-muted">{step === "check_in" ? t("forms.checkInHint") : t("forms.checkOutHint")}</p>
      <Textarea label={t("fields.stepNotes")} placeholder={t("fields.stepNotesPlaceholder")} value={notes} onChange={(event) => setNotes(event.target.value)} error={errors.notes ?? errors.status} />
    </FormShell>
  );
}

// --- Cleaning -----------------------------------------------------------------------------

export function CleaningForm({ existing, onSaved }: { existing?: Cleaning; onSaved: (saved: Cleaning) => void }) {
  const t = useTranslations("Rental");
  const [values, setValues] = useState<CleaningValues>({
    rental_property_id: existing?.rental_property_id,
    scheduled_for: existing?.scheduled_for ?? businessToday(),
    cleaner_name: existing?.cleaner_name ?? "",
    cost: existing?.cost ?? 0,
    charged_to: existing?.charged_to ?? "owner",
    notes: existing?.notes ?? "",
    ...(existing ? { status: existing.status } : {}),
  });
  const set = <K extends keyof CleaningValues>(key: K, value: CleaningValues[K]) => setValues((current) => ({ ...current, [key]: value }));
  const { errors, saving, submit } = useSave(() => {
    if (existing) {
      const { rental_property_id: _rentalPropertyId, ...rest } = values;
      void _rentalPropertyId;
      return updateCleaning(existing.id, rest);
    }
    return createCleaning(values);
  }, onSaved);

  return (
    <FormShell title={existing ? t("forms.editCleaning") : t("forms.newCleaning")} saving={saving} onSubmit={submit}>
      {existing ? (
        <p className="text-sm font-semibold text-text">{propertyLabel(existing)}</p>
      ) : (
        <ManagedPropertyPicker value={values.rental_property_id} onChange={(id) => set("rental_property_id", id)} error={errors.rental_property_id} />
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t("fields.scheduledFor")} type="date" required value={values.scheduled_for} onChange={(event) => set("scheduled_for", event.target.value)} error={errors.scheduled_for} />
        <Field label={t("fields.cleanerName")} value={values.cleaner_name} onChange={(event) => set("cleaner_name", event.target.value)} error={errors.cleaner_name} />
        <MoneyField label={t("fields.cost")} value={values.cost} onChange={(v) => set("cost", v)} error={errors.cost} />
        <ChargedToSelect value={values.charged_to} onChange={(v) => set("charged_to", v)} error={errors.charged_to} />
        {existing && (
          <Select label={t("fields.status")} value={values.status} onChange={(event) => set("status", event.target.value as CleaningValues["status"])} error={errors.status}>
            {CLEANING_STATUSES.map((status) => (
              <option key={status} value={status}>
                {t(`cleaningStatus.${status}`)}
              </option>
            ))}
          </Select>
        )}
      </div>
      <Textarea label={t("fields.notes")} value={values.notes} onChange={(event) => set("notes", event.target.value)} error={errors.notes} />
    </FormShell>
  );
}

// --- Maintenance ----------------------------------------------------------------------------

export function MaintenanceForm({ existing, onSaved }: { existing?: MaintenanceRequest; onSaved: (saved: MaintenanceRequest) => void }) {
  const t = useTranslations("Rental");
  const [values, setValues] = useState<MaintenanceValues>({
    rental_property_id: existing?.rental_property_id,
    title: existing?.title ?? "",
    description: existing?.description ?? "",
    priority: existing?.priority ?? "normal",
    provider_name: existing?.provider_name ?? "",
    reported_on: existing?.reported_on ?? businessToday(),
    cost: existing?.cost ?? 0,
    charged_to: existing?.charged_to ?? "owner",
    ...(existing ? { status: existing.status } : {}),
  });
  const set = <K extends keyof MaintenanceValues>(key: K, value: MaintenanceValues[K]) => setValues((current) => ({ ...current, [key]: value }));
  const { errors, saving, submit } = useSave(() => {
    if (existing) {
      const { rental_property_id: _rentalPropertyId, ...rest } = values;
      void _rentalPropertyId;
      return updateMaintenance(existing.id, rest);
    }
    return createMaintenance(values);
  }, onSaved);

  return (
    <FormShell title={existing ? t("forms.editMaintenance") : t("forms.newMaintenance")} saving={saving} onSubmit={submit}>
      {existing ? (
        <p className="text-sm font-semibold text-text">{propertyLabel(existing)}</p>
      ) : (
        <ManagedPropertyPicker value={values.rental_property_id} onChange={(id) => set("rental_property_id", id)} error={errors.rental_property_id} />
      )}
      <Field label={t("fields.issueTitle")} required value={values.title} onChange={(event) => set("title", event.target.value)} error={errors.title} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select label={t("fields.priority")} value={values.priority} onChange={(event) => set("priority", event.target.value as MaintenanceValues["priority"])} error={errors.priority}>
          {MAINTENANCE_PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {t(`priority.${priority}`)}
            </option>
          ))}
        </Select>
        {existing ? (
          <Select label={t("fields.status")} value={values.status} onChange={(event) => set("status", event.target.value as MaintenanceValues["status"])} error={errors.status}>
            {MAINTENANCE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {t(`maintenanceStatus.${status}`)}
              </option>
            ))}
          </Select>
        ) : (
          <Field label={t("fields.reportedOn")} type="date" value={values.reported_on} onChange={(event) => set("reported_on", event.target.value)} error={errors.reported_on} />
        )}
        <Field label={t("fields.provider")} value={values.provider_name} onChange={(event) => set("provider_name", event.target.value)} error={errors.provider_name} />
        <MoneyField label={t("fields.cost")} value={values.cost} onChange={(v) => set("cost", v)} error={errors.cost} />
        <ChargedToSelect value={values.charged_to} onChange={(v) => set("charged_to", v)} error={errors.charged_to} />
      </div>
      <Textarea label={t("fields.description")} value={values.description} onChange={(event) => set("description", event.target.value)} error={errors.description} />
      <p className="text-[0.76rem] text-text-muted">{t("forms.maintenanceCostHint")}</p>
    </FormShell>
  );
}

// --- Expense ------------------------------------------------------------------------------------

export function ExpenseForm({ existing, onSaved }: { existing?: Expense; onSaved: (saved: Expense) => void }) {
  const t = useTranslations("Rental");
  const [values, setValues] = useState<ExpenseValues>({
    rental_property_id: existing?.rental_property_id,
    category: existing?.category ?? "utilities",
    label: existing?.label ?? "",
    amount: existing?.amount ?? 0,
    incurred_on: existing?.incurred_on ?? businessToday(),
    charged_to: existing?.charged_to ?? "owner",
    notes: existing?.notes ?? "",
  });
  const set = <K extends keyof ExpenseValues>(key: K, value: ExpenseValues[K]) => setValues((current) => ({ ...current, [key]: value }));
  const { errors, saving, submit } = useSave(() => {
    if (existing) {
      const { rental_property_id: _rentalPropertyId, ...rest } = values;
      void _rentalPropertyId;
      return updateExpense(existing.id, rest);
    }
    return createExpense(values);
  }, onSaved);

  return (
    <FormShell title={existing ? t("forms.editExpense") : t("forms.newExpense")} saving={saving} onSubmit={submit}>
      {existing ? (
        <p className="text-sm font-semibold text-text">{propertyLabel(existing)}</p>
      ) : (
        <ManagedPropertyPicker value={values.rental_property_id} onChange={(id) => set("rental_property_id", id)} error={errors.rental_property_id} />
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select label={t("fields.category")} value={values.category} onChange={(event) => set("category", event.target.value as ExpenseValues["category"])} error={errors.category}>
          {EXPENSE_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {t(`expenseCategory.${category}`)}
            </option>
          ))}
        </Select>
        <Field label={t("fields.label")} required value={values.label} onChange={(event) => set("label", event.target.value)} error={errors.label} />
        <MoneyField label={t("fields.amount")} required value={values.amount} onChange={(v) => set("amount", v)} error={errors.amount} />
        <Field label={t("fields.incurredOn")} type="date" required value={values.incurred_on} onChange={(event) => set("incurred_on", event.target.value)} error={errors.incurred_on} />
        <ChargedToSelect value={values.charged_to} onChange={(v) => set("charged_to", v)} error={errors.charged_to} />
      </div>
      <Textarea label={t("fields.notes")} value={values.notes} onChange={(event) => set("notes", event.target.value)} error={errors.notes} />
    </FormShell>
  );
}
