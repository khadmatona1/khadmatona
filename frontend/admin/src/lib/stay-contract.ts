import { api } from "@/lib/api";
import type { StayContractData } from "@/types/stay-contract";

export function getStayContract(token: string): Promise<StayContractData> {
  return api.get(`/api/v1/rental/stay-contracts/${encodeURIComponent(token)}`);
}

export function signStayContract(token: string, values: FormData): Promise<StayContractData> {
  return api.postForm(`/api/v1/rental/stay-contracts/${encodeURIComponent(token)}/sign`, values);
}
