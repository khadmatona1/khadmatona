"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Building2 } from "lucide-react";

/** A failed media URL gets the same accessible fallback as missing media. */
export function PropertyImage({
  src,
  alt,
  className = "",
  priority = false,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  const t = useTranslations("PublicUx");
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!src || failedSrc === src)
    return (
      <div
        role="img"
        aria-label={`${alt} — ${t("noPhoto")}`}
        className={`flex h-full w-full flex-col items-center justify-center gap-3 bg-surface-muted p-4 text-center text-text-muted ${className}`}
      >
        <Building2 size={36} aria-hidden="true" />
        <span className="text-sm">{t("noPhoto")}</span>
      </div>
    );
  // Media is already processed by the backend; a native image also lets us recover on error.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      onError={() => setFailedSrc(src)}
      className={`h-full w-full object-cover ${className}`}
    />
  );
}
