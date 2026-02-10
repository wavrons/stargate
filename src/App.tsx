import { useCallback, useEffect, useRef, useState } from 'react';
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
import { Board } from './pages/Board';
import { Home } from './pages/Home';
import { Onboarding } from './pages/Onboarding';
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

type OverlayMode = 'infinite' | 'progress';

function ThemeBootOverlay({
  visible,
  label,
  mode = 'infinite',
  progress = 0,
}: {
  visible: boolean;
  label: string;
  mode?: OverlayMode;
  progress?: number;
}) {
  const clamped = Math.min(100, Math.max(0, Math.round(progress)));
  // clip-path inset: top value = 100% - progress (fills from bottom)
  const fillInset = `${100 - clamped}%`;

  return (
    <div
      className={`theme-boot-overlay ${visible ? 'theme-boot-overlay--visible' : 'theme-boot-overlay--hidden'} ${mode === 'infinite' ? 'theme-boot-overlay--infinite' : ''}`}
      aria-hidden={!visible}
    >
      <div className="theme-boot-overlay__content">
        {label ? (
          <>
            <div className="theme-boot-overlay__kicker">Welcome to</div>
            {mode === 'progress' ? (
              <>
                <div className="theme-boot-overlay__title theme-boot-overlay__title--progress">
                  {label}
                  <div
                    className="theme-boot-overlay__title-fill"
                    style={{ '--fill-inset': fillInset } as React.CSSProperties}
                    aria-hidden
                  >
                    {label}
                  </div>
                </div>
                <div className="theme-boot-overlay__percent">{clamped}%</div>
              </>
            ) : (
              <div className="theme-boot-overlay__title">{label}</div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

function AuthedApp({ onLogout }: { onLogout: () => void }) {
  const { t, i18n } = useTranslation();
  const location = useLocation();

  const isDashboard = location.pathname === '/dashboard' || location.pathname.startsWith('/trip/');
  const isItinerary = location.pathname.startsWith('/itinerary');
  const isAccountPage = location.pathname.startsWith('/account');

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-main)' }}>
      <header style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--card-surface)' }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-4">
            <div className="text-base font-semibold" style={{ color: 'var(--text-main)' }}>{t('app.title')}</div>
            <nav className="flex items-center gap-2">
              <Link
                to="/dashboard"
                className="rounded-lg px-3 py-2 text-sm font-medium"
                style={isDashboard ? { background: 'var(--accent-muted, rgba(0,0,0,0.06))', color: 'var(--accent)' } : { color: 'var(--text-muted)' }}
              >
                {t('nav.tripPlanner')}
              </Link>
              <Link
                to="/itinerary"
                className="rounded-lg px-3 py-2 text-sm font-medium"
                style={isItinerary ? { background: 'var(--accent-muted, rgba(0,0,0,0.06))', color: 'var(--accent)' } : { color: 'var(--text-muted)' }}
              >
                {t('nav.itinerary')}
              </Link>
              <Link
                to="/account"
                className="rounded-lg px-3 py-2 text-sm font-medium"
                style={isAccountPage ? { background: 'var(--accent-muted, rgba(0,0,0,0.06))', color: 'var(--accent)' } : { color: 'var(--text-muted)' }}
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
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/trip/:id" element={<TripDetail />} />
          <Route path="/trip/:id/board" element={<Board />} />
          <Route path="/itinerary" element={<Itinerary />} />
          <Route path="/account" element={<Account />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

const BOOT_MIN_MS = 2000;
const PROGRESS_INTERVAL_MS = 60; // tick every 60ms for smooth progress

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Overlay state
  const [bootVisible, setBootVisible] = useState(true);
  const [bootLabel, setBootLabel] = useState('');
  const [bootMode, setBootMode] = useState<OverlayMode>('infinite');
  const [bootProgress, setBootProgress] = useState(0);

  // Gate: don't render app content until the overlay is up and theme is applied
  const [themeReady, setThemeReady] = useState(false);

  // Onboarding: null = unknown, true = needs onboarding, false = already onboarded
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);

  const overlayShownAt = useRef<number>(Date.now());
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = useCallback(() => {
    if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null; }
    if (progressTimer.current) { clearInterval(progressTimer.current); progressTimer.current = null; }
  }, []);

  // Show overlay immediately (blocks content via themeReady=false)
  const showOverlay = useCallback((label: string, mode: OverlayMode = 'infinite') => {
    clearTimers();
    overlayShownAt.current = Date.now();
    setBootLabel(label);
    setBootMode(mode);
    setBootProgress(0);
    setBootVisible(true);
    setThemeReady(false);

    if (mode === 'progress') {
      // Simulate progress: ramp to ~90% over BOOT_MIN_MS, then wait for hideOverlay to finish
      const totalTicks = Math.floor(BOOT_MIN_MS / PROGRESS_INTERVAL_MS);
      let tick = 0;
      progressTimer.current = setInterval(() => {
        tick++;
        // Ease-out curve: fast start, slows toward 90%
        const ratio = tick / totalTicks;
        const value = Math.min(90, Math.round(90 * (1 - Math.pow(1 - ratio, 2))));
        setBootProgress(value);
        if (tick >= totalTicks && progressTimer.current) {
          clearInterval(progressTimer.current);
          progressTimer.current = null;
        }
      }, PROGRESS_INTERVAL_MS);
    }
  }, [clearTimers]);

  // Dismiss overlay: for progress mode, jump to 100% first, then fade out
  const hideOverlay = useCallback(() => {
    const elapsed = Date.now() - overlayShownAt.current;
    const remaining = Math.max(0, BOOT_MIN_MS - elapsed);

    // Stop the progress ramp
    if (progressTimer.current) { clearInterval(progressTimer.current); progressTimer.current = null; }

    const finalize = () => {
      // For progress mode, snap to 100% and hold briefly before fading
      if (bootMode === 'progress') {
        setBootProgress(100);
        hideTimer.current = setTimeout(() => {
          setBootVisible(false);
          setThemeReady(true);
          hideTimer.current = null;
        }, 400); // hold 100% for 400ms so user sees it
      } else {
        setBootVisible(false);
        setThemeReady(true);
        hideTimer.current = null;
      }
    };

    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (remaining > 0) {
      hideTimer.current = setTimeout(finalize, remaining);
    } else {
      finalize();
    }
  }, [bootMode]);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  // ── Auth session ──
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

  // ── Theme transition events (from Account page theme changes) ──
  useEffect(() => {
    const onStart = (evt: Event) => {
      const detail = (evt as CustomEvent<ThemeTransitionStartDetail>).detail;
      if (!detail?.themeKey) return;

      // Show overlay first, THEN apply theme behind it
      showOverlay(detail.label ?? CITY_THEME_LABELS[detail.themeKey] ?? '', 'infinite');
      // Small delay so overlay is opaque before theme paint
      requestAnimationFrame(() => {
        applyCityTheme(detail.themeKey);
      });
    };

    const onEnd = () => {
      hideOverlay();
    };

    window.addEventListener('city-theme-transition-start', onStart as EventListener);
    window.addEventListener('city-theme-transition-end', onEnd as EventListener);

    return () => {
      window.removeEventListener('city-theme-transition-start', onStart as EventListener);
      window.removeEventListener('city-theme-transition-end', onEnd as EventListener);
    };
  }, [showOverlay, hideOverlay]);

  // ── Initial boot: show overlay → apply theme → dismiss ──
  useEffect(() => {
    if (loading) return;

    const run = async () => {
      if (!session?.user) {
        // Not logged in: quick infinite overlay with fallback theme
        const fallback = 'taipei';
        showOverlay(CITY_THEME_LABELS[fallback], 'infinite');
        applyCityTheme(fallback);
        hideOverlay();
        return;
      }

      // Check if user has completed onboarding
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarded')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (!profile || !profile.onboarded) {
        // First-time user: show onboarding (Taipei theme as default)
        applyCityTheme('taipei');
        setNeedsOnboarding(true);
        setBootVisible(false);
        setThemeReady(true);
        return;
      }

      setNeedsOnboarding(false);

      // Logged in: show progress overlay FIRST, then fetch theme behind it
      showOverlay('', 'progress');

      const { data, error } = await supabase
        .from('user_settings')
        .select('city_theme')
        .eq('user_id', session.user.id)
        .maybeSingle();

      const themeKey = !error && data?.city_theme ? data.city_theme : 'taipei';
      const label = CITY_THEME_LABELS[themeKey] ?? CITY_THEME_LABELS.taipei;

      // Apply theme behind the overlay, then update label
      applyCityTheme(themeKey);
      setBootLabel(label);

      // Now let hideOverlay handle the min-duration + 100% snap
      hideOverlay();
    };

    void run();
  }, [loading, session, showOverlay, hideOverlay]);

  useEffect(() => {
    if (!session?.user) return;
    // If user previously soft-deactivated, signing in should reactivate.
    void supabase.rpc('reactivate_me');
  }, [session]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // While loading auth state, show overlay only
  if (loading) {
    return <ThemeBootOverlay visible label={bootLabel} mode="infinite" />;
  }

  const handleOnboardingComplete = (themeKey: string, themeLabel: string) => {
    setNeedsOnboarding(false);
    applyCityTheme(themeKey);
    showOverlay(themeLabel, 'progress');
    // Small delay to let overlay paint, then dismiss
    setTimeout(() => hideOverlay(), 300);
  };

  return (
    <>
      <ThemeBootOverlay visible={bootVisible} label={bootLabel} mode={bootMode} progress={bootProgress} />
      {/* Onboarding for first-time users */}
      {needsOnboarding && session?.user && (
        <Onboarding userId={session.user.id} onComplete={handleOnboardingComplete} />
      )}
      {/* Public routes: Home (quote) and Auth are accessible without login */}
      {!session && (
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth onAuth={() => {}} />} />
          <Route path="/auth/update-password" element={<UpdatePassword />} />
          <Route path="/waitlist" element={<Waitlist />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
      {/* Authenticated routes */}
      {session && (themeReady || needsOnboarding === false) && !needsOnboarding && (
        <AuthedApp onLogout={handleLogout} />
      )}
    </>
  );
}

export default App;
