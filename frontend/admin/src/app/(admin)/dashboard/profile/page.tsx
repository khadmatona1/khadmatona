"use client";

import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

export default function ProfilePage() {
  const { user } = useAuth();
  const t = useTranslations("Profile");

  if (!user) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text sm:text-3xl">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-text-muted">{t("subtitle")}</p>
      </div>

      <Card className="w-full max-w-xl">
        <div className="mb-5 flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-gold font-mono text-lg font-bold text-white">
            {user.name
              .split(" ")
              .map((part) => part[0])
              .filter(Boolean)
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-semibold text-text">
              {user.name}
            </p>
            <p className="truncate text-sm text-text-muted">
              <bdi dir="ltr">{user.email}</bdi>
            </p>
          </div>
        </div>

        <dl className="flex flex-col gap-3 border-t border-border pt-4 text-sm">
          <Row label={t("name")} value={user.name} />
          <Row label={t("email")} value={<bdi dir="ltr">{user.email}</bdi>} />
          <Row label={t("role")} value={user.roles?.[0] ?? t("noRole")} />
          <Row
            label={t("memberSince")}
            value={dateFormatter.format(new Date(user.created_at))}
          />
        </dl>
      </Card>
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
