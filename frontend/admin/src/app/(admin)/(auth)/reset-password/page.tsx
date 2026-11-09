import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage() {
  const t = await getTranslations("Dashboard");

  return (
    <Suspense fallback={<p className="text-sm text-text-muted">{t("loading")}…</p>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
