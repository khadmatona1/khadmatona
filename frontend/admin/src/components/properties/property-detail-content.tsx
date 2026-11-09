"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AlignLeft, Bath, BedDouble, Calendar, MapPin, Ruler, User, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DetailRow, DetailSection } from "@/components/ui/detail-section";
import { PropertyGallery } from "@/components/properties/property-gallery";
import { PropertySocialPanel } from "@/components/social/property-social-panel";
import { PropertyEditContent } from "@/components/properties/property-edit-content";
import { PropertyStatusBadge } from "@/components/properties/status-badge";
import { PropertyApprovalStatusBadge } from "@/components/properties/approval-status-badge";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { modal } from "@/lib/modal";
import { approveProperty, getDashboardProperty, rejectProperty } from "@/lib/properties";
import type { DashboardProperty } from "@/types/property";

const currencyFormatter = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 0,
});
const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

/** Small popup collecting an optional reason before rejecting - modal.confirm
 * only supports a plain message, no input field, so this goes through
 * modal.custom() instead. */
function RejectReasonPrompt({ onSubmit }: { onSubmit: (reason: string) => void }) {
  const t = useTranslations("PropertyDetail");
  const [reason, setReason] = useState("");

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-display text-lg font-semibold text-text">{t("rejectTitle")}</h2>
      <Textarea
        label={t("rejectionReason")}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder={t("rejectionReasonPlaceholder")}
      />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => modal.close()}>
          {t("cancel")}
        </Button>
        <Button
          variant="destructive"
          onClick={() => {
            onSubmit(reason);
            modal.close();
          }}
        >
          {t("reject")}
        </Button>
      </div>
    </div>
  );
}

export function PropertyDetailContent({
  id,
  onUpdated,
}: {
  id: number;
  /** Forwarded to the edit popup opened from here, so the underlying list
   * row stays in sync after a save. */
  onUpdated?: (property: DashboardProperty) => void;
}) {
  const t = useTranslations("DashboardProperties");
  const propertyDetail = useTranslations("PropertyDetail");
  const propertyType = useTranslations("PropertyType");
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes("Admin") ?? false;
  const [property, setProperty] = useState<DashboardProperty | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isActing, setIsActing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getDashboardProperty(id)
      .then((data) => {
        if (!cancelled) setProperty(data);
      })
      .catch((caught) => {
        if (cancelled) return;
        setError(
          caught instanceof ApiError && caught.status === 404 ? t("notFound") : t("loadError"),
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` is stable per locale render
  }, [id]);

  async function handleApprove() {
    if (!property) return;
    setIsActing(true);
    try {
      const updated = await approveProperty(property.id);
      setProperty(updated);
      onUpdated?.(updated);
      modal.success(propertyDetail("approveSuccess"));
    } catch (caught) {
      modal.error(caught instanceof ApiError ? caught.message : propertyDetail("approveError"));
    } finally {
      setIsActing(false);
    }
  }

  function handleReject() {
    if (!property) return;
    modal.custom({
      content: (
        <RejectReasonPrompt
          onSubmit={async (reason) => {
            setIsActing(true);
            try {
              const updated = await rejectProperty(property.id, reason || undefined);
              setProperty(updated);
              onUpdated?.(updated);
              modal.success(propertyDetail("rejectSuccess"));
            } catch (caught) {
              modal.error(caught instanceof ApiError ? caught.message : propertyDetail("rejectError"));
            } finally {
              setIsActing(false);
            }
          }}
        />
      ),
    });
  }

  if (isLoading) {
    return <p className="text-sm text-text-muted">{t("loading")}</p>;
  }

  if (error || !property) {
    return <p className="text-sm text-error">{error ?? t("notFound")}</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-semibold text-balance text-text">
            {property.title}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <PropertyStatusBadge status={property.status} />
            <PropertyApprovalStatusBadge status={property.approval_status} />
            <Badge tone="neutral">{propertyType(property.type)}</Badge>
          </div>
        </div>
        <Button
          variant="secondary"
          onClick={() =>
            modal.custom({ content: <PropertyEditContent id={property.id} onUpdated={onUpdated} /> })
          }
        >
          {t("edit")}
        </Button>
      </div>

      {isAdmin && property.approval_status === "pending_approval" && (
        <div className="flex flex-wrap gap-2 rounded-md border border-warning/30 bg-warning-surface p-4">
          <p className="mr-auto self-center text-sm font-semibold text-warning">
            {propertyDetail("pendingReviewNotice")}
          </p>
          <Button size="sm" isLoading={isActing} onClick={handleApprove}>
            {propertyDetail("approve")}
          </Button>
          <Button size="sm" variant="destructive" disabled={isActing} onClick={handleReject}>
            {propertyDetail("reject")}
          </Button>
        </div>
      )}

      {property.commercial_name && (
        <DetailSection icon={<User className="h-4 w-4" />} title={propertyDetail("submittedBy")}>
          <p className="text-sm text-text">{property.commercial_name}</p>
          {property.approval_status === "rejected" && property.rejection_reason && (
            <p className="mt-2 text-[0.85rem] text-error">
              {propertyDetail("rejectionReason")}: {property.rejection_reason}
            </p>
          )}
        </DetailSection>
      )}

      <PropertyGallery
        images={property.images}
        title={property.title}
        noImageLabel={propertyDetail("noImage")}
        previousImageLabel={propertyDetail("previousImage")}
        nextImageLabel={propertyDetail("nextImage")}
      />

      {/* Price gets its own gold-tinted section (not just another row in the
          characteristics grid below) - it's the single fact a listing is
          most often scanned for, same emphasis the property card itself
          gives it. */}
      <DetailSection icon={<Wallet className="h-4 w-4" />} title={t("price")} tone="gold">
        <p className="font-mono text-2xl font-bold text-gold-primary tabular-nums" dir="ltr">
          {currencyFormatter.format(property.price)} <span className="text-sm font-semibold">DH</span>
        </p>
      </DetailSection>

      <DetailSection icon={<AlignLeft className="h-4 w-4" />} title={propertyDetail("description")}>
        <p className="text-[0.95rem] text-text">
          {property.description ?? propertyDetail("noDescription")}
        </p>
      </DetailSection>

      <DetailSection icon={<Ruler className="h-4 w-4" />} title={propertyDetail("features")}>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <DetailRow
            label={t("city")}
            value={
              property.district_name
                ? `${property.district_name}, ${property.city_name}`
                : (property.city_name ?? "—")
            }
            icon={<MapPin className="h-3.5 w-3.5" />}
          />
          <DetailRow label={t("address")} value={property.address} />
          <DetailRow label={t("surface")} value={`${property.surface} m²`} icon={<Ruler className="h-3.5 w-3.5" />} />
          <DetailRow
            label={t("bedrooms")}
            value={String(property.bedrooms)}
            icon={<BedDouble className="h-3.5 w-3.5" />}
          />
          <DetailRow
            label={t("bathrooms")}
            value={String(property.bathrooms)}
            icon={<Bath className="h-3.5 w-3.5" />}
          />
          <DetailRow
            label={t("addedOnLabel")}
            value={dateFormatter.format(new Date(property.created_at))}
            icon={<Calendar className="h-3.5 w-3.5" />}
          />
        </dl>
      </DetailSection>

      <PropertySocialPanel propertyId={property.id} />
    </div>
  );
}
