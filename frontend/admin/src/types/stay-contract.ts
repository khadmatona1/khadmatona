export interface StayContractData {
  reference: string;
  status: "pending_signature" | "signed";
  guest: { name: string; phone: string; email: string };
  stay: {
    property_title: string;
    guests_count: number;
    check_in_date: string;
    check_out_date: string;
    total_amount: number;
    currency: "MAD";
  };
  contract: null | {
    nationality: string;
    identity_number: string;
    birth_date: string;
    address: string;
    estimated_arrival_time: string | null;
    signed_at: string;
  };
  expires_at: string;
}
