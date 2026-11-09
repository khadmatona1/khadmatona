export interface UserFormValues {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  role: string;
  is_active?: boolean;
  /** Only meaningful (and required by the backend) when role="Owner" -
   * links the login to the seller/landlord Contact it's for. */
  contact_id?: number | null;
}
