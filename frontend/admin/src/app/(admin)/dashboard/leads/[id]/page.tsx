"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { modal } from "@/lib/modal";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { LeadStatusBadge } from "@/components/leads/status-badge";
import { ApiError } from "@/lib/api";
import { deleteLead, getLead, updateLeadStatus } from "@/lib/leads";
import { LEAD_STATUSES, type Lead, type LeadStatus, type LeadType } from "@/types/lead";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const LIST_ROUTE: Record<LeadType, string> = {
  contact: "/dashboard/leads/contact",
  sell_request: "/dashboard/leads/sell",
  buy_request: "/dashboard/leads/buy",
  rent_request: "/dashboard/leads/rent",
  visit_request: "/dashboard/leads/visit",
};

export default function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const t = useTranslations("DashboardLeads");
  const leadDetail = useTranslations("LeadDetail");
  const leadType = useTranslations("LeadType");
  const leadStatus = useTranslations("LeadStatus");
  const leads = useTranslations("Leads");
  const [lead, setLead] = useState<Lead | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getLead(id)
      .then((data) => {
        if (!cancelled) setLead(data);
      })
      .catch((caught) => {
        if (cancelled) return;
        setLoadError(
          caught instanceof ApiError && caught.status === 404
            ? leadDetail("notFound")
            : leadDetail("loadError"),
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

  async function handleStatusChange(status: LeadStatus) {
    if (!lead) return;
    setIsUpdatingStatus(true);
    try {
      const updated = await updateLeadStatus(lead.id, status);
      setLead(updated);
      modal.success(leadDetail("statusUpdateSuccess"));
    } catch (caught) {
      modal.error(caught instanceof ApiError ? caught.message : leadDetail("statusUpdateError"));
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  function handleDelete() {
    if (!lead) return;
    modal.confirm({
      message: t("confirmDelete", { name: lead.name }),
      confirmLabel: t("delete"),
      cancelLabel: t("cancel"),
      onConfirm: async () => {
        setIsDeleting(true);
        try {
          await deleteLead(lead.id);
          modal.success(t("deleteSuccess"));
          router.push(LIST_ROUTE[lead.type]);
        } catch (caught) {
          modal.error(caught instanceof ApiError ? caught.message : t("deleteError"));
          setIsDeleting(false);
        }
      },
    });
  }

  if (isLoading) {
    return <p className="text-sm text-text-muted">{leadDetail("loading")}</p>;
  }

  if (loadError && !lead) {
    return <Alert tone="error">{loadError}</Alert>;
  }

  if (!lead) {
    return <Alert tone="error">{leadDetail("notFound")}</Alert>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href={LIST_ROUTE[lead.type]}
            className="text-sm font-semibold text-gold-primary hover:underline"
          >
            {leadDetail("backToList")}
          </Link>
          <h1 className="mt-2 font-display text-2xl font-semibold text-balance text-text sm:text-3xl">
            {lead.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <LeadStatusBadge status={lead.status} />
          </div>
        </div>
        <Button variant="destructive" onClick={handleDelete} isLoading={isDeleting}>
          {t("delete")}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <p className="mb-2 text-[0.7rem] font-bold tracking-wide text-text-muted uppercase">
            {leadDetail("message")}
          </p>
          <p className="max-w-none text-[0.95rem] text-text">
            {lead.message ?? leadDetail("noMessage")}
          </p>

          {lead.property_id && (
            <div className="mt-5 border-t border-border pt-4">
              <p className="mb-2 text-[0.7rem] font-bold tracking-wide text-text-muted uppercase">
                {leadDetail("linkedProperty")}
              </p>
              <Link
                href={`/dashboard/properties/${lead.property_id}`}
                className="text-sm font-semibold text-gold-primary hover:underline"
              >
                {leadDetail("viewProperty")}
              </Link>
            </div>
          )}

          {(lead.property_type || lead.city || lead.district || lead.address) && (
            <div className="mt-5 border-t border-border pt-4">
              <p className="mb-2 text-[0.7rem] font-bold tracking-wide text-text-muted uppercase">
                {leadDetail("propertyRequestDetails")}
              </p>
              <dl className="flex flex-col gap-2 text-sm">
                {lead.property_type && (
                  <Row label={leads("propertyTypeLabel")} value={leads(`propertyType.${lead.property_type}`)} />
                )}
                {lead.city && <Row label={leads("field.city")} value={lead.city} />}
                {lead.district && <Row label={leads("field.district")} value={lead.district} />}
                {lead.address && <Row label={leads("field.fullAddress")} value={lead.address} />}
                {lead.property_details &&
                  Object.entries(lead.property_details).map(([key, value]) => (
                    <Row
                      key={key}
                      label={leads(`field.${key}`)}
                      value={typeof value === "boolean" ? leads(value ? "field.yes" : "field.no") : String(value)}
                    />
                  ))}
              </dl>
            </div>
          )}
        </Card>

        <Card className="flex flex-col gap-5">
          <div>
            <p className="mb-4 text-[0.7rem] font-bold tracking-wide text-text-muted uppercase">
              {leadDetail("details")}
            </p>
            <dl className="flex flex-col gap-3 text-sm">
              <Row label={t("type")} value={leadType(lead.type)} />
              <Row label={t("email")} value={<bdi dir="ltr">{lead.email}</bdi>} />
              <Row label={leadDetail("phone")} value={<bdi dir="ltr">{lead.phone ?? "—"}</bdi>} />
              <Row
                label={t("submittedOn")}
                value={dateFormatter.format(new Date(lead.created_at))}
              />
            </dl>
          </div>

          <div className="border-t border-border pt-4">
            <Select
              label={leadDetail("updateStatus")}
              value={lead.status}
              disabled={isUpdatingStatus}
              onChange={(event) => handleStatusChange(event.target.value as LeadStatus)}
            >
              {LEAD_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {leadStatus(status)}
                </option>
              ))}
            </Select>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-text-muted">{label}</dt>
      <dd className="text-end font-semibold text-text">{value}</dd>
    </div>
  );
}
