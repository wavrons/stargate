import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase, type TripItem } from '../lib/supabase';

export function Itinerary() {
  const { t } = useTranslation();
  const [items, setItems] = useState<TripItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // For now, fetch ALL items from ALL trips the user has access to
      const { data } = await supabase
        .from('trip_items')
        .select(`
          *,
          trips (
            title
          )
        `)
        .order('created_at', { ascending: false });
      
      setItems(data || []);
      setLoading(false);
    })();
  }, []);

  if (loading) return null;

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-4 text-2xl font-bold text-gray-900">{t('itinerary.title')}</h1>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-white p-8 text-center text-sm text-gray-600">
          {t('itinerary.noPOIs')}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex justify-between gap-3">
                <div>
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-600">
                    {(item as any).trips?.title} • {item.country}
                  </div>
                  <div className="text-base font-semibold text-gray-900">{item.name}</div>
                  {item.notes && <div className="mt-1 text-sm text-gray-700">{item.notes}</div>}
                </div>
                {item.link && (
                  <a href={item.link} target="_blank" className="text-sm text-blue-600 hover:underline">Link</a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
