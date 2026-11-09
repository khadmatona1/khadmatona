"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { modal } from "@/lib/modal";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { api, ApiError } from "@/lib/api";

export default function ForgotPasswordPage() {
  const t = useTranslations("Auth");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await api.post("/api/v1/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      modal.error(err instanceof ApiError ? err.message : t("genericError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (sent) {
    return (
      <>
        <h2 className="mb-4 font-display text-2xl font-semibold text-text">
          {t("checkEmailTitle")}
        </h2>
        <Alert tone="success">
          {t.rich("checkEmailBody", {
            email,
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
        </Alert>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm font-semibold text-gold-primary hover:underline"
        >
          {t("backToSignIn")}
        </Link>
      </>
    );
  }

  return (
    <>
      <h2 className="mb-1 font-display text-2xl font-semibold text-text">
        {t("forgotPasswordTitle")}
      </h2>
      <p className="mb-6 text-sm text-text-muted">{t("forgotPasswordSubtitle")}</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <Field
          label={t("email")}
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Button type="submit" isLoading={isSubmitting}>
          {t("sendResetLink")}
        </Button>
      </form>

      <Link
        href="/login"
        className="mt-6 inline-block text-sm font-semibold text-gold-primary hover:underline"
      >
        {t("backToSignIn")}
      </Link>
    </>
  );
}
