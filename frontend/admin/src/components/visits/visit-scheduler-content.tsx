"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { modal } from "@/lib/modal";
import { isoToMoroccoLocalInput, moroccoLocalToIso } from "@/lib/morocco-time";

/** A given number of days from now, at the given HOUR, Morocco time -
 * computed via a real conversion, not the browser's own clock. Adapted from
 * callback-scheduler-content.tsx's tomorrowAtMoroccoHour(), generalized to N
 * days so "Demain" and "Après-demain" presets share one helper. */
function daysFromNowAtMoroccoHour(days: number, hour: number): string {
  const morocco = isoToMoroccoLocalInput(new Date().toISOString());
  const [datePart] = morocco.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1, day + days));
  const y = target.getUTCFullYear();
  const m = String(target.getUTCMonth() + 1).padStart(2, "0");
  const d = String(target.getUTCDate()).padStart(2, "0");

  return moroccoLocalToIso(`${y}-${m}-${d}T${String(hour).padStart(2, "0")}:00`);
}

/** Business hours: 09:00-19:00 Morocco time (MOROCCO_TZ), not Sunday - mirrors the
 * backend's WithinBusinessHours rule exactly, so the picker never offers a
 * value the server will reject. */
function isWithinBusinessHours(isoValue: string): boolean {
  const morocco = isoToMoroccoLocalInput(isoValue);
  const [datePart, timePart] = morocco.split("T");
  const hour = Number(timePart.split(":")[0]);
  const dayOfWeek = new Date(`${datePart}T00:00:00`).getDay();

  return dayOfWeek !== 0 && hour >= 9 && hour < 19;
}

/**
 * "Quand souhaitez-vous visiter ce bien ?" - the public booking form's
 * date/time picker, and the dashboard's "Reprogrammer" action. Adapted from
 * CallbackSchedulerContent (components/leads/callback-scheduler-content.tsx):
 * same Morocco-timezone-pinned datetime-local input, but presets are
 * business-hours-aligned ("Demain 10h" rather than "+15min") and client-side
 * validity also checks business hours, not just "in the future".
 */
export function VisitSchedulerContent({
  initialValue,
  onConfirm,
}: {
  initialValue?: string | null;
  onConfirm: (scheduledAtIso: string) => void;
}) {
  const t = useTranslations("VisitBooking");
  const [value, setValue] = useState(() =>
    isoToMoroccoLocalInput(
      initialValue && new Date(initialValue) > new Date() ? initialValue : daysFromNowAtMoroccoHour(1, 10),
    ),
  );

  const presets: { key: string; iso: () => string }[] = [
    { key: "tomorrowMorning", iso: () => daysFromNowAtMoroccoHour(1, 10) },
    { key: "tomorrowAfternoon", iso: () => daysFromNowAtMoroccoHour(1, 15) },
    { key: "dayAfterMorning", iso: () => daysFromNowAtMoroccoHour(2, 10) },
  ];

  const chosenIso = moroccoLocalToIso(value);
  const isFuture = !Number.isNaN(new Date(chosenIso).getTime()) && new Date(chosenIso) > new Date();
  const isValid = isFuture && isWithinBusinessHours(chosenIso);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-xl font-semibold text-text">{t("schedulerTitle")}</h2>
        <p className="mt-1 text-sm text-text-muted">{t("schedulerSubtitle")}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            key={preset.key}
            type="button"
            onClick={() => setValue(isoToMoroccoLocalInput(preset.iso()))}
            className="rounded-full border-[1.5px] border-border-strong px-3.5 py-1.5 text-sm font-semibold text-text-muted transition-colors hover:border-gold-primary hover:text-gold-primary"
          >
            {t(`preset.${preset.key}`)}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="visit-scheduled-at" className="text-sm font-bold text-text">
          {t("customLabel")}
        </label>
        <input
          id="visit-scheduled-at"
          type="datetime-local"
          value={value}
          min={isoToMoroccoLocalInput(new Date().toISOString())}
          onChange={(event) => setValue(event.target.value)}
          aria-invalid={!isValid || undefined}
          className="w-full rounded-sm border-[1.5px] border-border-strong bg-surface px-3.5 py-2.5 text-[0.95rem] text-text focus-visible:border-gold-primary"
        />
        <p className="text-[0.76rem] text-text-muted">{t("businessHoursHint")}</p>
        {!isValid && <p className="text-[0.76rem] font-semibold text-error">{t("invalidTime")}</p>}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => modal.close()}>
          {t("cancel")}
        </Button>
        <Button
          disabled={!isValid}
          onClick={() => {
            modal.close();
            onConfirm(chosenIso);
          }}
        >
          {t("confirm")}
        </Button>
      </div>
    </div>
  );
}
