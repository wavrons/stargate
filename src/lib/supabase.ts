import { createClient } from '@supabase/supabase-js';

// These environment variables will be needed
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      persistSession: true,
      storageKey: 'stargate-auth',
      storage: localStorage,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: {},
      fetch: async (url: RequestInfo | URL, init?: RequestInit) => {
        // Workaround: supabase-js may not attach the session JWT to REST requests.
        // Read token from localStorage directly to avoid recursion (getSession triggers fetch).
        const urlStr = typeof url === 'string' ? url : url.toString();
        // Skip auth endpoints to avoid infinite loop
        if (urlStr.includes('/auth/')) {
          return fetch(url, init);
        }
        try {
          const raw = localStorage.getItem('stargate-auth');
          if (raw) {
            const parsed = JSON.parse(raw);
            const accessToken = parsed?.access_token;
            if (accessToken) {
              const headers = new Headers(init?.headers);
              headers.set('Authorization', `Bearer ${accessToken}`);
              return fetch(url, { ...init, headers });
            }
          }
        } catch {
          // ignore parse errors
        }
        return fetch(url, init);
      },
    },
  }
);

export type Trip = {
  id: string;
  user_id: string;
  title: string;
  start_date?: string;
  end_date?: string;
  version: number;
  storage_used_bytes: number;
  created_at: string;
  updated_at: string;
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

export type ColorTag = 'red' | 'orange' | 'green' | 'blue' | 'purple' | null;

export const COLOR_TAG_OPTIONS: { value: ColorTag; hex: string; label: string }[] = [
  { value: 'red',    hex: '#ef4444', label: 'Red' },
  { value: 'orange', hex: '#f97316', label: 'Orange' },
  { value: 'green',  hex: '#22c55e', label: 'Green' },
  { value: 'blue',   hex: '#3b82f6', label: 'Blue' },
  { value: 'purple', hex: '#a855f7', label: 'Purple' },
];

export type BoardItem = {
  id: string;
  trip_id: string;
  user_id: string;
  type: 'link' | 'image' | 'video' | 'note';
  title: string;
  description?: string;
  url?: string;
  thumbnail_url?: string;
  file_path?: string;
  file_size_bytes?: number;
  color_tag: ColorTag;
  source_meta?: Record<string, unknown>;
  sort_order: number;
  group_label?: string;
  created_at: string;
};

export type TripMember = {
  id: string;
  trip_id: string;
  user_email: string;
  role: 'viewer' | 'editor';
};
