import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Layers, FolderOpen } from 'lucide-react';
import { Button } from '../components/Button';
import { BoardPasteInput } from '../components/BoardPasteInput';
import { BoardCard } from '../components/BoardCard';
import { ImageUpload } from '../components/ImageUpload';
import { RefreshBanner } from '../components/RefreshBanner';
import { ConfirmModal } from '../components/ConfirmModal';
import { useTripVersionPoll } from '../hooks/useTripVersionPoll';
import { supabase, type Trip, type BoardItem, type ColorTag } from '../lib/supabase';
import { TRIP_STORAGE_LIMIT_BYTES } from '../config';
import type { OGData } from '../lib/ogParse';

type GroupBy = 'time' | 'type' | 'group';

const GROUP_BY_OPTIONS: { value: GroupBy; label: string; icon: typeof Clock }[] = [
  { value: 'time',  label: 'Time',   icon: Clock },
  { value: 'type',  label: 'Type',   icon: Layers },
  { value: 'group', label: 'Group',  icon: FolderOpen },
];

export function Board() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [items, setItems] = useState<BoardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState<GroupBy>('time');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { stale, acknowledge } = useTripVersionPoll(id);

  // ── Fetch ──
  const fetchData = useCallback(async (tripId: string) => {
    try {
      const [tripRes, itemsRes] = await Promise.all([
        supabase.from('trips').select('*').eq('id', tripId).single(),
        supabase.from('board_items').select('*').eq('trip_id', tripId).order('created_at', { ascending: false }),
      ]);

      if (tripRes.error) throw tripRes.error;
      setTrip(tripRes.data);
      setItems(itemsRes.data ?? []);
    } catch (err) {
      console.error('Board fetch error:', err);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (id) fetchData(id);
  }, [id, fetchData]);

  const handleRefresh = useCallback(() => {
    if (id) {
      void fetchData(id);
      acknowledge();
    }
  }, [id, fetchData, acknowledge]);

  // ── Add link/video from paste ──
  const handleParsed = useCallback(async (og: OGData & { raw_url: string }) => {
    if (!id) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('board_items')
        .insert([{
          trip_id: id,
          user_id: user.id,
          type: og.content_type,
          title: og.title || og.raw_url,
          description: og.description || null,
          url: og.raw_url,
          thumbnail_url: og.image || null,
          source_meta: {
            site_name: og.site_name,
            og_type: og.type,
            embed_url: og.embed_url,
          },
          sort_order: 0,
        }])
        .select()
        .single();

      if (error) throw error;
      if (data) setItems(prev => [data, ...prev]);
    } catch (err) {
      console.error('Add board item error:', err);
      setErrorMsg('Failed to add item.');
    }
  }, [id]);

  // ── Add note ──
  const handleNote = useCallback(async (text: string) => {
    if (!id) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('board_items')
        .insert([{
          trip_id: id,
          user_id: user.id,
          type: 'note',
          title: text,
          sort_order: 0,
        }])
        .select()
        .single();

      if (error) throw error;
      if (data) setItems(prev => [data, ...prev]);
    } catch (err) {
      console.error('Add note error:', err);
      setErrorMsg('Failed to add note.');
    }
  }, [id]);

  // ── Image upload (placeholder — full encryption flow requires GitHub PAT) ──
  const handleImageUpload = useCallback(async (file: File) => {
    if (!id) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // For now, insert a board_item record tracking the file.
      // The actual encrypted upload to GitHub requires the PAT to be decrypted first.
      // This creates the DB record so the card appears; the file_path will be populated
      // when the full ImageStorage flow is wired with the user's PAT.
      const { data, error } = await supabase
        .from('board_items')
        .insert([{
          trip_id: id,
          user_id: user.id,
          type: 'image',
          title: file.name,
          file_size_bytes: file.size,
          sort_order: 0,
        }])
        .select()
        .single();

      if (error) throw error;
      if (data) setItems(prev => [data, ...prev]);
    } catch (err) {
      console.error('Image upload error:', err);
      setErrorMsg('Failed to upload image.');
    }
  }, [id]);

  // ── Delete ──
  const handleDelete = useCallback(async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('board_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      setItems(prev => prev.filter(i => i.id !== itemId));
    } catch (err) {
      console.error('Delete error:', err);
      setErrorMsg('Failed to delete item.');
    }
  }, []);

  // ── Color tag ──
  const handleTagChange = useCallback(async (itemId: string, tag: ColorTag) => {
    // Optimistic update
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, color_tag: tag } : i));

    const { error } = await supabase
      .from('board_items')
      .update({ color_tag: tag })
      .eq('id', itemId);

    if (error) {
      console.error('Tag update error:', error);
      // Revert on failure
      if (id) void fetchData(id);
    }
  }, [id, fetchData]);

  // ── Grouping ──
  const grouped = useMemo(() => {
    const groups = new Map<string, BoardItem[]>();

    for (const item of items) {
      let key: string;
      if (groupBy === 'type') {
        key = item.type.charAt(0).toUpperCase() + item.type.slice(1) + 's';
      } else if (groupBy === 'group') {
        key = item.group_label || 'Ungrouped';
      } else {
        // time — group by date
        const d = new Date(item.created_at);
        key = d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
      }

      const list = groups.get(key) ?? [];
      list.push(item);
      groups.set(key, list);
    }

    return Array.from(groups.entries());
  }, [items, groupBy]);

  if (loading) return null;
  if (!trip) return <div className="p-6">Trip not found</div>;

  return (
    <div className="mx-auto max-w-6xl p-6">
      <RefreshBanner visible={stale} onRefresh={handleRefresh} />

      {/* Header */}
      <div className="mb-6">
        <Button variant="secondary" size="sm" onClick={() => navigate('/dashboard')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Dashboard
        </Button>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--text-main)' }}>{trip.title}</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>Board</p>
      </div>

      {/* Input area */}
      <div className="mb-6 space-y-3">
        <BoardPasteInput onParsed={handleParsed} onNote={handleNote} />
        <ImageUpload
          onUpload={handleImageUpload}
          storageUsed={trip.storage_used_bytes ?? 0}
          storageLimit={TRIP_STORAGE_LIMIT_BYTES}
        />
      </div>

      {/* Group-by toggle */}
      <div className="mb-4 flex items-center gap-1">
        <span className="mr-2 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Group by:</span>
        {GROUP_BY_OPTIONS.map(opt => {
          const Icon = opt.icon;
          const active = groupBy === opt.value;
          return (
            <button
              key={opt.value}
              className="board-group-btn"
              data-active={active || undefined}
              onClick={() => setGroupBy(opt.value)}
            >
              <Icon className="h-3 w-3" />
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Board grid */}
      {grouped.map(([label, groupItems]) => (
        <section key={label} className="mb-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            {label}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {groupItems.map(item => (
              <BoardCard
                key={item.id}
                item={item}
                onDelete={(itemId) => setPendingDeleteId(itemId)}
                onTagChange={handleTagChange}
              />
            ))}
          </div>
        </section>
      ))}

      {items.length === 0 && (
        <div
          className="rounded-xl border border-dashed p-12 text-center"
          style={{ color: 'var(--text-muted)', borderColor: 'var(--border-color)' }}
        >
          Paste a link, drop an image, or type a note to get started.
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmModal
        open={!!pendingDeleteId}
        title="Delete item?"
        message="Are you sure you want to remove this from the board?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => {
          if (pendingDeleteId) void handleDelete(pendingDeleteId);
          setPendingDeleteId(null);
        }}
        onCancel={() => setPendingDeleteId(null)}
      />

      {/* Error modal */}
      <ConfirmModal
        open={!!errorMsg}
        title="Error"
        message={errorMsg ?? ''}
        confirmLabel="OK"
        cancelLabel="Close"
        variant="primary"
        onConfirm={() => setErrorMsg(null)}
        onCancel={() => setErrorMsg(null)}
      />
    </div>
  );
}
