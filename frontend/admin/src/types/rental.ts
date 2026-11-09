/** Gestion locative & Conciergerie - amounts in MAD, dates as "YYYY-MM-DD". */

export const CHARGED_TO = ["owner", "khadmatona"] as const;
export type ChargedTo = (typeof CHARGED_TO)[number];

export const RESERVATION_STATUSES = ["confirmed", "checked_in", "checked_out", "cancelled"] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export const RESERVATION_CHANNELS = ["direct", "airbnb", "booking", "other"] as const;
export type ReservationChannel = (typeof RESERVATION_CHANNELS)[number];

export const CLEANING_STATUSES = ["pending", "done", "cancelled"] as const;
export type CleaningStatus = (typeof CLEANING_STATUSES)[number];

export const MAINTENANCE_STATUSES = ["open", "in_progress", "resolved", "cancelled"] as const;
export type MaintenanceStatus = (typeof MAINTENANCE_STATUSES)[number];

export const MAINTENANCE_PRIORITIES = ["low", "normal", "urgent"] as const;
export type MaintenancePriority = (typeof MAINTENANCE_PRIORITIES)[number];

export const EXPENSE_CATEGORIES = ["utilities", "supplies", "repairs", "taxes", "insurance", "commission", "other"] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export interface ManagedProperty {
  approval_status: "pending" | "approved" | "rejected";
  id: number;
  property_id: number;
  property_title: string | null;
  commission_rate: number;
  cleaning_fee: number;
  cleaning_charged_to: ChargedTo;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

export interface ManagedPropertyValues {
  property_id?: number;
  commission_rate: number;
  cleaning_fee: number;
  cleaning_charged_to: ChargedTo;
  is_active: boolean;
  notes: string;
}

export interface Reservation {
  id: number;
  rental_property_id: number;
  property_id: number;
  property_title: string | null;
  guest_name: string;
  guest_phone: string | null;
  guest_email: string | null;
  guests_count: number;
  channel: ReservationChannel;
  check_in_date: string;
  check_out_date: string;
  nights: number;
  total_amount: number;
  platform_fee: number;
  net_revenue: number;
  commission_rate: number;
  commission: number;
  status: ReservationStatus;
  checked_in_at: string | null;
  checked_out_at: string | null;
  check_in_notes: string | null;
  check_out_notes: string | null;
  notes: string | null;
  created_at: string;
}

export interface ReservationValues {
  rental_property_id?: number;
  guest_name: string;
  guest_phone: string;
  guest_email: string;
  guests_count: number;
  channel: ReservationChannel;
  check_in_date: string;
  check_out_date: string;
  total_amount: number;
  platform_fee: number;
  notes: string;
}

export interface Cleaning {
  id: number;
  rental_property_id: number;
  property_id: number;
  property_title: string | null;
  reservation_id: number | null;
  scheduled_for: string;
  status: CleaningStatus;
  cleaner_name: string | null;
  cost: number;
  charged_to: ChargedTo;
  completed_at: string | null;
  notes: string | null;
}

export interface CleaningValues {
  rental_property_id?: number;
  scheduled_for: string;
  cleaner_name: string;
  cost: number;
  charged_to: ChargedTo;
  notes: string;
  status?: CleaningStatus;
}

export interface MaintenanceRequest {
  id: number;
  rental_property_id: number;
  property_id: number;
  property_title: string | null;
  title: string;
  description: string | null;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  provider_name: string | null;
  reported_on: string;
  resolved_at: string | null;
  cost: number;
  charged_to: ChargedTo;
}

export interface MaintenanceValues {
  rental_property_id?: number;
  title: string;
  description: string;
  priority: MaintenancePriority;
  provider_name: string;
  reported_on: string;
  cost: number;
  charged_to: ChargedTo;
  status?: MaintenanceStatus;
}

export interface Expense {
  id: number;
  rental_property_id: number;
  property_id: number;
  property_title: string | null;
  category: ExpenseCategory;
  label: string;
  amount: number;
  incurred_on: string;
  charged_to: ChargedTo;
  notes: string | null;
}

export interface ExpenseValues {
  rental_property_id?: number;
  category: ExpenseCategory;
  label: string;
  amount: number;
  incurred_on: string;
  charged_to: ChargedTo;
  notes: string;
}

export interface StatementFigures {
  reservations: number;
  nights: number;
  gross: number;
  platform_fees: number;
  net_revenue: number;
  commission: number;
  expenses_owner: number;
  expenses_khadmatona: number;
  owner_share: number;
  khadmatona_share: number;
}

export interface StatementLine {
  property_id: number;
  source: "cleaning" | "maintenance" | "expense";
  category: string;
  label: string;
  date: string;
  amount: number;
  charged_to: ChargedTo;
}

export interface StatementProperty extends StatementFigures {
  rental_property_id: number;
  property_id: number;
  property_title: string | null;
  commission_rate: number;
  is_active: boolean;
  lines?: StatementLine[];
}

export interface Statement {
  month: string;
  from: string;
  to: string;
  properties: StatementProperty[];
  totals: StatementFigures;
}

export interface DashboardStay {
  id: number;
  property_id: number;
  property_title: string | null;
  guest_name: string;
  guests_count: number;
  check_in_date: string;
  check_out_date: string;
  channel: ReservationChannel;
  status: ReservationStatus;
  total_amount: number;
}

export interface RentalDashboard {
  today: string;
  counts: {
    managed_properties: number;
    in_house: number;
    arrivals_today: number;
    departures_today: number;
    pending_cleanings: number;
    open_maintenance: number;
    urgent_maintenance: number;
  };
  occupancy_rate: number;
  month: StatementFigures & { month: string };
  arrivals: DashboardStay[];
  departures: DashboardStay[];
  cleanings: Array<{
    id: number;
    property_id: number;
    property_title: string | null;
    scheduled_for: string;
    cleaner_name: string | null;
    overdue: boolean;
  }>;
}

export interface OwnerStay {
  id: number;
  property_id: number;
  property_title: string | null;
  channel: ReservationChannel;
  guests_count: number;
  check_in_date: string;
  check_out_date: string;
  nights: number;
  status: ReservationStatus;
  net_revenue: number;
  commission: number;
}
