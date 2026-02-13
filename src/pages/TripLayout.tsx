import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useParams } from 'react-router-dom';
import { supabase, type Trip } from '../lib/supabase';

export function TripLayout() {
  const { id } = useParams();
  const location = useLocation();
  const [trip, setTrip] = useState<Trip | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!id) return;
      const { data } = await supabase.from('trips').select('*').eq('id', id).maybeSingle();
      setTrip((data as Trip) ?? null);
    };
    void run();
  }, [id]);

  const isBoard = location.pathname.endsWith('/board');
  const detailsActive = !isBoard;

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="account-layout">
        <aside className="account-sidebar">
          <Link
            to="/dashboard"
            className="account-tab"
            style={{ marginBottom: 8, justifyContent: 'center' }}
          >
            <span>Back to Dashboard</span>
          </Link>
          <h1 className="account-title" style={{ color: 'var(--text-main)' }}>
            {trip?.title ?? 'Trip'}
          </h1>
          <div className="account-tabs">
            <Link
              to={id ? `/trip/${id}/details` : '#'}
              className={`account-tab ${detailsActive ? 'account-tab--active' : ''}`}
            >
              <span>Details</span>
            </Link>
            <Link
              to={id ? `/trip/${id}/board` : '#'}
              className={`account-tab ${isBoard ? 'account-tab--active' : ''}`}
            >
              <span>Board</span>
            </Link>
          </div>
        </aside>

        <div className={`account-content ${isBoard ? 'trip-content--board' : ''}`}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
