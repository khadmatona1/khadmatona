"use client";

import { useTranslations } from "next-intl";
import { UserForm } from "@/components/users/user-form";
import { modal } from "@/lib/modal";
import { createUser } from "@/lib/users";
import type { User } from "@/types/api";
import type { UserFormValues } from "@/types/user";

export function UserCreateContent({
  onCreated,
  lockedContact,
}: {
  onCreated?: (user: User) => void;
  /** Set when opened from a Contact's detail view ("Créer un accès
   * propriétaire") - see UserForm's own doc comment. */
  lockedContact?: { id: number; name: string };
}) {
  const t = useTranslations("DashboardUsers");

  async function handleSubmit(values: UserFormValues) {
    const user = await createUser(values);
    onCreated?.(user);
    modal.success(t("createSuccess"));
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-xl font-semibold text-text">
          {lockedContact ? t("newOwnerAccessTitle") : t("newTitle")}
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          {lockedContact ? t("newOwnerAccessSubtitle", { name: lockedContact.name }) : t("newSubtitle")}
        </p>
      </div>

      <UserForm submitLabel={t("createSubmit")} onSubmit={handleSubmit} lockedContact={lockedContact} />
    </div>
  );
}
