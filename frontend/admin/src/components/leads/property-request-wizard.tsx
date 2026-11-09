"use client";

import { useEffect, useState, type ComponentProps, type FormEvent, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import { ArrowLeft, ArrowRight, Mail, MessageSquare, Phone, User } from "lucide-react";
import { PROPERTY_DETAIL_ROWS, PROPERTY_REQUEST_TYPES } from "@/components/leads/property-request-fields";
import { modal } from "@/lib/modal";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { listCities } from "@/lib/lookup";
import { submitLead } from "@/lib/leads";
import { isValidPhoneNumber } from "@/lib/phone";
import { useFormAnalytics } from "@/lib/analytics/use-form-analytics";
import type { City } from "@/types/lookup";
import type { LeadType, PropertyRequestType } from "@/types/lead";

const TOTAL_STEPS = 5;
const STEP_KEYS = ["type", "details", "location", "contact", "review"] as const;

// Which step a given backend validation field belongs to, so a 422 on
// (say) "address" jumps the visitor back to the Location step instead of
// leaving the error invisible on the Review step they submitted from.
const STEP_OF_FIELD: Record<string, number> = {
  property_type: 1,
  city: 3,
  district: 3,
  address: 3,
  name: 4,
  email: 4,
  phone: 4,
  message: 4,
};

function stepForErrorField(field: string): number {
  if (field.startsWith("property_details")) return 2;
  return STEP_OF_FIELD[field] ?? TOTAL_STEPS;
}

/**
 * A labeled Combobox for this wizard's own dropdowns (property type, yes/no
 * detail fields, city) - previously each was a native `<select>`, whose
 * open option list can't be styled at all (always the browser's own plain
 * OS-rendered popup, regardless of the app's theme). Combobox is the same
 * fully-styled dropdown already used for property type/status/city
 * filtering elsewhere (property-filters.tsx).
 */
function ComboField({
  label,
  variant,
  analyticsField,
  ...props
}: { label: string; variant: "default" | "onDark"; analyticsField?: string } & Omit<ComponentProps<typeof Combobox>, "variant">) {
  return (
    // data-analytics-field names this custom dropdown for form analytics
    // (field name only - see useFormAnalytics).
    <div className="flex flex-col gap-2" data-analytics-field={analyticsField}>
      <label className={clsx("text-sm font-bold", variant === "onDark" ? "text-white/85" : "text-text")}>
        {label}
      </label>
      <Combobox variant={variant} {...props} />
    </div>
  );
}

interface PropertyRequestWizardProps {
  type: LeadType;
  submitLabel?: string;
  submitIcon?: ReactNode;
  submitClassName?: string;
  messagePlaceholder?: string;
  showMessage?: boolean;
  phoneRequired?: boolean;
  variant?: "default" | "onDark";
}

export function PropertyRequestWizard({
  type,
  submitLabel,
  submitIcon,
  submitClassName,
  messagePlaceholder,
  showMessage = true,
  phoneRequired = false,
  variant = "default",
}: PropertyRequestWizardProps) {
  const t = useTranslations("Leads");
  const [step, setStep] = useState(1);

  const [propertyType, setPropertyType] = useState<PropertyRequestType | "">("");
  const [cities, setCities] = useState<City[]>([]);
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [address, setAddress] = useState("");
  // Every detail value is kept as the exact string the visitor typed (or a
  // boolean for yes/no fields) - never coerced through Number() on each
  // keystroke, which is what previously made number fields feel broken
  // (typing "-" or clearing the field snapped the value to NaN/0).
  const [details, setDetails] = useState<Record<string, string | boolean>>({});

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  // Observes the funnel only (field names and step names, never values).
  const analytics = useFormAnalytics(type);
  const { trackStep } = analytics;

  // "Last step reached" for abandonment analysis. No-op until the visitor
  // has actually started the form.
  useEffect(() => {
    trackStep(STEP_KEYS[step - 1]);
  }, [step, trackStep]);

  useEffect(() => {
    let cancelled = false;
    listCities()
      .then((result) => {
        if (!cancelled) setCities(result);
      })
      .catch(() => {
        // Non-blocking - city is optional, the form still works without it.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function updateDetail(key: string, value: string | boolean) {
    setDetails((previous) => ({ ...previous, [key]: value }));
  }

  // Only the keys that actually apply to the selected type, and only the
  // ones with a real value - a detail typed in before switching away from
  // a type stays in state (so it comes back if the visitor switches back)
  // but is excluded here once it's no longer relevant.
  function relevantDetails(): Record<string, string | boolean> {
    if (!propertyType) return {};
    const applicableKeys = new Set(
      PROPERTY_DETAIL_ROWS.flat()
        .filter((field) => field.types.includes(propertyType))
        .map((field) => field.key),
    );
    return Object.fromEntries(
      Object.entries(details).filter(
        ([key, value]) => applicableKeys.has(key) && value !== "" && value !== undefined,
      ),
    );
  }

  function validateStep(current: number): boolean {
    const errors: Record<string, string> = {};
    if (current === 1 && !propertyType) {
      errors.property_type = t("wizard.typeRequired");
    }
    if (current === 3 && !address.trim()) {
      errors.address = t("wizard.addressRequired");
    }
    if (current === 4) {
      if (!name.trim()) errors.name = t("wizard.nameRequired");
      if (!email.trim()) errors.email = t("wizard.emailRequired");
      if (phoneRequired && !phone.trim()) {
        errors.phone = t("wizard.phoneRequired");
      } else if (phone.trim() && !isValidPhoneNumber(phone)) {
        errors.phone = t("wizard.phoneInvalid");
      }
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function goNext() {
    if (!validateStep(step)) return;
    setFieldErrors({});
    setStep((current) => Math.min(TOTAL_STEPS, current + 1));
  }

  function goBack() {
    setFieldErrors({});
    setStep((current) => Math.max(1, current - 1));
  }

  async function submitRequest() {
    if (!validateStep(4)) {
      setStep(4);
      return;
    }
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      await submitLead({
        type,
        name,
        email,
        phone,
        message,
        property_type: propertyType || undefined,
        city: city || undefined,
        district: district || undefined,
        address,
        property_details: relevantDetails(),
      });
      analytics.trackSubmitted();
      setSent(true);
    } catch (caught) {
      if (caught instanceof ApiError && Object.keys(caught.errors).length > 0) {
        const flattened: Record<string, string> = {};
        for (const [field, messages] of Object.entries(caught.errors)) {
          flattened[field] = messages[0];
        }
        setFieldErrors(flattened);
        setStep(Math.min(...Object.keys(flattened).map(stepForErrorField)));
      } else {
        modal.error(caught instanceof ApiError ? caught.message : t("genericError"));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step < TOTAL_STEPS) {
      goNext();
      return;
    }
    void submitRequest();
  }

  if (sent) {
    return (
      <Alert tone="success" title={t("sentTitle")}>
        {t("sentBody", { name: name.split(" ")[0] })}
      </Alert>
    );
  }

  const groupLabelClass = clsx(
    "text-[0.7rem] font-bold tracking-wide uppercase",
    variant === "onDark" ? "text-gold-secondary" : "text-gold-primary",
  );
  const mutedClass = variant === "onDark" ? "text-white/70" : "text-text-muted";
  const dimBarClass = variant === "onDark" ? "bg-white/15" : "bg-border";

  const visibleRows = PROPERTY_DETAIL_ROWS.map((row) =>
    row.filter((field) => propertyType !== "" && field.types.includes(propertyType)),
  ).filter((row) => row.length > 0);

  return (
    <form {...analytics.formProps} onSubmit={handleFormSubmit} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <p className={groupLabelClass}>{t("wizard.stepLabel", { current: step, total: TOTAL_STEPS })}</p>
          <p className={clsx("text-[0.7rem] font-semibold", mutedClass)}>
            {t(`wizard.steps.${STEP_KEYS[step - 1]}`)}
          </p>
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: TOTAL_STEPS }, (_, index) => index + 1).map((segment) => (
            <div
              key={segment}
              className={clsx(
                "h-1.5 flex-1 rounded-full transition-colors duration-300",
                segment <= step ? "bg-gradient-gold" : dimBarClass,
              )}
            />
          ))}
        </div>
      </div>

      <div key={step} className="step-fade-in flex flex-col gap-4">
        {step === 1 && (
          <ComboField
            analyticsField="property_type"
            label={t("propertyTypeLabel")}
            variant={variant}
            value={propertyType}
            error={fieldErrors.property_type}
            onChange={(value) => setPropertyType(value as PropertyRequestType | "")}
            options={PROPERTY_REQUEST_TYPES.map((option) => ({
              value: option,
              label: t(`propertyType.${option}`),
            }))}
            placeholder={t("propertyTypePlaceholder")}
            ariaLabel={t("propertyTypeLabel")}
          />
        )}

        {step === 2 && (
          <>
            {visibleRows.length === 0 && (
              <p className={clsx("text-sm", mutedClass)}>{t("wizard.noDetailFields")}</p>
            )}
            {visibleRows.map((row, rowIndex) => (
              <div
                key={rowIndex}
                className={clsx("grid gap-4", row.length === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}
              >
                {row.map((field) => {
                  if (field.kind === "boolean") {
                    const current = details[field.key];
                    return (
                      <ComboField
                        key={field.key}
                        analyticsField={field.key}
                        label={t(`field.${field.labelKey}`)}
                        variant={variant}
                        value={current === true ? "yes" : current === false ? "no" : ""}
                        onChange={(value) => updateDetail(field.key, value === "yes")}
                        options={[
                          { value: "yes", label: t("field.yes") },
                          { value: "no", label: t("field.no") },
                        ]}
                        placeholder={t("field.selectPlaceholder")}
                        ariaLabel={t(`field.${field.labelKey}`)}
                      />
                    );
                  }
                  return (
                    <Field
                      key={field.key}
                      name={field.key}
                      label={t(`field.${field.labelKey}`)}
                      variant={variant}
                      type={field.kind === "number" ? "number" : "text"}
                      value={details[field.key] === undefined ? "" : String(details[field.key])}
                      onChange={(event) => updateDetail(field.key, event.target.value)}
                    />
                  );
                })}
              </div>
            ))}
          </>
        )}

        {step === 3 && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ComboField
                analyticsField="city"
                label={t("field.city")}
                variant={variant}
                value={city}
                onChange={setCity}
                options={cities.map((option) => ({ value: option.name, label: option.name }))}
                placeholder={t("field.cityPlaceholder")}
                ariaLabel={t("field.city")}
              />
              <Field
                name="district"
                label={t("field.district")}
                variant={variant}
                value={district}
                onChange={(event) => setDistrict(event.target.value)}
              />
            </div>
            <Field
              name="address"
              label={t("field.fullAddress")}
              variant={variant}
              required
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              error={fieldErrors.address}
            />
          </>
        )}

        {step === 4 && (
          <>
            <Field
              name="name"
              label={t("fullName")}
              icon={<User className="h-4 w-4" />}
              variant={variant}
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              error={fieldErrors.name}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                name="email"
                label={t("email")}
                icon={<Mail className="h-4 w-4" />}
                variant={variant}
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                error={fieldErrors.email}
              />
              <Field
                name="phone"
                label={t("phone")}
                icon={<Phone className="h-4 w-4" />}
                variant={variant}
                type="tel"
                placeholder={t("phonePlaceholder")}
                dir="ltr"
                required={phoneRequired}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                error={fieldErrors.phone}
                hint={phoneRequired ? undefined : t("optional")}
              />
            </div>
            {showMessage && (
              <Textarea
                name="message"
                label={t("message")}
                icon={<MessageSquare className="h-4 w-4" />}
                variant={variant}
                placeholder={messagePlaceholder ?? t("messagePlaceholder")}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                error={fieldErrors.message}
              />
            )}
          </>
        )}

        {step === 5 && (
          <ReviewStep
            variant={variant}
            propertyType={propertyType}
            city={city}
            district={district}
            address={address}
            details={relevantDetails()}
            name={name}
            email={email}
            phone={phone}
            message={message}
            onEdit={setStep}
          />
        )}
      </div>

      <div className="mt-1 flex items-center justify-between gap-3">
        {step > 1 ? (
          <Button type="button" variant="secondary" onClick={goBack}>
            <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" />
            {t("wizard.back")}
          </Button>
        ) : (
          <span />
        )}

        {step < TOTAL_STEPS ? (
          <Button type="submit" className="flex-1 justify-center">
            {t("wizard.next")}
            <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
          </Button>
        ) : (
          <Button type="submit" isLoading={isSubmitting} className={clsx("flex-1", submitClassName ?? "justify-center")}>
            {submitLabel ?? t("send")}
            {submitIcon}
          </Button>
        )}
      </div>
    </form>
  );
}

function ReviewStep({
  variant,
  propertyType,
  city,
  district,
  address,
  details,
  name,
  email,
  phone,
  message,
  onEdit,
}: {
  variant: "default" | "onDark";
  propertyType: PropertyRequestType | "";
  city: string;
  district: string;
  address: string;
  details: Record<string, string | boolean>;
  name: string;
  email: string;
  phone: string;
  message: string;
  onEdit: (step: number) => void;
}) {
  const t = useTranslations("Leads");
  const mutedClass = variant === "onDark" ? "text-white/70" : "text-text-muted";

  const detailFields = PROPERTY_DETAIL_ROWS.flat().filter(
    (field) => propertyType !== "" && field.types.includes(propertyType) && details[field.key] !== undefined,
  );

  return (
    <div className="flex flex-col gap-4">
      <p className={clsx("text-sm", mutedClass)}>{t("wizard.reviewIntro")}</p>

      <ReviewSection title={t("wizard.steps.type")} variant={variant} onEdit={() => onEdit(1)}>
        <ReviewRow label={t("propertyTypeLabel")} value={propertyType ? t(`propertyType.${propertyType}`) : "—"} variant={variant} />
      </ReviewSection>

      {detailFields.length > 0 && (
        <ReviewSection title={t("wizard.steps.details")} variant={variant} onEdit={() => onEdit(2)}>
          {detailFields.map((field) => (
            <ReviewRow
              key={field.key}
              label={t(`field.${field.labelKey}`)}
              value={
                typeof details[field.key] === "boolean"
                  ? t(details[field.key] ? "field.yes" : "field.no")
                  : String(details[field.key])
              }
              variant={variant}
            />
          ))}
        </ReviewSection>
      )}

      <ReviewSection title={t("wizard.steps.location")} variant={variant} onEdit={() => onEdit(3)}>
        {city && <ReviewRow label={t("field.city")} value={city} variant={variant} />}
        {district && <ReviewRow label={t("field.district")} value={district} variant={variant} />}
        <ReviewRow label={t("field.fullAddress")} value={address || "—"} variant={variant} />
      </ReviewSection>

      <ReviewSection title={t("wizard.steps.contact")} variant={variant} onEdit={() => onEdit(4)}>
        <ReviewRow label={t("fullName")} value={name || "—"} variant={variant} />
        <ReviewRow label={t("email")} value={email || "—"} variant={variant} />
        {phone && <ReviewRow label={t("phone")} value={phone} variant={variant} />}
        {message && <ReviewRow label={t("message")} value={message} variant={variant} />}
      </ReviewSection>
    </div>
  );
}

function ReviewSection({
  title,
  variant,
  onEdit,
  children,
}: {
  title: string;
  variant: "default" | "onDark";
  onEdit: () => void;
  children: ReactNode;
}) {
  const t = useTranslations("Leads");
  return (
    <div className={clsx("flex flex-col gap-2 rounded-md border p-4", variant === "onDark" ? "border-white/15" : "border-border")}>
      <div className="flex items-center justify-between gap-3">
        <p
          className={clsx(
            "text-[0.7rem] font-bold tracking-wide uppercase",
            variant === "onDark" ? "text-gold-secondary" : "text-gold-primary",
          )}
        >
          {title}
        </p>
        <button
          type="button"
          onClick={onEdit}
          className="text-[0.78rem] font-semibold text-gold-primary hover:underline"
        >
          {t("wizard.edit")}
        </button>
      </div>
      <dl className="flex flex-col gap-1.5">{children}</dl>
    </div>
  );
}

function ReviewRow({ label, value, variant }: { label: string; value: string; variant: "default" | "onDark" }) {
  return (
    <div className="flex flex-wrap justify-between gap-2 text-sm">
      <dt className={variant === "onDark" ? "text-white/60" : "text-text-muted"}>{label}</dt>
      <dd className={clsx("text-end font-semibold", variant === "onDark" ? "text-white" : "text-text")}>{value}</dd>
    </div>
  );
}
