import type { Metadata } from "next";
import { StayContractPage } from "@/components/rental/stay-contract-page";
import type { StayContractData } from "@/types/stay-contract";

export const metadata: Metadata = {
  title: "Stay contract preview",
  robots: { index: false, follow: false },
};

const previewContract: StayContractData = {
  reference: "KH-2026-DEMO",
  status: "pending_signature",
  guest: {
    name: "Client Demo",
    phone: "+212 6 12 34 56 78",
    email: "client@example.com",
  },
  stay: {
    property_title: "Villa Marrakech",
    guests_count: 2,
    check_in_date: "2026-10-10",
    check_out_date: "2026-10-13",
    total_amount: 4500,
    currency: "MAD",
  },
  contract: null,
  expires_at: "2026-10-29T12:00:00+01:00",
};

export default function StayContractPreviewPage() {
  return <StayContractPage token="preview" initialContract={previewContract} />;
}
