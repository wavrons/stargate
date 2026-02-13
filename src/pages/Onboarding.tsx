import { useEffect, useRef, useState } from 'react';
import {
  SFGlobe,
  SFLockFill,
  SFEyeSlashCircle,
  SFNosign,
  SFShield,
  SFKey,
  SFFingerprint,
  SFServer,
} from '../components/SFSymbols';
import { supabase } from '../lib/supabase';
import { Input } from '../components/Input';
import { Button } from '../components/Button';

const CITY_THEMES: { key: string; label: string; labelZh: string; adminOnly?: boolean; hidden?: boolean }[] = [
  { key: 'taipei',      label: 'Taipei',          labelZh: '台北' },
  { key: 'rio',         label: 'Rio de Janeiro',   labelZh: '里約' },
  { key: 'los_angeles', label: 'Los Angeles',      labelZh: '洛杉磯' },
  { key: 'amsterdam',   label: 'Amsterdam',        labelZh: '阿姆斯特丹' },
  { key: 'tokyo',       label: 'Tokyo',            labelZh: '東京' },
  { key: 'seoul',       label: 'Seoul',            labelZh: '首爾' },
  { key: 'santorini',   label: 'Santorini',        labelZh: '聖托里尼', hidden: true },
  { key: 'arjeplog',    label: 'Arjeplog',         labelZh: '阿爾耶普盧格', adminOnly: true },
];

type Step = 'welcome' | 'name' | 'privacy' | 'theme';

interface OnboardingProps {
  userId?: string;
  onComplete: (themeKey: string, themeLabel: string) => void;
  persist?: boolean;
  onExit?: () => void;
  prefillName?: string;
  isPreview?: boolean;
  forceIsAdmin?: boolean;
}

export function Onboarding({
  userId,
  onComplete,
  persist = true,
  onExit,
  prefillName,
  isPreview,
  forceIsAdmin,
}: OnboardingProps) {
  const initialThemeKey = 'tokyo';
  const initialThemeLabel = CITY_THEMES.find((theme) => theme.key === initialThemeKey)?.label ?? 'Tokyo';
  const [step, setStep] = useState<Step>('welcome');
  const [displayName, setDisplayName] = useState(prefillName ?? '');

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
  const [saving, setSaving] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(initialThemeKey);
  const previousThemeRef = useRef<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(forceIsAdmin ?? false);

  useEffect(() => {
    previousThemeRef.current = document.documentElement.getAttribute('data-theme');
    document.documentElement.setAttribute('data-theme', initialThemeKey);
    return () => {
      if (previousThemeRef.current) {
        document.documentElement.setAttribute('data-theme', previousThemeRef.current);
      }
    };
  }, [initialThemeKey]);

  useEffect(() => {
    if (forceIsAdmin !== undefined) {
      setIsAdmin(forceIsAdmin);
      return;
    }
    let mounted = true;
    const checkAdmin = async () => {
      const { data } = await supabase.rpc('is_admin');
      if (mounted) setIsAdmin(!!data);
    };
    void checkAdmin();
    return () => {
      mounted = false;
    };
  }, [forceIsAdmin]);

  useEffect(() => {
    if (!selectedTheme) return;
    document.documentElement.setAttribute('data-theme', selectedTheme);
  }, [selectedTheme]);

  // ── Step 1: Welcome (Taipei loading screen + tap to start) ──
  if (step === 'welcome') {
    return (
      <div className="onboarding-welcome" onClick={() => setStep('name')}>
        {onExit && (
          <button
            type="button"
            className="onboarding-close"
            onClick={(event) => {
              event.stopPropagation();
              onExit();
            }}
          >
            <SFNosign size={18} />
            <span>Close</span>
          </button>
        )}
        <div className="onboarding-welcome__content">
          <div className="onboarding-welcome__kicker">Welcome to</div>
          <div className="onboarding-welcome__city">{initialThemeLabel}</div>
          <button className="onboarding-welcome__tap">Tap to start</button>
        </div>
      </div>
    );
  }

  // ── Step 2: Display name ──
  if (step === 'name') {
    const avatarText = getAvatarLabel(displayName);
    return (
      <div className="onboarding-step">
        {isPreview && (
          <div className="onboarding-preview-label">Preview</div>
        )}
        {onExit && (
          <button type="button" className="onboarding-close" onClick={onExit}>
            <SFNosign size={18} />
            <span>Close</span>
          </button>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="onboarding-live-avatar" aria-hidden>
            {avatarText}
          </div>
          <form
            className="onboarding-card"
            onSubmit={(event) => {
              event.preventDefault();
              if (!displayName.trim()) return;
              setStep('privacy');
            }}
          >
            <h2 className="onboarding-card__title">How should we address you?</h2>
            <p className="onboarding-card__subtitle">
              This will be your display name everywhere. You can update it later in Account &gt; Profile.
            </p>
            <Input
              autoFocus
              placeholder="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              style={{ marginBottom: 20, fontSize: 16 }}
            />
            <Button
              type="submit"
              disabled={!displayName.trim()}
              style={{ width: '100%' }}
            >
              Continue
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // ── Step 3: Privacy card (iOS App Store style) ──
  if (step === 'privacy') {
    return (
      <div className="onboarding-step">
        {onExit && (
          <button type="button" className="onboarding-close" onClick={onExit}>
            <SFNosign size={18} />
            <span>Close</span>
          </button>
        )}
        <div className="onboarding-privacy">
          <div className="onboarding-privacy__header">
            <div className="onboarding-privacy__title-row">
              <div className="onboarding-privacy__icon-wrap">
                <SFShield className="onboarding-privacy__icon" />
              </div>
              <h2 className="onboarding-privacy__title">Your Data & Privacy</h2>
            </div>
            <p className="onboarding-privacy__subtitle">
              Before you continue, here's how we handle your information. You can change this anytime in Account &gt; Profile.
            </p>
          </div>

          <div className="onboarding-privacy__grid">
            <div className="onboarding-privacy__item">
              <SFLockFill className="onboarding-privacy__item-icon" />
              <div>
                <strong>End-to-End Encryption</strong>
                <span>Files are encrypted with AES-256-GCM before they ever leave your device.</span>
              </div>
            </div>

            <div className="onboarding-privacy__item">
              <SFKey className="onboarding-privacy__item-icon" />
              <div>
                <strong>Per-Trip Keys</strong>
                <span>Every trip gets its own PBKDF2 key so one link can’t expose another.</span>
              </div>
            </div>

            <div className="onboarding-privacy__item">
              <SFFingerprint className="onboarding-privacy__item-icon" />
              <div>
                <strong>Authentication</strong>
                <span>Supabase Auth keeps sessions local—never shared with third parties.</span>
              </div>
            </div>

            <div className="onboarding-privacy__item">
              <SFServer className="onboarding-privacy__item-icon" />
              <div>
                <strong>Private Storage</strong>
                <span>Encrypted files live in a private GitHub repo and need your secret key.</span>
              </div>
            </div>

            <div className="onboarding-privacy__item">
              <SFEyeSlashCircle className="onboarding-privacy__item-icon" />
              <div>
                <strong>No Tracking</strong>
                <span>No analytics, cookies, or trackers. Your usage stays on your device.</span>
              </div>
            </div>

            <div className="onboarding-privacy__item">
              <SFGlobe className="onboarding-privacy__item-icon" />
              <div>
                <strong>Open Graph Parsing</strong>
                <span>URL previews fetch metadata only—no page content is stored server-side.</span>
              </div>
            </div>
          </div>

          <p className="onboarding-privacy__footer">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>

          <Button onClick={() => setStep('theme')} style={{ width: '100%' }}>
            Continue
          </Button>
        </div>
      </div>
    );
  }

  // ── Step 4: Theme picker ──
  const handleFinish = async () => {
    if (!selectedTheme) return;
    setSaving(true);

    try {
      if (persist) {
        if (!userId) {
          setSaving(false);
          return;
        }
        // Save display name + onboarded flag
        await supabase.from('profiles').upsert({
          user_id: userId,
          display_name: displayName.trim(),
          onboarded: true,
        });

        // Save theme
        await supabase.from('user_settings').upsert({
          user_id: userId,
          city_theme: selectedTheme,
        });
      }

      const label = CITY_THEMES.find(t => t.key === selectedTheme)?.label ?? 'Taipei';
      onComplete(selectedTheme, label);
    } catch (err) {
      console.error('Onboarding save error:', err);
      setSaving(false);
    }
  };

  return (
    <div className="onboarding-step">
      {onExit && (
        <button type="button" className="onboarding-close" onClick={onExit}>
          <SFNosign size={18} />
          <span>Close</span>
        </button>
      )}
      <div className="onboarding-card" style={{ maxWidth: 520 }}>
        <h2 className="onboarding-card__title">Pick your city</h2>
        <p className="onboarding-card__subtitle">This sets your app's look and feel. You can change it anytime.</p>

        <div className="onboarding-theme-grid">
          {CITY_THEMES.filter((theme) => (theme.adminOnly ? isAdmin : true) && !theme.hidden).map(theme => (
            <button
              key={theme.key}
              className="onboarding-theme-btn"
              data-active={selectedTheme === theme.key || undefined}
              data-theme-preview={theme.key}
              onClick={() => setSelectedTheme(theme.key)}
            >
              <span className="onboarding-theme-btn__label">{theme.label}</span>
              <span className="onboarding-theme-btn__zh">{theme.labelZh}</span>
            </button>
          ))}
        </div>

        <Button
          disabled={!selectedTheme || saving}
          onClick={handleFinish}
          style={{ width: '100%', marginTop: 20 }}
        >
          {saving ? 'Applying...' : 'Apply'}
        </Button>
      </div>
    </div>
  );
}
