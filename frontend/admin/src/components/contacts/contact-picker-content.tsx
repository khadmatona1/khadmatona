"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ContactTypeBadge } from "@/components/contacts/type-badge";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { listContacts } from "@/lib/contacts";
import { modal } from "@/lib/modal";
import type { Contact } from "@/types/contact";

/** Small search-and-pick popup used to link a Lead to a Contact. */
export function ContactPickerContent({
  onSelect,
}: {
  onSelect: (contact: Contact) => void;
}) {
  const t = useTranslations("ContactPicker");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setIsLoading(true);
      try {
        const result = await listContacts({ search, perPage: 10 });
        if (!cancelled) setContacts(result.contacts);
      } catch (caught) {
        if (!cancelled) modal.error(caught instanceof ApiError ? caught.message : t("loadError"));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [search, t]);

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearch(searchInput.trim());
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-display text-lg font-semibold text-text">{t("title")}</h2>

      <form onSubmit={handleSearchSubmit}>
        <input
          type="search"
          autoFocus
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder={t("searchPlaceholder")}
          className="w-full min-w-0 rounded-sm border-[1.5px] border-border-strong bg-surface px-3.5 py-2.5 text-[0.95rem] text-text focus-visible:border-gold-primary"
        />
      </form>

      <div className="max-h-72 overflow-y-auto">
        {isLoading ? (
          <p className="py-4 text-center text-sm text-text-muted">{t("loading")}</p>
        ) : contacts.length === 0 ? (
          <p className="py-4 text-center text-sm text-text-muted">{t("noResults")}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {contacts.map((contact) => (
              <li key={contact.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(contact);
                    modal.close();
                  }}
                  className="flex w-full items-center justify-between gap-2 rounded-sm px-2 py-2 text-start text-sm hover:bg-surface-muted"
                >
                  <span className="min-w-0 truncate font-semibold text-text">{contact.name}</span>
                  <ContactTypeBadge type={contact.type} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Button variant="secondary" onClick={() => modal.close()} className="self-end">
        {t("cancel")}
      </Button>
    </div>
  );
}
