import { api } from "@/lib/api";
import type { BookingRequest, BookingRequestValues } from "@/types/booking";
import type { Pagination } from "@/types/property";
import type { Property } from "@/types/property";

export function listBookingProperties(page: number, search: string): Promise<{ properties: Property[]; pagination: Pagination }> {
  return api.get(`/api/v1/rental/booking-properties?${new URLSearchParams({ page: String(page), search })}`);
}

export function getBookingAvailability(propertyId: number, checkIn?: string, checkOut?: string): Promise<{ bookable: boolean; available: boolean | null }> {
  const query = new URLSearchParams();
  if (checkIn && checkOut) { query.set("check_in_date", checkIn); query.set("check_out_date", checkOut); }
  return api.get(`/api/v1/rental/booking/${propertyId}?${query}`);
}

export function submitBookingRequest(values: BookingRequestValues): Promise<{ reference: string; status: "received" }> {
  return api.post("/api/v1/rental/booking-requests", values);
}

export async function listBookingRequests(page: number, status: string) {
  const query = new URLSearchParams({ page: String(page), per_page: "10", sort: "-created_at" });
  if (status) query.set("filter[status]", status);
  const envelope = await api.getWithMeta<BookingRequest[]>(`/api/v1/rental/booking-requests?${query}`);
  return { items: envelope.data, pagination: envelope.meta?.pagination as Pagination };
}

export function confirmBookingRequest(id: number, totalAmount: string) {
  return api.patch(`/api/v1/rental/booking-requests/${id}/confirm`, { total_amount: totalAmount });
}

export function rejectBookingRequest(id: number) {
  return api.patch(`/api/v1/rental/booking-requests/${id}/reject`, {});
}
