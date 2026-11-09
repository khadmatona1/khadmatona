import { api } from "@/lib/api";
import type {
  PropertySocialState,
  SocialOverview,
  SocialPage,
  SocialPlatform,
  SocialPreferences,
  SocialSettings,
} from "@/types/social";

const BASE = "/api/v1/social";

export function getSocialOverview(): Promise<SocialOverview> {
  return api.get<SocialOverview>(`${BASE}/settings`);
}

export function updateSocialSettings(settings: SocialSettings): Promise<SocialOverview> {
  return api.put<SocialOverview>(`${BASE}/settings`, settings);
}

export function startMetaConnection(): Promise<{ url: string }> {
  return api.post<{ url: string }>(`${BASE}/connection/authorize`);
}

export function completeMetaConnection(code: string, state: string): Promise<{ pages: SocialPage[] }> {
  return api.post<{ pages: SocialPage[] }>(`${BASE}/connection/callback`, { code, state });
}

export function selectMetaPage(pageId: string): Promise<void> {
  return api.post<void>(`${BASE}/connection/page`, { page_id: pageId });
}

export function verifyMetaConnection(): Promise<void> {
  return api.post<void>(`${BASE}/connection/verify`);
}

export function disconnectMeta(): Promise<void> {
  return api.delete<void>(`${BASE}/connection`);
}

export function getPropertySocial(propertyId: number): Promise<PropertySocialState> {
  return api.get<PropertySocialState>(`${BASE}/properties/${propertyId}`);
}

export function updatePropertySocialPreferences(
  propertyId: number,
  preferences: SocialPreferences,
): Promise<PropertySocialState> {
  return api.put<PropertySocialState>(`${BASE}/properties/${propertyId}/preferences`, preferences);
}

export function publishPropertyNow(
  propertyId: number,
  platforms: SocialPlatform[],
): Promise<PropertySocialState> {
  return api.post<PropertySocialState>(`${BASE}/properties/${propertyId}/publish`, { platforms });
}

export function retrySocialPublication(publicationId: number): Promise<PropertySocialState> {
  return api.post<PropertySocialState>(`${BASE}/publications/${publicationId}/retry`);
}
