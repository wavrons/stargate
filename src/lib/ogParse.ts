import { supabase } from './supabase';

export interface OGData {
  title: string;
  description: string;
  image: string;
  site_name: string;
  type: string;
  url: string;
  content_type: 'link' | 'video';
  embed_url: string | null;
}

/**
 * Calls the `og-parse` Supabase Edge Function to extract
 * OpenGraph metadata from a URL.
 */
export async function parseUrl(url: string): Promise<OGData> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

  const resp = await fetch(`${supabaseUrl}/functions/v1/og-parse`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token ?? anonKey}`,
      apikey: anonKey,
    },
    body: JSON.stringify({ url }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`OG parse failed: ${body}`);
  }

  return resp.json();
}

/**
 * Detect if a string looks like a URL.
 */
export function looksLikeUrl(text: string): boolean {
  const trimmed = text.trim();
  if (/^https?:\/\//i.test(trimmed)) return true;
  if (/^www\./i.test(trimmed)) return true;
  // Bare domain pattern: something.tld/...
  if (/^[a-z0-9-]+\.[a-z]{2,}/i.test(trimmed)) return true;
  return false;
}

/**
 * Normalize a URL string (add https:// if missing).
 */
export function normalizeUrl(text: string): string {
  const trimmed = text.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
