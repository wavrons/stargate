import { SFTrashFill } from './SFSymbols';
import { Button } from './Button';
import { type BoardItem, type ColorTag, COLOR_TAG_OPTIONS } from '../lib/supabase';

interface BoardCardProps {
  item: BoardItem;
  onDelete: (id: string) => void;
  onTagChange: (id: string, tag: ColorTag) => void;
  onOpen?: (item: BoardItem) => void;
}

function nextTag(current: ColorTag): ColorTag {
  const values: ColorTag[] = [null, ...COLOR_TAG_OPTIONS.map(o => o.value)];
  const idx = values.indexOf(current);
  return values[(idx + 1) % values.length];
}

function tagHex(tag: ColorTag): string | undefined {
  return COLOR_TAG_OPTIONS.find(o => o.value === tag)?.hex;
}

export function BoardCard({ item, onDelete, onTagChange, onOpen }: BoardCardProps) {
  const hasThumb = !!item.thumbnail_url;
  const isVideo = item.type === 'video';
  const embedUrl = (item.source_meta as Record<string, unknown>)?.embed_url as string | undefined;
  const resolvedUrl = item.url || embedUrl;

  const clickable = typeof onOpen === 'function';

  return (
    <div
      className="board-card"
      onClick={() => {
        if (!onOpen) return;
        onOpen(item);
      }}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={(event) => {
        if (!clickable) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen?.(item);
        }
      }}
    >
      {/* Color tag dot — top-right corner */}
      <button
        className="board-card__tag-dot"
        title={item.color_tag ? `Tag: ${item.color_tag}` : 'Add color tag'}
        onClick={(e) => {
          e.stopPropagation();
          onTagChange(item.id, nextTag(item.color_tag));
        }}
        style={{
          background: tagHex(item.color_tag) ?? 'var(--border-color)',
          opacity: item.color_tag ? 1 : 0.4,
        }}
      />

      {hasThumb && (
        <div style={{ position: 'relative' }}>
          <img
            src={item.thumbnail_url}
            alt={item.title}
            className="board-card__thumb"
            loading="lazy"
          />
          {isVideo && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.25)', pointerEvents: 'none',
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8" style={{ color: '#fff', opacity: 0.9 }}>
                <polygon points="8 5 19 12 8 19" />
              </svg>
            </div>
          )}
        </div>
      )}

      <div className="board-card__body">
        <span className="board-card__type">{item.type}</span>
        {item.title && <div className="board-card__title">{item.title}</div>}
        {item.description && <div className="board-card__desc">{item.description}</div>}
        {item.source_meta && (item.source_meta as Record<string, unknown>).site_name ? (
          <div className="board-card__site">
            {String((item.source_meta as Record<string, unknown>).site_name)}
          </div>
        ) : null}
      </div>

      <div className="board-card__actions">
        {resolvedUrl && (
          <a
            href={resolvedUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
            style={{ marginRight: 'auto' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        )}
        {resolvedUrl && (
          <button
            type="button"
            aria-label="Copy URL"
            title="Copy URL"
            onClick={async (event) => {
              event.stopPropagation();
              try {
                await navigator.clipboard.writeText(resolvedUrl);
              } catch {
                // ignore
              }
            }}
            style={{
              marginRight: 8,
              width: 28,
              height: 28,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              border: '1px solid var(--border-color)',
              background: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>
        )}
        <Button
          variant="danger"
          size="sm"
          onClick={(event) => {
            event.stopPropagation();
            onDelete(item.id);
          }}
        >
          <SFTrashFill size={16} />
        </Button>
      </div>
    </div>
  );
}
