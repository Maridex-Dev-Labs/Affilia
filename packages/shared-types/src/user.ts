export type UserRole = 'merchant' | 'affiliate' | 'admin';

export interface UserProfile {
  id: string;
  full_name: string;
  role: UserRole;
  phone_number?: string;
}
