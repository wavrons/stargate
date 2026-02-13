import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { supabase, type Trip } from '../lib/supabase';
import { Button } from '../components/Button';

export function TripLayout() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
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
  const isItinerary = location.pathname.endsWith('/itinerary');
  const detailsActive = !isBoard && !isItinerary;

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="account-layout">
        <aside className="account-sidebar">
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
            <Link
              to={id ? `/trip/${id}/itinerary` : '#'}
              className={`account-tab ${isItinerary ? 'account-tab--active' : ''}`}
            >
              <span>Itinerary</span>
            </Link>
          </div>
        </aside>

        <div className={`account-content ${isBoard ? 'trip-content--board' : ''}`}>
          <div style={{ marginBottom: 16 }}>
            <Button variant="secondary" size="sm" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
