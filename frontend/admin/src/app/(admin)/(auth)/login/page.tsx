"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { modal } from "@/lib/modal";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { user, isLoading, login } = useAuth();
  const t = useTranslations("Auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Skip the form if the session check has already confirmed a logged-in
  // user - driven by the real /auth/me result, never by cookie presence
  // alone (that's what caused the login<->dashboard redirect loop the
  // proxy used to have).
  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/dashboard");
    }
  }, [isLoading, user, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      await login(email, password, remember);
      router.push("/dashboard");
    } catch (error) {
      if (error instanceof ApiError) {
        if (Object.keys(error.errors).length > 0) {
          setFieldErrors({
            email: error.fieldError("email") ?? "",
          });
        } else {
          modal.error(error.message);
        }
      } else {
        modal.error(t("genericError"));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <h2 className="mb-1 font-display text-2xl font-semibold text-text">
        {t("signInTitle")}
      </h2>
      <p className="mb-6 text-sm text-text-muted">{t("signInSubtitle")}</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <Field
          label={t("email")}
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={fieldErrors.email}
        />
        <Field
          label={t("password")}
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              className="h-4 w-4 accent-gold-primary"
            />
            {t("rememberMe")}
          </label>
          <Link
            href="/forgot-password"
            className="text-sm font-semibold text-gold-primary hover:underline"
          >
            {t("forgotPassword")}
          </Link>
        </div>
        <Button type="submit" isLoading={isSubmitting} className="mt-1">
          {t("signIn")}
        </Button>
      </form>
    </>
  );
}
