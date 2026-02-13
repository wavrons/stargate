import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

export function Waitlist() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase
        .from('waitlist')
        .insert([{
          name: name.trim(),
          email: email.trim(),
          message: message.trim() || null,
        }]);

      if (error) {
        if (error.code === '23505') {
          throw new Error('This email is already on the waitlist.');
        }
        throw error;
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
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
        <div className="w-full max-w-md rounded-2xl p-8 shadow-xl text-center" style={{ background: 'var(--card-surface)' }}>
          <div className="mb-4 text-6xl">✅</div>
          <h1 className="mb-2 text-2xl font-bold" style={{ color: 'var(--text-main)' }}>
            {t('waitlist.successTitle')}
          </h1>
          <p className="mb-6" style={{ color: 'var(--text-muted)' }}>
            {t('waitlist.successMessage')}
          </p>
          <Button onClick={() => navigate('/')} variant="secondary">
            {t('waitlist.backToLogin')}
          </Button>
        </div>
      </div>
    );
  }

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
        <h1 className="mb-2 text-center text-3xl font-bold" style={{ color: 'var(--text-main)' }}>
          {t('waitlist.title')}
        </h1>
        <p className="mb-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          {t('waitlist.description')}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{t('waitlist.name')}</label>
            <Input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{t('waitlist.email')}</label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
              {t('waitlist.message')} <span style={{ color: 'var(--text-muted)', opacity: 0.6 }}>({t('waitlist.optional')})</span>
            </label>
            <textarea
              className="w-full rounded-lg border p-2 text-sm focus:outline-none focus:ring-1"
              style={{ borderColor: 'var(--border-color)', background: 'var(--input-surface, var(--card-surface))', color: 'var(--text-main)' }}
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('waitlist.messagePlaceholder')}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? '...' : t('waitlist.submit')}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <button
            onClick={() => navigate('/')}
            className="hover:underline"
            style={{ color: 'var(--accent)' }}
          >
            {t('waitlist.backToLogin')}
          </button>
        </div>
      </div>
    </div>
  );
}
