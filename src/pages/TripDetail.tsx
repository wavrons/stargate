import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { supabase, type Trip, type TripItem } from '../lib/supabase';

export function TripDetail() {
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

  useEffect(() => {
    if (id) fetchTripData(id);
  }, [id]);

  const fetchTripData = async (tripId: string) => {
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
      navigate('/'); // Redirect if not found/access denied
    } finally {
      setLoading(false);
    }
  };

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
      alert('Failed to add item. You might only have viewer access.');
    }
  };

  const onDelete = async (itemId: string) => {
    if (!confirm('Delete this item?')) return;
    try {
      const { error } = await supabase
        .from('trip_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      setItems(items.filter(i => i.id !== itemId));
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item. You might only have viewer access.');
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

  if (loading) return <div className="p-6">Loading...</div>;
  if (!trip) return <div className="p-6">Trip not found</div>;

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6">
        <Button variant="secondary" size="sm" onClick={() => navigate('/')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">{trip.title}</h1>
          <Button onClick={() => setIsFormOpen(!isFormOpen)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('tripPlanner.addPOI')}
          </Button>
        </div>
      </div>

      {isFormOpen && (
        <form onSubmit={onAdd} className="mb-8 rounded-xl border bg-white p-5 shadow-sm">
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
            <h2 className="mb-3 text-sm font-semibold text-gray-700">{country}</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {items.map(item => (
                <article key={item.id} className="rounded-xl border bg-white p-4 shadow-sm">
                  {item.image_url && (
                    <img src={item.image_url} alt={item.name} className="mb-3 h-40 w-full rounded-lg object-cover" />
                  )}
                  <div className="mb-2 flex justify-between">
                    <h3 className="font-semibold">{item.name}</h3>
                    <Button variant="danger" size="sm" onClick={() => onDelete(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {item.link && (
                    <a href={item.link} target="_blank" className="text-sm text-blue-600 hover:underline">Link</a>
                  )}
                  {item.notes && <p className="mt-1 text-sm text-gray-600">{item.notes}</p>}
                </article>
              ))}
            </div>
          </section>
        ))}
        {items.length === 0 && (
          <div className="rounded-xl border border-dashed p-12 text-center text-gray-500">
            No places added yet.
          </div>
        )}
      </div>
    </div>
  );
}
