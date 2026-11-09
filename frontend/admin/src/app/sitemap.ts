import type { MetadataRoute } from "next";
import { listProperties } from "@/lib/properties";

// Placeholder until the real production domain is known.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.khadmatona.ma";

const STATIC_PAGES = ["/", "/properties", "/services", "/about", "/contact"];

// Otherwise new/removed properties would never appear without a rebuild.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = STATIC_PAGES.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
  }));

  try {
    const { properties } = await listProperties({ perPage: 100, sort: "-created_at" });
    const propertyEntries: MetadataRoute.Sitemap = properties.map((property) => ({
      url: `${SITE_URL}/properties/${property.id}`,
      lastModified: property.updated_at,
    }));

    return [...staticEntries, ...propertyEntries];
  } catch {
    // If the API is unreachable at build time, still ship the static pages.
    return staticEntries;
  }
}
