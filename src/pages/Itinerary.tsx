import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { supabase, type BoardItem, type ItineraryEntry, type Trip, type TripAttachment } from '../lib/supabase';

type PortalRow = {
  token: string;
  trip_id: string;
  published: boolean;
  show_receipts?: boolean;
  created_at: string;
};

type SnapshotPayload = {
  cover_image_url?: string;
  trip_meta?: string;
  logistics?: Array<{ label: string; value: string }>;
  days: Array<{
    label: string;
    entries: Array<{ id: string; title: string; url?: string; description?: string; thumbnail_url?: string }>;
  }>;
  receipts: Array<{ id: string; title: string; url: string; kind: string }>;
};

function makeToken(len = 12) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < bytes.length; i += 1) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

function getGoogleMapsSearchUrl(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function Itinerary({ embedded }: { embedded?: boolean } = {}) {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [boardItems, setBoardItems] = useState<BoardItem[]>([]);
  const [entries, setEntries] = useState<ItineraryEntry[]>([]);
  const [attachments, setAttachments] = useState<TripAttachment[]>([]);
  const [portal, setPortal] = useState<PortalRow | null>(null);
  const [showReceipts, setShowReceipts] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [flexDays, setFlexDays] = useState(7);

  const portalUrl = useMemo(() => {
    if (!portal?.token) return '';
    const base = import.meta.env.BASE_URL || '/';
    return `${window.location.origin}${base}#/v/${portal.token}`;
  }, [portal?.token]);

  const isFixedDates = !!trip?.start_date && !!trip?.end_date;

  const dayCount = useMemo(() => {
    if (!trip) return 0;
    if (trip.start_date && trip.end_date) {
      const start = new Date(trip.start_date);
      const end = new Date(trip.end_date);
      const ms = end.getTime() - start.getTime();
      const days = Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
      return Math.max(1, days);
    }
    return Math.max(1, flexDays || 7);
  }, [trip, flexDays]);

  const dayLabels = useMemo(() => {
    if (!trip) return [] as string[];
    if (trip.start_date && trip.end_date) {
      const start = new Date(trip.start_date);
      const labels: string[] = [];
      for (let i = 0; i < dayCount; i += 1) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        labels.push(d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }));
      }
      return labels;
    }
    return Array.from({ length: dayCount }, (_, i) => `Day ${i + 1}`);
  }, [trip, dayCount]);

  const boardById = useMemo(() => {
    const m = new Map<string, BoardItem>();
    for (const b of boardItems) m.set(b.id, b);
    return m;
  }, [boardItems]);

  const scheduledIds = useMemo(() => new Set(entries.map((e) => e.board_item_id)), [entries]);

  const unscheduled = useMemo(() => boardItems.filter((b) => !scheduledIds.has(b.id)), [boardItems, scheduledIds]);

  const entriesByDay = useMemo(() => {
    const m = new Map<number, ItineraryEntry[]>();
    for (const e of entries) {
      const list = m.get(e.day_index) ?? [];
      list.push(e);
      m.set(e.day_index, list);
    }
    for (const [k, list] of m.entries()) {
      list.sort((a, b) => a.sort_order - b.sort_order);
      m.set(k, list);
    }
    return m;
  }, [entries]);

  const buildSnapshotPayload = (): SnapshotPayload => {
    const days = dayLabels.map((label, idx) => {
      const dayIndex = idx + 1;
      const list = entriesByDay.get(dayIndex) ?? [];
      const mapped = list
        .map((e) => {
          const b = boardById.get(e.board_item_id);
          if (!b) return null;
          return {
            id: b.id,
            title: b.title || '(untitled)',
            url: b.url,
            description: b.description,
            thumbnail_url: b.thumbnail_url,
          };
        })
        .filter(Boolean) as Array<{ id: string; title: string; url?: string; description?: string; thumbnail_url?: string }>;
      return { label, entries: mapped };
    });

    const receipts = attachments.map((a) => ({
      id: a.id,
      title: a.title,
      url: a.url,
      kind: a.kind,
    }));

    const scheduledCount = entries.length;
    const tripMeta = `${dayLabels.length} Days • ${scheduledCount} Places`;

    const logistics: Array<{ label: string; value: string }> = [];
    if (trip?.flight_number) logistics.push({ label: 'Flight', value: trip.flight_number });
    if (trip?.stay_name) logistics.push({ label: 'Stay', value: trip.stay_name });

    return {
      cover_image_url: trip?.cover_image_url ?? undefined,
      trip_meta: tripMeta,
      logistics,
      days,
      receipts,
    };
  };

  const upsertSnapshot = async (token: string, tripTitle: string) => {
    const payload = buildSnapshotPayload();
    await supabase
      .from('trip_portal_snapshots')
      .upsert({ token, trip_title: tripTitle, payload }, { onConflict: 'token' });
  };

  const refreshEntries = async () => {
    if (!id) return;
    const { data } = await supabase.from('itinerary_entries').select('*').eq('trip_id', id);
    setEntries((data as ItineraryEntry[]) ?? []);
  };

  const normalizeDaySort = async (dayIndex: number, orderedEntryIds: string[]) => {
    await Promise.all(
      orderedEntryIds.map((entryId, idx) =>
        supabase
          .from('itinerary_entries')
          .update({ sort_order: idx * 10, day_index: dayIndex })
          .eq('id', entryId)
      )
    );
  };

  const ensureEntryForBoardItem = async (tripId: string, boardItemId: string, dayIndex: number) => {
    const existing = entries.find((e) => e.board_item_id === boardItemId);
    if (existing) return existing;

    const { data } = await supabase
      .from('itinerary_entries')
      .insert({ trip_id: tripId, board_item_id: boardItemId, day_index: dayIndex, sort_order: 0 })
      .select('*')
      .single();

    return (data as ItineraryEntry) ?? null;
  };

  const handlePublishToggle = async () => {
    if (!id) return;
    setPublishing(true);
    try {
      if (!portal) {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        if (!userId) throw new Error('You must be logged in to publish.');
        const token = makeToken(12);
        const { data, error } = await supabase
          .from('trip_portals')
          .insert({ token, trip_id: id, created_by: userId, published: true, show_receipts: showReceipts })
          .select('token, trip_id, published, created_at')
          .single();
        if (error) throw error;
        setPortal({ ...(data as PortalRow), show_receipts: showReceipts });
        if (trip?.title) await upsertSnapshot(token, trip.title);
      } else {
        const next = !portal.published;
        const { data, error } = await supabase
          .from('trip_portals')
          .update({ published: next, show_receipts: showReceipts })
          .eq('token', portal.token)
          .select('token, trip_id, published, created_at')
          .single();
        if (error) throw error;
        setPortal({ ...(data as PortalRow), show_receipts: showReceipts });
        if (trip?.title && next) await upsertSnapshot(portal.token, trip.title);
      }
    } finally {
      setPublishing(false);
    }
  };

  const handleUpdateReceiptsVisibility = async (next: boolean) => {
    setShowReceipts(next);
    if (!portal?.token) return;
    await supabase.from('trip_portals').update({ show_receipts: next }).eq('token', portal.token);
    if (trip?.title) await upsertSnapshot(portal.token, trip.title);
  };

  const handleChangeFlexDays = async (next: number) => {
    if (!id || !trip) return;
    const clamped = Math.max(1, Math.min(60, next));
    setFlexDays(clamped);
    await supabase.from('trips').update({ flex_day_count: clamped }).eq('id', id);
    if (clamped < dayCount) {
      await supabase.from('itinerary_entries').delete().eq('trip_id', id).gt('day_index', clamped);
      await refreshEntries();
    }
    if (portal?.published && portal.token && trip.title) await upsertSnapshot(portal.token, trip.title);
  };

  const onDragStart = (boardItemId: string, fromDay?: number) => (evt: React.DragEvent) => {
    evt.dataTransfer.setData('text/board_item_id', boardItemId);
    evt.dataTransfer.setData('text/from_day', fromDay ? String(fromDay) : '');
    evt.dataTransfer.effectAllowed = 'move';
  };

  const onDropToDay = (dayIndex: number) => async (evt: React.DragEvent) => {
    evt.preventDefault();
    if (!id) return;
    const boardItemId = evt.dataTransfer.getData('text/board_item_id');
    if (!boardItemId) return;
    const targetList = entriesByDay.get(dayIndex) ?? [];
    const nextSort = targetList.length ? Math.max(...targetList.map((e) => e.sort_order)) + 10 : 0;

    const existing = entries.find((e) => e.board_item_id === boardItemId);
    if (!existing) {
      await supabase
        .from('itinerary_entries')
        .insert({ trip_id: id, board_item_id: boardItemId, day_index: dayIndex, sort_order: nextSort });
    } else {
      await supabase
        .from('itinerary_entries')
        .update({ day_index: dayIndex, sort_order: nextSort })
        .eq('id', existing.id);
    }

    await refreshEntries();
    if (portal?.published && portal.token && trip?.title) await upsertSnapshot(portal.token, trip.title);
  };

  const onDropAtIndex = (dayIndex: number, insertIndex: number) => async (evt: React.DragEvent) => {
    evt.preventDefault();
    if (!id) return;
    const boardItemId = evt.dataTransfer.getData('text/board_item_id');
    if (!boardItemId) return;

    const movedEntry = await ensureEntryForBoardItem(id, boardItemId, dayIndex);
    if (!movedEntry) return;

    const dayList = (entriesByDay.get(dayIndex) ?? []).slice().sort((a, b) => a.sort_order - b.sort_order);
    const filtered = dayList.filter((e) => e.id !== movedEntry.id);
    const clampedIndex = Math.max(0, Math.min(filtered.length, insertIndex));
    const nextIds = filtered.slice(0, clampedIndex).map((e) => e.id).concat([movedEntry.id]).concat(filtered.slice(clampedIndex).map((e) => e.id));

    await supabase.from('itinerary_entries').update({ day_index: dayIndex }).eq('id', movedEntry.id);
    await normalizeDaySort(dayIndex, nextIds);
    await refreshEntries();

    if (portal?.published && portal.token && trip?.title) await upsertSnapshot(portal.token, trip.title);
  };

  const removeFromDay = async (entryId: string) => {
    if (!id) return;
    await supabase.from('itinerary_entries').delete().eq('id', entryId).eq('trip_id', id);
    await refreshEntries();
    if (portal?.published && portal.token && trip?.title) await upsertSnapshot(portal.token, trip.title);
  };

  const onDragOver = (evt: React.DragEvent) => {
    evt.preventDefault();
    evt.dataTransfer.dropEffect = 'move';
  };

  const handleCopyPortalUrl = async () => {
    if (!portalUrl) return;
    try {
      await navigator.clipboard.writeText(portalUrl);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    (async () => {
      if (!id) {
        setBoardItems([]);
        setEntries([]);
        setAttachments([]);
        setTrip(null);
        setPortal(null);
        setLoading(false);
        return;
      }

      const [{ data: tripData }, { data: bItems }, { data: entryData }, { data: portalData }, { data: attData }] = await Promise.all([
        supabase.from('trips').select('*').eq('id', id).maybeSingle(),
        supabase.from('board_items').select('*').eq('trip_id', id).order('created_at', { ascending: false }),
        supabase.from('itinerary_entries').select('*').eq('trip_id', id),
        supabase.from('trip_portals').select('token, trip_id, published, show_receipts, created_at').eq('trip_id', id).order('created_at', { ascending: false }).limit(1),
        supabase.from('trip_attachments').select('*').eq('trip_id', id).order('created_at', { ascending: false }),
      ]);

      setTrip((tripData as Trip) ?? null);
      setBoardItems((bItems as BoardItem[]) ?? []);
      setEntries((entryData as ItineraryEntry[]) ?? []);
      setAttachments((attData as TripAttachment[]) ?? []);

      const flex = (tripData as any)?.flex_day_count;
      if (typeof flex === 'number') setFlexDays(flex);

      const latestPortal = Array.isArray(portalData) && portalData.length ? portalData[0] : null;
      setPortal((latestPortal as PortalRow) ?? null);
      setShowReceipts(!!(latestPortal as any)?.show_receipts);
      setLoading(false);
    })();
  }, [id]);


  if (loading) return null;

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          {!embedded && (
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>
              {t('itinerary.title')}
            </h1>
          )}
          {trip?.title && (
            <div className={embedded ? 'text-sm font-semibold' : 'mt-1 text-sm'} style={{ color: embedded ? 'var(--text-main)' : 'var(--text-muted)' }}>
              {trip.title}
            </div>
          )}
          {!isFixedDates && (
            <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              <span>Days</span>
              <Button variant="secondary" size="sm" onClick={() => void handleChangeFlexDays(flexDays - 1)}>
                -
              </Button>
              <span style={{ minWidth: 24, textAlign: 'center' }}>{flexDays}</span>
              <Button variant="secondary" size="sm" onClick={() => void handleChangeFlexDays(flexDays + 1)}>
                +
              </Button>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button variant="secondary" size="sm" disabled={publishing} onClick={() => void handlePublishToggle()}>
            {portal?.published ? 'Unpublish' : 'Publish'}
          </Button>
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span>Show receipts</span>
            <input
              type="checkbox"
              checked={showReceipts}
              onChange={(e) => void handleUpdateReceiptsVisibility(e.target.checked)}
            />
          </div>
          {portal?.published && portalUrl && (
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => void handleCopyPortalUrl()}>
                Copy Link
              </Button>
              <Button variant="secondary" size="sm" onClick={() => window.open(portalUrl, '_blank')}>
                Open
              </Button>
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 1fr) minmax(360px, 1.2fr)',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <div className="rounded-2xl p-4" style={{ background: 'var(--card-surface)', border: '1px solid var(--border-color)' }}>
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Sandbox (Board)
          </div>
          {unscheduled.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm" style={{ background: 'transparent', color: 'var(--text-muted)', borderColor: 'var(--border-color)' }}>
              No unscheduled items.
            </div>
          ) : (
            <div className="space-y-2">
              {unscheduled.map((b) => (
                <div
                  key={b.id}
                  className="rounded-xl p-3"
                  style={{ border: '1px solid var(--border-color)', cursor: 'grab' }}
                  draggable
                  onDragStart={onDragStart(b.id)}
                >
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
                    {b.title || '(untitled)'}
                  </div>
                  {b.url && (
                    <a href={b.url} target="_blank" className="text-xs hover:underline" style={{ color: 'var(--accent)' }}>
                      {b.url}
                    </a>
                  )}
                  {b.description && (
                    <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {b.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl p-4" style={{ background: 'var(--card-surface)', border: '1px solid var(--border-color)' }}>
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Timeline
          </div>
          <div className="space-y-3">
            {dayLabels.map((label, idx) => {
              const dayIndex = idx + 1;
              const list = entriesByDay.get(dayIndex) ?? [];
              return (
                <section
                  key={label}
                  className="rounded-xl p-3"
                  style={{ border: '1px dashed var(--border-color)' }}
                  onDragOver={onDragOver}
                  onDrop={(e) => void onDropToDay(dayIndex)(e)}
                >
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    {label}
                  </div>
                  {list.length === 0 ? (
                    <div className="rounded-lg p-3 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                      Drop items here
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div
                        className="rounded-lg"
                        style={{ height: 10, borderRadius: 8, border: '1px dashed transparent' }}
                        onDragOver={onDragOver}
                        onDrop={(e) => void onDropAtIndex(dayIndex, 0)(e)}
                      />

                      {list.map((entry, entryIdx) => {
                        const b = boardById.get(entry.board_item_id);
                        if (!b) return null;
                        return (
                          <div key={entry.id}>
                            <div
                              className="rounded-xl p-3"
                              style={{ border: '1px solid var(--border-color)', cursor: 'grab' }}
                              draggable
                              onDragStart={onDragStart(b.id, dayIndex)}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
                                    {b.title || '(untitled)'}
                                  </div>
                                  {b.description && (
                                    <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                                      {b.description}
                                    </div>
                                  )}
                                </div>
                                <Button variant="secondary" size="sm" onClick={() => void removeFromDay(entry.id)}>
                                  Remove
                                </Button>
                              </div>

                              <div className="mt-2 flex items-center justify-between gap-2">
                                {b.url ? (
                                  <a href={b.url} target="_blank" className="text-xs hover:underline" style={{ color: 'var(--accent)' }}>
                                    Link
                                  </a>
                                ) : (
                                  <span />
                                )}
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => window.open(getGoogleMapsSearchUrl(b.title), '_blank')}
                                >
                                  Open in Google Maps
                                </Button>
                              </div>
                            </div>

                            <div
                              className="rounded-lg"
                              style={{ height: 10, borderRadius: 8, border: '1px dashed transparent' }}
                              onDragOver={onDragOver}
                              onDrop={(e) => void onDropAtIndex(dayIndex, entryIdx + 1)(e)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}
