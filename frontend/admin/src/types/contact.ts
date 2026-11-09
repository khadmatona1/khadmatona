export type ContactType = "buyer" | "seller" | "tenant" | "landlord";

export const CONTACT_TYPES: ContactType[] = ["buyer", "seller", "tenant", "landlord"];

export interface Contact {
  id: number;
  type: ContactType;
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  notes: string | null;
  commercial_id: number | null;
  commercial_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactFormValues {
  type: ContactType;
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  notes: string;
}
