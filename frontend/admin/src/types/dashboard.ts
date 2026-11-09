export interface DashboardStats {
  total_properties: number;
  available_properties: number;
  sold_properties: number;
  rented_properties: number;
  reserved_properties: number;
  new_properties_this_month: number;
  /** In MAD (decimal) - the API converts from stored cents. */
  monthly_revenue: number;
  monthly_trend: Array<{ month: string; count: number }>;
}
