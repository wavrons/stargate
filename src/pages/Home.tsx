import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function Home() {
  const navigate = useNavigate();
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  return (
    <div className="home-page">
      <img
        className="home-page__corner-logo"
        src={`${import.meta.env.BASE_URL}${isLocalhost ? 'dev-logo.svg' : 'logo.svg'}`}
        alt="lyra"
      />
      <div className="home-page__content">
        <blockquote className="home-page__quote">
          讓唐僧成為唐僧的，<br />不是經書，而是取經的那條路
        </blockquote>
        <button
          className="home-page__btn"
          onClick={async () => {
            const { data } = await supabase.auth.getSession();
            if (data.session) {
              navigate('/dashboard');
            } else {
              navigate('/auth');
            }
          }}
        >
          Bon Voyage
        </button>
      </div>
    </div>
  );
}
