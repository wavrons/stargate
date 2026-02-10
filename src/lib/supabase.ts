import { createClient } from '@supabase/supabase-js';

// These environment variables will be needed
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);

export type Trip = {
  id: string;
  user_id: string;
  title: string;
  start_date?: string;
  end_date?: string;
  created_at: string;
};

export type TripItem = {
  id: string;
  trip_id: string;
  user_id: string;
  country: string;
  name: string;
  link?: string;
  notes?: string;
  image_url?: string;
  created_at: string;
};

export type TripMember = {
  id: string;
  trip_id: string;
  user_email: string;
  role: 'viewer' | 'editor';
};
