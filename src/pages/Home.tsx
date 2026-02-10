import { useNavigate } from 'react-router-dom';

export function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-page">
      <div className="home-page__content">
        <blockquote className="home-page__quote">
          讓唐僧成為唐僧的，<br />不是經書，而是取經的那條路
        </blockquote>
        <button className="home-page__btn" onClick={() => navigate('/auth')}>
          Bon Voyage
        </button>
      </div>
    </div>
  );
}
