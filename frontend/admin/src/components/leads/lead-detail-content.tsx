"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Building2, Calendar, Home, Mail, MapPinned, MessageCircle, MessageSquare, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { DetailRow, DetailSection } from "@/components/ui/detail-section";
import { PropertyDetailContent } from "@/components/properties/property-detail-content";
import { PROPERTY_DETAIL_ROWS } from "@/components/leads/property-request-fields";
import { LeadStatusBadge } from "@/components/leads/status-badge";
import { CallbackSchedulerContent } from "@/components/leads/callback-scheduler-content";
import { LeadWhatsAppSection } from "@/components/whatsapp/lead-whatsapp-section";
import { ContactDetailContent } from "@/components/contacts/contact-detail-content";
import { ContactPickerContent } from "@/components/contacts/contact-picker-content";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { getContact } from "@/lib/contacts";
import { modal } from "@/lib/modal";
import { deleteLead, getLead, linkLeadContact, updateLeadStatus } from "@/lib/leads";
import { moroccoDateTimeFormatter } from "@/lib/morocco-time";
import { LEAD_STATUSES, type Lead, type LeadStatus } from "@/types/lead";
import type { Contact } from "@/types/contact";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function LeadDetailContent({
  id,
  onUpdated,
  onDeleted,
}: {
  id: number;
  /** Keeps the underlying list row in sync after a status change made from
   * inside this popup, since the list doesn't refetch on its own. */
  onUpdated?: (lead: Lead) => void;
  /** Lets the caller remove the row from its own list state - this popup
   * only knows about the single lead it fetched, not the list. */
  onDeleted?: () => void;
}) {
  const t = useTranslations("DashboardLeads");
  const leadDetail = useTranslations("LeadDetail");
  const leadType = useTranslations("LeadType");
  const leadStatus = useTranslations("LeadStatus");
  // Same "Leads" namespace the public sell/rent wizard uses for property
  // type/field labels (property-request-wizard.tsx) - reused here rather
  // than duplicated, so admin and public read the exact same field names.
  const leads = useTranslations("Leads");
  const contactDetail = useTranslations("ContactDetail");
  const leadCallback = useTranslations("LeadCallback");
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes("Admin") ?? false;
  const [lead, setLead] = useState<Lead | null>(null);
  const [linkedContact, setLinkedContact] = useState<Contact | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLinkingContact, setIsLinkingContact] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getLead(id)
      .then(async (data) => {
        if (cancelled) return;
        setLead(data);
        if (data.contact_id) {
          try {
            const contact = await getContact(data.contact_id);
            if (!cancelled) setLinkedContact(contact);
          } catch {
            // Non-blocking - the section just falls back to "no contact linked".
          }
        }
      })
      .catch((caught) => {
        if (cancelled) return;
        setError(
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

  async function handleStatusChange(status: LeadStatus, callbackAt?: string) {
    if (!lead) return;
    setIsUpdatingStatus(true);
    try {
      const updated = await updateLeadStatus(lead.id, status, callbackAt);
      setLead(updated);
      onUpdated?.(updated);
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
          modal.close();
          onDeleted?.();
        } catch (caught) {
          modal.error(caught instanceof ApiError ? caught.message : t("deleteError"));
          setIsDeleting(false);
        }
      },
    });
  }

  /** "À rappeler" needs a time: ask for it first, then save status + timer together. */
  function openCallbackScheduler() {
    modal.custom({
      content: (
        <CallbackSchedulerContent
          initialValue={lead?.callback_at}
          onConfirm={(callbackAt) => handleStatusChange("to_call_back", callbackAt)}
        />
      ),
    });
  }

  function handleViewProperty() {
    if (!lead?.property_id) return;
    modal.custom({ content: <PropertyDetailContent id={lead.property_id} /> });
  }

  function handleViewContact() {
    if (!lead?.contact_id) return;
    modal.custom({ content: <ContactDetailContent id={lead.contact_id} /> });
  }

  async function handleLinkContact(contact: Contact) {
    if (!lead) return;
    setIsLinkingContact(true);
    try {
      const updated = await linkLeadContact(lead.id, contact.id);
      setLead(updated);
      setLinkedContact(contact);
      onUpdated?.(updated);
    } catch (caught) {
      modal.error(caught instanceof ApiError ? caught.message : contactDetail("linkError"));
    } finally {
      setIsLinkingContact(false);
    }
  }

  function handleOpenContactPicker() {
    modal.custom({ content: <ContactPickerContent onSelect={handleLinkContact} /> });
  }

  async function handleUnlinkContact() {
    if (!lead) return;
    setIsLinkingContact(true);
    try {
      const updated = await linkLeadContact(lead.id, null);
      setLead(updated);
      setLinkedContact(null);
      onUpdated?.(updated);
    } catch (caught) {
      modal.error(caught instanceof ApiError ? caught.message : contactDetail("linkError"));
    } finally {
      setIsLinkingContact(false);
    }
  }

  if (isLoading) {
    return <p className="text-sm text-text-muted">{leadDetail("loading")}</p>;
  }

  if (error || !lead) {
    return <p className="text-sm text-error">{error ?? leadDetail("notFound")}</p>;
  }

  // Only the property-detail fields that both apply to this lead's
  // property_type AND actually have a value - same filter the public
  // wizard's review step uses (property-request-wizard.tsx).
  const detailFields = lead.property_type
    ? PROPERTY_DETAIL_ROWS.flat().filter(
        (field) =>
          field.types.includes(lead.property_type!) &&
          lead.property_details?.[field.key] !== undefined &&
          lead.property_details[field.key] !== null &&
          lead.property_details[field.key] !== "",
      )
    : [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-semibold text-balance text-text">{lead.name}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone="neutral">{leadType(lead.type)}</Badge>
            <LeadStatusBadge status={lead.status} />
          </div>
        </div>
        {isAdmin && (
          <Button variant="destructive" onClick={handleDelete} isLoading={isDeleting}>
            {t("delete")}
          </Button>
        )}
      </div>

      <DetailSection icon={<Mail className="h-4 w-4" />} title={leadDetail("details")}>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <DetailRow label={t("email")} value={<bdi dir="ltr">{lead.email}</bdi>} />
          <DetailRow label={leadDetail("phone")} value={<bdi dir="ltr">{lead.phone ?? "—"}</bdi>} />
          <DetailRow label={leads("address")} value={lead.address || "—"} />
          <DetailRow
            label={t("submittedOn")}
            value={dateFormatter.format(new Date(lead.created_at))}
            icon={<Calendar className="h-3.5 w-3.5" />}
          />
        </dl>
      </DetailSection>

      <DetailSection icon={<MessageSquare className="h-4 w-4" />} title={leadDetail("message")}>
        <p className="whitespace-pre-wrap text-[0.95rem] text-text">{lead.message ?? leadDetail("noMessage")}</p>
      </DetailSection>

      {Boolean(lead.photos?.length) && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {lead.photos?.map((photo, index) => (
            <a key={photo.id} href={photo.url} target="_blank" rel="noopener noreferrer">
              {/* Same media/CDN delivery as property galleries. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt={`${leadDetail("propertyRequestDetails")} ${index + 1}`} className="aspect-square w-full rounded-lg object-cover" loading="lazy" />
            </a>
          ))}
        </div>
      )}

      <DetailSection icon={<MessageCircle className="h-4 w-4" />} title={leadDetail("whatsapp")}>
        <LeadWhatsAppSection lead={lead} />
      </DetailSection>


      {lead.property_id && (
        <DetailSection icon={<Home className="h-4 w-4" />} title={leadDetail("linkedProperty")}>
          <button
            type="button"
            onClick={handleViewProperty}
            className="text-sm font-semibold text-gold-primary hover:underline"
          >
            {leadDetail("viewProperty")}
          </button>
        </DetailSection>
      )}

      <DetailSection icon={<User className="h-4 w-4" />} title={contactDetail("linkedContact")}>
        {linkedContact ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleViewContact}
              className="text-sm font-semibold text-gold-primary hover:underline"
            >
              {linkedContact.name}
            </button>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={handleOpenContactPicker} disabled={isLinkingContact}>
                {contactDetail("changeContact")}
              </Button>
              <Button size="sm" variant="destructive" onClick={handleUnlinkContact} disabled={isLinkingContact}>
                {contactDetail("unlinkContact")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-text-muted">{contactDetail("noLinkedContact")}</p>
            <Button size="sm" variant="secondary" onClick={handleOpenContactPicker} disabled={isLinkingContact}>
              {contactDetail("linkContact")}
            </Button>
          </div>
        )}
      </DetailSection>

      {/* sell_request/rent_request only - the "Vendre ou louer" wizard's own
          type/location/property-details fields, not shown by visit_request
          or contact leads (which never set property_type). Same
          PROPERTY_DETAIL_ROWS config and Leads.field.* labels the public
          wizard's review step uses, so admin and public agree on what each
          field is called and which ones apply to a given property type. */}
      {lead.property_type && (
        <DetailSection
          icon={<Building2 className="h-4 w-4" />}
          title={leadDetail("propertyRequestDetails")}
          tone="gold"
        >
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge tone="gold">{leads(`propertyType.${lead.property_type}`)}</Badge>
          </div>

          {(lead.city || lead.district || lead.address) && (
            <div className="mb-3 flex items-start gap-2 text-sm text-text-muted">
              <MapPinned className="mt-0.5 h-4 w-4 shrink-0 text-gold-primary" aria-hidden="true" />
              <span className="text-text">
                {[lead.address, lead.district, lead.city].filter(Boolean).join(", ")}
              </span>
            </div>
          )}

          {detailFields.length > 0 && (
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 divide-y divide-border/60 text-sm sm:grid-cols-2 sm:divide-y-0">
              {detailFields.map((field) => {
                const value = lead.property_details![field.key];
                return (
                  <DetailRow
                    key={field.key}
                    label={leads(`field.${field.labelKey}`)}
                    value={field.kind === "boolean" ? leads(value ? "field.yes" : "field.no") : String(value)}
                    className="py-1.5 sm:py-0"
                  />
                );
              })}
            </dl>
          )}
        </DetailSection>
      )}

      <div className="rounded-md border border-border bg-surface-muted p-4">
        <Select
          label={leadDetail("updateStatus")}
          value={lead.status}
          disabled={isUpdatingStatus}
          onChange={(event) => {
            const next = event.target.value as LeadStatus;
            if (next === "to_call_back") openCallbackScheduler();
            else handleStatusChange(next);
          }}
        >
          {LEAD_STATUSES.map((status) => (
            <option key={status} value={status}>
              {leadStatus(status)}
            </option>
          ))}
        </Select>

        {/* Re-selecting "À rappeler" from the dropdown above when it's
            already the current status fires no onChange (native <select>
            behavior) - so a lead that reached this status before a time was
            ever set (or any other way callback_at ended up empty) needs its
            own always-visible way to set one, not just a "reschedule" button
            gated on a time already existing. */}
        {lead.status === "to_call_back" && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
            {lead.callback_at ? (
              <span className={new Date(lead.callback_at) < new Date() ? "font-semibold text-error" : "text-text"}>
                {leadCallback("scheduledFor", { when: moroccoDateTimeFormatter.format(new Date(lead.callback_at)) })}
                {new Date(lead.callback_at) < new Date() && ` · ${leadCallback("overdue")}`}
              </span>
            ) : (
              <span className="font-semibold text-warning">{leadCallback("noTimeSet")}</span>
            )}
            <Button size="sm" variant="secondary" onClick={openCallbackScheduler} disabled={isUpdatingStatus}>
              {leadCallback(lead.callback_at ? "reschedule" : "setTime")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
