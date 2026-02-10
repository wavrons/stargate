import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
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
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl text-center">
          <div className="mb-4 text-6xl">✅</div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            {t('waitlist.successTitle')}
          </h1>
          <p className="mb-6 text-gray-600">
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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <h1 className="mb-2 text-center text-3xl font-bold text-gray-900">
          {t('waitlist.title')}
        </h1>
        <p className="mb-6 text-center text-sm text-gray-600">
          {t('waitlist.description')}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t('waitlist.name')}</label>
            <Input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t('waitlist.email')}</label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t('waitlist.message')} <span className="text-gray-400">({t('waitlist.optional')})</span>
            </label>
            <textarea
              className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
            className="text-blue-600 hover:underline"
          >
            {t('waitlist.backToLogin')}
          </button>
        </div>
      </div>
    </div>
  );
}
