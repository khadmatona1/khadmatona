export type VisitStatus = "scheduled" | "completed" | "cancelled" | "no_show";

export const VISIT_STATUSES: VisitStatus[] = ["scheduled", "completed", "cancelled", "no_show"];

export type VisitReportOutcome = "interested" | "not_interested" | "follow_up" | "no_show";

export const VISIT_REPORT_OUTCOMES: VisitReportOutcome[] = [
  "interested",
  "not_interested",
  "follow_up",
  "no_show",
];

/** What the public booking form submits. */
export interface VisitBookingPayload {
  name: string;
  email: string;
  phone: string;
  propertyId: number;
  scheduledAt: string;
  message?: string;
}

export interface VisitConfirmation {
  id: number;
  propertyId: number;
  scheduledAt: string;
}

/** Admin/Commercial dashboard view - denormalized display fields are
 * populated server-side (VisitFilter's joins / VisitController::withDisplay()),
 * never resolved client-side. */
export interface Visit {
  id: number;
  lead_id: number;
  property_id: number;
  property_title: string | null;
  lead_name: string | null;
  lead_email: string | null;
  lead_phone: string | null;
  commercial_id: number | null;
  commercial_name: string | null;
  scheduled_at: string;
  status: VisitStatus;
  report: string | null;
  report_outcome: VisitReportOutcome | null;
  completed_at: string | null;
  whatsapp_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}
