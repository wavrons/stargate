import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { supabase, type TripItem } from '../lib/supabase';

export function Itinerary({ embedded }: { embedded?: boolean } = {}) {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [items, setItems] = useState<TripItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!id) {
        setItems([]);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('trip_items')
        .select('*')
        .eq('trip_id', id)
        .order('created_at', { ascending: false });
      
      setItems(data || []);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return null;

  return (
    <div className="mx-auto max-w-4xl p-6">
      {!embedded && (
        <h1 className="mb-4 text-2xl font-bold" style={{ color: 'var(--text-main)' }}>{t('itinerary.title')}</h1>
      )}

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm" style={{ background: 'var(--card-surface)', color: 'var(--text-muted)', borderColor: 'var(--border-color)' }}>
          {t('itinerary.noPOIs')}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="rounded-xl p-4 shadow-sm" style={{ background: 'var(--card-surface)', border: '1px solid var(--border-color)' }}>
              <div className="flex justify-between gap-3">
                <div>
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--accent)' }}>{item.country}</div>
                  <div className="text-base font-semibold" style={{ color: 'var(--text-main)' }}>{item.name}</div>
                  {item.notes && <div className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>{item.notes}</div>}
                </div>
                {item.link && (
                  <a href={item.link} target="_blank" className="text-sm hover:underline" style={{ color: 'var(--accent)' }}>Link</a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
