export interface User {
  id: number;
  name: string;
  email: string;
  locale: string | null;
  theme_preference: string | null;
  is_active: boolean;
  contact_id: number | null;
  roles?: string[];
  email_verified_at: string | null;
  created_at: string;
}
