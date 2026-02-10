import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { GitHubStorage } from '../lib/github';

interface LoginProps {
  onLogin: (storage: GitHubStorage) => void;
}

export function Login({ onLogin }: LoginProps) {
  const { t } = useTranslation();
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token.trim()) {
      setError(t('auth.required'));
      return;
    }

    setLoading(true);
    try {
      const storage = new GitHubStorage(token);
      const isValid = await storage.verifyToken();

      if (isValid) {
        localStorage.setItem('github_token', token);
        onLogin(storage);
      } else {
        setError('Invalid token');
      }
    } catch (err) {
      setError('Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <h1 className="mb-6 text-center text-3xl font-bold text-gray-900">
          {t('app.title')}
        </h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              {t('auth.enterToken')}
            </label>
            <Input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={t('auth.tokenPlaceholder')}
              error={!!error}
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Verifying...' : t('auth.login')}
          </Button>
        </form>
      </div>
    </div>
  );
}
