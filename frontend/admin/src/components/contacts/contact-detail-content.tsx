"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Building2, Mail, MapPin, MessageSquare, Phone, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DetailRow, DetailSection } from "@/components/ui/detail-section";
import { ContactTypeBadge } from "@/components/contacts/type-badge";
import { ContactEditContent } from "@/components/contacts/contact-edit-content";
import { LeadDetailContent } from "@/components/leads/lead-detail-content";
import { LeadStatusBadge } from "@/components/leads/status-badge";
import { PropertyDetailContent } from "@/components/properties/property-detail-content";
import { PropertyStatusBadge } from "@/components/properties/status-badge";
import { UserCreateContent } from "@/components/users/user-create-content";
import { ApiError } from "@/lib/api";
import { getContact } from "@/lib/contacts";
import { listLeads } from "@/lib/leads";
import { modal } from "@/lib/modal";
import { listDashboardProperties } from "@/lib/properties";
import type { Contact } from "@/types/contact";
import type { Lead } from "@/types/lead";
import type { DashboardProperty } from "@/types/property";

export function ContactDetailContent({
  id,
  onUpdated,
}: {
  id: number;
  onUpdated?: (contact: Contact) => void;
}) {
  const t = useTranslations("DashboardContacts");
  const contactDetail = useTranslations("ContactDetail");
  const leadType = useTranslations("LeadType");
  const propertyType = useTranslations("PropertyType");
  const [contact, setContact] = useState<Contact | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [properties, setProperties] = useState<DashboardProperty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getContact(id)
      .then(async (data) => {
        if (cancelled) return;
        setContact(data);

        const [leadResult, propertyResult] = await Promise.all([
          listLeads({ contactId: data.id, perPage: 20 }),
          data.type === "seller" || data.type === "landlord"
            ? listDashboardProperties({ ownerContactId: data.id, perPage: 20 })
            : Promise.resolve(null),
        ]);

        if (cancelled) return;
        setLeads(leadResult.leads);
        setProperties(propertyResult?.properties ?? []);
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

  function handleViewLead(lead: Lead) {
    modal.custom({ content: <LeadDetailContent id={lead.id} /> });
  }

  function handleViewProperty(property: DashboardProperty) {
    modal.custom({ content: <PropertyDetailContent id={property.id} /> });
  }

  function handleCreateOwnerAccess() {
    if (!contact) return;
    modal.custom({
      content: <UserCreateContent lockedContact={{ id: contact.id, name: contact.name }} />,
    });
  }

  if (isLoading) {
    return <p className="text-sm text-text-muted">{t("loading")}</p>;
  }

  if (error || !contact) {
    return <p className="text-sm text-error">{error ?? t("notFound")}</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-semibold text-balance text-text">
            {contact.name}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <ContactTypeBadge type={contact.type} />
          </div>
        </div>
        <Button
          variant="secondary"
          onClick={() =>
            modal.custom({ content: <ContactEditContent id={contact.id} onUpdated={onUpdated} /> })
          }
        >
          {t("edit")}
        </Button>
      </div>

      <DetailSection icon={<Mail className="h-4 w-4" />} title={contactDetail("details")}>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <DetailRow label={contactDetail("email")} value={contact.email ?? "—"} />
          <DetailRow
            label={contactDetail("phone")}
            value={<bdi dir="ltr">{contact.phone ?? "—"}</bdi>}
            icon={<Phone className="h-3.5 w-3.5" />}
          />
          <DetailRow
            label={contactDetail("whatsapp")}
            value={<bdi dir="ltr">{contact.whatsapp ?? "—"}</bdi>}
            icon={<MessageSquare className="h-3.5 w-3.5" />}
          />
          <DetailRow
            label={contactDetail("address")}
            value={contact.address ?? "—"}
            icon={<MapPin className="h-3.5 w-3.5" />}
          />
        </dl>
        {contact.notes && (
          <p className="mt-3 border-t border-border pt-3 text-sm text-text">{contact.notes}</p>
        )}
      </DetailSection>

      <DetailSection icon={<Users className="h-4 w-4" />} title={contactDetail("linkedLeads")}>
        {leads.length === 0 ? (
          <p className="text-sm text-text-muted">{contactDetail("noLinkedLeads")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {leads.map((lead) => (
              <li key={lead.id}>
                <button
                  type="button"
                  onClick={() => handleViewLead(lead)}
                  className="flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-start text-sm hover:bg-surface"
                >
                  <span className="min-w-0 truncate">
                    {lead.name} <span className="text-text-muted">· {leadType(lead.type)}</span>
                  </span>
                  <LeadStatusBadge status={lead.status} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </DetailSection>

      {(contact.type === "seller" || contact.type === "landlord") && (
        <Button variant="secondary" onClick={handleCreateOwnerAccess} className="self-start">
          {contactDetail("createOwnerAccess")}
        </Button>
      )}

      {(contact.type === "seller" || contact.type === "landlord") && (
        <DetailSection icon={<Building2 className="h-4 w-4" />} title={contactDetail("ownedProperties")}>
          {properties.length === 0 ? (
            <p className="text-sm text-text-muted">{contactDetail("noOwnedProperties")}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {properties.map((property) => (
                <li key={property.id}>
                  <button
                    type="button"
                    onClick={() => handleViewProperty(property)}
                    className="flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-start text-sm hover:bg-surface"
                  >
                    <span className="min-w-0 truncate">
                      {property.title}{" "}
                      <span className="text-text-muted">· {propertyType(property.type)}</span>
                    </span>
                    <PropertyStatusBadge status={property.status} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </DetailSection>
      )}

      {contact.commercial_name && (
        <Badge tone="neutral">{contactDetail("managedBy", { name: contact.commercial_name })}</Badge>
      )}
    </div>
  );
}
