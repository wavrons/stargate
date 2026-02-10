import { useState } from 'react';
import { Shield, Lock, Eye, EyeOff, Server, Key, Fingerprint, Globe } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Input } from '../components/Input';
import { Button } from '../components/Button';

const CITY_THEMES: { key: string; label: string; labelZh: string }[] = [
  { key: 'taipei',      label: 'Taipei',          labelZh: '台北' },
  { key: 'rio',         label: 'Rio de Janeiro',   labelZh: '里約' },
  { key: 'los_angeles', label: 'Los Angeles',      labelZh: '洛杉磯' },
  { key: 'amsterdam',   label: 'Amsterdam',        labelZh: '阿姆斯特丹' },
  { key: 'tokyo',       label: 'Tokyo',            labelZh: '東京' },
  { key: 'seoul',       label: 'Seoul',            labelZh: '首爾' },
  { key: 'santorini',   label: 'Santorini',        labelZh: '聖托里尼' },
  { key: 'arjeplog',    label: 'Arjeplog',         labelZh: '阿爾耶普盧格' },
];

type Step = 'welcome' | 'name' | 'privacy' | 'theme';

interface OnboardingProps {
  userId: string;
  onComplete: (themeKey: string, themeLabel: string) => void;
}

export function Onboarding({ userId, onComplete }: OnboardingProps) {
  const [step, setStep] = useState<Step>('welcome');
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);

  // ── Step 1: Welcome (Taipei loading screen + tap to start) ──
  if (step === 'welcome') {
    return (
      <div className="onboarding-welcome" onClick={() => setStep('name')}>
        <div className="onboarding-welcome__content">
          <div className="onboarding-welcome__kicker">Welcome to</div>
          <div className="onboarding-welcome__city">Taipei</div>
          <button className="onboarding-welcome__tap">Tap to start</button>
        </div>
      </div>
    );
  }

  // ── Step 2: Display name ──
  if (step === 'name') {
    return (
      <div className="onboarding-step">
        <div className="onboarding-card">
          <h2 className="onboarding-card__title">How should we address you?</h2>
          <p className="onboarding-card__subtitle">This will be your display name across the app.</p>
          <Input
            autoFocus
            placeholder="Your name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            style={{ marginBottom: 20, fontSize: 16 }}
          />
          <Button
            disabled={!displayName.trim()}
            onClick={() => setStep('privacy')}
            style={{ width: '100%' }}
          >
            Continue
          </Button>
        </div>
      </div>
    );
  }

  // ── Step 3: Privacy card (iOS App Store style) ──
  if (step === 'privacy') {
    return (
      <div className="onboarding-step">
        <div className="onboarding-privacy">
          {/* Header */}
          <div className="onboarding-privacy__header">
            <div className="onboarding-privacy__icon-wrap">
              <Shield className="onboarding-privacy__icon" />
            </div>
            <h2 className="onboarding-privacy__title">Your Data & Privacy</h2>
            <p className="onboarding-privacy__subtitle">
              Before you continue, here's how we handle your information.
            </p>
          </div>

          {/* Data items grid */}
          <div className="onboarding-privacy__grid">
            <div className="onboarding-privacy__item">
              <Lock className="onboarding-privacy__item-icon" />
              <div>
                <strong>End-to-End Encryption</strong>
                <span>All uploaded images are encrypted with AES-256-GCM before leaving your device. Not even we can read them.</span>
              </div>
            </div>

            <div className="onboarding-privacy__item">
              <Key className="onboarding-privacy__item-icon" />
              <div>
                <strong>Per-Trip Encryption Keys</strong>
                <span>Each trip derives its own unique encryption key via PBKDF2. Compromising one trip cannot expose another.</span>
              </div>
            </div>

            <div className="onboarding-privacy__item">
              <Fingerprint className="onboarding-privacy__item-icon" />
              <div>
                <strong>Authentication</strong>
                <span>Your account is secured by Supabase Auth. Sessions are stored locally and never shared.</span>
              </div>
            </div>

            <div className="onboarding-privacy__item">
              <Server className="onboarding-privacy__item-icon" />
              <div>
                <strong>Private Storage</strong>
                <span>Encrypted files are stored in a private GitHub repository. Raw data is unreadable without your secret key.</span>
              </div>
            </div>

            <div className="onboarding-privacy__item">
              <EyeOff className="onboarding-privacy__item-icon" />
              <div>
                <strong>No Tracking</strong>
                <span>We don't use analytics, cookies, or any third-party tracking. Your usage stays on your device.</span>
              </div>
            </div>

            <div className="onboarding-privacy__item">
              <Globe className="onboarding-privacy__item-icon" />
              <div>
                <strong>Open Graph Parsing</strong>
                <span>When you paste a URL, our edge function fetches metadata only — no content is stored server-side.</span>
              </div>
            </div>
          </div>

          {/* Not linked section — inspired by stellaride */}
          <div className="onboarding-privacy__unlinked">
            <Eye className="onboarding-privacy__unlinked-icon" />
            <strong>Data not linked to you</strong>
            <div className="onboarding-privacy__unlinked-grid">
              <span>Location</span>
              <span>Browsing history</span>
              <span>Device ID</span>
              <span>Contacts</span>
              <span>Usage data</span>
              <span>Diagnostics</span>
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

      const label = CITY_THEMES.find(t => t.key === selectedTheme)?.label ?? 'Taipei';
      onComplete(selectedTheme, label);
    } catch (err) {
      console.error('Onboarding save error:', err);
      setSaving(false);
    }
  };

  return (
    <div className="onboarding-step">
      <div className="onboarding-card" style={{ maxWidth: 520 }}>
        <h2 className="onboarding-card__title">Pick your city</h2>
        <p className="onboarding-card__subtitle">This sets your app's look and feel. You can change it anytime.</p>

        <div className="onboarding-theme-grid">
          {CITY_THEMES.map(theme => (
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
