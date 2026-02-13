import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ConfirmModal } from '../components/ConfirmModal';
import { RefreshBanner } from '../components/RefreshBanner';
import { useTripVersionPoll } from '../hooks/useTripVersionPoll';
import { supabase, type Trip, type TripAttachment } from '../lib/supabase';

export function TripDetail({ embedded }: { embedded?: boolean } = {}) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [trip, setTrip] = useState<Trip | null>(null);
  const [detailsDraft, setDetailsDraft] = useState({
    cover_image_url: '',
    date_mode: 'fixed' as 'fixed' | 'flex',
    start_date: '',
    end_date: '',
    duration_nights: '',
    flight_number: '',
    flight_airline: '',
    flight_status: '',
    stay_name: '',
    stay_address: '',
    stay_checkin_time: '',
    transport_notes: '',
  });
  const [savingDetails, setSavingDetails] = useState(false);
  const [attachments, setAttachments] = useState<TripAttachment[]>([]);
  const [receiptDraft, setReceiptDraft] = useState({ title: '', url: '' });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { stale, acknowledge } = useTripVersionPoll(id);

  const fetchTripData = useCallback(async (tripId: string) => {
    try {
      // Fetch trip details
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single();
      
      if (tripError) throw tripError;
      setTrip(tripData);

      const { data: attData } = await supabase
        .from('trip_attachments')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false });
      setAttachments((attData as TripAttachment[]) ?? []);

    } catch (error) {
      console.error('Error fetching data:', error);
      navigate('/dashboard'); // Redirect if not found/access denied
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (id) fetchTripData(id);
  }, [id, fetchTripData]);

  useEffect(() => {
    if (!trip) return;
    setDetailsDraft({
      cover_image_url: trip.cover_image_url ?? '',
      date_mode: trip.date_mode ?? 'fixed',
      start_date: trip.start_date ?? '',
      end_date: trip.end_date ?? '',
      duration_nights: typeof trip.duration_nights === 'number' ? String(trip.duration_nights) : '',
      flight_number: trip.flight_number ?? '',
      flight_airline: trip.flight_airline ?? '',
      flight_status: trip.flight_status ?? '',
      stay_name: trip.stay_name ?? '',
      stay_address: trip.stay_address ?? '',
      stay_checkin_time: trip.stay_checkin_time ?? '',
      transport_notes: trip.transport_notes ?? '',
    });
  }, [trip]);

  const handleRefresh = useCallback(() => {
    if (id) {
      void fetchTripData(id);
      acknowledge();
    }
  }, [id, fetchTripData, acknowledge]);

  const saveDetails = async () => {
    if (!id) return;
    setSavingDetails(true);
    setErrorMsg(null);

    try {
      const payload: Record<string, any> = {
        cover_image_url: detailsDraft.cover_image_url || null,
        date_mode: detailsDraft.date_mode,
        flight_number: detailsDraft.flight_number || null,
        flight_airline: detailsDraft.flight_airline || null,
        flight_status: detailsDraft.flight_status || null,
        stay_name: detailsDraft.stay_name || null,
        stay_address: detailsDraft.stay_address || null,
        stay_checkin_time: detailsDraft.stay_checkin_time || null,
        transport_notes: detailsDraft.transport_notes || null,
      };

      if (detailsDraft.date_mode === 'fixed') {
        payload.start_date = detailsDraft.start_date || null;
        payload.end_date = detailsDraft.end_date || null;
        payload.duration_nights = null;
      } else {
        payload.start_date = null;
        payload.end_date = null;
        payload.duration_nights = detailsDraft.duration_nights ? Number(detailsDraft.duration_nights) : null;
      }

      const { data, error } = await supabase
        .from('trips')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;
      setTrip((data as Trip) ?? null);
    } catch (e: any) {
      setErrorMsg(e.message ?? 'Failed to save details.');
    } finally {
      setSavingDetails(false);
    }
  };

  const updatePortalReceiptsSnapshot = async (tripId: string, tripTitle: string, nextAttachments: TripAttachment[]) => {
    const { data: portalRows } = await supabase
      .from('trip_portals')
      .select('token, published')
      .eq('trip_id', tripId)
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(1);
    const token = Array.isArray(portalRows) && portalRows.length ? (portalRows[0] as any).token : null;
    if (!token) return;

    const { data: snapData } = await supabase
      .from('trip_portal_snapshots')
      .select('trip_title, payload')
      .eq('token', token)
      .maybeSingle();

    const prevPayload = (snapData as any)?.payload ?? {};
    const receipts = nextAttachments.map((a) => ({ id: a.id, title: a.title, url: a.url, kind: a.kind }));
    const nextPayload = { ...prevPayload, receipts };

    await supabase
      .from('trip_portal_snapshots')
      .upsert({ token, trip_title: (snapData as any)?.trip_title ?? tripTitle, payload: nextPayload }, { onConflict: 'token' });
  };

  const addReceipt = async () => {
    if (!id) return;
    const title = receiptDraft.title.trim();
    const url = receiptDraft.url.trim();
    if (!url) return;

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return;

      const { data, error } = await supabase
        .from('trip_attachments')
        .insert({ trip_id: id, user_id: userId, title: title || 'Receipt', url, kind: 'receipt' })
        .select('*')
        .single();
      if (error) throw error;

      const next = [data as TripAttachment, ...attachments];
      setAttachments(next);
      setReceiptDraft({ title: '', url: '' });
      if (trip?.title) await updatePortalReceiptsSnapshot(id, trip.title, next);
    } catch (e) {
      setErrorMsg('Failed to add receipt. You might only have viewer access.');
    }
  };

  if (loading) return null;
  if (!trip) return <div className="p-6">Trip not found</div>;

  return (
    <div className={embedded ? undefined : 'mx-auto max-w-6xl p-6'}>
      <RefreshBanner visible={stale} onRefresh={handleRefresh} />
      <div className="mb-6" style={embedded ? { display: 'flex', justifyContent: 'flex-end' } : undefined}>
        {!embedded && (
          <Button variant="secondary" size="sm" onClick={() => navigate('/dashboard')} className="mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4"><polyline points="15 18 9 12 15 6"/></svg>
            Back to Dashboard
          </Button>
        )}
        {!embedded && (
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold" style={{ color: 'var(--text-main)' }}>{trip.title}</h1>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="mb-3 font-semibold" style={{ color: 'var(--accent)', fontSize: 18 }}>
            Basic Info
          </h2>
          <div className="rounded-xl p-5" style={{ background: 'var(--card-surface)', border: '1px solid var(--border-color)' }}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">Cover Image URL</label>
                <Input
                  value={detailsDraft.cover_image_url}
                  onChange={(e) => setDetailsDraft({ ...detailsDraft, cover_image_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium">Dates</label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={detailsDraft.date_mode === 'fixed' ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setDetailsDraft({ ...detailsDraft, date_mode: 'fixed' })}
                  >
                    Fixed Dates
                  </Button>
                  <Button
                    type="button"
                    variant={detailsDraft.date_mode === 'flex' ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setDetailsDraft({ ...detailsDraft, date_mode: 'flex' })}
                  >
                    Duration
                  </Button>
                </div>
              </div>

              {detailsDraft.date_mode === 'fixed' ? (
                <>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Start Date</label>
                    <Input
                      type="date"
                      value={detailsDraft.start_date}
                      onChange={(e) => setDetailsDraft({ ...detailsDraft, start_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">End Date</label>
                    <Input
                      type="date"
                      value={detailsDraft.end_date}
                      onChange={(e) => setDetailsDraft({ ...detailsDraft, end_date: e.target.value })}
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="mb-1 block text-sm font-medium">Nights</label>
                  <Input
                    type="number"
                    min={1}
                    value={detailsDraft.duration_nights}
                    onChange={(e) => setDetailsDraft({ ...detailsDraft, duration_nights: e.target.value })}
                    placeholder="7"
                  />
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <Button type="button" onClick={() => void saveDetails()} disabled={savingDetails}>
                {savingDetails ? 'Saving...' : 'Save Details'}
              </Button>
            </div>
          </div>
        </div>

        <div>
          <h2 className="mb-3 font-semibold" style={{ color: 'var(--accent)', fontSize: 18 }}>
            Logistics
          </h2>
          <div className="rounded-xl p-5" style={{ background: 'var(--card-surface)', border: '1px solid var(--border-color)' }}>
            <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl p-4" style={{ background: 'transparent', border: 'none' }}>
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Flight</div>
              <div className="space-y-2">
                <Input
                  value={detailsDraft.flight_number}
                  onChange={(e) => setDetailsDraft({ ...detailsDraft, flight_number: e.target.value })}
                  placeholder="Flight #"
                />
                <Input
                  value={detailsDraft.flight_airline}
                  onChange={(e) => setDetailsDraft({ ...detailsDraft, flight_airline: e.target.value })}
                  placeholder="Airline"
                />
                <Input
                  value={detailsDraft.flight_status}
                  onChange={(e) => setDetailsDraft({ ...detailsDraft, flight_status: e.target.value })}
                  placeholder="Status"
                />
              </div>
            </div>

            <div className="rounded-xl p-4" style={{ background: 'transparent', border: 'none' }}>
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Stay</div>
              <div className="space-y-2">
                <Input
                  value={detailsDraft.stay_name}
                  onChange={(e) => setDetailsDraft({ ...detailsDraft, stay_name: e.target.value })}
                  placeholder="Hotel"
                />
                <Input
                  value={detailsDraft.stay_address}
                  onChange={(e) => setDetailsDraft({ ...detailsDraft, stay_address: e.target.value })}
                  placeholder="Address"
                />
                <Input
                  value={detailsDraft.stay_checkin_time}
                  onChange={(e) => setDetailsDraft({ ...detailsDraft, stay_checkin_time: e.target.value })}
                  placeholder="Check-in time"
                />
              </div>
            </div>

            <div className="rounded-xl p-4" style={{ background: 'transparent', border: 'none' }}>
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Transport</div>
              <textarea
                className="w-full rounded-lg border p-2 text-sm"
                style={{ borderColor: 'var(--border-color)', background: 'var(--input-surface, var(--card-surface))', color: 'var(--text-main)' }}
                rows={6}
                value={detailsDraft.transport_notes}
                onChange={(e) => setDetailsDraft({ ...detailsDraft, transport_notes: e.target.value })}
                placeholder="Train passes, car rental, notes..."
              />
            </div>
          </div>

          <div className="mt-4">
            <Button type="button" variant="secondary" size="sm" onClick={() => void saveDetails()} disabled={savingDetails}>
              {savingDetails ? 'Saving...' : 'Save Logistics'}
            </Button>
          </div>
          </div>
        </div>

        <section>
          <h2 className="mb-3 font-semibold" style={{ color: 'var(--accent)', fontSize: 18 }}>
            Document Vault
          </h2>
          <div className="rounded-xl p-5" style={{ background: 'var(--card-surface)', border: '1px solid var(--border-color)' }}>
            <div className="mb-3 flex gap-2">
              <Input
                value={receiptDraft.title}
                onChange={(e) => setReceiptDraft({ ...receiptDraft, title: e.target.value })}
                placeholder="Title (optional)"
              />
              <Input
                value={receiptDraft.url}
                onChange={(e) => setReceiptDraft({ ...receiptDraft, url: e.target.value })}
                placeholder="Receipt URL"
              />
              <Button type="button" onClick={() => void addReceipt()}>
                Add
              </Button>
            </div>

            {attachments.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm" style={{ color: 'var(--text-muted)', borderColor: 'var(--border-color)' }}>
                No receipts yet.
              </div>
            ) : (
              <div className="space-y-2">
                {attachments.map((a) => (
                  <div key={a.id} className="rounded-xl p-3" style={{ background: 'transparent', border: '1px solid var(--border-color)' }}>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>{a.title}</div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{a.kind}</div>
                      </div>
                      <a href={a.url} target="_blank" className="text-xs hover:underline" style={{ color: 'var(--accent)' }}>
                        View
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <div className="rounded-xl border border-dashed p-12 text-center" style={{ color: 'var(--text-muted)', borderColor: 'var(--border-color)' }}>
          POIs are managed in Board / Itinerary.
        </div>
      </div>

      <ConfirmModal
        open={!!errorMsg}
        title="Error"
        message={errorMsg ?? ''}
        confirmLabel="OK"
        cancelLabel="Close"
        variant="primary"
        onConfirm={() => setErrorMsg(null)}
        onCancel={() => setErrorMsg(null)}
      />
    </div>
  );
}
