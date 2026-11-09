import type { Metadata } from "next";
import { StayContractPage } from "@/components/rental/stay-contract-page";

export const metadata: Metadata = {
  title: "Stay contract",
  robots: { index: false, follow: false },
};

export default async function ContractPage({ params }: { params: Promise<{ token: string }> }) {
  return <StayContractPage token={(await params).token} />;
}
