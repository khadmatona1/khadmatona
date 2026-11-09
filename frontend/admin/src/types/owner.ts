import type { PropertyApprovalStatus, PropertyStatus, PropertyType } from "@/types/property";

export interface OwnerProperty {
  id: number;
  title: string;
  type: PropertyType;
  status: PropertyStatus;
  approval_status: PropertyApprovalStatus;
  rejection_reason: string | null;
  commercial_name: string | null;
  city_name: string | null;
  district_name: string | null;
  address: string;
  /** In MAD (decimal). */
  price: number;
  surface: number;
  bedrooms: number;
  bathrooms: number;
  cover_image: string | null;
  leads_count: number;
  completed_visits_count: number;
  created_at: string;
}

export interface OwnerMonthlyReportEntry {
  /** "YYYY-MM" */
  month: string;
  leads_count: number;
  completed_visits_count: number;
}
