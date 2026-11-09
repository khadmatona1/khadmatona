"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import { ArrowRight, Handshake, Home, Lock } from "lucide-react";
import { LeadForm } from "@/components/leads/lead-form";

export function SellRentSection({ className }: { className?: string }) {
  const t = useTranslations("SellRent");
  const [mode, setMode] = useState<"sell_request" | "rent_request">("sell_request");

  return (
    <div className={className ?? "mx-auto max-w-xl rounded-md border border-border bg-surface p-6 shadow-xl sm:p-8"}>
      <div className="mb-6 flex gap-2">
        <button
          type="button"
          onClick={() => setMode("sell_request")}
          className={clsx(
            "flex flex-1 items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-bold transition-colors",
            mode === "sell_request"
              ? "border-gold-primary text-gold-primary"
              : "border-border text-text-muted hover:border-gold-primary/40 hover:text-text",
          )}
        >
          <Handshake className="h-4 w-4" />
          {t("sellTab")}
        </button>
        <button
          type="button"
          onClick={() => setMode("rent_request")}
          className={clsx(
            "flex flex-1 items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-bold transition-colors",
            mode === "rent_request"
              ? "border-gold-primary text-gold-primary"
              : "border-border text-text-muted hover:border-gold-primary/40 hover:text-text",
          )}
        >
          <Home className="h-4 w-4" />
          {t("rentTab")}
        </button>
      </div>

      <LeadForm
        key={mode}
        type={mode}
        dynamicPropertyFields
        phoneRequired={mode === "rent_request"}
        submitLabel={mode === "sell_request" ? t("sellSubmit") : t("rentSubmit")}
        submitIcon={<ArrowRight className="h-4 w-4 rtl:-scale-x-100" />}
        submitClassName="w-full justify-center"
        messagePlaceholder={
          mode === "sell_request" ? t("sellPlaceholder") : t("rentPlaceholder")
        }
      />

      <p className="mt-4 flex items-center justify-center gap-1.5 text-[0.78rem] text-text-muted">
        <Lock className="h-3.5 w-3.5" />
        {t("confidentialNote")}
      </p>
    </div>
  );
}
