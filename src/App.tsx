import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from './components/Button';
import { Footer } from './components/Footer';
import { SFGlobe, SFCheckmark } from './components/SFSymbols';
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
import { TripLayout } from './pages/TripLayout';
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
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [avatarLabel, setAvatarLabel] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const accountCloseTimer = useRef<number | null>(null);
  const langCloseTimer = useRef<number | null>(null);

  const isDashboard = location.pathname === '/dashboard' || location.pathname.startsWith('/trip/');
  const isItinerary = location.pathname.startsWith('/itinerary');
  const isAccountPage = location.pathname.startsWith('/account');
  const isBoard = location.pathname.includes('/board');

  const isCjk = (value: string) => /[\u3400-\u9FFF\uF900-\uFAFF]/.test(value);
  const getAvatarLabel = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return '?';
    if (isCjk(trimmed)) {
      const chars = Array.from(trimmed.replace(/\s+/g, ''));
      return chars.length ? chars[chars.length - 1] : '?';
    }
    const letters = trimmed.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (!letters) return '?';
    return letters.slice(0, 2);
  };

  const BG: Record<string, { bg: string; text: string }> = {
    taipei: { bg: '#999999', text: '#121212' },
    rio: { bg: '#61BB46', text: '#1B3022' },
    los_angeles: { bg: '#FDBD2C', text: '#3D2B1F' },
    amsterdam: { bg: '#F58220', text: '#FFFFFF' },
    tokyo: { bg: '#333333', text: '#FFFFFF' },
    seoul: { bg: '#963D97', text: '#FFFFFF' },
    santorini: { bg: '#009DDC', text: '#FFFFFF' },
    arjeplog: { bg: '#F0EEE9', text: '#002147' },
  };


  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
      if (!langMenuRef.current?.contains(event.target as Node)) {
        setLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    let mounted = true;
    const checkAdmin = async () => {
      const { data } = await supabase.rpc('is_admin');
      if (mounted) setIsAdmin(!!data);
    };
    void checkAdmin();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadAvatar = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const [{ data: profile }, { data: settings }] = await Promise.all([
        supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', userData.user.id)
          .maybeSingle(),
        supabase
          .from('user_settings')
          .select('city_theme')
          .eq('user_id', userData.user.id)
          .maybeSingle(),
      ]);

      const labelSource = (profile?.display_name || userData.user.email || '').trim();
      const label = getAvatarLabel(labelSource);
      const themeKey = settings?.city_theme && BG[settings.city_theme]
        ? settings.city_theme
        : 'tokyo';
      const avatarSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <defs>
    <clipPath id="c">
      <circle cx="64" cy="64" r="64" />
    </clipPath>
  </defs>
  <g clip-path="url(#c)">
    <rect width="128" height="128" fill="${BG[themeKey].bg}" />
    <text x="64" y="64" text-anchor="middle" dominant-baseline="central" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial" font-size="48" font-weight="700" fill="${BG[themeKey].text}">${label}</text>
  </g>
</svg>`;
      const url = `data:image/svg+xml;utf8,${encodeURIComponent(avatarSvg)}`;
      if (mounted) {
        setAvatarLabel(label);
        setAvatarUrl(url);
      }
    };
    void loadAvatar();
    return () => {
      mounted = false;
    };
  }, []);


  const openAccountMenu = () => {
    if (accountCloseTimer.current) {
      window.clearTimeout(accountCloseTimer.current);
      accountCloseTimer.current = null;
    }
    setLangMenuOpen(false);
    setAccountMenuOpen(true);
  };

  const scheduleCloseAccountMenu = () => {
    if (accountCloseTimer.current) {
      window.clearTimeout(accountCloseTimer.current);
    }
    accountCloseTimer.current = window.setTimeout(() => {
      setAccountMenuOpen(false);
      accountCloseTimer.current = null;
    }, 400);
  };

  const openLangMenu = () => {
    if (langCloseTimer.current) {
      window.clearTimeout(langCloseTimer.current);
      langCloseTimer.current = null;
    }
    setAccountMenuOpen(false);
    setLangMenuOpen(true);
  };

  const scheduleCloseLangMenu = () => {
    if (langCloseTimer.current) {
      window.clearTimeout(langCloseTimer.current);
    }
    langCloseTimer.current = window.setTimeout(() => {
      setLangMenuOpen(false);
      langCloseTimer.current = null;
    }, 300);
  };

  return (
    <div
      className="min-h-screen"
      style={{ background: 'var(--bg-main)', display: 'flex', flexDirection: 'column' }}
    >
      <header
        style={{
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--card-surface)',
          position: 'sticky',
          top: 0,
          zIndex: 70,
        }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-4">
            <Link to="/" aria-label={t('app.title')}>
              <img
                src={`${import.meta.env.BASE_URL}${isLocalhost ? 'dev-logo.svg' : 'logo.svg'}`}
                alt={t('app.title')}
                style={{ width: 28, height: 28, borderRadius: 8, display: 'block' }}
              />
            </Link>
            {!isBoard && (
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
              </nav>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div
              className="relative"
              ref={langMenuRef}
              onMouseEnter={openLangMenu}
              onMouseLeave={scheduleCloseLangMenu}
            >
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setLangMenuOpen((prev) => {
                    if (!prev) setAccountMenuOpen(false);
                    return !prev;
                  });
                }}
                aria-haspopup="menu"
                aria-expanded={langMenuOpen}
                className="icon-button"
                style={{ border: 'none', background: 'transparent' }}
              >
                <SFGlobe size={16} />
                <span className="icon-tooltip">Language</span>
              </Button>
              {langMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-48 rounded-xl border shadow-lg lang-menu__panel"
                  style={{ background: 'var(--card-surface)', borderColor: 'var(--border-color)' }}
                  role="menu"
                  onMouseEnter={openLangMenu}
                  onMouseLeave={scheduleCloseLangMenu}
                >
                  <button
                    type="button"
                    className={`menu-item w-full text-left text-sm ${i18n.language === 'en' ? 'lang-menu__active' : ''}`}
                    style={{ color: 'var(--text-main)' }}
                    onClick={() => {
                      void i18n.changeLanguage('en');
                      setLangMenuOpen(false);
                    }}
                    role="menuitem"
                  >
                    <span className="lang-menu__label">English</span>
                    {i18n.language === 'en' && <span className="lang-menu__status"><SFCheckmark size={12} /></span>}
                  </button>
                  <button
                    type="button"
                    className={`menu-item w-full text-left text-sm ${i18n.language === 'zh-TW' ? 'lang-menu__active' : ''}`}
                    style={{ color: 'var(--text-main)' }}
                    onClick={() => {
                      void i18n.changeLanguage('zh-TW');
                      setLangMenuOpen(false);
                    }}
                    role="menuitem"
                  >
                    <span className="lang-menu__label">中文 (繁體)</span>
                    {i18n.language === 'zh-TW' && <span className="lang-menu__status"><SFCheckmark size={12} /></span>}
                  </button>
                </div>
              )}
            </div>
            <div
              className="relative account-menu"
              ref={accountMenuRef}
              onMouseEnter={openAccountMenu}
              onMouseLeave={scheduleCloseAccountMenu}
            >
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setAccountMenuOpen((prev) => {
                    if (!prev) setLangMenuOpen(false);
                    return !prev;
                  });
                }}
                aria-haspopup="menu"
                aria-expanded={accountMenuOpen}
                className="icon-button"
                style={{ border: 'none', background: 'transparent', ...(isAccountPage ? { color: 'var(--accent)' } : {}) }}
              >
                <span className="icon-tooltip">Account</span>
                <span className="account-avatar" aria-hidden>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="account-avatar__img" />
                  ) : (
                    avatarLabel || '?'
                  )}
                </span>
              </Button>
              {accountMenuOpen && (
                <>
                  <div className="account-menu__bridge" aria-hidden />
                  <div
                    className="absolute right-0 mt-2 w-52 rounded-xl border shadow-lg account-menu__panel"
                    style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
                    role="menu"
                    onMouseEnter={openAccountMenu}
                    onMouseLeave={scheduleCloseAccountMenu}
                  >
                    <Link
                      to="/account?tab=profile"
                      className="menu-item block text-sm"
                      style={{ color: 'var(--text-main)' }}
                      onClick={() => setAccountMenuOpen(false)}
                      role="menuitem"
                    >
                      Profile
                    </Link>
                    <Link
                      to="/account?tab=look_and_feel"
                      className="menu-item block text-sm"
                      style={{ color: 'var(--text-main)' }}
                      onClick={() => setAccountMenuOpen(false)}
                      role="menuitem"
                    >
                      Look & Feel
                    </Link>
                    {isAdmin && (
                      <Link
                        to="/account?tab=admin"
                        className="menu-item block text-sm"
                        style={{ color: 'var(--text-main)' }}
                        onClick={() => setAccountMenuOpen(false)}
                        role="menuitem"
                      >
                        Admin
                      </Link>
                    )}
                    <Link
                      to="/account?tab=support"
                      className="menu-item block text-sm"
                      style={{ color: 'var(--text-main)' }}
                      onClick={() => setAccountMenuOpen(false)}
                      role="menuitem"
                    >
                      Support
                    </Link>
                    <div className="my-1 h-px" style={{ background: 'var(--border-color)' }} />
                    <button
                      type="button"
                      className="menu-item block w-full text-left text-sm"
                      style={{ color: 'var(--text-main)' }}
                      onClick={() => {
                        setAccountMenuOpen(false);
                        onLogout();
                      }}
                      role="menuitem"
                    >
                      {t('app.logout')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/trip/:id" element={<TripLayout />}>
            <Route index element={<TripDetail embedded={true} />} />
            <Route path="details" element={<TripDetail embedded={true} />} />
            <Route path="board" element={<Board embedded />} />
          </Route>
          <Route path="/itinerary" element={<Itinerary />} />
          <Route path="/account" element={<Account />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
      <Footer />
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
  const location = useLocation();

  const overlayShownAt = useRef<number>(Date.now());
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastRoutePathRef = useRef(location.pathname);

  const clearTimers = useCallback(() => {
    if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null; }
    if (progressTimer.current) { clearInterval(progressTimer.current); progressTimer.current = null; }
  }, []);

  // Show overlay immediately (blocks content via themeReady=false)
  const showOverlay = useCallback((label: string, mode: OverlayMode = 'infinite', gateContent = true) => {
    clearTimers();
    overlayShownAt.current = Date.now();
    setBootLabel(label);
    setBootMode(mode);
    setBootProgress(0);
    setBootVisible(true);
    if (gateContent) {
      setThemeReady(false);
    }

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

  // ── Route transitions ──
  useEffect(() => {
    if (!session || needsOnboarding !== false || !themeReady) {
      lastRoutePathRef.current = location.pathname;
      return;
    }
    if (lastRoutePathRef.current === location.pathname) return;
    lastRoutePathRef.current = location.pathname;

    const activeTheme = document.documentElement.getAttribute('data-theme') ?? 'tokyo';
    const label = CITY_THEME_LABELS[activeTheme] ?? CITY_THEME_LABELS.tokyo;

    showOverlay(label, 'infinite', false);
    hideOverlay();
  }, [location.pathname, session, needsOnboarding, themeReady, showOverlay, hideOverlay]);

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
        const fallback = 'tokyo';
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
        // First-time user: show onboarding using current or stored theme
        let initialTheme = 'tokyo';
        try {
          const stored = localStorage.getItem('city_theme');
          if (stored) initialTheme = stored;
        } catch {
          // ignore
        }
        applyCityTheme(initialTheme);
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

      const themeKey = !error && data?.city_theme ? data.city_theme : 'tokyo';
      const label = CITY_THEME_LABELS[themeKey] ?? CITY_THEME_LABELS.tokyo;

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
        <Onboarding
          userId={session.user.id}
          onComplete={handleOnboardingComplete}
        />
      )}
      {/* Public routes: Home (quote) and Auth are accessible without login */}
      {!session && (
        <>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<Auth onAuth={() => {}} />} />
            <Route path="/auth/update-password" element={<UpdatePassword />} />
            <Route path="/waitlist" element={<Waitlist />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Footer fixed />
        </>
      )}
      {/* Authenticated routes */}
      {session && (themeReady || needsOnboarding === false) && !needsOnboarding && (
        <AuthedApp onLogout={handleLogout} />
      )}
    </>
  );
}

export default App;
