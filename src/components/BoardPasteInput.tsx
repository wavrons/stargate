import { useState, useCallback } from 'react';
import { Link2, Loader2 } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { parseUrl, looksLikeUrl, normalizeUrl, type OGData } from '../lib/ogParse';

interface BoardPasteInputProps {
  /** Called with parsed OG data + the normalized URL when parsing succeeds */
  onParsed: (data: OGData & { raw_url: string }) => void;
  /** Called when the user submits a plain note (non-URL text) */
  onNote?: (text: string) => void;
  disabled?: boolean;
}

export function BoardPasteInput({ onParsed, onNote, disabled }: BoardPasteInputProps) {
  const [value, setValue] = useState('');
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = useCallback(async () => {
    const trimmed = value.trim();
    if (!trimmed) return;

    if (looksLikeUrl(trimmed)) {
      setParsing(true);
      setError('');
      try {
        const url = normalizeUrl(trimmed);
        const og = await parseUrl(url);
        onParsed({ ...og, raw_url: url });
        setValue('');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to parse URL';
        setError(msg);
      } finally {
        setParsing(false);
      }
    } else if (onNote) {
      onNote(trimmed);
      setValue('');
    }
  }, [value, onParsed, onNote]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text/plain').trim();
    if (text && looksLikeUrl(text)) {
      e.preventDefault();
      setValue(text);
      // Auto-parse on paste
      setParsing(true);
      setError('');
      try {
        const url = normalizeUrl(text);
        const og = await parseUrl(url);
        onParsed({ ...og, raw_url: url });
        setValue('');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to parse URL';
        setError(msg);
        setValue(text);
      } finally {
        setParsing(false);
      }
    }
  }, [onParsed]);

  return (
    <div className="board-paste-input">
      <div className="board-paste-input__row">
        <Link2 className="h-4 w-4 board-paste-input__icon" />
        <Input
          value={value}
          onChange={e => { setValue(e.target.value); setError(''); }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Paste a URL or type a note…"
          disabled={disabled || parsing}
          className="flex-1"
        />
        <Button
          size="sm"
          onClick={() => void handleSubmit()}
          disabled={disabled || parsing || !value.trim()}
        >
          {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
        </Button>
      </div>
      {error && <p className="board-paste-input__error">{error}</p>}
    </div>
  );
}
