"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { modal } from "@/lib/modal";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { POST_STATUSES, type PostFormValues, type PostStatus } from "@/types/blog";

const EMPTY_VALUES: PostFormValues = {
  title: "",
  slug: "",
  excerpt: "",
  body: "",
  status: "draft",
  published_at: "",
  cover_image: null,
};

export function PostForm({
  initialValues,
  existingCoverImage = null,
  submitLabel,
  onSubmit,
}: {
  initialValues?: Partial<PostFormValues>;
  /** Already-saved cover image URL - only meaningful in edit mode. */
  existingCoverImage?: string | null;
  submitLabel: string;
  onSubmit: (values: PostFormValues) => Promise<void>;
}) {
  const t = useTranslations("PostForm");
  const postStatus = useTranslations("PostStatus");
  const [values, setValues] = useState<PostFormValues>({
    ...EMPTY_VALUES,
    ...initialValues,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pendingPreview = useMemo(
    () => (values.cover_image ? URL.createObjectURL(values.cover_image) : null),
    [values.cover_image],
  );
  useEffect(() => {
    return () => {
      if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    };
  }, [pendingPreview]);

  function set<K extends keyof PostFormValues>(key: K, value: PostFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function handleCoverImageSelected(fileList: FileList | null) {
    set("cover_image", fileList?.[0] ?? null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      await onSubmit(values);
    } catch (caught) {
      if (caught instanceof ApiError && Object.keys(caught.errors).length > 0) {
        const flattened: Record<string, string> = {};
        for (const [field, messages] of Object.entries(caught.errors)) {
          flattened[field] = messages[0];
        }
        setFieldErrors(flattened);
      } else {
        modal.error(caught instanceof ApiError ? caught.message : t("genericError"));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const coverPreview = pendingPreview ?? existingCoverImage;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <Field
        label={t("title")}
        required
        value={values.title}
        onChange={(event) => set("title", event.target.value)}
        error={fieldErrors.title}
      />

      <Field
        label={t("slug")}
        hint={t("slugHint")}
        value={values.slug}
        onChange={(event) => set("slug", event.target.value)}
        error={fieldErrors.slug}
      />

      <Textarea
        label={t("excerpt")}
        value={values.excerpt}
        onChange={(event) => set("excerpt", event.target.value)}
        error={fieldErrors.excerpt}
      />

      <Textarea
        label={t("body")}
        hint={t("bodyHint")}
        required
        className="min-h-[16rem] font-mono text-[0.85rem]"
        value={values.body}
        onChange={(event) => set("body", event.target.value)}
        error={fieldErrors.body}
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Select
          label={t("status")}
          value={values.status}
          onChange={(event) => set("status", event.target.value as PostStatus)}
          error={fieldErrors.status}
        >
          {POST_STATUSES.map((value) => (
            <option key={value} value={value}>
              {postStatus(value)}
            </option>
          ))}
        </Select>

        <Field
          label={t("publishedAt")}
          type="date"
          hint={t("publishedAtHint")}
          value={values.published_at}
          onChange={(event) => set("published_at", event.target.value)}
          error={fieldErrors.published_at}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-bold text-text">{t("coverImage")}</label>
        <input
          type="file"
          accept="image/*"
          onChange={(event) => handleCoverImageSelected(event.target.files)}
          className="w-full rounded-sm border-[1.5px] border-border-strong bg-surface px-3.5 py-2.5 text-[0.9rem] text-text file:mr-3 file:rounded-sm file:border-0 file:bg-gold-primary/15 file:px-3 file:py-1.5 file:font-semibold file:text-gold-primary"
        />
        {fieldErrors.cover_image && (
          <p className="text-[0.76rem] font-semibold text-error">{fieldErrors.cover_image}</p>
        )}

        {coverPreview && (
          <div className="mt-2 h-32 w-56 overflow-hidden rounded-md border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview or media-library-served thumbnail */}
            <img src={coverPreview} alt="" className="h-full w-full object-cover" />
          </div>
        )}
      </div>

      <Button type="submit" isLoading={isSubmitting} className="self-start">
        {submitLabel}
      </Button>
    </form>
  );
}
