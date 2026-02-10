import { useEffect, useState } from 'react';
import { X, UserPlus, Trash2 } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { Select } from './Select';
import { supabase, type TripMember } from '../lib/supabase';

interface ShareModalProps {
  tripId: string;
  onClose: () => void;
}

export function ShareModal({ tripId, onClose }: ShareModalProps) {
  const [members, setMembers] = useState<TripMember[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [role, setRole] = useState<'viewer' | 'editor'>('viewer');
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMembers();
  }, [tripId]);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('trip_members')
        .select('*')
        .eq('trip_id', tripId);

      if (error) throw error;
      setMembers(data || []);
    } catch (err) {
      console.error('Error fetching members:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    setSharing(true);
    setError('');

    try {
      const { data, error } = await supabase
        .from('trip_members')
        .insert([{
          trip_id: tripId,
          user_email: newEmail.trim(),
          role
        }])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') throw new Error('User already added');
        throw error;
      }
      
      if (data) {
        setMembers([...members, data]);
        setNewEmail('');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSharing(false);
    }
  };

  const handleRemove = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('trip_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
      setMembers(members.filter(m => m.id !== memberId));
    } catch (err) {
      console.error('Error removing member:', err);
    }
  };

  return (
    <div className="themed-modal__backdrop">
      <div className="themed-modal__panel" style={{ maxWidth: 480 }}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-main)' }}>Share Trip</h2>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleShare} className="mb-6">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                type="email"
                required
                placeholder="friend@example.com"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
              />
            </div>
            <Select
              value={role}
              onChange={v => setRole(v as 'viewer' | 'editor')}
              options={[
                { value: 'viewer', label: 'Viewer' },
                { value: 'editor', label: 'Editor' },
              ]}
            />
          </div>
          {error && <p className="mt-1 text-sm" style={{ color: '#ef4444' }}>{error}</p>}
          <Button type="submit" className="mt-2 w-full" disabled={sharing}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite
          </Button>
        </form>

        <div>
          <h3 className="mb-2 text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>Access List</h3>
          {loading ? (
            <div className="h-6" />
          ) : members.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No one else has access.</p>
          ) : (
            <div className="space-y-2">
              {members.map(member => (
                <div key={member.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>{member.user_email}</div>
                    <div className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>{member.role}</div>
                  </div>
                  <button 
                    onClick={() => handleRemove(member.id)}
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
