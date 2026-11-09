"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { modal } from "@/lib/modal";
import { Card } from "@/components/ui/card";
import { UserForm } from "@/components/users/user-form";
import { createUser } from "@/lib/users";
import type { UserFormValues } from "@/types/user";

export default function NewUserPage() {
  const router = useRouter();
  const t = useTranslations("DashboardUsers");

  async function handleSubmit(values: UserFormValues) {
    await createUser(values);
    modal.success(t("createSuccess"));
    router.push("/dashboard/users");
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text sm:text-3xl">
          {t("newTitle")}
        </h1>
        <p className="mt-1 text-sm text-text-muted">{t("newSubtitle")}</p>
      </div>

      <Card className="w-full max-w-xl">
        <UserForm submitLabel={t("createSubmit")} onSubmit={handleSubmit} />
      </Card>
    </div>
  );
}
