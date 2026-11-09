"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Calendar, Mail, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DetailRow, DetailSection } from "@/components/ui/detail-section";
import { UserEditContent } from "@/components/users/user-edit-content";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { modal } from "@/lib/modal";
import { deleteUser, getUser } from "@/lib/users";
import type { User } from "@/types/api";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

export function UserDetailContent({
  id,
  onUpdated,
  onDeleted,
}: {
  id: number;
  /** Forwarded to the edit popup opened from here, so the underlying list
   * row stays in sync after a save. */
  onUpdated?: (user: User) => void;
  /** Lets the caller remove the row from its own list state - this popup
   * only knows about the single user it fetched, not the list. */
  onDeleted?: () => void;
}) {
  const t = useTranslations("DashboardUsers");
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  function handleDelete() {
    if (!user) return;
    modal.confirm({
      message: t("confirmDelete", { name: user.name }),
      confirmLabel: t("delete"),
      cancelLabel: t("cancel"),
      onConfirm: async () => {
        setIsDeleting(true);
        try {
          await deleteUser(user.id);
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
    return <p className="text-sm text-text-muted">{t("loading")}</p>;
  }

  if (error || !user) {
    return <p className="text-sm text-error">{error ?? t("notFound")}</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-semibold text-balance text-text">
            {user.name}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {user.roles && user.roles.length > 0 ? (
              <Badge tone="gold">{user.roles[0]}</Badge>
            ) : (
              <span className="text-sm text-text-muted">{t("noRole")}</span>
            )}
            <Badge tone={user.is_active ? "success" : "error"}>
              {user.is_active ? t("active") : t("inactive")}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          {currentUser?.id !== user.id && (
            <Button variant="destructive" onClick={handleDelete} isLoading={isDeleting}>
              {t("delete")}
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={() =>
              modal.custom({ content: <UserEditContent id={user.id} onUpdated={onUpdated} /> })
            }
          >
            {t("edit")}
          </Button>
        </div>
      </div>

      <DetailSection icon={<Mail className="h-4 w-4" />} title={t("details")}>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <DetailRow label={t("email")} value={<bdi dir="ltr">{user.email}</bdi>} />
          <DetailRow
            label={t("role")}
            value={user.roles && user.roles.length > 0 ? user.roles[0] : t("noRole")}
            icon={<ShieldCheck className="h-3.5 w-3.5" />}
          />
          <DetailRow
            label={t("createdOn")}
            value={dateFormatter.format(new Date(user.created_at))}
            icon={<Calendar className="h-3.5 w-3.5" />}
          />
        </dl>
      </DetailSection>
    </div>
  );
}
