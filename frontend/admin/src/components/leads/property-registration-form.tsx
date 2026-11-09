"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Building2,
  Castle,
  CheckCircle2,
  House,
  HousePlus,
  LandPlot,
  Store,
  BriefcaseBusiness,
  Ellipsis,
  HandCoins,
  ImagePlus,
  KeyRound,
  LockKeyhole,
  Send,
  Tag,
  X,
  Phone, UserRound, Mail, MessageCircle, MapPin, MapPinned, Ruler,
  Banknote, BedDouble, Layers, Sparkles, Clock, FileText, UsersRound,
  ChevronDown, SlidersHorizontal, Car, Trees, Waves, Sofa, Snowflake,
  Flame, ShieldCheck, CookingPot, ArrowUpDown, Sun,
  type LucideIcon,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { LeadConfirmation } from "@/lib/leads";
import { compressLeadPhoto } from "@/lib/compress-lead-photo";
import { Combobox } from "@/components/ui/combobox";
import { listCities } from "@/lib/lookup";
import type { City } from "@/types/lookup";
import styles from "./property-registration-form.module.css";

const phoneValid = (value: string) => {
  const normalized = normalizePhone(value);
  return /^\+[1-9]\d{6,14}$/.test(normalized) || /^0[5-7]\d{8}$/.test(normalized);
};
const normalizePhone = (value: string) =>
  value.replace(/[\s.()-]/g, "").replace(/^00/, "+");
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const MAX_TOTAL_BYTES = 3 * 1024 * 1024;
const fieldIcons: Record<string, LucideIcon> = {
  name: UserRound, phone: Phone, whatsapp: MessageCircle, email: Mail,
  city: MapPin, district: MapPinned, address: MapPinned, area: Ruler,
  price: Banknote, rooms: BedDouble, floor: Layers, condition: Sparkles,
  relationship: UsersRound, contactTime: Clock, features: FileText,
};

function Field({
  name,
  label,
  required,
  children,
  error,
  full = false,
}: {
  name: string;
  label: string;
  required?: boolean;
  children: ReactNode;
  error?: string;
  full?: boolean;
}) {
  const t = useTranslations("PropertyRegistration");
  const Icon = fieldIcons[name];
  return (
    <div className={`${styles.field} ${full ? styles.full : ""}`}>
      <label htmlFor={name}>
        {Icon && <Icon size={17} aria-hidden="true" />}
        {label}{" "}
        {required ? (
          <span className={styles.required}>*</span>
        ) : (
          <small>{t("optional")}</small>
        )}
      </label>
      {children}
      {error && (
        <p id={`${name}-error`} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}

function PhotoPreview({
  file,
  onRemove,
}: {
  file: File;
  onRemove: () => void;
}) {
  const t = useTranslations("PropertyRegistration");
  const imageRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    // The URL belongs to this preview and is released on removal/unmount.
    if (imageRef.current) imageRef.current.src = objectUrl;
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return (
    <div className={styles.thumb}>
      {/* Local file previews cannot use the Next image optimizer. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={imageRef} alt={file.name} />
      <button
        type="button"
        onClick={onRemove}
        aria-label={t("removePhoto", { name: file.name })}
      >
        <X size={15} />
      </button>
    </div>
  );
}

export function PropertyRegistrationForm() {
  const t = useTranslations("PropertyRegistration");
  const locale = useLocale();
  const ux = useTranslations("PublicUx");
  const [cities, setCities] = useState<City[]>([]);
  const [city, setCity] = useState(t("marrakech"));
  const [cityError, setCityError] = useState(false);
  useEffect(() => {
    let active = true;
    listCities().then((result) => {
      if (active) setCities(result);
    }).catch(() => {
      if (active) setCityError(true);
    });
    return () => { active = false; };
  }, []);
  const [processingPhotos, setProcessingPhotos] = useState(false);
  const processingRef = useRef(false);
  const types = [
    { key: "apartment", label: t("apartment"), Icon: Building2 },
    { key: "villa", label: t("villa"), Icon: HousePlus },
    { key: "house", label: t("house"), Icon: House },
    { key: "riad", label: t("riad"), Icon: Castle },
    { key: "land", label: t("land"), Icon: LandPlot },
    { key: "shop", label: t("shop"), Icon: Store },
    { key: "office", label: t("office"), Icon: BriefcaseBusiness },
    { key: "other", label: t("other"), Icon: Ellipsis },
  ];
  const transactions = [
    {
      key: "sell_request",
      label: t("sell"),
      description: t("sellDescription"),
      Icon: Tag,
    },
    {
      key: "rent_request",
      label: t("rent"),
      description: t("rentDescription"),
      Icon: KeyRound,
    },
    {
      key: "buy_request",
      label: t("buy"),
      description: t("buyDescription"),
      Icon: HandCoins,
    },
  ];
  const amenities = [
    { value: "مصعد", label: t("lift") },
    { value: "باركينغ", label: t("parking") },
    { value: "تراس", label: t("terrace") },
    { value: "مسبح", label: t("pool") },
    { value: "جردة", label: t("garden") },
    { value: "مفروش", label: t("furnished") },
    { value: "تكييف", label: t("airConditioning") },
    { value: "تدفئة", label: t("heating") },
    { value: "حارس / أمن", label: t("security") },
    { value: "كوزينة مجهزة", label: t("kitchen") },
  ];

  const formRef = useRef<HTMLFormElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const submitting = useRef(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoError, setPhotoError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState<LeadConfirmation | null>(
    null,
  );
  const [price, setPrice] = useState("");
  const [descriptionLength, setDescriptionLength] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [transaction, setTransaction] = useState("");
  const isBuying = transaction === "buy_request";

  useEffect(() => {
    if (confirmation) successRef.current?.focus();
  }, [confirmation]);

  async function addPhotos(incoming: FileList | File[]) {
    if (processingRef.current) return;
    const additions = Array.from(incoming);
    if (photos.length + additions.length > 10)
      return setPhotoError(t("photoCountError"));
    if (
      additions.some(
        (file) =>
          !["image/jpeg", "image/png", "image/webp"].includes(file.type),
      )
    )
      return setPhotoError(t("photoTypeError"));
    if (additions.some((file) => file.size > 20 * 1024 * 1024))
      return setPhotoError(ux("photoSourceError"));
    processingRef.current = true;
    setProcessingPhotos(true);
    setPhotoError("");
    try {
      const prepared: File[] = [];
      // Sequential decoding bounds memory use on phones.
      for (const file of additions)
        prepared.push(await compressLeadPhoto(file));
      const combined = [...photos, ...prepared];
      if (combined.some((file) => file.size > MAX_PHOTO_BYTES))
        return setPhotoError(t("photoSizeError"));
      if (
        combined.reduce((size, file) => size + file.size, 0) > MAX_TOTAL_BYTES
      )
        return setPhotoError(t("photoTotalError"));
      setPhotos(combined);
    } catch {
      setPhotoError(ux("photoProcessingError"));
    } finally {
      processingRef.current = false;
      setProcessingPhotos(false);
    }
  }

  const accessibility = (name: string) => ({
    "aria-invalid": Boolean(errors[name]),
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || processingRef.current) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const value = (name: string) => String(values.get(name) ?? "").trim();
    const invalid: Record<string, string> = {};
    const requiredFields = [
      "transaction",
      "propertyType",
      "city",
      "area",
      "price",
      "name",
      "phone",
    ];
    if (!isBuying) requiredFields.push("district");
    for (const name of requiredFields) {
      if (!value(name)) invalid[name] = t("requiredError");
    }
    if (!(Number(value("area")) > 0)) invalid.area = t("areaError");
    const amount = Number(value("price").replace(/\s/g, ""));
    if (!Number.isSafeInteger(amount) || amount <= 0)
      invalid.price = t("priceError");
    if (!phoneValid(value("phone"))) invalid.phone = t("phoneError");
    if (value("whatsapp") && !phoneValid(value("whatsapp")))
      invalid.whatsapp = t("whatsappError");
    const emailInput = form.elements.namedItem("email") as HTMLInputElement;
    if (value("email") && !emailInput.validity.valid)
      invalid.email = t("emailError");
    if (!values.has("consent")) invalid.consent = t("consentError");
    setErrors(invalid);
    setFailure("");
    if (Object.keys(invalid).length) {
      const firstKey = Object.keys(invalid)[0];
      const firstInvalid = firstKey === "city"
        ? form.querySelector<HTMLElement>("#city")
        : form.querySelector<HTMLElement>(`[name="${firstKey}"]`);
      const details = firstInvalid?.closest("details");
      if (details) details.open = true;
      firstInvalid?.focus();
      return;
    }

    const selectedType = value("propertyType");
    const typeLabel =
      types.find(({ key }) => key === selectedType)?.label ?? selectedType;
    const equipment = values.getAll("equipment").join("، ");
    const details = {
      surface: Number(value("area")),
      price: amount,
      bedrooms: value("rooms"),
      floor: value("floor"),
      condition: value("condition"),
      equipment,
      relationship: isBuying ? "مشتري" : value("relationship"),
      whatsapp: normalizePhone(value("whatsapp")),
      contactTime: value("contactTime"),
      originalType: typeLabel,
      consent: true,
    };
    // Preserve every reference-form field in the existing CRM's readable message,
    // including fields that its property-type-specific detail renderer doesn't list.
    const message = [
      `الطلب: ${transactions.find(({ key }) => key === transaction)?.label}`,
      `نوع العقار: ${typeLabel}`,
      `المساحة: ${value("area")} م²`,
      `${isBuying ? "الميزانية" : "الثمن"}: ${amount} درهم`,
      value("rooms") && `الغرف: ${value("rooms")}`,
      value("floor") && `الطابق: ${value("floor")}`,
      value("condition") && `الحالة: ${value("condition")}`,
      equipment && `التجهيزات: ${equipment}`,
      !isBuying && `العلاقة بالعقار: ${value("relationship")}`,
      value("whatsapp") && `واتساب: ${normalizePhone(value("whatsapp"))}`,
      value("contactTime") && `وقت التواصل: ${value("contactTime")}`,
      value("features"),
    ]
      .filter(Boolean)
      .join("\n");
    const payload = new FormData();
    payload.set("type", value("transaction"));
    for (const name of ["name", "email", "city", "district"])
      payload.set(name, value(name));
    if (!isBuying) payload.set("address", value("address"));
    payload.set("phone", normalizePhone(value("phone")));
    payload.set("message", message);
    if (selectedType !== "other")
      payload.set(
        "property_type",
        ["villa", "house"].includes(selectedType)
          ? "house_villa"
          : selectedType,
      );
    for (const [key, detail] of Object.entries(details))
      payload.set(`property_details[${key}]`, String(detail));
    if (!isBuying) photos.forEach((photo) => payload.append("photos[]", photo));
    submitting.current = true;
    setBusy(true);
    try {
      const result = await api.postForm<LeadConfirmation>(
        "/api/v1/leads",
        payload,
      );
      setConfirmation(result);
      setPhotos([]);
    } catch (error) {
      if (error instanceof ApiError) {
        const fieldErrors = Object.fromEntries(
          Object.entries(error.errors).map(([key, messages]) => [
            key,
            messages[0],
          ]),
        );
        setErrors(fieldErrors);
        const uploadError = Object.entries(fieldErrors).find(([key]) =>
          key.startsWith("photos"),
        );
        if (uploadError) setPhotoError(uploadError[1]);
        setFailure(
          error.status === 422 ? t("validationError") : t("networkError"),
        );
      } else setFailure(t("submitError"));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <div
      className={styles.page}
      dir={locale === "ar" ? "rtl" : "ltr"}
      lang={locale}
    >
      <div className={styles.wrap}>
        <div className={styles.card}>
          {confirmation ? (
            <div
              className={styles.success}
              ref={successRef}
              tabIndex={-1}
              role="status"
            >
              <CheckCircle2 size={64} />
              <h2>{isBuying ? t("buySuccess") : t("propertySuccess")}</h2>
              <p>{t("successDescription")}</p>
              <span className={styles.reference}>KI-{confirmation.id}</span>
              <Link href="/" className={styles.submit}>
                {t("backHome")}
              </Link>
            </div>
          ) : (
            <form
              ref={formRef}
              onSubmit={handleSubmit}
              noValidate
              aria-busy={busy}
            >
              <div className={styles.intro}>
                <span>{t("register")}</span>
                <p>{t.rich("intro", { b: (chunks) => <b>{chunks}</b> })}</p>
              </div>
              <fieldset disabled={busy} className={styles.formFields}>
                <section
                  className={styles.section}
                  aria-labelledby="property-heading"
                >
                  <div className={styles.sectionHead}>
                    <span><House size={21} aria-hidden="true" /></span>
                    <div>
                      <h2 id="property-heading">
                        {isBuying
                          ? t("buyPropertyHeading")
                          : t("propertyHeading")}
                      </h2>
                      <p>
                        {isBuying
                          ? t("buyPropertyDescription")
                          : t("propertyDescription")}
                      </p>
                    </div>
                  </div>
                  <div className={styles.grid}>
                    <fieldset
                      className={`${styles.choiceField} ${styles.full}`}
                      aria-describedby={
                        errors.transaction ? "transaction-error" : undefined
                      }
                    >
                      <legend>
                        {t("transaction")}{" "}
                        <span className={styles.required}>*</span>
                      </legend>
                      <div className={styles.choices}>
                        {transactions.map(
                          ({ key, label, description, Icon }) => (
                            <label className={styles.choice} key={key}>
                              <input
                                type="radio"
                                name="transaction"
                                value={key}
                                checked={transaction === key}
                                onChange={() => {
                                  setTransaction(key);
                                  setErrors({});
                                  setFailure("");
                                }}
                                required
                                {...accessibility("transaction")}
                              />
                              <span className={styles.transaction}>
                                <Icon size={27} aria-hidden="true" />
                                <span>
                                  <strong>{label}</strong>
                                  <small>{description}</small>
                                </span>
                              </span>
                            </label>
                          ),
                        )}
                      </div>
                      {errors.transaction && (
                        <p className={styles.error} id="transaction-error">
                          {errors.transaction}
                        </p>
                      )}
                    </fieldset>
                    <fieldset
                      className={`${styles.choiceField} ${styles.full}`}
                    >
                      <legend>
                        {t("propertyType")}{" "}
                        <span className={styles.required}>*</span>
                      </legend>
                      <div className={styles.types}>
                        {types.map(({ key, label, Icon }) => (
                          <label className={styles.choice} key={key}>
                            <input
                              type="radio"
                              name="propertyType"
                              value={key}
                              required
                              {...accessibility("propertyType")}
                            />
                            <span>
                              <Icon size={24} aria-hidden="true" />
                              {label}
                            </span>
                          </label>
                        ))}
                      </div>
                      {errors.propertyType && (
                        <p className={styles.error} id="propertyType-error">
                          {errors.propertyType}
                        </p>
                      )}
                    </fieldset>
                    <Field
                      name="area"
                      label={isBuying ? t("preferredArea") : t("area")}
                      required
                      error={errors.area}
                    >
                      <div className={styles.affix}>
                        <input
                          id="area"
                          name="area"
                          type="number"
                          inputMode="decimal"
                          min="1"
                          step="any"
                          placeholder={t("areaPlaceholder")}
                          required
                          {...accessibility("area")}
                        />
                        <span>{t("squareMetres")}</span>
                      </div>
                    </Field>
                    <Field
                      name="price"
                      label={isBuying ? t("budget") : t("askingPrice")}
                      required
                      error={errors.price}
                    >
                      <div className={styles.affix}>
                        <input
                          id="price"
                          name="price"
                          inputMode="numeric"
                          placeholder={t("pricePlaceholder")}
                          maxLength={18}
                          value={price}
                          onChange={(event) => {
                            const digits = event.target.value
                              .replace(/[٠-٩]/g, (digit) =>
                                String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)),
                              )
                              .replace(/\D/g, "")
                              .slice(0, 12);
                            setPrice(
                              digits.replace(/\B(?=(\d{3})+(?!\d))/g, " "),
                            );
                          }}
                          required
                          {...accessibility("price")}
                        />
                        <span>{t("currency")}</span>
                      </div>
                      {transaction === "rent_request" && (
                        <small className={styles.hint}>
                          {t("monthlyPrice")}
                        </small>
                      )}
                    </Field>
                    <Field
                      name="city"
                      label={t("city")}
                      required
                      error={errors.city}
                    >
                      <input type="hidden" name="city" value={city} />
                      <Combobox
                        id="city"
                        value={city}
                        onChange={setCity}
                        options={[
                          { value: t("marrakech"), label: t("marrakech") },
                          ...cities.filter((item) => item.name.toLowerCase() !== t("marrakech").toLowerCase()).map((item) => ({ value: item.name, label: item.name })),
                        ]}
                        placeholder={t("choose")}
                        ariaLabel={t("city")}
                        searchPlaceholder={t("city")}
                        className="min-h-12 !rounded-xl"
                        expanded
                      />
                      {cityError && <small className={styles.hint}>{ux("citiesUnavailable")}</small>}
                    </Field>
                    <Field
                      name="district"
                      label={isBuying ? t("preferredDistrict") : t("district")}
                      required={!isBuying}
                      error={errors.district}
                    >
                      <input
                        id="district"
                        name="district"
                        placeholder={t("districtPlaceholder")}
                        maxLength={255}
                        required={!isBuying}
                        list="registration-districts"
                        {...accessibility("district")}
                      />
                      <datalist id="registration-districts">
                        {[
                          t("gueliz"),
                          t("hivernage"),
                          t("medina"),
                          t("targa"),
                          t("palmeraie"),
                          t("massira"),
                          t("agdal"),
                          t("ourika"),
                          t("fes"),
                          t("sidiGhanem"),
                        ].map((district) => (
                          <option key={district} value={district} />
                        ))}
                      </datalist>
                    </Field>
                    {!isBuying && (
                      <Field
                        name="address"
                        label={t("address")}
                        full
                        error={errors.address}
                      >
                        <input
                          id="address"
                          name="address"
                          autoComplete="street-address"
                          placeholder={t("addressPlaceholder")}
                          maxLength={255}
                          {...accessibility("address")}
                        />
                      </Field>
                    )}
                  </div>
                </section>

                <section
                  className={styles.section}
                  aria-labelledby="contact-heading"
                >
                  <div className={styles.sectionHead}>
                    <span><Phone size={21} aria-hidden="true" /></span>
                    <div>
                      <h2 id="contact-heading">{t("contactHeading")}</h2>
                      <p>{t("contactDescription")}</p>
                    </div>
                  </div>
                  <div className={styles.grid}>
                    <Field
                      name="name"
                      label={t("fullName")}
                      required
                      error={errors.name}
                    >
                      <input
                        id="name"
                        name="name"
                        autoComplete="name"
                        placeholder={t("namePlaceholder")}
                        maxLength={255}
                        required
                        {...accessibility("name")}
                      />
                    </Field>
                    <Field
                      name="phone"
                      label={t("phone")}
                      required
                      error={errors.phone}
                    >
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        dir="ltr"
                        autoComplete="tel"
                        placeholder="06 00 00 00 00"
                        maxLength={30}
                        required
                        {...accessibility("phone")}
                      />
                    </Field>
                    <details className={styles.full}>
                      <summary className={styles.detailsSummary}><ChevronDown size={18} aria-hidden="true" />{ux("moreDetails")}</summary>
                      <div className={styles.grid}>
                    {!isBuying && (
                      <Field
                        name="relationship"
                        label={t("relationship")}
                        error={errors.relationship}
                      >
                        <select
                          id="relationship"
                          name="relationship"
                          {...accessibility("relationship")}
                        >
                          <option value="">{t("choose")}</option>
                          {[
                            { value: "المالك", label: t("owner") },
                            {
                              value: "مفوّض من طرف المالك",
                              label: t("representative"),
                            },
                            { value: "وسيط", label: t("broker") },
                          ].map((relationship) => (
                            <option
                              key={relationship.value}
                              value={relationship.value}
                            >
                              {relationship.label}
                            </option>
                          ))}
                        </select>
                      </Field>
                    )}
                    <Field
                      name="whatsapp"
                      label={t("whatsapp")}
                      error={errors.whatsapp}
                    >
                      <input
                        id="whatsapp"
                        name="whatsapp"
                        type="tel"
                        dir="ltr"
                        placeholder="06 00 00 00 00"
                        maxLength={30}
                        {...accessibility("whatsapp")}
                      />
                    </Field>
                    <Field name="email" label={t("email")} error={errors.email}>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        dir="ltr"
                        autoComplete="email"
                        placeholder="name@example.com"
                        maxLength={255}
                        {...accessibility("email")}
                      />
                    </Field>
                    <Field name="contactTime" label={t("contactTime")}>
                      <select id="contactTime" name="contactTime">
                        <option value="">{t("anyTime")}</option>
                        {[
                          { value: "الصباح (9 – 12)", label: t("morning") },
                          {
                            value: "بعد الزوال (12 – 17)",
                            label: t("afternoon"),
                          },
                          { value: "العشية (17 – 20)", label: t("evening") },
                        ].map((time) => (
                          <option key={time.value} value={time.value}>
                            {time.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                      </div>
                    </details>

                  </div>
                </section>
                <section
                  className={styles.section}
                  aria-labelledby="details-heading"
                >
                  <div className={styles.sectionHead}>
                    <span><SlidersHorizontal size={21} aria-hidden="true" /></span>
                    <div>
                      <h2 id="details-heading">
                        {isBuying
                          ? t("buyDetailsHeading")
                          : t("detailsHeading")}
                      </h2>
                      <p>
                        {isBuying
                          ? t("buyDetailsDescription")
                          : t("detailsDescription")}
                      </p>
                    </div>
                  </div>
                  <div className={styles.grid}>
                    <details className={styles.full}>
                      <summary className={styles.detailsSummary}>
                        <ChevronDown size={18} aria-hidden="true" />
                        {ux("moreDetails")}
                      </summary>
                      <div className={styles.grid}>
                        <Field name="rooms" label={t("rooms")}>
                          <select id="rooms" name="rooms">
                            <option value="">{t("choose")}</option>
                            {[
                              { value: "استوديو", label: t("studio") },
                              { value: "1", label: "1" },
                              { value: "2", label: "2" },
                              { value: "3", label: "3" },
                              { value: "4", label: "4" },
                              { value: "5+", label: "5+" },
                            ].map((room) => (
                              <option key={room.value} value={room.value}>
                                {room.label}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field name="floor" label={t("floor")}>
                          <select id="floor" name="floor">
                            <option value="">{t("choose")}</option>
                            {[
                              {
                                value: "الطابق الأرضي",
                                label: t("groundFloor"),
                              },
                              { value: "1", label: "1" },
                              { value: "2", label: "2" },
                              { value: "3", label: "3" },
                              { value: "4", label: "4" },
                              { value: "5+", label: "5+" },
                              {
                                value: "طابق خاص / دار كاملة",
                                label: t("wholeHouse"),
                              },
                            ].map((floor) => (
                              <option key={floor.value} value={floor.value}>
                                {floor.label}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field name="condition" label={t("condition")} full>
                          <select id="condition" name="condition">
                            <option value="">{t("chooseCondition")}</option>
                            {[
                              { value: "جديد", label: t("new") },
                              {
                                value: "مستعمل بحالة جيدة",
                                label: t("goodCondition"),
                              },
                              {
                                value: "يحتاج إصلاحات",
                                label: t("renovation"),
                              },
                              {
                                value: "قيد البناء",
                                label: t("underConstruction"),
                              },
                            ].map((condition) => (
                              <option
                                key={condition.value}
                                value={condition.value}
                              >
                                {condition.label}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <fieldset
                          className={`${styles.choiceField} ${styles.full}`}
                        >
                          <legend>
                            {t("amenities")} <small>{t("selectAll")}</small>
                          </legend>
                          <div className={styles.chips}>
                            {amenities.map((amenity, index) => {
                              const Icon = [ArrowUpDown, Car, Sun, Waves, Trees, Sofa, Snowflake, Flame, ShieldCheck, CookingPot][index];
                              return (
                              <label key={amenity.value}>
                                <input
                                  type="checkbox"
                                  name="equipment"
                                  value={amenity.value}
                                />
                                <span><Icon size={17} aria-hidden="true" />{amenity.label}</span>
                              </label>
                              );
                            })}
                          </div>
                        </fieldset>
                        <Field
                          name="features"
                          label={t("additionalDetails")}
                          full
                        >
                          <textarea
                            id="features"
                            name="features"
                            maxLength={800}
                            placeholder={
                              isBuying
                                ? t("buyFeaturesPlaceholder")
                                : t("featuresPlaceholder")
                            }
                            onChange={(event) =>
                              setDescriptionLength(event.target.value.length)
                            }
                          />
                          <small className={styles.hint}>
                            {descriptionLength} / 800
                          </small>
                        </Field>
                        {!isBuying && (
                          <div className={`${styles.field} ${styles.full}`}>
                            <label htmlFor="photos">
                              {t("photos")} <small>{t("photosOptional")}</small>
                            </label>
                            <label
                              className={`${styles.drop} ${dragging ? styles.dragging : ""}`}
                              onDragOver={(event) => {
                                event.preventDefault();
                                setDragging(true);
                              }}
                              onDragLeave={() => setDragging(false)}
                              onDrop={(event) => {
                                event.preventDefault();
                                setDragging(false);
                                if (!busy) addPhotos(event.dataTransfer.files);
                              }}
                            >
                              <ImagePlus size={34} />
                              <strong>{t("addPhotos")}</strong>
                              <span>{t("dropPhotos")}</span>
                              <input
                                id="photos"
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                multiple
                                aria-describedby="photos-hint photos-error"
                                onChange={(event) => {
                                  if (event.target.files)
                                    addPhotos(event.target.files);
                                  event.target.value = "";
                                }}
                              />
                            </label>
                            {processingPhotos && (
                              <p role="status" className={styles.hint}>
                                {ux("processingPhotos")}
                              </p>
                            )}
                            <small id="photos-hint" className={styles.hint}>
                              {t("photosHint")}
                            </small>
                            <p
                              id="photos-error"
                              className={styles.error}
                              role="alert"
                            >
                              {photoError}
                            </p>
                            <div className={styles.thumbs}>
                              {photos.map((file, index) => (
                                <PhotoPreview
                                  key={`${file.name}-${file.lastModified}-${index}`}
                                  file={file}
                                  onRemove={() => {
                                    setPhotos((current) =>
                                      current.filter((_, i) => i !== index),
                                    );
                                    setPhotoError("");
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </details>
                  </div>
                </section>

                    <div className={styles.full}>
                      <label className={styles.consent}>
                        <input
                          id="consent"
                          name="consent"
                          type="checkbox"
                          required
                          {...accessibility("consent")}
                        />
                        <span>
                          {t("consent")}{" "}
                          <span className={styles.required}>*</span>
                        </span>
                      </label>
                      {errors.consent && (
                        <p id="consent-error" className={styles.error}>
                          {errors.consent}
                        </p>
                      )}
                    </div>
                <div className={styles.actions}>
                  {failure && (
                    <p role="alert" className={styles.error}>
                      {failure}
                    </p>
                  )}
                  <button
                    type="submit"
                    className={styles.submit}
                    disabled={busy || processingPhotos}
                  >
                    <Send size={19} />
                    {busy
                      ? t("sending")
                      : isBuying
                        ? t("submitBuy")
                        : t("submitProperty")}
                  </button>
                  <p className={styles.secure}>
                    <LockKeyhole size={15} />
                    {t("privacy")}
                  </p>
                </div>
              </fieldset>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
