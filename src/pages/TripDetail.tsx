import { useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { SFTrashFill } from '../components/SFSymbols';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ConfirmModal } from '../components/ConfirmModal';
import { RefreshBanner } from '../components/RefreshBanner';
import { useTripVersionPoll } from '../hooks/useTripVersionPoll';
import { supabase, type Trip, type TripItem } from '../lib/supabase';

export function TripDetail({ embedded }: { embedded?: boolean } = {}) {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [trip, setTrip] = useState<Trip | null>(null);
  const [items, setItems] = useState<TripItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [draft, setDraft] = useState({
    country: '',
    name: '',
    link: '',
    notes: '',
    image_url: '',
  });
  const [pendingDeleteItemId, setPendingDeleteItemId] = useState<string | null>(null);
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

      // Fetch trip items
      const { data: itemsData, error: itemsError } = await supabase
        .from('trip_items')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false });

      if (itemsError) throw itemsError;
      setItems(itemsData || []);

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

  const handleRefresh = useCallback(() => {
    if (id) {
      void fetchTripData(id);
      acknowledge();
    }
  }, [id, fetchTripData, acknowledge]);

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !trip) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('trip_items')
        .insert([{
          trip_id: id,
          user_id: user.id,
          country: draft.country,
          name: draft.name,
          link: draft.link || null,
          notes: draft.notes || null,
          image_url: draft.image_url || null,
        }])
        .select()
        .single();

      if (error) throw error;
      if (data) setItems([data, ...items]);
      
      setDraft({ country: '', name: '', link: '', notes: '', image_url: '' });
      setIsFormOpen(false);
    } catch (error) {
      console.error('Error adding item:', error);
      setErrorMsg('Failed to add item. You might only have viewer access.');
    }
  };

  const onDelete = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('trip_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      setItems(items.filter(i => i.id !== itemId));
    } catch (error) {
      console.error('Error deleting item:', error);
      setErrorMsg('Failed to delete item. You might only have viewer access.');
    }
  };

  const grouped = useMemo(() => {
    const map = new Map<string, TripItem[]>();
    for (const item of items) {
      const list = map.get(item.country) ?? [];
      list.push(item);
      map.set(item.country, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

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
            <Button onClick={() => setIsFormOpen(!isFormOpen)}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              {t('tripPlanner.addPOI')}
            </Button>
          </div>
        )}
        {embedded && (
          <Button onClick={() => setIsFormOpen(!isFormOpen)}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            {t('tripPlanner.addPOI')}
          </Button>
        )}
      </div>

      {isFormOpen && (
        <form onSubmit={onAdd} className="mb-8 rounded-xl p-5 shadow-sm" style={{ background: 'var(--card-surface)', border: '1px solid var(--border-color)' }}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">{t('tripPlanner.country')}</label>
              <Input required value={draft.country} onChange={e => setDraft({...draft, country: e.target.value})} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t('tripPlanner.name')}</label>
              <Input required value={draft.name} onChange={e => setDraft({...draft, name: e.target.value})} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t('tripPlanner.link')}</label>
              <Input type="url" value={draft.link} onChange={e => setDraft({...draft, link: e.target.value})} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t('tripPlanner.image')}</label>
              <Input type="url" value={draft.image_url} onChange={e => setDraft({...draft, image_url: e.target.value})} />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium">{t('tripPlanner.notes')}</label>
              <textarea 
                className="w-full rounded-lg border p-2 text-sm"
                rows={3}
                value={draft.notes}
                onChange={e => setDraft({...draft, notes: e.target.value})}
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button type="submit">{t('tripPlanner.save')}</Button>
            <Button type="button" variant="secondary" onClick={() => setIsFormOpen(false)}>{t('tripPlanner.cancel')}</Button>
          </div>
        </form>
      )}

      <div className="space-y-6">
        {grouped.map(([country, items]) => (
          <section key={country}>
            <h2 className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>{country}</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {items.map(item => (
                <article key={item.id} className="rounded-xl p-4 shadow-sm" style={{ background: 'var(--card-surface)', border: '1px solid var(--border-color)' }}>
                  {item.image_url && (
                    <img src={item.image_url} alt={item.name} className="mb-3 h-40 w-full rounded-lg object-cover" />
                  )}
                  <div className="mb-2 flex justify-between">
                    <h3 className="font-semibold">{item.name}</h3>
                    <Button variant="danger" size="sm" onClick={() => setPendingDeleteItemId(item.id)}>
                      <SFTrashFill size={16} />
                    </Button>
                  </div>
                  {item.link && (
                    <a href={item.link} target="_blank" className="text-sm hover:underline" style={{ color: 'var(--accent)' }}>Link</a>
                  )}
                  {item.notes && <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>{item.notes}</p>}
                </article>
              ))}
            </div>
          </section>
        ))}
        {items.length === 0 && (
          <div className="rounded-xl border border-dashed p-12 text-center" style={{ color: 'var(--text-muted)', borderColor: 'var(--border-color)' }}>
            No places added yet.
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!pendingDeleteItemId}
        title="Delete item?"
        message="Are you sure you want to delete this item?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => {
          if (pendingDeleteItemId) void onDelete(pendingDeleteItemId);
          setPendingDeleteItemId(null);
        }}
        onCancel={() => setPendingDeleteItemId(null)}
      />

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
