"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { modal } from "@/lib/modal";
import { isoToMoroccoLocalInput, moroccoLocalToIso } from "@/lib/morocco-time";

function inMinutes(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

/** Tomorrow at the given HOUR, Morocco time - computed via a real conversion, not the browser's own clock. */
function tomorrowAtMoroccoHour(hour: number): string {
  const morocco = isoToMoroccoLocalInput(new Date().toISOString());
  const [datePart] = morocco.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const tomorrow = new Date(Date.UTC(year, month - 1, day + 1));
  const y = tomorrow.getUTCFullYear();
  const m = String(tomorrow.getUTCMonth() + 1).padStart(2, "0");
  const d = String(tomorrow.getUTCDate()).padStart(2, "0");

  return moroccoLocalToIso(`${y}-${m}-${d}T${String(hour).padStart(2, "0")}:00`);
}

/**
 * "When should this lead be called back?" - shown when a lead is set to
 * "À rappeler". Picking a time arms the timer: at that moment the
 * responsible commercial gets a notification (bell + email).
 *
 * The picker always reads/writes Morocco wall-clock time (MOROCCO_TZ),
 * converted via lib/morocco-time - never the browser/device's own system
 * timezone. A plain `datetime-local` + `Date.toISOString()` roundtrip
 * silently uses whatever timezone the viewing machine is set to, and would
 * pick the wrong instant for any agent/tester whose device isn't on
 * Morocco's current offset.
 */
export function CallbackSchedulerContent({
  initialValue,
  onConfirm,
}: {
  /** Pre-fills the picker when rescheduling an existing callback. */
  initialValue?: string | null;
  onConfirm: (callbackAtIso: string) => void;
}) {
  const t = useTranslations("LeadCallback");
  const [value, setValue] = useState(() =>
    isoToMoroccoLocalInput(initialValue && new Date(initialValue) > new Date() ? initialValue : inMinutes(60)),
  );

  const presets: { key: string; iso: () => string }[] = [
    { key: "in15", iso: () => inMinutes(15) },
    { key: "in30", iso: () => inMinutes(30) },
    { key: "in1h", iso: () => inMinutes(60) },
    { key: "in2h", iso: () => inMinutes(120) },
    { key: "tomorrow", iso: () => tomorrowAtMoroccoHour(9) },
  ];

  const chosenIso = moroccoLocalToIso(value);
  const isValid = !Number.isNaN(new Date(chosenIso).getTime()) && new Date(chosenIso) > new Date();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-xl font-semibold text-text">{t("title")}</h2>
        <p className="mt-1 text-sm text-text-muted">{t("subtitle")}</p>
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
        <label htmlFor="callback-at" className="text-sm font-bold text-text">
          {t("customLabel")}
        </label>
        <input
          id="callback-at"
          type="datetime-local"
          value={value}
          min={isoToMoroccoLocalInput(new Date().toISOString())}
          onChange={(event) => setValue(event.target.value)}
          aria-invalid={!isValid || undefined}
          className="w-full rounded-sm border-[1.5px] border-border-strong bg-surface px-3.5 py-2.5 text-[0.95rem] text-text focus-visible:border-gold-primary"
        />
        <p className="text-[0.76rem] text-text-muted">{t("moroccoTimeHint")}</p>
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
