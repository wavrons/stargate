import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Plus, Share2, Trash2 } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { supabase, type Trip } from '../lib/supabase';
import { ShareModal } from '../components/ShareModal';

export function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newTripTitle, setNewTripTitle] = useState('');
  const [shareTripId, setShareTripId] = useState<string | null>(null);

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('trips')
        .insert([{
          user_id: user.id,
          title: newTripTitle.trim(),
        }])
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setTrips([data, ...trips]);
        setNewTripTitle('');
        setIsCreating(false);
      }
    } catch (error) {
      console.error('Error creating trip:', error);
    }
  };

  const handleDeleteTrip = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation
    if (!confirm('Are you sure you want to delete this trip?')) return;

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

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
        <Button onClick={() => setIsCreating(!isCreating)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('dashboard.newTrip')}
        </Button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreateTrip} className="mb-8 rounded-xl border bg-white p-5 shadow-sm">
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
            className="group relative cursor-pointer rounded-xl border bg-white p-6 shadow-sm transition-all hover:shadow-md"
            onClick={() => navigate(`/trip/${trip.id}`)}
          >
            <h3 className="mb-2 text-lg font-semibold text-gray-900">{trip.title}</h3>
            <p className="text-sm text-gray-500">{t('dashboard.created')} {new Date(trip.created_at).toLocaleDateString()}</p>
            
            <div className="absolute right-4 top-4 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={(e) => {
                  e.stopPropagation();
                  setShareTripId(trip.id);
                }}
              >
                <Share2 className="h-4 w-4" />
              </Button>
              <Button 
                variant="danger" 
                size="sm" 
                onClick={(e) => handleDeleteTrip(trip.id, e)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        {trips.length === 0 && !isCreating && (
          <div className="col-span-full rounded-xl border border-dashed p-12 text-center text-gray-500">
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
    </div>
  );
}
