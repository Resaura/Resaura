export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  company_name: string;
  profession: string;
  photo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  user_id: string;
  brand: string;
  model: string;
  license_plate: string;
  photo_url?: string;
  created_at: string;
}

export interface Client {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  phone_normalized?: string | null;
  email?: string;
  is_loyal: boolean;
  is_vip?: boolean;
  is_blacklisted?: boolean;
  loyalty_status?: string;
  loyalty_points?: number;
  opt_in_sms?: boolean;
  opt_in_email?: boolean;
  company_flag?: boolean;
  billing_mode?: string;
  notes?: string;
  tags?: string[];
  favorite_addresses: Record<string, string | null>;
  communication_prefs?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Reservation {
  id: string;
  user_id: string;
  client_id?: string;
  pickup_address: string;
  dropoff_address: string;
  pickup_date: string;
  pickup_time: string;
  passengers: number;
  luggage: number;
  child_seat: boolean;
  booster_seat: boolean;
  notes?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  estimated_price?: number;
  actual_price?: number;
  sms_sent: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  reservation_id?: string;
  amount: number;
  category: string;
  subcategory?: string;
  payment_method: string;
  notes?: string;
  transaction_date: string;
  created_at: string;
}

export interface Settings {
  id: string;
  user_id: string;
  price_per_km: number;
  minimum_fare: number;
  fixed_rates: any;
  dark_mode: boolean;
  language: string;
  notifications_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfessionModule {
  id: string;
  name: string;
  display_name: string;
  is_active: boolean;
  config: any;
  created_at: string;
}
