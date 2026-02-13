import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { BoardPasteInput } from '../components/BoardPasteInput';
import { BoardCard } from '../components/BoardCard';
import { ImageUpload } from '../components/ImageUpload';
import { RefreshBanner } from '../components/RefreshBanner';
import { ConfirmModal } from '../components/ConfirmModal';
import { ShareModal } from '../components/ShareModal';
import { useTripVersionPoll } from '../hooks/useTripVersionPoll';
import { supabase, type Trip, type BoardItem, type ColorTag } from '../lib/supabase';
import { TRIP_STORAGE_LIMIT_BYTES } from '../config';
import type { OGData } from '../lib/ogParse';

// Inline icon components (SF-style)
const ChevronLeft = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="15 18 9 12 15 6"/></svg>
);
const ChevronRight = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="9 18 15 12 9 6"/></svg>
);
const Clock = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);
const Layers = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
);
const FolderOpen = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><path d="M1 10h22"/></svg>
);

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
  const [previewItem, setPreviewItem] = useState<BoardItem | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

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

  const previewUrl = useMemo(() => {
    if (!previewItem) return null;
    if (previewItem.url) return previewItem.url;

    const meta = (previewItem.source_meta ?? null) as Record<string, unknown> | null;
    const embedUrl = typeof meta?.embed_url === 'string' ? meta.embed_url : undefined;
    if (embedUrl) return embedUrl;
    const rawUrl = typeof meta?.raw_url === 'string' ? meta.raw_url : undefined;
    if (rawUrl) return rawUrl;

    const extractUrl = (value?: string | null) => {
      if (!value) return null;
      const match = value.match(/https?:\/\/[^\s)]+/i);
      return match ? match[0] : null;
    };

    return extractUrl(previewItem.title) ?? extractUrl(previewItem.description);
  }, [previewItem]);

  const handleCardOpen = useCallback((item: BoardItem) => {
    setPreviewItem(item);
    setPreviewVisible(true);
  }, []);

  useEffect(() => {
    if (!previewVisible) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPreviewVisible(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [previewVisible]);

  const previewTitle = previewUrl ?? (previewItem?.title ?? 'Preview');
  const previewOpen = previewVisible && !!previewItem;

  if (loading) return null;
  if (!trip) return <div className="p-6">Trip not found</div>;

  return (
    <div className="board-page">
      <div className="board-page__main">
        <RefreshBanner visible={stale} onRefresh={handleRefresh} />

        {/* Breadcrumb Header */}
        <div className="board-page__header">
          <div className="board-page__header-top">
            <div className="board-page__breadcrumb">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="board-page__breadcrumb-link"
                style={{ color: 'var(--text-muted)' }}
              >
                <ChevronLeft className="mr-1 h-4 w-4 inline" />
                Dashboard
              </button>
              <span className="board-page__breadcrumb-sep">/</span>
              <span className="board-page__breadcrumb-current" style={{ color: 'var(--text-main)' }}>
                {trip.title}
              </span>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setShareModalOpen(true)}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Share
            </Button>
          </div>
          <h1 className="board-page__title">{trip.title}</h1>
          <p className="board-page__subtitle">Board</p>
        </div>

        <div className="board-page__content">
          {/* Add button */}
          <div className="mb-6">
            <Button onClick={() => setAddModalOpen(true)}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add to Board
            </Button>
          </div>

          {/* Add modal */}
          {addModalOpen && (
            <div className="board-add-modal__backdrop" onClick={() => setAddModalOpen(false)}>
              <div className="board-add-modal" onClick={(e) => e.stopPropagation()}>
                <div className="board-add-modal__header">
                  <h2 style={{ color: 'var(--text-main)' }}>Add to Board</h2>
                  <button
                    type="button"
                    onClick={() => setAddModalOpen(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '24px', color: 'var(--text-main)' }}
                  >
                    ×
                  </button>
                </div>
                <div className="board-add-modal__content">
                  <BoardPasteInput onParsed={(og) => { void handleParsed(og); setAddModalOpen(false); }} onNote={(text) => { void handleNote(text); setAddModalOpen(false); }} />
                  <ImageUpload
                    onUpload={(file) => { void handleImageUpload(file).then(() => setAddModalOpen(false)); }}
                    storageUsed={trip.storage_used_bytes ?? 0}
                    storageLimit={TRIP_STORAGE_LIMIT_BYTES}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Group-by toggle */}
          <div className="mb-6 flex items-center gap-1">
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
                  onOpen={handleCardOpen}
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
      </div>

      <button
        type="button"
        className="board-preview-toggle"
        aria-label={previewOpen ? 'Hide preview' : previewItem ? 'Show preview' : 'Select a card to enable preview'}
        data-open={previewOpen || undefined}
        onClick={() => {
          if (!previewItem) return;
          setPreviewVisible(prev => !prev);
        }}
        disabled={!previewItem}
      >
        <ChevronRight className="board-preview-toggle__icon" />
      </button>

      {shareModalOpen && id && (
        <ShareModal 
          tripId={id} 
          onClose={() => setShareModalOpen(false)} 
        />
      )}

      {previewOpen && (
        <aside className="side-browser side-browser--open" aria-hidden={false}>
          <button
            type="button"
            className="side-browser__scrim"
            aria-hidden="true"
            onClick={() => setPreviewVisible(false)}
          />
          <div className="side-browser__panel" role="dialog" aria-label="Link preview">
            <div className="side-browser__inner">
              <div className="side-browser__header">
                <div>
                  <p className="side-browser__eyebrow">{previewItem?.type}</p>
                  <h3 className="side-browser__title">{previewTitle}</h3>
                </div>
                <div className="side-browser__header-actions">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPreviewVisible(false)}
                  >
                    Close
                  </Button>
                  {previewUrl && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        window.open(previewUrl, '_blank', 'noopener,noreferrer');
                      }}
                    >
                      Open tab
                    </Button>
                  )}
                  <button
                    type="button"
                    className="side-browser__close"
                    onClick={() => setPreviewVisible(false)}
                    aria-label="Close preview"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="side-browser__body">
                {previewUrl ? (
                  <iframe
                    key={previewUrl}
                    src={previewUrl}
                    title={previewTitle}
                    className="side-browser__frame"
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                  />
                ) : (
                  <p className="side-browser__empty">
                    This note doesn’t contain a link we can preview. Use the external link button instead.
                  </p>
                )}
              </div>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
