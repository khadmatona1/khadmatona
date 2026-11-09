export type ProfessionalType =
  | "independent_agent"
  | "agency"
  | "commercial"
  | "developer"
  | "other";

export const PROFESSIONAL_TYPES: ProfessionalType[] = [
  "independent_agent",
  "agency",
  "commercial",
  "developer",
  "other",
];

export type CommercialPropertyType =
  | "apartments"
  | "villas"
  | "houses"
  | "land"
  | "commercial_premises"
  | "other";

export const COMMERCIAL_PROPERTY_TYPES: CommercialPropertyType[] = [
  "apartments",
  "villas",
  "houses",
  "land",
  "commercial_premises",
  "other",
];

export type CommercialLeadStatus = "new" | "contacted" | "qualified" | "partner" | "rejected";

export const COMMERCIAL_LEAD_STATUSES: CommercialLeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "partner",
  "rejected",
];

export interface CommercialLeadFormValues {
  full_name: string;
  company_name: string;
  email: string;
  phone: string;
  whatsapp: string;
  city: string;
  address: string;
  position: string;
  professional_type: ProfessionalType | "";
  message: string;
}

// Admin-side shape - full submission detail, as returned by the
// auth:sanctum + role:Admin commercial-lead endpoints
// (AdminCommercialLeadResource on the backend).
export interface CommercialLead {
  id: number;
  full_name: string;
  company_name: string | null;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  city: string | null;
  address: string | null;
  position: string | null;
  professional_type: ProfessionalType;
  portfolio_size: number | null;
  property_types: CommercialPropertyType[] | null;
  collaboration_type: string | null;
  message: string | null;
  source: string | null;
  status: CommercialLeadStatus;
  created_at: string;
  updated_at: string;
}
