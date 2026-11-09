"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { VisitBookingForm } from "@/components/visits/visit-booking-form";
import { PublicBookingForm } from "@/components/rental/public-booking-form";
import { Card } from "@/components/ui/card";

export function PropertyInquiry({
  propertyId,
  stay,
  title,
  available,
}: {
  propertyId: number;
  stay: boolean;
  title: string;
  available: boolean;
}) {
  const t = useTranslations("PublicUx");
  const visit = useTranslations("PropertyDetail");
  const [mode, setMode] = useState<"visit" | "stay">(stay ? "stay" : "visit");
  const [bookable, setBookable] = useState(stay);
  if (!available)
    return (
      <Card>
        <p className="text-text-muted">{t("notAvailable")}</p>
        <a
          href="/contact"
          className="mt-3 inline-block font-semibold text-gold-primary underline"
        >
          {t("contactTeam")}
        </a>
      </Card>
    );
  return (
    <>
      <div id="inquiry" className="scroll-mt-28 space-y-4 pb-20 lg:pb-0">
        {bookable && (
          <div
            className="grid grid-cols-2 gap-2"
            role="group"
            aria-label={t("inquiryChoice")}
          >
            {(["visit", "stay"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                onClick={() => setMode(value)}
                className={`min-h-12 rounded-xl border px-3 py-3 text-sm font-semibold ${mode === value ? "border-gold-primary bg-gold-primary/10 text-gold-primary" : "border-border text-text-muted"}`}
              >
                {t(value === "visit" ? "requestVisit" : "requestStay")}
              </button>
            ))}
          </div>
        )}
        {/* Keep both drafts mounted when switching; only the selected form is exposed. */}
        <div hidden={mode !== "stay"}>
          <PublicBookingForm
            propertyId={propertyId}
            onEligibility={setBookable}
          />
        </div>
        <div hidden={mode !== "visit"}>
          <Card radius="md">
            <h2 className="font-display text-xl font-semibold text-text">
              {visit("visitRequestTitle")}
            </h2>
            <p className="mt-2 mb-5 text-sm text-text-muted">{title}</p>
            <VisitBookingForm propertyId={propertyId} />
          </Card>
        </div>
        {mode === "stay" && !bookable && (
          <Card>
            <p className="text-text-muted">{t("stayUnavailable")}</p>
            <button
              onClick={() => setMode("visit")}
              className="mt-3 font-semibold text-gold-primary underline"
            >
              {t("requestVisit")}
            </button>
          </Card>
        )}
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <a
          href="#inquiry"
          className="flex min-h-12 items-center justify-center rounded-xl bg-gradient-gold px-5 font-semibold text-ink"
        >
          {t(mode === "stay" ? "requestStay" : "requestVisit")}
        </a>
      </div>
    </>
  );
}
