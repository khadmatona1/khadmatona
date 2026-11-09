import type { Pagination } from "@/types/property";

export type EntryKind = "fee" | "commission" | "expense";
export interface FinanceTotals {
  revenue: number;
  commissions: number;
  expenses: number;
  receipts: number;
  disbursements: number;
  margin: number;
  cash_balance: number;
  unpaid: number;
  fee_count: number;
}
export interface FinancePerformance extends FinanceTotals {
  id: number | null;
  name: string | null;
}
export interface FinancialEntry {
  id: number;
  kind: EntryKind;
  label: string;
  amount_cents: number;
  occurred_on: string;
  paid_on: string | null;
  property_id: number | null;
  property_title: string | null;
  commercial_id: number | null;
  commercial_name: string | null;
  notes: string | null;
}
export interface FinanceFilters {
  kind?: EntryKind;
  from: string;
  to: string;
  property_id: string;
  commercial_id: string;
}
export interface FinanceReport {
  currency: "MAD";
  from: string;
  to: string;
  totals: FinanceTotals;
  trend: (FinanceTotals & { month: string })[];
  properties: FinancePerformance[];
  commercials: FinancePerformance[];
  entries: FinancialEntry[];
  pagination: Pagination;
}
export interface FinanceOptions {
  properties: { id: number; title: string }[];
  commercials: { id: number; name: string }[];
}
export interface FinancialEntryValues {
  kind: EntryKind;
  label: string;
  amount: string;
  occurred_on: string;
  paid_on: string | null;
  property_id: number | null;
  commercial_id: number | null;
  notes: string | null;
}
