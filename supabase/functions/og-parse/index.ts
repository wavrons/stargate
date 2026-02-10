// Supabase Edge Function: og-parse
// Fetches OpenGraph metadata from a given URL
// Deploy with: supabase functions deploy og-parse

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface OGResult {
  title: string;
  description: string;
  image: string;
  site_name: string;
  type: string;
  url: string;
}

function extractMeta(html: string, property: string): string {
  // Match both property="og:..." and name="og:..."
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${property}["']`, 'i'),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1].trim();
  }
  return '';
}

function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return m?.[1]?.trim() ?? '';
}

// Detect YouTube / Instagram / other video platforms and extract embed info
function detectVideoEmbed(url: string): { type: 'video' | 'link'; embedUrl?: string } {
  try {
    const u = new URL(url);

    // YouTube
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
      let videoId = '';
      if (u.hostname.includes('youtu.be')) {
        videoId = u.pathname.slice(1);
      } else {
        videoId = u.searchParams.get('v') ?? '';
      }
      if (videoId) {
        return { type: 'video', embedUrl: `https://www.youtube.com/embed/${videoId}` };
      }
    }

    // Instagram reels/posts
    if (u.hostname.includes('instagram.com') && (u.pathname.includes('/reel/') || u.pathname.includes('/p/'))) {
      return { type: 'video', embedUrl: `${u.origin}${u.pathname}embed/` };
    }

    // TikTok
    if (u.hostname.includes('tiktok.com') && u.pathname.includes('/video/')) {
      return { type: 'video' };
    }
  } catch {
    // invalid URL
  }
  return { type: 'link' };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing url' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Fetch the page (timeout 8s, only read first 100KB for speed)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; StargateBot/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });
    clearTimeout(timeout);

    // Read only the first ~100KB
    const reader = resp.body?.getReader();
    let html = '';
    const decoder = new TextDecoder();
    const MAX_BYTES = 100_000;
    let bytesRead = 0;

    if (reader) {
      while (bytesRead < MAX_BYTES) {
        const { done, value } = await reader.read();
        if (done) break;
        html += decoder.decode(value, { stream: true });
        bytesRead += value.length;
      }
      reader.cancel();
    }

    const og: OGResult = {
      title: extractMeta(html, 'og:title') || extractTitle(html),
      description: extractMeta(html, 'og:description') || extractMeta(html, 'description'),
      image: extractMeta(html, 'og:image'),
      site_name: extractMeta(html, 'og:site_name'),
      type: extractMeta(html, 'og:type'),
      url: extractMeta(html, 'og:url') || url,
    };

    const video = detectVideoEmbed(url);

    return new Response(
      JSON.stringify({ ...og, content_type: video.type, embed_url: video.embedUrl ?? null }),
      {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
