import { api } from "@/lib/api";
import type { City, District } from "@/types/lookup";

export function listCities(): Promise<City[]> {
  return api.get<City[]>("/api/v1/cities");
}

export function listDistricts(cityId?: number): Promise<District[]> {
  const query = cityId !== undefined ? `?city_id=${cityId}` : "";
  return api.get<District[]>(`/api/v1/districts${query}`);
}
