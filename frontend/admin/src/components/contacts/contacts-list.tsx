"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { modal } from "@/lib/modal";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { EyeIcon, PencilIcon, TrashIcon } from "@/components/ui/action-icons";
import { ContactTypeBadge } from "@/components/contacts/type-badge";
import { ContactCreateContent } from "@/components/contacts/contact-create-content";
import { ContactEditContent } from "@/components/contacts/contact-edit-content";
import { ContactDetailContent } from "@/components/contacts/contact-detail-content";
import { ApiError } from "@/lib/api";
import { deleteContact, listContacts } from "@/lib/contacts";
import { CONTACT_TYPES, type Contact, type ContactType } from "@/types/contact";
import type { Pagination as PaginationData } from "@/types/property";

export function ContactsList({ title, subtitle }: { title: string; subtitle: string }) {
  const t = useTranslations("DashboardContacts");
  const contactType = useTranslations("ContactType");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ContactType | "">("");
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setIsLoading(true);

      try {
        const result = await listContacts({ page, search, type: typeFilter || undefined });
        if (cancelled) return;
        setContacts(result.contacts);
        setPagination(result.pagination);
      } catch (caught) {
        if (cancelled) return;
        modal.error(caught instanceof ApiError ? caught.message : t("genericError"));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` is stable per locale render
  }, [page, search, typeFilter]);

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function handleTypeFilterChange(value: string) {
    setTypeFilter(value as ContactType | "");
    setPage(1);
  }

  function handleCreate() {
    modal.custom({
      content: (
        <ContactCreateContent
          onCreated={(created) => setContacts((current) => [created, ...current])}
        />
      ),
    });
  }

  function handleContactUpdated(updated: Contact) {
    setContacts((current) => current.map((c) => (c.id === updated.id ? updated : c)));
  }

  function handleView(contact: Contact) {
    modal.custom({
      content: <ContactDetailContent id={contact.id} onUpdated={handleContactUpdated} />,
    });
  }

  function handleEdit(contact: Contact) {
    modal.custom({
      content: <ContactEditContent id={contact.id} onUpdated={handleContactUpdated} />,
    });
  }

  function handleDelete(contact: Contact) {
    modal.confirm({
      message: t("confirmDelete", { name: contact.name }),
      confirmLabel: t("delete"),
      cancelLabel: t("cancel"),
      onConfirm: async () => {
        setDeletingId(contact.id);
        try {
          await deleteContact(contact.id);
          setContacts((current) => current.filter((c) => c.id !== contact.id));
          modal.success(t("deleteSuccess"));
        } catch (caught) {
          modal.error(caught instanceof ApiError ? caught.message : t("deleteError"));
        } finally {
          setDeletingId(null);
        }
      },
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold text-text sm:text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-text-muted">{subtitle}</p>
        </div>
        <Button className="w-full sm:w-auto" onClick={handleCreate}>
          {t("addContact")}
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <form onSubmit={handleSearchSubmit} className="flex w-full max-w-sm items-center gap-2">
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full min-w-0 rounded-sm border-[1.5px] border-border-strong bg-surface px-3.5 py-2.5 text-[0.95rem] text-text focus-visible:border-gold-primary"
          />
        </form>
        <div className="w-full sm:max-w-56">
          <Select
            label={t("type")}
            value={typeFilter}
            onChange={(event) => handleTypeFilterChange(event.target.value)}
          >
            <option value="">{t("allTypes")}</option>
            {CONTACT_TYPES.map((type) => (
              <option key={type} value={type}>
                {contactType(type)}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} columns={5} />
      ) : contacts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-strong bg-surface-muted p-8 text-center sm:p-12">
          <h3 className="font-display text-xl font-semibold text-text">{t("noResultsTitle")}</h3>
          <p className="mt-2 text-sm text-text-muted">
            {search || typeFilter ? t("noResultsWithSearch") : t("noResultsEmpty")}
          </p>
        </div>
      ) : (
        <>
          <Table>
            <TableHead>
              <TableHeaderCell>{t("name")}</TableHeaderCell>
              <TableHeaderCell>{t("type")}</TableHeaderCell>
              <TableHeaderCell>{t("email")}</TableHeaderCell>
              <TableHeaderCell>{t("phone")}</TableHeaderCell>
              <TableHeaderCell>{t("actions")}</TableHeaderCell>
            </TableHead>
            <TableBody>
              {contacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell label={t("name")} className="max-w-[200px] truncate font-semibold">
                    {contact.name}
                  </TableCell>
                  <TableCell label={t("type")}>
                    <ContactTypeBadge type={contact.type} />
                  </TableCell>
                  <TableCell label={t("email")} className="max-w-[220px] truncate">
                    <bdi dir="ltr">{contact.email ?? "—"}</bdi>
                  </TableCell>
                  <TableCell label={t("phone")}>
                    <bdi dir="ltr">{contact.phone ?? "—"}</bdi>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-start gap-1">
                      <button
                        type="button"
                        onClick={() => handleView(contact)}
                        title={t("view")}
                        aria-label={t("view")}
                        className="rounded-md p-2 text-text-muted hover:bg-surface-muted hover:text-gold-primary"
                      >
                        <EyeIcon />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEdit(contact)}
                        title={t("edit")}
                        aria-label={t("edit")}
                        className="rounded-md p-2 text-text-muted hover:bg-surface-muted hover:text-gold-primary"
                      >
                        <PencilIcon />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(contact)}
                        disabled={deletingId === contact.id}
                        title={deletingId === contact.id ? t("deleting") : t("delete")}
                        aria-label={deletingId === contact.id ? t("deleting") : t("delete")}
                        className="rounded-md p-2 text-text-muted hover:bg-error/10 hover:text-error disabled:opacity-50"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {pagination && <Pagination pagination={pagination} onPageChange={setPage} />}
        </>
      )}
    </div>
  );
}
