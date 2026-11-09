"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { modal } from "@/lib/modal";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { ApiError } from "@/lib/api";
import { listContacts } from "@/lib/contacts";
import { listRoles } from "@/lib/users";
import type { UserFormValues } from "@/types/user";

const EMPTY_VALUES: UserFormValues = {
  name: "",
  email: "",
  password: "",
  password_confirmation: "",
  role: "",
  is_active: true,
  contact_id: null,
};

export function UserForm({
  initialValues,
  isEditing = false,
  submitLabel,
  onSubmit,
  /** Set when opened from a specific Contact's detail view ("Créer un accès
   * propriétaire") - locks role to Owner and the contact picker to this one
   * contact, since that's the whole point of that entry point. */
  lockedContact,
}: {
  initialValues?: UserFormValues;
  /** Password becomes optional (blank = keep current) once editing. */
  isEditing?: boolean;
  submitLabel: string;
  onSubmit: (values: UserFormValues) => Promise<void>;
  lockedContact?: { id: number; name: string };
}) {
  const t = useTranslations("UserForm");
  const [values, setValues] = useState<UserFormValues>(() => {
    if (lockedContact) {
      return { ...(initialValues ?? EMPTY_VALUES), role: "Owner", contact_id: lockedContact.id };
    }
    return initialValues ?? EMPTY_VALUES;
  });
  const [roles, setRoles] = useState<string[]>([]);
  const [ownerContacts, setOwnerContacts] = useState<{ id: number; name: string }[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    listRoles()
      .then((data) => {
        if (cancelled) return;
        setRoles(data);
        // Only default to the first role for a brand-new (create) form -
        // an edit form already has the user's real role from initialValues,
        // which this must not clobber once the role list arrives. A locked
        // Owner form already has its role fixed too.
        if (data.length > 0 && !initialValues?.role && !lockedContact) {
          setValues((current) => ({ ...current, role: current.role || data[0] }));
        }
      })
      .catch(() => {
        if (!cancelled) modal.error(t("rolesLoadError"));
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initialValues/t/lockedContact are stable for the form's lifetime
  }, []);

  // The Owner role needs a linked seller/landlord Contact - fetched only
  // when actually needed (role picked as Owner, no locked contact already
  // supplied), same "fetch on demand, non-blocking on failure" shape as
  // ConversationAdminControls' agent picker.
  useEffect(() => {
    if (values.role !== "Owner" || lockedContact) return;
    let cancelled = false;

    Promise.all([
      listContacts({ type: "seller", perPage: 100 }),
      listContacts({ type: "landlord", perPage: 100 }),
    ])
      .then(([sellers, landlords]) => {
        if (cancelled) return;
        setOwnerContacts(
          [...sellers.contacts, ...landlords.contacts].map((c) => ({ id: c.id, name: c.name })),
        );
      })
      .catch(() => {
        // Non-blocking - the contact picker just stays empty.
      });

    return () => {
      cancelled = true;
    };
  }, [values.role, lockedContact]);

  function set<K extends keyof UserFormValues>(key: K, value: UserFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
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

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <Field
        label={t("name")}
        required
        value={values.name}
        onChange={(event) => set("name", event.target.value)}
        error={fieldErrors.name}
      />

      <Field
        label={t("email")}
        type="email"
        required
        dir="ltr"
        value={values.email}
        onChange={(event) => set("email", event.target.value)}
        error={fieldErrors.email}
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field
          label={t("password")}
          type="password"
          required={!isEditing}
          hint={isEditing ? t("passwordHint") : undefined}
          value={values.password}
          onChange={(event) => set("password", event.target.value)}
          error={fieldErrors.password}
        />
        <Field
          label={t("passwordConfirmation")}
          type="password"
          required={!isEditing}
          value={values.password_confirmation}
          onChange={(event) => set("password_confirmation", event.target.value)}
        />
      </div>

      <Select
        label={t("role")}
        required
        disabled={Boolean(lockedContact)}
        value={values.role}
        onChange={(event) => set("role", event.target.value)}
        error={fieldErrors.role}
      >
        {roles.length === 0 && <option value="">{t("loadingRoles")}</option>}
        {roles.map((role) => (
          <option key={role} value={role}>
            {role}
          </option>
        ))}
      </Select>

      {values.role === "Owner" && (
        lockedContact ? (
          <Field label={t("ownerContact")} value={lockedContact.name} disabled />
        ) : (
          <Combobox
            value={values.contact_id ? String(values.contact_id) : ""}
            onChange={(value) => set("contact_id", value ? Number(value) : null)}
            options={ownerContacts.map((c) => ({ value: String(c.id), label: c.name }))}
            placeholder={t("ownerContactPlaceholder")}
            ariaLabel={t("ownerContact")}
            error={fieldErrors.contact_id}
          />
        )
      )}

      {isEditing && (
        <Select
          label={t("accountStatus")}
          value={values.is_active === false ? "inactive" : "active"}
          onChange={(event) => set("is_active", event.target.value === "active")}
        >
          <option value="active">{t("active")}</option>
          <option value="inactive">{t("inactive")}</option>
        </Select>
      )}

      <Button type="submit" isLoading={isSubmitting} className="self-start">
        {submitLabel}
      </Button>
    </form>
  );
}
