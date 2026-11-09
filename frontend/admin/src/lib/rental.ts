import { api } from "@/lib/api";
import type { Pagination } from "@/types/property";
import type {
  Cleaning,
  CleaningValues,
  Expense,
  ExpenseValues,
  MaintenanceRequest,
  MaintenanceValues,
  ManagedProperty,
  ManagedPropertyValues,
  OwnerStay,
  RentalDashboard,
  Reservation,
  ReservationValues,
  Statement,
} from "@/types/rental";

// Rental back office for Admin and scoped Commercial/SeniorCommercial accounts.
// Owner endpoints live under /api/v1/owner/rental.

const BASE = "/api/v1/rental";

export interface Page<T> {
  items: T[];
  pagination: Pagination;
}

/** filter[key]=value for every non-empty entry, plus page/per_page/sort. */
async function listPage<T>(
  path: string,
  params: { page?: number; perPage?: number; sort?: string; filters?: Record<string, string | number | undefined> },
): Promise<Page<T>> {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("per_page", String(params.perPage ?? 15));
  if (params.sort) query.set("sort", params.sort);
  for (const [key, value] of Object.entries(params.filters ?? {})) {
    if (value !== undefined && value !== "") query.set(`filter[${key}]`, String(value));
  }

  const envelope = await api.getWithMeta<T[]>(`${BASE}/${path}?${query.toString()}`);

  return {
    items: envelope.data,
    pagination: (envelope.meta?.pagination as Pagination) ?? {
      current_page: 1,
      last_page: 1,
      per_page: params.perPage ?? 15,
      total: envelope.data.length,
    },
  };
}

/** Optional text fields go out as null when blank, never as "". */
function blankToNull<T extends object>(values: T): T {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, typeof value === "string" && value.trim() === "" ? null : value]),
  ) as T;
}

export type ListParams = Parameters<typeof listPage>[1];

// --- Dashboard & statement ---------------------------------------------------

export function getRentalDashboard(): Promise<RentalDashboard> {
  return api.get<RentalDashboard>(`${BASE}/dashboard`);
}

export function getRentalStatement(month: string): Promise<Statement> {
  return api.get<Statement>(`${BASE}/statement?month=${encodeURIComponent(month)}`);
}

// --- Managed properties ------------------------------------------------------

export function listManagedProperties(params: ListParams = {}): Promise<Page<ManagedProperty>> {
  return listPage<ManagedProperty>("properties", params);
}

export function createManagedProperty(values: ManagedPropertyValues): Promise<ManagedProperty> {
  return api.post<ManagedProperty>(`${BASE}/properties`, blankToNull(values));
}

export function reviewManagedProperty(id: number, decision: "approve" | "reject"): Promise<ManagedProperty> {
  return api.patch<ManagedProperty>(`${BASE}/properties/${id}/${decision}`, {});
}

export function updateManagedProperty(id: number, values: ManagedPropertyValues): Promise<ManagedProperty> {
  return api.put<ManagedProperty>(`${BASE}/properties/${id}`, blankToNull(values));
}

export function deleteManagedProperty(id: number): Promise<void> {
  return api.delete<void>(`${BASE}/properties/${id}`);
}

// --- Reservations --------------------------------------------------------------

export function listReservations(params: ListParams = {}): Promise<Page<Reservation>> {
  return listPage<Reservation>("reservations", params);
}

export function createReservation(values: ReservationValues): Promise<Reservation> {
  return api.post<Reservation>(`${BASE}/reservations`, blankToNull(values));
}

export function updateReservation(id: number, values: ReservationValues): Promise<Reservation> {
  return api.put<Reservation>(`${BASE}/reservations/${id}`, blankToNull(values));
}

export function checkInReservation(id: number, notes: string): Promise<Reservation> {
  return api.patch<Reservation>(`${BASE}/reservations/${id}/check-in`, { notes: notes.trim() || null });
}

export function checkOutReservation(id: number, notes: string): Promise<Reservation> {
  return api.patch<Reservation>(`${BASE}/reservations/${id}/check-out`, { notes: notes.trim() || null });
}

export function cancelReservation(id: number): Promise<Reservation> {
  return api.patch<Reservation>(`${BASE}/reservations/${id}/cancel`);
}

export function deleteReservation(id: number): Promise<void> {
  return api.delete<void>(`${BASE}/reservations/${id}`);
}

// --- Cleaning ------------------------------------------------------------------

export function listCleanings(params: ListParams = {}): Promise<Page<Cleaning>> {
  return listPage<Cleaning>("cleanings", params);
}

export function createCleaning(values: CleaningValues): Promise<Cleaning> {
  return api.post<Cleaning>(`${BASE}/cleanings`, blankToNull(values));
}

export function updateCleaning(id: number, values: Partial<CleaningValues>): Promise<Cleaning> {
  return api.patch<Cleaning>(`${BASE}/cleanings/${id}`, blankToNull(values));
}

export function deleteCleaning(id: number): Promise<void> {
  return api.delete<void>(`${BASE}/cleanings/${id}`);
}

// --- Maintenance -----------------------------------------------------------------

export function listMaintenance(params: ListParams = {}): Promise<Page<MaintenanceRequest>> {
  return listPage<MaintenanceRequest>("maintenance", params);
}

export function createMaintenance(values: MaintenanceValues): Promise<MaintenanceRequest> {
  return api.post<MaintenanceRequest>(`${BASE}/maintenance`, blankToNull(values));
}

export function updateMaintenance(id: number, values: Partial<MaintenanceValues>): Promise<MaintenanceRequest> {
  return api.patch<MaintenanceRequest>(`${BASE}/maintenance/${id}`, blankToNull(values));
}

export function deleteMaintenance(id: number): Promise<void> {
  return api.delete<void>(`${BASE}/maintenance/${id}`);
}

// --- Expenses --------------------------------------------------------------------

export function listExpenses(params: ListParams = {}): Promise<Page<Expense>> {
  return listPage<Expense>("expenses", params);
}

export function createExpense(values: ExpenseValues): Promise<Expense> {
  return api.post<Expense>(`${BASE}/expenses`, blankToNull(values));
}

export function updateExpense(id: number, values: ExpenseValues): Promise<Expense> {
  return api.put<Expense>(`${BASE}/expenses/${id}`, blankToNull(values));
}

export function deleteExpense(id: number): Promise<void> {
  return api.delete<void>(`${BASE}/expenses/${id}`);
}

// --- Owner Portal -------------------------------------------------------------------

export function getOwnerRentalStatement(month: string): Promise<Statement> {
  return api.get<Statement>(`/api/v1/owner/rental/statement?month=${encodeURIComponent(month)}`);
}

export function listOwnerStays(month: string): Promise<OwnerStay[]> {
  return api.get<OwnerStay[]>(`/api/v1/owner/rental/reservations?month=${encodeURIComponent(month)}`);
}
