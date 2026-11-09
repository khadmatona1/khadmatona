export interface BookingRequestValues {
  property_id: number;
  request_key: string;
  guest_name: string;
  guest_phone: string;
  guest_email?: string | null;
  guests_count: number;
  check_in_date: string;
  check_out_date: string;
  notes: string;
  consent: boolean;
  website: string;
}

export interface BookingRequest {
  id: number;
  reference: string;
  property_id: number;
  property_title: string | null;
  guest_name: string;
  guest_phone: string;
  guest_email: string | null;
  guests_count: number;
  check_in_date: string;
  check_out_date: string;
  notes: string | null;
  status: "pending" | "confirmed" | "rejected";
  reservation_id: number | null;
  created_at: string;
}
