export const SOCIAL_PLATFORMS = ["facebook", "instagram"] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export type PublishMode = "auto" | "manual";

export type PublicationStatus = "pending" | "publishing" | "published" | "failed";

export interface SocialPreferences {
  facebook: boolean;
  instagram: boolean;
  mode: PublishMode;
}

export interface SocialPublication {
  id: number;
  platform: SocialPlatform;
  status: PublicationStatus;
  platform_post_id: string | null;
  published_at: string | null;
  error_code: string | null;
  error_message: string | null;
  retry_count: number;
  can_retry: boolean;
  updated_at: string;
}

export interface PropertySocialState {
  preferences: SocialPreferences;
  is_public: boolean;
  publications: SocialPublication[];
  caption_preview: string;
}

export interface SocialAccount {
  external_id: string;
  name: string;
  status: "connected" | "needs_reconnect";
  connected_at: string;
}

export interface SocialSettings {
  facebook_enabled: boolean;
  instagram_enabled: boolean;
  default_facebook: boolean;
  default_instagram: boolean;
  default_mode: PublishMode;
  caption_template: string | null;
  facebook_max_images: number;
  instagram_max_images: number;
}

export interface SocialOverview {
  app_configured: boolean;
  accounts: Record<SocialPlatform, SocialAccount | null>;
  settings: SocialSettings;
  default_caption_template: string;
}

export interface SocialPage {
  id: string;
  name: string;
  instagram: { id: string; username: string } | null;
}
