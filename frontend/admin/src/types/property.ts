import type { SocialPreferences } from "@/types/social";

export type PropertyType =
  "appartement" | "villa" | "riad" | "maison" | "terrain" | "bureau" | "local";

export type PropertyStatus = "disponible" | "reserve" | "vendu" | "loue";

/** Moderation state - separate from PropertyStatus (which is availability). */
export type PropertyApprovalStatus =
  "pending_approval" | "approved" | "rejected";

export const PROPERTY_APPROVAL_STATUSES: PropertyApprovalStatus[] = [
  "pending_approval",
  "approved",
  "rejected",
];

export interface PropertyImage {
  id: number;
  url: string;
}

export interface Property {
  id: number;
  title: string;
  type: PropertyType;
  status: PropertyStatus;
  transaction_type?: "sale" | "rent" | null;
  price_period?: "month" | "night" | null;
  city_id: number;
  city_name: string | null;
  district_id: number | null;
  district_name: string | null;
  address: string;
  /** In MAD (decimal) - the API converts from stored cents. */
  price: number;
  surface: number;
  bedrooms: number;
  bathrooms: number;
  description: string | null;
  images: PropertyImage[];
  cover_image: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Authenticated dashboard view - adds moderation/ownership fields the
 * public Property never exposes. Returned by /api/v1/dashboard/properties*
 * only (Admin: any row; Commercial: only their own).
 */
export interface DashboardProperty extends Property {
  approval_status: PropertyApprovalStatus;
  rejection_reason: string | null;
  commercial_id: number | null;
  /** Admin's social publishing choice for a new listing - absent means
   * "use the saved defaults". */
  social?: SocialPreferences;
  commercial_name: string | null;
  owner_contact_id: number | null;
}

export interface PropertyFormValues {
  title: string;
  type: PropertyType;
  status: PropertyStatus;
  transaction_type?: "sale" | "rent" | null;
  price_period?: "month" | "night" | null;
  city_id: number | "";
  district_id: number | "";
  address: string;
  price: number;
  surface: number;
  bedrooms: number;
  bathrooms: number;
  description: string;
  /** Newly selected files pending upload - not yet-saved images. */
  images: File[];
  /** Links this listing to a seller/landlord Contact - what the Owner
   * Portal (PropertyFilter/PropertyPolicy's Owner branch) scopes on. */
  owner_contact_id: number | null;
  /** Optional assignment to a Commercial/SeniorCommercial (Admin only - the
   * backend overwrites it with the caller's own id for Commercial accounts).
   * null = not assigned. */
  commercial_id: number | null;
  /** Admin's social publishing choice for a new listing - absent means
   * "use the saved defaults". */
  social?: SocialPreferences;
}

export interface Pagination {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

// Labels are no longer hardcoded here - PropertyType/PropertyStatus values
// double as translation keys under the "PropertyType"/"PropertyStatus"
// message namespaces (messages/{locale}.json), looked up via
// useTranslations("PropertyType")(type) at each call site.
export const PROPERTY_TYPES: PropertyType[] = [
  "appartement",
  "villa",
  "riad",
  "maison",
  "terrain",
  "bureau",
  "local",
];

export const PROPERTY_STATUSES: PropertyStatus[] = [
  "disponible",
  "reserve",
  "vendu",
  "loue",
];
