export type LeadType = "visit_request" | "sell_request" | "rent_request" | "buy_request" | "contact";

// Only used by sell_request/rent_request leads (the "Vendre ou louer" form)
// - distinct from the Property module's own PropertyType (the listing
// catalog's villa/riad/appartement/... taxonomy). Drives which
// property-details fields the form shows - see property-request-fields.ts.
export type PropertyRequestType =
  | "apartment"
  | "house_villa"
  | "riad"
  | "land"
  | "commercial"
  | "office"
  | "shop";

export interface LeadFormValues {
  type: LeadType;
  name: string;
  email: string;
  phone: string;
  message: string;
  property_id?: number;
  property_type?: PropertyRequestType;
  city?: string;
  district?: string;
  address?: string;
  property_details?: Record<string, string | number | boolean>;
}

export const LEAD_TYPE_LABELS: Record<LeadType, string> = {
  visit_request: "Demande de visite",
  sell_request: "Vendre un bien",
  buy_request: "Acheter un bien",
  rent_request: "Mettre un bien en location",
  contact: "Contact",
};

// Admin-side shape - full submission detail, as returned by the
// auth:sanctum + role:Admin lead endpoints (AdminLeadResource on the
// backend). Distinct from LeadFormValues/LeadConfirmation above, which
// belong to the public capture flow.
export type LeadStatus =
  | "new"
  | "contacted"
  | "to_call_back"
  | "visit"
  | "negotiation"
  | "closed";

export const LEAD_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "to_call_back",
  "visit",
  "negotiation",
  "closed",
];

export interface Lead {
  id: number;
  type: LeadType;
  status: LeadStatus;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  property_id: number | null;
  property_type: PropertyRequestType | null;
  city: string | null;
  district: string | null;
  address: string | null;
  property_details: Record<string, string | number | boolean> | null;
  photos?: { id: number; url: string }[];
  commercial_id: number | null;
  contact_id: number | null;
  /** When an "À rappeler" lead is due for a callback (null for any other status). */
  callback_at: string | null;
  created_at: string;
  updated_at: string;
}
