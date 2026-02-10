import { useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from './components/Button';
import { supabase } from './lib/supabase';
import { Auth } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { TripDetail } from './pages/TripDetail';
import { Itinerary } from './pages/Itinerary';
import { UpdatePassword } from './pages/UpdatePassword';
import { Waitlist } from './pages/Waitlist';
import { Account } from './pages/Account';
import type { Session } from '@supabase/supabase-js';

const CITY_THEME_LABELS: Record<string, string> = {
  taipei: 'Taipei',
  rio: 'Rio de Janeiro',
  los_angeles: 'Los Angeles',
  amsterdam: 'Amsterdam',
  tokyo: 'Tokyo',
  seoul: 'Seoul',
  santorini: 'Santorini',
  arjeplog: 'Arjeplog',
};

type ThemeTransitionStartDetail = {
  themeKey: string;
  label?: string;
};

function applyCityTheme(themeKey: string) {
  document.documentElement.setAttribute('data-theme', themeKey);
  try {
    localStorage.setItem('city_theme', themeKey);
  } catch {
    // ignore
  }
}

function ThemeBootOverlay({ visible, label }: { visible: boolean; label: string }) {
  return (
    <div
      className={`theme-boot-overlay ${visible ? 'theme-boot-overlay--visible' : 'theme-boot-overlay--hidden'}`}
      aria-hidden={!visible}
    >
      <div className="theme-boot-overlay__content">
        {label ? (
          <>
            <div className="theme-boot-overlay__kicker">Welcome to</div>
            <div className="theme-boot-overlay__title">{label}</div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function AuthedApp({ onLogout }: { onLogout: () => void }) {
  const { t, i18n } = useTranslation();
  const location = useLocation();

  const isDashboard = location.pathname === '/' || location.pathname.startsWith('/trip/');
  const isItinerary = location.pathname.startsWith('/itinerary');
  const isAccountPage = location.pathname.startsWith('/account');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-4">
            <div className="text-base font-semibold text-gray-900">{t('app.title')}</div>
            <nav className="flex items-center gap-2">
              <Link
                to="/"
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  isDashboard ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {t('nav.tripPlanner')}
              </Link>
              <Link
                to="/itinerary"
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  isItinerary ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {t('nav.itinerary')}
              </Link>
              <Link
                to="/account"
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  isAccountPage ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Account
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void i18n.changeLanguage(i18n.language === 'en' ? 'zh-TW' : 'en')}
            >
              {i18n.language === 'en' ? '中文' : 'EN'}
            </Button>
            <Button variant="secondary" size="sm" onClick={onLogout}>
              {t('app.logout')}
            </Button>
          </div>
        </div>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/trip/:id" element={<TripDetail />} />
          <Route path="/itinerary" element={<Itinerary />} />
          <Route path="/account" element={<Account />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [bootThemeVisible, setBootThemeVisible] = useState(true);
  const [bootThemeLabel, setBootThemeLabel] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Theme is applied before React loads (index.html inline script). Do not override it here,
    // otherwise users will see a brief flash of the fallback theme.
  }, []);

  useEffect(() => {
    const onStart = (evt: Event) => {
      const detail = (evt as CustomEvent<ThemeTransitionStartDetail>).detail;
      if (!detail?.themeKey) return;

      setBootThemeVisible(true);
      setBootThemeLabel(detail.label ?? CITY_THEME_LABELS[detail.themeKey] ?? '');
      applyCityTheme(detail.themeKey);
    };

    const onEnd = () => {
      window.setTimeout(() => {
        setBootThemeVisible(false);
      }, 300);
    };

    window.addEventListener('city-theme-transition-start', onStart as EventListener);
    window.addEventListener('city-theme-transition-end', onEnd as EventListener);

    return () => {
      window.removeEventListener('city-theme-transition-start', onStart as EventListener);
      window.removeEventListener('city-theme-transition-end', onEnd as EventListener);
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    const run = async () => {
      if (!session?.user) {
        const fallback = 'taipei';
        setBootThemeLabel(CITY_THEME_LABELS[fallback]);
        applyCityTheme(fallback);
        window.dispatchEvent(
          new CustomEvent<ThemeTransitionStartDetail>('city-theme-transition-start', {
            detail: { themeKey: fallback, label: CITY_THEME_LABELS[fallback] },
          })
        );
        window.dispatchEvent(new Event('city-theme-transition-end'));
        return;
      }

      const { data, error } = await supabase
        .from('user_settings')
        .select('city_theme')
        .eq('user_id', session.user.id)
        .maybeSingle();

      const themeKey = !error && data?.city_theme ? data.city_theme : 'taipei';
      window.dispatchEvent(
        new CustomEvent<ThemeTransitionStartDetail>('city-theme-transition-start', {
          detail: { themeKey, label: CITY_THEME_LABELS[themeKey] ?? CITY_THEME_LABELS.taipei },
        })
      );
      window.dispatchEvent(new Event('city-theme-transition-end'));
    };

    void run();
  }, [loading, session]);

  useEffect(() => {
    if (!session?.user) return;
    // If user previously soft-deactivated, signing in should reactivate.
    void supabase.rpc('reactivate_me');
  }, [session]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <>
        <ThemeBootOverlay visible label={bootThemeLabel} />
        <div className="p-6 text-sm text-gray-600">Loading...</div>
      </>
    );
  }

  return (
    <>
      <ThemeBootOverlay visible={bootThemeVisible} label={bootThemeLabel} />
      <Routes>
        <Route path="/auth/update-password" element={<UpdatePassword />} />
        <Route path="/waitlist" element={<Waitlist />} />
        <Route
          path="*"
          element={!session ? <Auth onAuth={() => {}} /> : <AuthedApp onLogout={handleLogout} />}
        />
      </Routes>
    </>
  );
}

export default App;
