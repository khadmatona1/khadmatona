"use client";

import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { modal } from "@/lib/modal";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { UserForm } from "@/components/users/user-form";
import { getUser, updateUser } from "@/lib/users";
import type { User } from "@/types/api";
import type { UserFormValues } from "@/types/user";

export default function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
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
      .catch(() => {
        if (!cancelled) setError(t("loadError"));
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
    await updateUser(id, values);
    modal.success(t("editSuccess"));
    router.push("/dashboard/users");
  }

  if (isLoading) {
    return <p className="text-sm text-text-muted">{t("loading")}</p>;
  }

  if (error || !user) {
    return <Alert tone="error">{error ?? t("notFound")}</Alert>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-semibold text-text sm:text-3xl">
          {t("editTitle")}
        </h1>
        <p className="mt-1 truncate text-sm text-text-muted">{user.name}</p>
      </div>

      <Card className="w-full max-w-xl">
        <UserForm
          initialValues={{
            name: user.name,
            email: user.email,
            password: "",
            password_confirmation: "",
            role: user.roles?.[0] ?? "",
          }}
          isEditing
          submitLabel={t("editSubmit")}
          onSubmit={handleSubmit}
        />
      </Card>
    </div>
  );
}
