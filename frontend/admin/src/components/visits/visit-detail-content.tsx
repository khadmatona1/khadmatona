"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { modal } from "@/lib/modal";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { listUsers } from "@/lib/users";
import { assignVisit, cancelVisit, getVisit, reportVisit, rescheduleVisit } from "@/lib/visits";
import { moroccoDateTimeFormatter } from "@/lib/morocco-time";
import { VisitSchedulerContent } from "@/components/visits/visit-scheduler-content";
import { VisitStatusBadge } from "@/components/visits/visit-status-badge";
import { VISIT_REPORT_OUTCOMES, type Visit, type VisitReportOutcome } from "@/types/visit";
import type { User } from "@/types/api";

/**
 * Self-fetches by id, same convention as PropertyDetailContent/
 * LeadDetailContent - callers (the calendar, the notification bell) only
 * ever need to know the id, not carry a pre-fetched object around.
 */
export function VisitDetailContent({
  id,
  onChange,
}: {
  id: number;
  onChange?: (visit: Visit) => void;
}) {
  const t = useTranslations("DashboardVisits");
  const [visit, setVisit] = useState<Visit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getVisit(id)
      .then((result) => {
        if (!cancelled) setVisit(result);
      })
      .catch((caught) => {
        if (!cancelled) setError(caught instanceof ApiError ? caught.message : t("genericError"));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` is stable per locale render
  }, [id]);

  function handleChange(updated: Visit) {
    setVisit(updated);
    onChange?.(updated);
  }

  if (isLoading) {
    return <p className="py-6 text-center text-sm text-text-muted">{t("loading")}</p>;
  }

  if (error || !visit) {
    return <p className="py-6 text-center text-sm text-error">{error ?? t("genericError")}</p>;
  }

  return <VisitDetailBody visit={visit} onChange={handleChange} />;
}

/**
 * Full visit record - lead/property info, assignment (Admin-only, mirrors
 * ConversationAdminControls' agent-picker pattern exactly), reschedule,
 * compte-rendu, cancel.
 */
function VisitDetailBody({
  visit,
  onChange,
}: {
  visit: Visit;
  onChange: (visit: Visit) => void;
}) {
  const t = useTranslations("DashboardVisits");
  const outcomeLabel = useTranslations("VisitReportOutcome");
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes("Admin") ?? false;

  const [agents, setAgents] = useState<User[]>([]);
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);
  const [outcome, setOutcome] = useState<VisitReportOutcome | "">(visit.report_outcome ?? "");
  const [report, setReport] = useState(visit.report ?? "");
  const [isSavingReport, setIsSavingReport] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;

    let cancelled = false;

    async function run() {
      try {
        const [commercials, seniors] = await Promise.all([
          listUsers({ role: "Commercial" }),
          listUsers({ role: "SeniorCommercial" }),
        ]);
        if (!cancelled) setAgents([...commercials.users, ...seniors.users]);
      } catch {
        // Non-blocking - the assignee picker just stays empty.
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  async function handleAssign(commercialId: number | null) {
    setIsSavingAssignment(true);
    try {
      onChange(await assignVisit(visit.id, commercialId));
    } catch (caught) {
      modal.error(caught instanceof ApiError ? caught.message : t("genericError"));
    } finally {
      setIsSavingAssignment(false);
    }
  }

  function openReschedule() {
    modal.custom({
      content: (
        <VisitSchedulerContent
          initialValue={visit.scheduled_at}
          onConfirm={async (iso) => {
            try {
              onChange(await rescheduleVisit(visit.id, iso));
            } catch (caught) {
              modal.error(caught instanceof ApiError ? caught.message : t("genericError"));
            }
          }}
        />
      ),
    });
  }

  async function handleSaveReport() {
    if (!outcome) return;
    setIsSavingReport(true);
    try {
      onChange(await reportVisit(visit.id, outcome, report.trim() || undefined));
      modal.success(t("reportSaved"));
    } catch (caught) {
      modal.error(caught instanceof ApiError ? caught.message : t("genericError"));
    } finally {
      setIsSavingReport(false);
    }
  }

  function handleCancel() {
    modal.confirm({
      message: t("confirmCancel"),
      confirmLabel: t("cancelVisit"),
      cancelLabel: t("keepVisit"),
      onConfirm: async () => {
        setIsCancelling(true);
        try {
          onChange(await cancelVisit(visit.id));
          modal.success(t("cancelSuccess"));
        } catch (caught) {
          modal.error(caught instanceof ApiError ? caught.message : t("genericError"));
        } finally {
          setIsCancelling(false);
        }
      },
    });
  }

  const canManage = visit.status === "scheduled";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-text">
            {visit.property_title ?? t("unknownProperty")}
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            <bdi dir="ltr">{moroccoDateTimeFormatter.format(new Date(visit.scheduled_at))}</bdi>
          </p>
        </div>
        <VisitStatusBadge status={visit.status} />
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-md border border-border bg-surface-muted p-4 text-sm sm:grid-cols-2">
        <div>
          <p className="text-[0.7rem] font-bold tracking-wide text-text-muted uppercase">{t("visitor")}</p>
          <p className="mt-0.5 font-semibold text-text">{visit.lead_name ?? "—"}</p>
        </div>
        <div>
          <p className="text-[0.7rem] font-bold tracking-wide text-text-muted uppercase">{t("phone")}</p>
          <bdi dir="ltr" className="mt-0.5 block text-text">{visit.lead_phone ?? "—"}</bdi>
        </div>
        <div>
          <p className="text-[0.7rem] font-bold tracking-wide text-text-muted uppercase">{t("email")}</p>
          <bdi dir="ltr" className="mt-0.5 block truncate text-text">{visit.lead_email ?? "—"}</bdi>
        </div>
        <div>
          <p className="text-[0.7rem] font-bold tracking-wide text-text-muted uppercase">{t("whatsappConfirmation")}</p>
          <p className="mt-0.5 text-text">
            {visit.whatsapp_confirmed_at ? t("whatsappConfirmed") : t("whatsappNotConfirmed")}
          </p>
        </div>
      </div>

      {isAdmin && (
        <Select
          label={t("assignedTo")}
          value={visit.commercial_id ?? ""}
          disabled={isSavingAssignment}
          onChange={(event) => handleAssign(event.target.value ? Number(event.target.value) : null)}
        >
          <option value="">{t("unassigned")}</option>
          {visit.commercial_id && !agents.some((a) => a.id === visit.commercial_id) && (
            <option value={visit.commercial_id}>{visit.commercial_name ?? `#${visit.commercial_id}`}</option>
          )}
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </Select>
      )}

      {canManage && (
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={openReschedule}>
            {t("reschedule")}
          </Button>
          <Button variant="secondary" onClick={handleCancel} isLoading={isCancelling}>
            {t("cancelVisit")}
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-border pt-4">
        <h3 className="font-display text-base font-semibold text-text">{t("report")}</h3>
        {canManage ? (
          <>
            <Select
              label={t("reportOutcome")}
              value={outcome}
              onChange={(event) => setOutcome(event.target.value as VisitReportOutcome | "")}
            >
              <option value="">{t("selectOutcome")}</option>
              {VISIT_REPORT_OUTCOMES.map((value) => (
                <option key={value} value={value}>
                  {outcomeLabel(value)}
                </option>
              ))}
            </Select>
            <Textarea
              label={t("reportNotes")}
              value={report}
              onChange={(event) => setReport(event.target.value)}
            />
            <Button onClick={handleSaveReport} disabled={!outcome} isLoading={isSavingReport} className="self-start">
              {t("saveReport")}
            </Button>
          </>
        ) : visit.report_outcome ? (
          <div className="rounded-md border border-border bg-surface-muted p-4 text-sm">
            <p className="font-semibold text-text">{outcomeLabel(visit.report_outcome)}</p>
            {visit.report && <p className="mt-2 text-text-muted">{visit.report}</p>}
          </div>
        ) : (
          <p className="text-sm text-text-muted">{t("noReportYet")}</p>
        )}
      </div>
    </div>
  );
}
