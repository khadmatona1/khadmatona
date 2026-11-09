"use client";

import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";

/**
 * Visitor analytics - Admin only. The API enforces it (role:Admin), and
 * dashboard/layout.tsx already sends Commercial/Owner accounts to their own
 * areas before this page can render.
 */
export default function AnalyticsPage() {
  return <AnalyticsDashboard />;
}
