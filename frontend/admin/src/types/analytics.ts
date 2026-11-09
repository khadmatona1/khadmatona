import type { Pagination } from "@/types/property";

export type AnalyticsRange = "today" | "yesterday" | "7d" | "30d" | "custom";

export const TRAFFIC_SOURCES = [
  "direct",
  "google",
  "facebook",
  "instagram",
  "tiktok",
  "other_search",
  "other_social",
  "email",
  "referral",
] as const;
export type TrafficSource = (typeof TRAFFIC_SOURCES)[number];

export const DEVICE_TYPES = ["desktop", "mobile", "tablet"] as const;
export type DeviceType = (typeof DEVICE_TYPES)[number];

export const TRACKED_FORMS = [
  "contact",
  "sell_request",
  "buy_request",
  "rent_request",
  "visit_request",
  "property_alert",
  "partner_application",
] as const;
export type TrackedFormType = (typeof TRACKED_FORMS)[number];

/** Mirrors backend AnalyticsEventType::reportable(). */
export const REPORTABLE_EVENTS = [
  "page_view",
  "property_view",
  "cta_click",
  "whatsapp_click",
  "phone_click",
  "email_click",
  "social_click",
  "form_started",
  "form_field_interaction",
  "form_step",
  "form_submitted",
  "form_abandoned",
  "property_contact",
  "visit_request_started",
  "visit_request_submitted",
] as const;
export type ReportableEvent = (typeof REPORTABLE_EVENTS)[number];

export interface AnalyticsFilters {
  range: AnalyticsRange;
  from?: string;
  to?: string;
  source?: TrafficSource | "";
  device?: DeviceType | "";
  page?: string;
  propertyId?: string;
  event?: ReportableEvent | "";
  form?: TrackedFormType | "";
}

export interface RangeMeta {
  from: string;
  to: string;
  timezone: string;
}

export interface AnalyticsOverview {
  range: RangeMeta;
  cards: {
    visitors_today: number;
    visitors_week: number;
    visitors_month: number;
    sessions: number;
    visitors: number;
    page_views: number;
    avg_session_seconds: number;
    bounce_rate: number;
    leads: number;
    form_submissions: number;
    converted_sessions: number;
    conversion_rate: number;
  };
  series: Array<{ date: string; visitors: number; sessions: number; page_views: number; leads: number }>;
  sources: SourceRow[];
  devices: BreakdownRow[];
  funnel: { sessions: number; property_viewers: number; form_starters: number; converters: number };
}

export interface SourceRow {
  source: TrafficSource;
  sessions: number;
  visitors: number;
  conversions: number;
  conversion_rate?: number;
}

export interface BreakdownRow {
  value: string | null;
  sessions: number;
}

export interface AnalyticsSources {
  range: RangeMeta;
  sources: SourceRow[];
  referrers: Array<{ host: string; sessions: number }>;
  campaigns: Array<{
    utm_source: string | null;
    utm_medium: string | null;
    utm_campaign: string | null;
    sessions: number;
    conversions: number;
    conversion_rate: number;
  }>;
  devices: BreakdownRow[];
  browsers: BreakdownRow[];
  operating_systems: BreakdownRow[];
  countries: BreakdownRow[];
  cities: BreakdownRow[];
}

export interface AnalyticsPages {
  range: RangeMeta;
  pages: Array<{
    path: string;
    page_type: string;
    views: number;
    visitors: number;
    avg_seconds: number | null;
    exits: number;
    exit_rate: number;
  }>;
  exit_pages: Array<{ path: string; exits: number; sessions_share: number }>;
}

export interface AnalyticsProperties {
  range: RangeMeta;
  properties: Array<{
    property_id: number;
    title: string | null;
    views: number;
    visitors: number;
    avg_seconds: number | null;
    cta_clicks: number;
    contact_clicks: number;
    form_starts: number;
    form_submissions: number;
    leads: number;
    conversion_rate: number;
  }>;
}

export interface FormStats {
  form_type: TrackedFormType;
  started: number;
  submitted: number;
  abandoned: number;
  in_progress: number;
  avg_seconds_to_submit: number | null;
  conversion_rate: number;
  abandonment_rate: number;
  drop_off_fields: Array<{ field: string; count: number }>;
  fields: Array<{ field: string; interactions: number }>;
}

export interface AnalyticsForms {
  range: RangeMeta;
  forms: FormStats[];
}

export interface AnalyticsEvents {
  range: RangeMeta;
  events: Array<{ event_type: string; count: number; sessions: number }>;
}

export interface JourneyStep {
  type: string;
  at: string;
  path: string | null;
  page_type: string | null;
  property_id: number | null;
  property_title: string | null;
  duration_seconds: number | null;
  form_type: TrackedFormType | null;
  field: string | null;
  label: string | null;
}

export interface Journey {
  id: string;
  visitor_label: string;
  returning: boolean;
  started_at: string;
  last_activity_at: string;
  duration_seconds: number;
  page_views: number;
  source: TrafficSource;
  referrer_host: string | null;
  utm_campaign: string | null;
  device_type: DeviceType;
  browser: string | null;
  os: string | null;
  country: string | null;
  city: string | null;
  converted: boolean;
  steps: JourneyStep[];
}

export interface JourneyList {
  journeys: Journey[];
  pagination: Pagination;
}

export interface RealtimeVisitors {
  window_seconds: number;
  sessions: number;
  visitors: number;
  items: Array<{
    id: string;
    current_path: string | null;
    device_type: DeviceType;
    browser: string | null;
    os: string | null;
    country: string | null;
    city: string | null;
    source: TrafficSource;
    page_views: number;
    started_at: string;
    last_activity_at: string;
    seconds_since_activity: number;
  }>;
}
