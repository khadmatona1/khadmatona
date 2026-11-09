"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Briefcase, Building2, Calendar, Home, Mail, MapPin, MessageSquare, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DetailRow, DetailSection } from "@/components/ui/detail-section";
import { CommercialLeadStatusBadge } from "@/components/commercial-leads/status-badge";
import { ApiError } from "@/lib/api";
import { modal } from "@/lib/modal";
import { deleteCommercialLead, getCommercialLead, updateCommercialLeadStatus } from "@/lib/commercial-leads";
import type { CommercialLead, CommercialLeadStatus } from "@/types/commercial-lead";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

type ActionButtonVariant = "primary" | "secondary" | "destructive";

const STATUS_ACTIONS: { status: CommercialLeadStatus; labelKey: string; variant: ActionButtonVariant }[] = [
  { status: "contacted", labelKey: "markContacted", variant: "secondary" },
  { status: "qualified", labelKey: "markQualified", variant: "secondary" },
  { status: "partner", labelKey: "acceptAsPartner", variant: "primary" },
  { status: "rejected", labelKey: "reject", variant: "destructive" },
];

export function CommercialLeadDetailContent({
  id,
  onUpdated,
  onDeleted,
}: {
  id: number;
  /** Keeps the underlying list row in sync after a status change made from
   * inside this popup, since the list doesn't refetch on its own. */
  onUpdated?: (lead: CommercialLead) => void;
  /** Lets the caller remove the row from its own list state - this popup
   * only knows about the single lead it fetched, not the list. */
  onDeleted?: () => void;
}) {
  const t = useTranslations("DashboardCommercialLeads");
  const detail = useTranslations("CommercialLeadDetail");
  const professionalType = useTranslations("ProfessionalType");
  const [lead, setLead] = useState<CommercialLead | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<CommercialLeadStatus | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getCommercialLead(id)
      .then((data) => {
        if (!cancelled) setLead(data);
      })
      .catch((caught) => {
        if (cancelled) return;
        setError(
          caught instanceof ApiError && caught.status === 404 ? detail("notFound") : detail("loadError"),
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- translators are stable per locale render
  }, [id]);

  async function handleStatusChange(status: CommercialLeadStatus) {
    if (!lead) return;
    setPendingStatus(status);
    try {
      const updated = await updateCommercialLeadStatus(lead.id, status);
      setLead(updated);
      onUpdated?.(updated);
      modal.success(detail("statusUpdateSuccess"));
    } catch (caught) {
      modal.error(caught instanceof ApiError ? caught.message : detail("statusUpdateError"));
    } finally {
      setPendingStatus(null);
    }
  }

  function handleStatusAction(status: CommercialLeadStatus) {
    // Rejecting is a terminal, negative action - confirm first, same
    // pattern as handleDelete below.
    if (status === "rejected") {
      modal.confirm({
        message: detail("confirmReject"),
        confirmLabel: detail("reject"),
        cancelLabel: t("cancel"),
        onConfirm: () => handleStatusChange(status),
      });
      return;
    }
    handleStatusChange(status);
  }

  function handleDelete() {
    if (!lead) return;
    modal.confirm({
      message: t("confirmDelete", { name: lead.full_name }),
      confirmLabel: t("delete"),
      cancelLabel: t("cancel"),
      onConfirm: async () => {
        setIsDeleting(true);
        try {
          await deleteCommercialLead(lead.id);
          modal.close();
          onDeleted?.();
        } catch (caught) {
          modal.error(caught instanceof ApiError ? caught.message : t("deleteError"));
          setIsDeleting(false);
        }
      },
    });
  }

  if (isLoading) {
    return <p className="text-sm text-text-muted">{detail("loading")}</p>;
  }

  if (error || !lead) {
    return <p className="text-sm text-error">{error ?? detail("notFound")}</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-semibold text-balance text-text">{lead.full_name}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <CommercialLeadStatusBadge status={lead.status} />
          </div>
        </div>
        <Button variant="destructive" onClick={handleDelete} isLoading={isDeleting}>
          {t("delete")}
        </Button>
      </div>

      <DetailSection icon={<User className="h-4 w-4" />} title={detail("personalInformation")}>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <DetailRow label={detail("email")} value={<bdi dir="ltr">{lead.email}</bdi>} icon={<Mail className="h-3.5 w-3.5" />} />
          <DetailRow label={detail("phone")} value={<bdi dir="ltr">{lead.phone ?? "—"}</bdi>} />
          <DetailRow label={detail("whatsapp")} value={<bdi dir="ltr">{lead.whatsapp ?? "—"}</bdi>} />
        </dl>
      </DetailSection>

      <DetailSection icon={<Building2 className="h-4 w-4" />} title={detail("companyInformation")}>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <DetailRow label={detail("companyName")} value={lead.company_name ?? "—"} />
          <DetailRow label={detail("position")} value={lead.position ?? "—"} icon={<Briefcase className="h-3.5 w-3.5" />} />
          <DetailRow label={detail("professionalType")} value={professionalType(lead.professional_type)} />
          <DetailRow label={detail("city")} value={lead.city ?? "—"} icon={<MapPin className="h-3.5 w-3.5" />} />
          <DetailRow label={detail("address")} value={lead.address ?? "—"} icon={<Home className="h-3.5 w-3.5" />} />
        </dl>
      </DetailSection>

      <DetailSection icon={<MessageSquare className="h-4 w-4" />} title={detail("message")}>
        <p className="text-[0.95rem] text-text">{lead.message ?? detail("noMessage")}</p>
      </DetailSection>

      <DetailSection icon={<Calendar className="h-4 w-4" />} title={detail("leadInformation")}>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <DetailRow
            label={t("submittedOn")}
            value={dateFormatter.format(new Date(lead.created_at))}
            icon={<Calendar className="h-3.5 w-3.5" />}
          />
          <DetailRow
            label={detail("updatedAt")}
            value={dateFormatter.format(new Date(lead.updated_at))}
            icon={<Calendar className="h-3.5 w-3.5" />}
          />
        </dl>
      </DetailSection>

      <div className="rounded-md border border-border bg-surface-muted p-4">
        <p className="mb-3 text-[0.7rem] font-bold tracking-wide text-text-muted uppercase">
          {detail("updateStatus")}
        </p>
        <div className="flex flex-wrap gap-2">
          {STATUS_ACTIONS.map((action) => (
            <Button
              key={action.status}
              type="button"
              variant={action.variant}
              size="sm"
              disabled={pendingStatus !== null || lead.status === action.status}
              isLoading={pendingStatus === action.status}
              onClick={() => handleStatusAction(action.status)}
            >
              {detail(action.labelKey)}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
