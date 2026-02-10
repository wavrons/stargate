import { Trash2, ExternalLink, Play } from 'lucide-react';
import { Button } from './Button';
import { type BoardItem, type ColorTag, COLOR_TAG_OPTIONS } from '../lib/supabase';

interface BoardCardProps {
  item: BoardItem;
  onDelete: (id: string) => void;
  onTagChange: (id: string, tag: ColorTag) => void;
}

function nextTag(current: ColorTag): ColorTag {
  const values: ColorTag[] = [null, ...COLOR_TAG_OPTIONS.map(o => o.value)];
  const idx = values.indexOf(current);
  return values[(idx + 1) % values.length];
}

function tagHex(tag: ColorTag): string | undefined {
  return COLOR_TAG_OPTIONS.find(o => o.value === tag)?.hex;
}

export function BoardCard({ item, onDelete, onTagChange }: BoardCardProps) {
  const hasThumb = !!item.thumbnail_url;
  const isVideo = item.type === 'video';
  const embedUrl = (item.source_meta as Record<string, unknown>)?.embed_url as string | undefined;

  return (
    <div className="board-card">
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
              <Play className="h-8 w-8" style={{ color: '#fff', opacity: 0.9 }} />
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
        {(item.url || embedUrl) && (
          <a
            href={item.url || embedUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ marginRight: 'auto' }}
          >
            <Button variant="secondary" size="sm">
              <ExternalLink className="h-3 w-3" />
            </Button>
          </a>
        )}
        <Button variant="danger" size="sm" onClick={() => onDelete(item.id)}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
