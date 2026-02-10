import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Copy, Trash2, Check, X } from 'lucide-react';

type ProfileRow = {
  user_id: string;
  display_name: string | null;
  deactivated_at: string | null;
};

type SettingsRow = {
  user_id: string;
  city_theme?: string | null;
};

type FrequentFlyerRow = {
  id: string;
  user_id: string;
  airline_code: string;
  airline_name: string | null;
  member_number: string;
};

type InviteCode = {
  id: string;
  code: string;
  created_for_name?: string;
  created_for_email?: string;
  used_by?: string;
  used_at?: string;
  created_at: string;
};

type WaitlistEntry = {
  id: string;
  name: string;
  email: string;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

const AIRLINES: Array<{ code: string; name: string }> = [
  { code: 'BR', name: 'EVA Air' },
  { code: 'CI', name: 'China Airlines' },
  { code: 'JL', name: 'Japan Airlines' },
  { code: 'NH', name: 'ANA' },
  { code: 'SQ', name: 'Singapore Airlines' },
  { code: 'CX', name: 'Cathay Pacific' },
  { code: 'UA', name: 'United' },
  { code: 'AA', name: 'American' },
  { code: 'DL', name: 'Delta' },
];

export function Account() {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'profile' | 'ff' | 'admin' | 'support'>('profile');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [currentEmail, setCurrentEmail] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');

  const [displayName, setDisplayName] = useState('');

  const [cityTheme, setCityTheme] = useState<
    'taipei' | 'rio' | 'los_angeles' | 'amsterdam' | 'tokyo' | 'seoul' | 'santorini' | 'arjeplog'
  >('taipei');

  const [ffRows, setFfRows] = useState<FrequentFlyerRow[]>([]);
  const [airlineCode, setAirlineCode] = useState('');
  const [airlineName, setAirlineName] = useState('');
  const [memberNumber, setMemberNumber] = useState('');

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Admin-only state
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [newCodeName, setNewCodeName] = useState('');
  const [newCodeEmail, setNewCodeEmail] = useState('');
  const [generating, setGenerating] = useState(false);

  const isCjk = (value: string) => /[\u3400-\u9FFF\uF900-\uFAFF]/.test(value);

  const getAvatarText = (value: string) => {
    const v = (value || '').trim();
    if (!v) return '?';

    if (isCjk(v)) {
      const chars = Array.from(v.replace(/\s+/g, ''));
      return chars.length ? chars[chars.length - 1] : '?';
    }

    const letters = v.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (!letters) return '?';
    return letters.slice(0, 2);
  };

  const cityThemes: Array<{
    key: typeof cityTheme;
    name: string;
    description: string;
    primaryColor: string;
    bgColor: string;
    adminOnly?: boolean;
  }> = [
    { key: 'taipei', name: 'Taipei', description: 'Brutalist Tech', primaryColor: '#999999', bgColor: '#121212' },
    { key: 'rio', name: 'Rio de Janeiro', description: 'Organic Growth', primaryColor: '#61BB46', bgColor: '#F0FFF0' },
    { key: 'los_angeles', name: 'Los Angeles', description: 'Cinematic Retro', primaryColor: '#FDBD2C', bgColor: '#3D2B1F' },
    { key: 'amsterdam', name: 'Amsterdam', description: 'Modern Heritage', primaryColor: '#F58220', bgColor: '#FAF9F6' },
    { key: 'tokyo', name: 'Tokyo', description: 'Precise Editorial', primaryColor: '#333333', bgColor: '#FFFFFF' },
    { key: 'seoul', name: 'Seoul', description: 'Cyber-Pop', primaryColor: '#963D97', bgColor: '#0B0114' },
    { key: 'santorini', name: 'Santorini', description: 'Fluid/Coastal', primaryColor: '#009DDC', bgColor: '#FFFFFF' },
    { key: 'arjeplog', name: 'Arjeplog', description: 'The Hidden Forest', primaryColor: '#F0EEE9', bgColor: '#1B3022', adminOnly: true },
  ];

  const getCityLabel = (key: typeof cityTheme) => cityThemes.find((t) => t.key === key)?.name ?? key;

  const saveCityTheme = async () => {
    if (!userId) return;
    setError('');
    setMessage('');
    setSavingTheme(true);

    const prevTheme =
      (document.documentElement.getAttribute('data-theme') as typeof cityTheme | null) ?? 'taipei';
    const isSameTheme = prevTheme === cityTheme;

    if (!isSameTheme) {
      window.dispatchEvent(
        new CustomEvent('city-theme-transition-start', {
          detail: { themeKey: cityTheme, label: getCityLabel(cityTheme) },
        })
      );
    }

    try {
      const { error: upsertErr } = await supabase
        .from('user_settings')
        .upsert({ user_id: userId, city_theme: cityTheme });

      if (upsertErr) throw upsertErr;

      // Persist for next refresh (pre-React boot theme)
      try {
        localStorage.setItem('city_theme', cityTheme);
      } catch {
        // ignore
      }

      setMessage('Theme saved.');
    } catch (e: any) {
      if (!isSameTheme) {
        document.documentElement.setAttribute('data-theme', prevTheme);
        try {
          localStorage.setItem('city_theme', prevTheme);
        } catch {
          // ignore
        }
      }
      setError(e.message ?? 'Failed to save theme');
    } finally {
      if (!isSameTheme) {
        window.dispatchEvent(new Event('city-theme-transition-end'));
      }
      setSavingTheme(false);
    }
  };

  const avatarText = getAvatarText(displayName || currentEmail);

  const BG: Record<typeof cityTheme, { bg: string; text: string }> = {
    taipei: { bg: '#999999', text: '#FFFFFF' },
    rio: { bg: '#61BB46', text: '#FFFFFF' },
    los_angeles: { bg: '#FDBD2C', text: '#000000' },
    amsterdam: { bg: '#F58220', text: '#FFFFFF' },
    tokyo: { bg: '#333333', text: '#FFFFFF' },
    seoul: { bg: '#963D97', text: '#FFFFFF' },
    santorini: { bg: '#009DDC', text: '#FFFFFF' },
    arjeplog: { bg: '#F0EEE9', text: '#1B3022' },
  };

  const avatarSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <defs>
    <clipPath id="c">
      <circle cx="64" cy="64" r="64" />
    </clipPath>
  </defs>
  <g clip-path="url(#c)">
    <rect width="128" height="128" fill="${BG[cityTheme].bg}" />
    <text x="64" y="72" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial" font-size="48" font-weight="700" fill="${BG[cityTheme].text}">${avatarText}</text>
  </g>
</svg>`;

  const avatarUrl = `data:image/svg+xml;utf8,${encodeURIComponent(avatarSvg)}`;

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      void fetchCodes();
      void fetchWaitlist();
    }
  }, [isAdmin]);

  const load = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      if (!userData.user) throw new Error('Not signed in');

      const { data: adminData } = await supabase.rpc('is_admin');
      setIsAdmin(!!adminData);

      setUserId(userData.user.id);
      setCurrentEmail(userData.user.email ?? '');
      setNewEmail('');

      const [{ data: p }, { data: s }, { data: ff }] = await Promise.all([
        supabase.from('profiles').select('user_id, display_name, deactivated_at').eq('user_id', userData.user.id).maybeSingle(),
        supabase.from('user_settings').select('user_id, city_theme').eq('user_id', userData.user.id).maybeSingle(),
        supabase.from('frequent_flyer_accounts').select('id, user_id, airline_code, airline_name, member_number').eq('user_id', userData.user.id).order('created_at', { ascending: false }),
      ]);

      const profile = (p ?? null) as ProfileRow | null;
      const settings = (s ?? null) as SettingsRow | null;

      setDisplayName(profile?.display_name ?? '');

      const rawTheme = ((settings as any)?.city_theme as string | null) ?? null;
      const allowed = new Set(['taipei', 'rio', 'los_angeles', 'amsterdam', 'tokyo', 'seoul', 'santorini', 'arjeplog']);
      const theme = (allowed.has(rawTheme ?? '') ? (rawTheme as any) : 'taipei') as typeof cityTheme;
      setCityTheme(theme);
      
      // Apply theme to document root
      document.documentElement.setAttribute('data-theme', theme);
      
      setFfRows((ff as any) ?? []);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load account');
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!userId) return;
    setError('');
    setMessage('');

    try {
      const { error: upsertErr } = await supabase
        .from('profiles')
        .upsert({
          user_id: userId,
          display_name: displayName.trim() || null,
        });

      if (upsertErr) throw upsertErr;
      setMessage('Saved.');
    } catch (e: any) {
      setError(e.message ?? 'Failed to save');
    }
  };


  const updateEmail = async (newEmail: string) => {
    setError('');
    setMessage('');

    try {
      const { error: updateErr } = await supabase.auth.updateUser({ email: newEmail });
      if (updateErr) throw updateErr;
      setMessage('Email update requested. Check both your old and new inbox for confirmation.');
    } catch (e: any) {
      setError(e.message ?? 'Failed to update email');
    }
  };


  const addFrequentFlyer = async () => {
    if (!userId) return;
    setError('');
    setMessage('');

    const code = airlineCode.trim().toUpperCase();
    if (!code) {
      setError('Airline code is required.');
      return;
    }
    if (!memberNumber.trim()) {
      setError('Member number is required.');
      return;
    }

    try {
      const { error: insertErr } = await supabase.from('frequent_flyer_accounts').insert({
        user_id: userId,
        airline_code: code,
        airline_name: airlineName.trim() || null,
        member_number: memberNumber.trim(),
      });

      if (insertErr) throw insertErr;

      setAirlineCode('');
      setAirlineName('');
      setMemberNumber('');

      await load();
      setMessage('Added.');
    } catch (e: any) {
      setError(e.message ?? 'Failed to add');
    }
  };

  const deleteFrequentFlyer = async (id: string) => {
    setError('');
    setMessage('');

    try {
      const { error: delErr } = await supabase.from('frequent_flyer_accounts').delete().eq('id', id);
      if (delErr) throw delErr;
      await load();
      setMessage('Deleted.');
    } catch (e: any) {
      setError(e.message ?? 'Failed to delete');
    }
  };

  const copyMemberNumber = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setMessage('Copied.');
    } catch {
      setMessage('Copy failed.');
    }
  };

  const deactivate = async () => {
    setError('');
    setMessage('');
    setDeactivating(true);

    try {
      const { error: rpcErr } = await supabase.rpc('deactivate_me');
      if (rpcErr) throw rpcErr;

      await supabase.auth.signOut();
    } catch (e: any) {
      setError(e.message ?? 'Failed to deactivate');
    } finally {
      setDeactivating(false);
    }
  };

  const fetchCodes = async () => {
    const { data } = await supabase
      .from('invite_codes')
      .select('*')
      .order('created_at', { ascending: false });
    setCodes(data || []);
  };

  const fetchWaitlist = async () => {
    const { data } = await supabase
      .from('waitlist')
      .select('*')
      .order('created_at', { ascending: false });
    setWaitlist(data || []);
  };

  const generateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setError('');
    setMessage('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: newCode } = await supabase.rpc('generate_invite_code');

      const { error: insertErr } = await supabase
        .from('invite_codes')
        .insert([{
          code: newCode,
          created_by: user.id,
          created_for_name: newCodeName.trim() || null,
          created_for_email: newCodeEmail.trim() || null,
        }]);

      if (insertErr) throw insertErr;

      setNewCodeName('');
      setNewCodeEmail('');
      await fetchCodes();
      setMessage('Invite code generated.');
    } catch (e: any) {
      setError(e.message ?? 'Failed to generate code');
    } finally {
      setGenerating(false);
    }
  };

  const deleteCode = async (id: string) => {
    if (!confirm('Delete this invite code?')) return;
    setError('');
    setMessage('');

    try {
      const { error: delErr } = await supabase
        .from('invite_codes')
        .delete()
        .eq('id', id);

      if (delErr) throw delErr;
      await fetchCodes();
      setMessage('Code deleted.');
    } catch (e: any) {
      setError(e.message ?? 'Failed to delete code');
    }
  };

  const copyCode = async (code: string) => {
    const url = `${window.location.origin}/?code=${code}`;
    try {
      await navigator.clipboard.writeText(url);
      setMessage('Invite link copied.');
    } catch {
      setMessage('Copy failed.');
    }
  };

  const updateWaitlistStatus = async (id: string, status: 'approved' | 'rejected') => {
    setError('');
    setMessage('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error: updateErr } = await supabase
        .from('waitlist')
        .update({ 
          status, 
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateErr) throw updateErr;
      await fetchWaitlist();
      setMessage(`Waitlist entry ${status}.`);
    } catch (e: any) {
      setError(e.message ?? 'Failed to update waitlist');
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-gray-600">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-2xl font-bold text-gray-900">Account</h1>

      <div className="mb-6 flex flex-wrap gap-2">
        <Button variant={tab === 'profile' ? 'primary' : 'secondary'} onClick={() => setTab('profile')}>
          Profile
        </Button>
        <Button variant={tab === 'ff' ? 'primary' : 'secondary'} onClick={() => setTab('ff')}>
          Frequent Flyer Info
        </Button>
        {isAdmin && (
          <Button variant={tab === 'admin' ? 'primary' : 'secondary'} onClick={() => setTab('admin')}>
            Admin
          </Button>
        )}
        <Button variant={tab === 'support' ? 'primary' : 'secondary'} onClick={() => setTab('support')}>
          Support
        </Button>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {message && <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</div>}

      {tab === 'profile' && (
        <div className="space-y-8">
          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Basic</h2>

            <div className="flex items-center gap-4">
              <div className="h-16 w-16 overflow-hidden rounded-full border bg-gray-100">
                <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Display name</label>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
                <Input value={currentEmail} disabled />
                <div className="mt-2 flex gap-2">
                  <Input
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="new-email@example.com"
                  />
                  <Button variant="secondary" onClick={() => void updateEmail(newEmail)}>
                    Update
                  </Button>
                </div>
                <p className="mt-1 text-xs text-gray-500">Changing email requires re-verification.</p>
              </div>
            </div>

            <div className="mt-4">
              <Button onClick={() => void saveProfile()}>Save profile</Button>
            </div>
          </section>

          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">City Theme</h2>
            <p className="mb-4 text-sm text-gray-600">
              Choose a city theme to customize your experience. Each theme changes the look and feel of the entire site and your avatar.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {cityThemes
                .filter((theme) => (theme.adminOnly ? isAdmin : true))
                .map((theme) => (
                  <button
                    key={theme.key}
                    type="button"
                    onClick={() => setCityTheme(theme.key)}
                    className={`flex items-center gap-3 rounded-lg border-2 p-4 text-left transition-all ${
                      cityTheme === theme.key
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div
                      className="h-12 w-12 flex-shrink-0 rounded-lg"
                      style={{ backgroundColor: theme.primaryColor }}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{theme.name}</span>
                        {theme.adminOnly && (
                          <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{theme.description}</p>
                    </div>
                  </button>
                ))}
            </div>
            <div className="mt-4">
              <Button onClick={() => void saveCityTheme()} disabled={savingTheme}>
                {savingTheme ? 'Saving…' : 'Save Theme'}
              </Button>
            </div>
          </section>
        </div>
      )}

      {tab === 'ff' && (
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Frequent Flyer Info</h2>

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Airline</label>
              <select
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                value={airlineCode}
                onChange={(e) => {
                  const next = e.target.value;
                  setAirlineCode(next);
                  const match = AIRLINES.find((a) => a.code === next);
                  if (match) setAirlineName(match.name);
                }}
              >
                <option value="">Select…</option>
                {AIRLINES.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.code} — {a.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">Or type airline code below.</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Airline code</label>
              <Input value={airlineCode} onChange={(e) => setAirlineCode(e.target.value)} placeholder="e.g. BR" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Member number</label>
              <Input value={memberNumber} onChange={(e) => setMemberNumber(e.target.value)} placeholder="123456789" />
            </div>
          </div>

          <div className="mt-3">
            <label className="mb-1 block text-sm font-medium text-gray-700">Airline name (optional)</label>
            <Input value={airlineName} onChange={(e) => setAirlineName(e.target.value)} placeholder="Airline name" />
          </div>

          <div className="mt-4">
            <Button onClick={() => void addFrequentFlyer()}>Add</Button>
          </div>

          <div className="mt-6 space-y-2">
            {ffRows.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900">
                    {r.airline_code}{r.airline_name ? ` — ${r.airline_name}` : ''}
                  </div>
                  <div className="font-mono text-sm text-gray-700">{r.member_number}</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => void copyMemberNumber(r.member_number)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => void deleteFrequentFlyer(r.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {ffRows.length === 0 && <div className="text-sm text-gray-500">No frequent flyer accounts yet.</div>}
          </div>
        </section>
      )}

      {tab === 'admin' && isAdmin && (
        <div className="space-y-8">
          {/* Generate Invite Code */}
          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">Generate Invite Code</h2>
            <form onSubmit={generateCode} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Name (Optional)</label>
                  <Input
                    value={newCodeName}
                    onChange={(e) => setNewCodeName(e.target.value)}
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Email (Optional)</label>
                  <Input
                    type="email"
                    value={newCodeEmail}
                    onChange={(e) => setNewCodeEmail(e.target.value)}
                    placeholder="john@example.com"
                  />
                </div>
              </div>
              <Button type="submit" disabled={generating}>
                {generating ? 'Generating...' : 'Generate Code'}
              </Button>
            </form>
          </section>

          {/* Invite Codes List */}
          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">Invite Codes ({codes.length})</h2>
            <div className="space-y-2">
              {codes.map((code) => (
                <div key={code.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-lg font-bold text-blue-600">{code.code}</span>
                      {code.used_by && <span className="rounded bg-gray-200 px-2 py-1 text-xs">Used</span>}
                    </div>
                    {code.created_for_name && (
                      <div className="mt-1 text-sm text-gray-600">
                        For: {code.created_for_name} {code.created_for_email && `(${code.created_for_email})`}
                      </div>
                    )}
                    <div className="text-xs text-gray-500">
                      Created {new Date(code.created_at).toLocaleDateString()}
                      {code.used_at && ` • Used ${new Date(code.used_at).toLocaleDateString()}`}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!code.used_by && (
                      <>
                        <Button size="sm" variant="secondary" onClick={() => void copyCode(code.code)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => void deleteCode(code.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {codes.length === 0 && (
                <p className="text-center text-sm text-gray-500">No invite codes yet.</p>
              )}
            </div>
          </section>

          {/* Waitlist */}
          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              Waitlist ({waitlist.filter(w => w.status === 'pending').length} pending)
            </h2>
            <div className="space-y-2">
              {waitlist.map((entry) => (
                <div key={entry.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{entry.name}</span>
                        <span className={`rounded px-2 py-1 text-xs ${
                          entry.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          entry.status === 'approved' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {entry.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">{entry.email}</div>
                      {entry.message && (
                        <div className="mt-2 text-sm italic text-gray-700">"{entry.message}"</div>
                      )}
                      <div className="mt-1 text-xs text-gray-500">
                        Submitted {new Date(entry.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    {entry.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => void updateWaitlistStatus(entry.id, 'approved')}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => void updateWaitlistStatus(entry.id, 'rejected')}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {waitlist.length === 0 && (
                <p className="text-center text-sm text-gray-500">No waitlist entries yet.</p>
              )}
            </div>
          </section>
        </div>
      )}

      {tab === 'support' && (
        <div className="space-y-8">
          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-lg font-semibold text-gray-900">FAQ</h2>
            <p className="text-sm text-gray-600">Coming soon.</p>
          </section>

          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-lg font-semibold text-gray-900">Deactivate account</h2>
            <p className="mb-4 text-sm text-gray-600">
              This is a soft deactivation. You can reactivate anytime by logging back in.
            </p>
            <Button variant="secondary" onClick={() => setShowDeactivateModal(true)}>
              Deactivate
            </Button>
          </section>
        </div>
      )}

      {showDeactivateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-2 text-xl font-bold text-gray-900">Deactivate account?</div>
            <p className="mb-4 text-sm text-gray-600">
              This will soft-deactivate your account. You can reactivate whenever you want by logging back in.
            </p>

            {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

            <div className="flex justify-end gap-2">
              <Button
                variant="primary"
                onClick={() => setShowDeactivateModal(false)}
                disabled={deactivating}
              >
                Cancel
              </Button>
              <Button
                variant="secondary"
                className="text-red-700"
                onClick={async () => {
                  await deactivate();
                  setShowDeactivateModal(false);
                }}
                disabled={deactivating}
              >
                {deactivating ? 'Deactivating…' : 'Deactivate'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
