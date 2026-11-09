"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { modal } from "@/lib/modal";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { listContacts } from "@/lib/contacts";
import { listUsers } from "@/lib/users";
import { listCities, listDistricts } from "@/lib/lookup";
import { getSocialOverview } from "@/lib/social";
import { SocialPreferencesFields } from "@/components/social/social-preferences-fields";
import { deletePropertyImage } from "@/lib/properties";
import type { City, District } from "@/types/lookup";
import {
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
  type PropertyFormValues,
  type PropertyImage,
  type PropertyStatus,
  type PropertyType,
} from "@/types/property";

const EMPTY_VALUES: PropertyFormValues = {
  title: "",
  type: "appartement",
  status: "disponible",
  city_id: "",
  district_id: "",
  address: "",
  price: 0,
  surface: 0,
  bedrooms: 0,
  bathrooms: 0,
  description: "",
  images: [],
  owner_contact_id: null,
  commercial_id: null,
};

export function PropertyForm({
  initialValues,
  existingImages = [],
  propertyId,
  submitLabel,
  onSubmit,
}: {
  initialValues?: Partial<PropertyFormValues>;
  /** Already-saved gallery images - only meaningful in edit mode. */
  existingImages?: PropertyImage[];
  /** Required to delete an existing image - only known in edit mode. */
  propertyId?: number;
  submitLabel: string;
  onSubmit: (values: PropertyFormValues) => Promise<void>;
}) {
  const t = useTranslations("PropertyForm");
  const ux = useTranslations("PublicUx");
  const social = useTranslations("SocialPublishing");
  const propertyType = useTranslations("PropertyType");
  const propertyStatus = useTranslations("PropertyStatus");
  const [values, setValues] = useState<PropertyFormValues>({
    ...EMPTY_VALUES,
    ...initialValues,
  });
  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [ownerContacts, setOwnerContacts] = useState<
    { id: number; name: string }[]
  >([]);
  const [commercials, setCommercials] = useState<
    { id: number; name: string; isActive: boolean }[]
  >([]);
  // Assigning a listing to a commercial is an Admin decision - Commercial
  // accounts never see this field (and the backend ignores it for them).
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes("Admin") ?? false;
  const [savedImages, setSavedImages] =
    useState<PropertyImage[]>(existingImages);
  const [removingImageId, setRemovingImageId] = useState<number | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    listCities()
      .then(setCities)
      .catch(() => modal.error(t("citiesLoadError")));
  }, [t]);

  // Optional link to the seller/landlord Contact this listing belongs to -
  // same "fetch seller+landlord contacts, non-blocking on failure" shape as
  // UserForm's Owner-account contact picker.
  useEffect(() => {
    let cancelled = false;

    Promise.all([
      listContacts({ type: "seller", perPage: 100 }),
      listContacts({ type: "landlord", perPage: 100 }),
    ])
      .then(([sellers, landlords]) => {
        if (cancelled) return;
        setOwnerContacts(
          [...sellers.contacts, ...landlords.contacts].map((c) => ({
            id: c.id,
            name: c.name,
          })),
        );
      })
      .catch(() => {
        // Non-blocking - the owner picker just stays empty.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Commercial + SeniorCommercial accounts for the optional assignment -
  // non-blocking on failure, same as the owner picker above.
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;

    listUsers({ role: "Commercial,SeniorCommercial", perPage: 200 })
      .then(({ users }) => {
        if (cancelled) return;
        setCommercials(
          users.map((u) => ({ id: u.id, name: u.name, isActive: u.is_active })),
        );
      })
      .catch(() => {
        // Non-blocking - the picker just stays empty.
      });

    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  // New listings only - once saved, PropertySocialPanel takes over. Non-blocking:
  // if this fails the section stays hidden and the saved defaults apply.
  useEffect(() => {
    if (!isAdmin || propertyId) return;
    let cancelled = false;

    getSocialOverview()
      .then(({ settings }) => {
        if (cancelled) return;
        setValues((current) => ({
          ...current,
          social: {
            facebook: settings.default_facebook,
            instagram: settings.default_instagram,
            mode: settings.default_mode,
          },
        }));
      })
      .catch(() => {
        // Non-blocking, as above.
      });

    return () => {
      cancelled = true;
    };
  }, [isAdmin, propertyId]);

  // Active accounts only, plus the current assignee even if since
  // deactivated, so an existing assignment always displays correctly.
  const commercialOptions = commercials
    .filter((c) => c.isActive || c.id === values.commercial_id)
    .map((c) => ({
      value: String(c.id),
      label: c.isActive ? c.name : `${c.name} (${t("commercialInactive")})`,
    }));

  useEffect(() => {
    if (values.city_id === "") return;
    let cancelled = false;
    listDistricts(values.city_id)
      .then((data) => {
        if (!cancelled) setDistricts(data);
      })
      .catch(() => {
        if (!cancelled) modal.error(t("districtsLoadError"));
      });
    return () => {
      cancelled = true;
    };
  }, [values.city_id, t]);
  // `districts` state isn't reset when city_id clears back to "" (no
  // synchronous setState in an effect) - derive the visible list instead,
  // so a stale previous city's districts never render.
  const visibleDistricts = values.city_id === "" ? [] : districts;

  // Local object URLs for not-yet-uploaded image previews, memoized so
  // createObjectURL runs once per file rather than on every render -
  // revoked via the cleanup-only effect below when they change/unmount.
  const pendingPreviews = useMemo(
    () => values.images.map((file) => URL.createObjectURL(file)),
    [values.images],
  );
  useEffect(() => {
    return () => {
      pendingPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [pendingPreviews]);

  function set<K extends keyof PropertyFormValues>(
    key: K,
    value: PropertyFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function handleCityChange(cityId: number | "") {
    setValues((current) => ({ ...current, city_id: cityId, district_id: "" }));
  }

  function handleFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    set("images", [...values.images, ...Array.from(fileList)]);
  }

  function removePendingImage(index: number) {
    set(
      "images",
      values.images.filter((_, i) => i !== index),
    );
  }

  async function removeSavedImage(image: PropertyImage) {
    if (!propertyId) return;
    setRemovingImageId(image.id);
    try {
      await deletePropertyImage(propertyId, image.id);
      setSavedImages((current) => current.filter((img) => img.id !== image.id));
    } catch (caught) {
      modal.error(
        caught instanceof ApiError ? caught.message : t("imageDeleteError"),
      );
    } finally {
      setRemovingImageId(null);
    }
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
        modal.error(
          caught instanceof ApiError ? caught.message : t("genericError"),
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <Field
        label={t("title")}
        required
        value={values.title}
        onChange={(event) => set("title", event.target.value)}
        error={fieldErrors.title}
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Select
          label={t("propertyType")}
          value={values.type}
          onChange={(event) => set("type", event.target.value as PropertyType)}
          error={fieldErrors.type}
        >
          {PROPERTY_TYPES.map((value) => (
            <option key={value} value={value}>
              {propertyType(value)}
            </option>
          ))}
        </Select>

        <Select
          label={t("status")}
          value={values.status}
          onChange={(event) =>
            set("status", event.target.value as PropertyStatus)
          }
          error={fieldErrors.status}
        >
          {PROPERTY_STATUSES.map((value) => (
            <option key={value} value={value}>
              {propertyStatus(value)}
            </option>
          ))}
        </Select>
      </div>

      <div className="rounded-xl border border-gold-primary/30 bg-gold-primary/5 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
      <Select
        name="transaction_type"
        label={t("listingPurpose")}
        value={values.transaction_type ?? ""}
        onChange={(event) =>
          setValues((current) => ({
            ...current,
            transaction_type: (event.target.value ||
              null) as PropertyFormValues["transaction_type"],
            price_period:
              event.target.value === "rent"
                ? (current.price_period ?? "month")
                : null,
          }))
        }
        error={fieldErrors.transaction_type}
      >
        <option value="">{ux("unspecified")}</option>
        <option value="sale">{t("forSale")}</option>
        <option value="rent">{t("forRent")}</option>
      </Select>
      {values.transaction_type === "rent" && (
        <Select
          name="price_period"
          label={ux("pricePeriod")}
          value={values.price_period ?? "month"}
          onChange={(event) =>
            set("price_period", event.target.value as "month" | "night")
          }
          error={fieldErrors.price_period}
        >
          <option value="month">{ux("month")}</option>
          <option value="night">{ux("night")}</option>
        </Select>
      )}
        </div>
        <p className="mt-3 text-xs text-text-muted">{t("listingPurposeHint")}</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Select
          label={t("city")}
          required
          value={values.city_id}
          onChange={(event) =>
            handleCityChange(
              event.target.value === "" ? "" : Number(event.target.value),
            )
          }
          error={fieldErrors.city_id}
        >
          <option value="">{t("selectCity")}</option>
          {cities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </Select>

        <Select
          label={t("district")}
          value={values.district_id}
          onChange={(event) =>
            set(
              "district_id",
              event.target.value === "" ? "" : Number(event.target.value),
            )
          }
          disabled={values.city_id === "" || visibleDistricts.length === 0}
          error={fieldErrors.district_id}
        >
          <option value="">{t("selectDistrictOptional")}</option>
          {visibleDistricts.map((district) => (
            <option key={district.id} value={district.id}>
              {district.name}
            </option>
          ))}
        </Select>
      </div>

      <Field
        label={t("address")}
        required
        value={values.address}
        onChange={(event) => set("address", event.target.value)}
        error={fieldErrors.address}
      />

      <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
        <Field
          label={t("price")}
          type="number"
          min={0}
          required
          value={values.price}
          onChange={(event) => set("price", Number(event.target.value))}
          error={fieldErrors.price}
        />
        <Field
          label={t("surface")}
          type="number"
          min={0}
          required
          value={values.surface}
          onChange={(event) => set("surface", Number(event.target.value))}
          error={fieldErrors.surface}
        />
        <Field
          label={t("bedrooms")}
          type="number"
          min={0}
          value={values.bedrooms}
          onChange={(event) => set("bedrooms", Number(event.target.value))}
          error={fieldErrors.bedrooms}
        />
        <Field
          label={t("bathrooms")}
          type="number"
          min={0}
          value={values.bathrooms}
          onChange={(event) => set("bathrooms", Number(event.target.value))}
          error={fieldErrors.bathrooms}
        />
      </div>

      {isAdmin && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-bold text-text">{t("commercial")}</span>
          <Combobox
            value={values.commercial_id ? String(values.commercial_id) : ""}
            onChange={(value) =>
              set("commercial_id", value ? Number(value) : null)
            }
            options={commercialOptions}
            placeholder={t("commercialNone")}
            ariaLabel={t("commercial")}
            error={fieldErrors.commercial_id}
          />
          <p className="text-[0.76rem] text-text-muted">
            {t("commercialHint")}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <span className="text-sm font-bold text-text">{t("owner")}</span>
        <Combobox
          value={values.owner_contact_id ? String(values.owner_contact_id) : ""}
          onChange={(value) =>
            set("owner_contact_id", value ? Number(value) : null)
          }
          options={ownerContacts.map((c) => ({
            value: String(c.id),
            label: c.name,
          }))}
          placeholder={t("ownerNone")}
          ariaLabel={t("owner")}
          error={fieldErrors.owner_contact_id}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-bold text-text">{t("images")}</label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(event) => handleFilesSelected(event.target.files)}
          className="w-full rounded-sm border-[1.5px] border-border-strong bg-surface px-3.5 py-2.5 text-[0.9rem] text-text file:mr-3 file:rounded-sm file:border-0 file:bg-gold-primary/15 file:px-3 file:py-1.5 file:font-semibold file:text-gold-primary"
        />
        {fieldErrors["images.0"] && (
          <p className="text-[0.76rem] font-semibold text-error">
            {fieldErrors["images.0"]}
          </p>
        )}

        {(savedImages.length > 0 || pendingPreviews.length > 0) && (
          <div className="mt-2 flex flex-wrap gap-3">
            {savedImages.map((image) => (
              <div
                key={image.id}
                className="group relative h-20 w-20 overflow-hidden rounded-md border border-border"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- media-library-served thumbnail */}
                <img
                  src={image.url}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeSavedImage(image)}
                  disabled={removingImageId === image.id}
                  aria-label={t("removeImage")}
                  className="absolute end-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink/70 text-[0.65rem] font-bold text-white disabled:opacity-50"
                >
                  ×
                </button>
              </div>
            ))}
            {pendingPreviews.map((url, index) => (
              <div
                key={url}
                className="group relative h-20 w-20 overflow-hidden rounded-md border border-border"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview of a pending upload */}
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePendingImage(index)}
                  aria-label={t("removeImage")}
                  className="absolute end-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink/70 text-[0.65rem] font-bold text-white"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Textarea
        label={t("description")}
        value={values.description}
        onChange={(event) => set("description", event.target.value)}
        error={fieldErrors.description}
      />

      {values.social && (
        <div className="flex flex-col gap-3 rounded-md border border-border p-4">
          <p className="text-sm font-bold text-text">{social("sectionTitle")}</p>
          <SocialPreferencesFields
            value={values.social}
            onChange={(next) => set("social", next)}
          />
        </div>
      )}

      <Button type="submit" isLoading={isSubmitting} className="self-start">
        {submitLabel}
      </Button>
    </form>
  );
}
