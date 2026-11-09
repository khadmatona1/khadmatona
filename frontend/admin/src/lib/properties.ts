import { api } from "@/lib/api";
import type { DashboardStats } from "@/types/dashboard";
import type {
  DashboardProperty,
  Pagination,
  Property,
  PropertyApprovalStatus,
  PropertyFormValues,
  PropertyStatus,
  PropertyType,
} from "@/types/property";

export interface ListPropertiesParams {
  page?: number;
  perPage?: number;
  search?: string;
  /** Allow-listed on the backend - used by the public listing page's filters. */
  type?: PropertyType;
  status?: PropertyStatus;
  cityId?: number;
  districtId?: number;
  priceMin?: number;
  priceMax?: number;
  surfaceMin?: number;
  surfaceMax?: number;
  sort?: string;
  transactionType?: "sale" | "rent";
  pricePeriod?: "month" | "night";
}

export interface PropertyList {
  properties: Property[];
  pagination: Pagination;
}

export async function listProperties(
  params: ListPropertiesParams = {},
): Promise<PropertyList> {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("per_page", String(params.perPage ?? 10));
  query.set("sort", params.sort ?? "-created_at");
  if (params.transactionType)
    query.set("filter[transaction_type]", params.transactionType);
  if (params.pricePeriod) query.set("filter[price_period]", params.pricePeriod);
  if (params.search) query.set("filter[search]", params.search);
  if (params.type) query.set("filter[type]", params.type);
  if (params.status) query.set("filter[status]", params.status);
  if (params.cityId !== undefined)
    query.set("filter[city_id]", String(params.cityId));
  if (params.districtId !== undefined)
    query.set("filter[district_id]", String(params.districtId));
  if (params.priceMin !== undefined) {
    query.set("filter[price_min]", String(params.priceMin));
  }
  if (params.priceMax !== undefined) {
    query.set("filter[price_max]", String(params.priceMax));
  }
  if (params.surfaceMin !== undefined)
    query.set("filter[surface_min]", String(params.surfaceMin));
  if (params.surfaceMax !== undefined)
    query.set("filter[surface_max]", String(params.surfaceMax));

  const envelope = await api.getWithMeta<Property[]>(
    `/api/v1/properties?${query.toString()}`,
  );

  return {
    properties: envelope.data,
    pagination: (envelope.meta?.pagination as Pagination) ?? {
      current_page: 1,
      last_page: 1,
      per_page: params.perPage ?? 10,
      total: envelope.data.length,
    },
  };
}

export function getProperty(id: number | string): Promise<Property> {
  return api.get<Property>(`/api/v1/properties/${id}`);
}

export interface PropertyFacets {
  /** Keyed by city id (as a string, since it arrives via JSON object keys). */
  city_id: Record<string, number>;
  type: Partial<Record<PropertyType, number>>;
  status: Partial<Record<PropertyStatus, number>>;
}

/**
 * How many properties match each possible filter value, given whichever
 * *other* filters are already active (each dimension excludes its own
 * current value server-side, so e.g. picking a city doesn't just count
 * itself against itself) - powers the counters shown next to each option
 * in PropertyFilters/the Combobox.
 */
export function getPropertyFacets(
  params: Pick<
    ListPropertiesParams,
    | "search"
    | "type"
    | "status"
    | "cityId"
    | "priceMin"
    | "priceMax"
    | "transactionType"
    | "pricePeriod"
  > = {},
): Promise<PropertyFacets> {
  const query = new URLSearchParams();
  if (params.transactionType)
    query.set("filter[transaction_type]", params.transactionType);
  if (params.pricePeriod) query.set("filter[price_period]", params.pricePeriod);
  if (params.search) query.set("filter[search]", params.search);
  if (params.type) query.set("filter[type]", params.type);
  if (params.status) query.set("filter[status]", params.status);
  if (params.cityId !== undefined)
    query.set("filter[city_id]", String(params.cityId));
  if (params.priceMin !== undefined)
    query.set("filter[price_min]", String(params.priceMin));
  if (params.priceMax !== undefined)
    query.set("filter[price_max]", String(params.priceMax));

  return api.get<PropertyFacets>(
    `/api/v1/properties/facets?${query.toString()}`,
  );
}

export interface ListDashboardPropertiesParams extends ListPropertiesParams {
  approvalStatus?: PropertyApprovalStatus;
  ownerContactId?: number | string;
}

export interface DashboardPropertyList {
  properties: DashboardProperty[];
  pagination: Pagination;
}

/**
 * Authenticated dashboard listing (Admin: every property; Commercial: only
 * their own, any approval_status) - the Admin dashboard's own properties
 * page must use this, not listProperties(), since the public endpoint is
 * approved-only and would otherwise hide every pending/rejected
 * Commercial submission from Admin too.
 */
export async function listDashboardProperties(
  params: ListDashboardPropertiesParams = {},
): Promise<DashboardPropertyList> {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("per_page", String(params.perPage ?? 10));
  query.set("sort", params.sort ?? "-created_at");
  if (params.transactionType)
    query.set("filter[transaction_type]", params.transactionType);
  if (params.pricePeriod) query.set("filter[price_period]", params.pricePeriod);
  if (params.search) query.set("filter[search]", params.search);
  if (params.type) query.set("filter[type]", params.type);
  if (params.status) query.set("filter[status]", params.status);
  if (params.approvalStatus)
    query.set("filter[approval_status]", params.approvalStatus);
  if (params.ownerContactId !== undefined)
    query.set("filter[owner_contact_id]", String(params.ownerContactId));
  if (params.cityId !== undefined)
    query.set("filter[city_id]", String(params.cityId));
  if (params.districtId !== undefined)
    query.set("filter[district_id]", String(params.districtId));
  if (params.priceMin !== undefined)
    query.set("filter[price_min]", String(params.priceMin));
  if (params.priceMax !== undefined)
    query.set("filter[price_max]", String(params.priceMax));
  if (params.surfaceMin !== undefined)
    query.set("filter[surface_min]", String(params.surfaceMin));
  if (params.surfaceMax !== undefined)
    query.set("filter[surface_max]", String(params.surfaceMax));

  const envelope = await api.getWithMeta<DashboardProperty[]>(
    `/api/v1/dashboard/properties?${query.toString()}`,
  );

  return {
    properties: envelope.data,
    pagination: (envelope.meta?.pagination as Pagination) ?? {
      current_page: 1,
      last_page: 1,
      per_page: params.perPage ?? 10,
      total: envelope.data.length,
    },
  };
}

export function getDashboardProperty(
  id: number | string,
): Promise<DashboardProperty> {
  return api.get<DashboardProperty>(`/api/v1/dashboard/properties/${id}`);
}

export function approveProperty(
  id: number | string,
): Promise<DashboardProperty> {
  return api.patch<DashboardProperty>(`/api/v1/properties/${id}/approve`, {});
}

export function rejectProperty(
  id: number | string,
  rejectionReason?: string,
): Promise<DashboardProperty> {
  return api.patch<DashboardProperty>(`/api/v1/properties/${id}/reject`, {
    rejection_reason: rejectionReason,
  });
}

function toFormData(values: PropertyFormValues): FormData {
  const form = new FormData();
  form.set("title", values.title);
  form.set("type", values.type);
  form.set("status", values.status);
  form.set("transaction_type", values.transaction_type ?? "");
  form.set(
    "price_period",
    values.transaction_type === "rent" ? (values.price_period ?? "") : "",
  );
  form.set("city_id", String(values.city_id));
  if (values.district_id !== "")
    form.set("district_id", String(values.district_id));
  form.set("address", values.address);
  form.set("price", String(values.price));
  form.set("surface", String(values.surface));
  form.set("bedrooms", String(values.bedrooms));
  form.set("bathrooms", String(values.bathrooms));
  if (values.description) form.set("description", values.description);
  // Same "omit when unset" treatment as district_id above - an empty string
  // would fail the backend's `integer` rule (multipart form data has no
  // native null, and this API's middleware doesn't convert "" to null the
  // way the web guard's does), so a cleared/never-set owner just isn't sent.
  if (values.owner_contact_id !== null) {
    form.set("owner_contact_id", String(values.owner_contact_id));
  }
  // Always sent, unlike the optional fields above: an empty string is how
  // the multipart form says "no commercial", so an Admin can also UNassign
  // on edit (the backend reads "" as null; omitting the key would keep the
  // current assignee instead).
  form.set(
    "commercial_id",
    values.commercial_id !== null ? String(values.commercial_id) : "",
  );
  if (values.social) {
    form.set("social[facebook]", values.social.facebook ? "1" : "0");
    form.set("social[instagram]", values.social.instagram ? "1" : "0");
    form.set("social[mode]", values.social.mode);
  }
  for (const file of values.images) {
    form.append("images[]", file);
  }
  return form;
}

/**
 * Always an authenticated call now (store/update moved behind
 * auth:sanctum) - the backend returns the richer DashboardPropertyResource
 * shape here, not the public PropertyResource.
 */
export function createProperty(
  values: PropertyFormValues,
): Promise<DashboardProperty> {
  return api.postForm<DashboardProperty>(
    "/api/v1/properties",
    toFormData(values),
  );
}

export function updateProperty(
  id: number | string,
  values: PropertyFormValues,
): Promise<DashboardProperty> {
  return api.putForm<DashboardProperty>(
    `/api/v1/properties/${id}`,
    toFormData(values),
  );
}

export function deleteProperty(id: number | string): Promise<void> {
  return api.delete<void>(`/api/v1/properties/${id}`);
}

export function deletePropertyImage(
  propertyId: number | string,
  mediaId: number,
): Promise<void> {
  return api.delete<void>(`/api/v1/properties/${propertyId}/images/${mediaId}`);
}

export function getDashboardStats(): Promise<DashboardStats> {
  return api.get<DashboardStats>("/api/v1/dashboard/stats");
}
