"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { UserForm } from "@/components/users/user-form";
import { ApiError } from "@/lib/api";
import { modal } from "@/lib/modal";
import { getUser, updateUser } from "@/lib/users";
import type { User } from "@/types/api";
import type { UserFormValues } from "@/types/user";

export function UserEditContent({
  id,
  onUpdated,
}: {
  id: number;
  /** Keeps the underlying list row in sync after a successful edit, since
   * the list doesn't refetch on its own. */
  onUpdated?: (user: User) => void;
}) {
  const t = useTranslations("DashboardUsers");
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getUser(id)
      .then((data) => {
        if (!cancelled) setUser(data);
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

  async function handleSubmit(values: UserFormValues) {
    const updated = await updateUser(id, values);
    onUpdated?.(updated);
    modal.success(t("editSuccess"));
  }

  if (isLoading) {
    return <p className="text-sm text-text-muted">{t("loading")}</p>;
  }

  if (error || !user) {
    return <p className="text-sm text-error">{error ?? t("notFound")}</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="min-w-0">
        <h2 className="font-display text-xl font-semibold text-balance text-text">
          {t("editTitle")}
        </h2>
        <p className="mt-1 truncate text-sm text-text-muted">{user.name}</p>
      </div>

      <UserForm
        initialValues={{
          name: user.name,
          email: user.email,
          password: "",
          password_confirmation: "",
          role: user.roles?.[0] ?? "",
          is_active: user.is_active,
          contact_id: user.contact_id,
        }}
        isEditing
        submitLabel={t("editSubmit")}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
