import type { PropertyType } from "@/types/property";

/** What the public alert form submits - phone is the only required field
 * (delivery is WhatsApp-only, see lib/property-alerts.ts). */
export interface PropertyAlertPayload {
  phone: string;
  transactionType?: "sale" | "rent";
  pricePeriod?: "month" | "night";
  email?: string;
  cityId?: number;
  districtId?: number;
  propertyType?: PropertyType;
  /** MAD (decimal), not cents - converted server-side. */
  budgetMax?: number;
  surfaceMin?: number;
  surfaceMax?: number;
}

export interface PropertyAlertConfirmation {
  id: number;
  /** True when this exact contact + criteria combination was already saved. */
  alreadyExisted: boolean;
}

/** Admin dashboard listing shape. */
export interface PropertyAlert {
  id: number;
  email: string | null;
  phone: string;
  city_id: number | null;
  city_name: string | null;
  district_id: number | null;
  district_name: string | null;
  property_type: PropertyType | null;
  budget_max: number | null;
  surface_min: number | null;
  surface_max: number | null;
  created_at: string;
}
