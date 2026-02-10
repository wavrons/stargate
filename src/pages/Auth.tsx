import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

interface AuthProps {
  onAuth: () => void;
}

export function Auth({ onAuth }: AuthProps) {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Auto-fill invite code from URL if present
    const codeFromUrl = searchParams.get('code');
    if (codeFromUrl) {
      setInviteCode(codeFromUrl.toUpperCase());
      setMode('signup');
    }
  }, [searchParams]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onAuth();
      } else if (mode === 'signup') {
        // Validate invite code first
        if (!inviteCode || inviteCode.length !== 6) {
          throw new Error('Please enter a valid 6-digit invite code.');
        }

        // Check if code exists and is unused
        const { data: codeData, error: codeError } = await supabase
          .from('invite_codes')
          .select('id, used_by')
          .eq('code', inviteCode.toUpperCase())
          .is('used_by', null)
          .single();

        if (codeError || !codeData) {
          throw new Error('Invalid or already used invite code.');
        }

        // Create account
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        // Mark invite code as used
        if (data.user) {
          await supabase
            .from('invite_codes')
            .update({ 
              used_by: data.user.id, 
              used_at: new Date().toISOString() 
            })
            .eq('id', codeData.id);
        }
        
        // If email confirmation is enabled, session will be null
        if (data.user && !data.session) {
          setMessage('Account created! Please check your email to confirm your registration.');
          setMode('login');
        } else {
          onAuth();
        }
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/update-password`,
        });
        if (error) throw error;
        setMessage('Password reset instructions sent to your email.');
        setMode('login');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <h1 className="mb-2 text-center text-3xl font-bold text-gray-900">
          {t('app.title')}
        </h1>
        <p className="mb-6 text-center text-gray-600">
          {mode === 'login' && t('auth.login')}
          {mode === 'signup' && t('auth.createAccount')}
          {mode === 'forgot' && t('auth.forgotPassword')}
        </p>

        {message && (
          <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
            {message}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t('auth.inviteCode')}</label>
              <Input
                type="text"
                required
                maxLength={6}
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                className="uppercase"
              />
              <p className="mt-1 text-xs text-gray-500">
                {t('auth.inviteCodeHint')} <Link to="/waitlist" className="text-blue-600 hover:underline">{t('auth.joinWaitlist')}</Link>
              </p>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t('auth.email')}</label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          
          {mode !== 'forgot' && (
            <div>
              <div className="mb-1 flex justify-between">
                <label className="block text-sm font-medium text-gray-700">{t('auth.password')}</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setError('');
                      setMessage('');
                    }}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    {t('auth.forgotPasswordLink')}
                  </button>
                )}
              </div>
              <Input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          )}
          
          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? '...' : (
              mode === 'login' ? t('auth.login') : 
              mode === 'signup' ? t('auth.signUp') : 
              t('auth.sendResetLink')
            )}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          {mode === 'login' ? (
            <button
              onClick={() => {
                setMode('signup');
                setError('');
                setMessage('');
              }}
              className="text-blue-600 hover:underline"
            >
              {t('auth.noAccount')}
            </button>
          ) : (
            <button
              onClick={() => {
                setMode('login');
                setError('');
                setMessage('');
              }}
              className="text-blue-600 hover:underline"
            >
              {t('auth.backToLogin')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
