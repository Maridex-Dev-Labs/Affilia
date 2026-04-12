export type UserRole = 'merchant' | 'affiliate' | 'admin';

export interface UserProfile {
  id: string;
  full_name: string | null;
  role: UserRole | null;
  phone_number?: string | null;
  business_name?: string | null;
}
