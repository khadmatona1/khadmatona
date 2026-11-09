import { SiteHeaderClient } from "@/components/layout/site-header-client";
import { getSettings } from "@/lib/settings";

export async function SiteHeader() {
  const settings = await getSettings();
  return <SiteHeaderClient settings={settings} />;
}
