import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { SFPersonBadgePlus, SFTrashFill } from '../components/SFSymbols';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { supabase, type Trip } from '../lib/supabase';
import { ShareModal } from '../components/ShareModal';
import { ConfirmModal } from '../components/ConfirmModal';

export function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newTripTitle, setNewTripTitle] = useState('');
  const [shareTripId, setShareTripId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTrips(data || []);
    } catch (error) {
      console.error('Error fetching trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTripTitle.trim()) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setError('Not authenticated — please log in again.');
        return;
      }

      // Use raw fetch — don't request return=representation to avoid SELECT policy check
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const resp = await fetch(`${supabaseUrl}/rest/v1/trips`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${session.access_token}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          user_id: session.user.id,
          title: newTripTitle.trim(),
        }),
      });

      if (!resp.ok) {
        const errBody = await resp.text();
        throw new Error(`${resp.status}: ${errBody}`);
      }

      // Re-fetch trips since we didn't get the inserted row back
      await fetchTrips();
      setNewTripTitle('');
      setIsCreating(false);
    } catch (err: any) {
      const msg = err?.message || err?.details || JSON.stringify(err);
      console.error('Error creating trip:', err);
      setError(`Failed to create trip: ${msg}`);
    }
  };

  const handleDeleteTrip = async (id: string) => {
    try {
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setTrips(trips.filter(t => t.id !== id));
    } catch (error) {
      console.error('Error deleting trip:', error);
    }
  };

  if (loading) return null;

  return (
    <div className="mx-auto max-w-6xl p-6">
      {error && (
        <div className="mb-4 rounded-lg p-3 text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
          {error}
        </div>
      )}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>{t('dashboard.title')}</h1>
        <Button onClick={() => setIsCreating(!isCreating)}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          {t('dashboard.newTrip')}
        </Button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreateTrip} className="mb-8 rounded-xl p-5 shadow-sm" style={{ background: 'var(--card-surface)', border: '1px solid var(--border-color)' }}>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium">{t('dashboard.tripTitle')}</label>
              <Input 
                autoFocus
                required 
                value={newTripTitle} 
                onChange={e => setNewTripTitle(e.target.value)} 
                placeholder={t('dashboard.placeholder')}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit">{t('dashboard.create')}</Button>
              <Button type="button" variant="secondary" onClick={() => setIsCreating(false)}>{t('dashboard.cancel')}</Button>
            </div>
          </div>
        </form>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {trips.map(trip => (
          <div 
            key={trip.id} 
            className="group relative cursor-pointer rounded-xl p-6 shadow-sm transition-all hover:shadow-md"
            style={{ background: 'var(--card-surface)', border: '1px solid var(--border-color)' }}
            onClick={() => navigate(`/trip/${trip.id}`)}
          >
            <h3 className="mb-2 text-lg font-semibold" style={{ color: 'var(--text-main)' }}>{trip.title}</h3>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('dashboard.created')} {new Date(trip.created_at).toLocaleDateString()}</p>
            
            <div className="absolute right-4 top-4 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={(e) => {
                  e.stopPropagation();
                  setShareTripId(trip.id);
                }}
              >
                <SFPersonBadgePlus size={16} />
              </Button>
              <Button 
                variant="danger" 
                size="sm" 
                onClick={(e) => {
                  e.stopPropagation();
                  setPendingDeleteId(trip.id);
                }}
              >
                <SFTrashFill size={16} />
              </Button>
            </div>
          </div>
        ))}

        {trips.length === 0 && !isCreating && (
          <div className="col-span-full rounded-xl border border-dashed p-12 text-center" style={{ color: 'var(--text-muted)', borderColor: 'var(--border-color)' }}>
            {t('dashboard.noTrips')}
          </div>
        )}
      </div>

      {shareTripId && (
        <ShareModal 
          tripId={shareTripId} 
          onClose={() => setShareTripId(null)} 
        />
      )}

      <ConfirmModal
        open={!!pendingDeleteId}
        title="Delete trip?"
        message="Are you sure you want to delete this trip? This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => {
          if (pendingDeleteId) void handleDeleteTrip(pendingDeleteId);
          setPendingDeleteId(null);
        }}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
