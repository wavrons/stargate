import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

type PortalRow = {
  token: string;
  published: boolean;
  show_receipts?: boolean;
  created_at: string;
};

type SnapshotPayload = {
  cover_image_url?: string;
  trip_meta?: string;
  logistics?: Array<{ label: string; value: string }>;
  days?: Array<{
    label: string;
    entries: Array<{ id: string; title: string; url?: string; description?: string; thumbnail_url?: string }>;
  }>;
  receipts?: Array<{ id: string; title: string; url: string; kind: string }>;
};

function getGoogleMapsSearchUrl(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function Portal() {
  const { token } = useParams<{ token: string }>();
  const [portal, setPortal] = useState<PortalRow | null>(null);
  const [tripTitle, setTripTitle] = useState<string>('');
  const [payload, setPayload] = useState<SnapshotPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      if (!token) return;
      setLoading(true);
      setError('');

      const { data: portalData, error: portalErr } = await supabase
        .from('trip_portals')
        .select('token, published, show_receipts, created_at')
        .eq('token', token)
        .maybeSingle();

      if (portalErr || !portalData || !portalData.published) {
        setPortal(null);
        setPayload(null);
        setTripTitle('');
        setLoading(false);
        setError('This link is invalid or unpublished.');
        return;
      }

      setPortal(portalData as PortalRow);

      const { data: snapData } = await supabase
        .from('trip_portal_snapshots')
        .select('trip_title, payload')
        .eq('token', token)
        .maybeSingle();

      setTripTitle((snapData as any)?.trip_title ?? 'Trip');
      setPayload(((snapData as any)?.payload as SnapshotPayload) ?? null);
      setLoading(false);
    })();
  }, [token]);

  if (loading) return null;

  return (
    <div className="public-portal" data-theme="tokyo">
      <header
        className="hero"
        style={payload?.cover_image_url ? { backgroundImage: `linear-gradient(transparent, var(--bg-surface)), url('${payload.cover_image_url}')` } : undefined}
      >
        <div className="hero-overlay">
          <h1 className="trip-title">{tripTitle}</h1>
          {payload?.trip_meta && <p className="trip-meta">{payload.trip_meta}</p>}
        </div>
      </header>

      {payload?.logistics?.length ? (
        <section className="logistics-bar">
          {payload.logistics.map((item) => (
            <div key={item.label} className="log-item">
              <span>{item.label}</span> {item.value}
            </div>
          ))}
        </section>
      ) : null}

      <main className="itinerary-feed">

        {error ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm" style={{ background: 'var(--card-surface)', color: 'var(--text-muted)', borderColor: 'var(--border-color)' }}>
            {error}
          </div>
        ) : !payload?.days?.length ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm" style={{ background: 'var(--card-surface)', color: 'var(--text-muted)', borderColor: 'var(--border-color)' }}>
            No stops yet.
          </div>
        ) : (
          <>
            {payload.days.map((day) => (
              <article key={day.label} className="day-block">
                <h2 className="day-label">{day.label}</h2>

                {day.entries.map((e) => (
                  <div key={e.id} className="poi-card">
                    {e.thumbnail_url ? (
                      <img src={e.thumbnail_url} alt={e.title} className="poi-img" />
                    ) : null}
                    <div className="poi-content">
                      <h3 style={{ color: 'var(--text-main)' }}>{e.title}</h3>
                      {e.description ? (
                        <p style={{ color: 'var(--text-muted)' }}>{e.description}</p>
                      ) : null}
                      <div className="poi-links">
                        <a className="map-link" href={getGoogleMapsSearchUrl(e.title)} target="_blank">
                          Open in Google Maps
                        </a>
                        {e.url ? (
                          <a className="map-link" href={e.url} target="_blank">
                            Link
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </article>
            ))}

            {portal?.show_receipts && payload?.receipts?.length ? (
              <section style={{ padding: '0 2rem 2rem' }}>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  Receipts
                </div>
                <div className="space-y-2">
                  {payload.receipts.map((r) => (
                    <div key={r.id} className="rounded-xl p-4 shadow-sm" style={{ background: 'var(--card-surface)', border: '1px solid var(--border-color)' }}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>{r.title || r.kind}</div>
                          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{r.kind}</div>
                        </div>
                        <a href={r.url} target="_blank" className="text-sm hover:underline" style={{ color: 'var(--accent)' }}>
                          View
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </main>

      {portal && (
        <div className="mt-6 text-xs" style={{ color: 'var(--text-muted)', padding: '0 2rem 2rem' }}>
          Link id: {portal.token}
        </div>
      )}
    </div>
  );
}
