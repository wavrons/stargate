import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

export function UpdatePassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Check if we have a session (user clicked magic link)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/');
      }
    });
  }, [navigate]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;
      setMessage('Password updated successfully! Redirecting...');
      setTimeout(() => navigate('/'), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: 'var(--bg-main)', position: 'relative' }}>
      <Link
        to="/"
        aria-label={t('app.title')}
        style={{ position: 'absolute', top: 16, left: 16 }}
      >
        <img
          src={`${import.meta.env.BASE_URL}logo.svg`}
          alt={t('app.title')}
          style={{ width: 28, height: 28, borderRadius: 8, display: 'block' }}
        />
      </Link>
      <div className="w-full max-w-md rounded-2xl p-8 shadow-xl" style={{ background: 'var(--card-surface)' }}>
        <h1 className="mb-6 text-center text-2xl font-bold" style={{ color: 'var(--text-main)' }}>
          {t('auth.updatePasswordTitle')}
        </h1>

        {message && (
          <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
            {message}
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{t('auth.newPassword')}</label>
            <Input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          
          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t('auth.updating') : t('auth.updatePassword')}
          </Button>
        </form>
      </div>
    </div>
  );
}
