import { useState, useRef, useCallback } from 'react';
import { Upload, Loader2, ImageIcon } from 'lucide-react';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif', 'image/bmp'];

interface ImageUploadProps {
  /** Called when an image file is selected and ready for upload */
  onUpload: (file: File) => Promise<void>;
  /** Current trip storage used in bytes */
  storageUsed: number;
  /** Max storage per trip in bytes */
  storageLimit: number;
  disabled?: boolean;
}

export function ImageUpload({ onUpload, storageUsed, storageLimit, disabled }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setError('');

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError(`Unsupported file type: ${file.type}`);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 10MB per file.`);
      return;
    }

    if (storageUsed + file.size > storageLimit) {
      const remaining = Math.max(0, storageLimit - storageUsed);
      setError(`Not enough storage. ${(remaining / 1024 / 1024).toFixed(1)}MB remaining.`);
      return;
    }

    setUploading(true);
    setProgress(0);
    try {
      await onUpload(file);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setError(msg);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [onUpload, storageUsed, storageLimit]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  }, [handleFile]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const usedMB = (storageUsed / (1024 * 1024)).toFixed(1);
  const limitMB = (storageLimit / (1024 * 1024)).toFixed(0);
  const usedPct = Math.min(100, Math.round((storageUsed / storageLimit) * 100));

  return (
    <div className="image-upload">
      <div
        className={`image-upload__dropzone ${dragOver ? 'image-upload__dropzone--active' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          onChange={handleInputChange}
          style={{ display: 'none' }}
        />
        {uploading ? (
          <div className="image-upload__status">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Encrypting & uploading… {progress}%</span>
          </div>
        ) : (
          <div className="image-upload__status">
            {dragOver ? (
              <ImageIcon className="h-6 w-6" />
            ) : (
              <Upload className="h-6 w-6" />
            )}
            <span>{dragOver ? 'Drop image here' : 'Drag & drop or click to upload'}</span>
          </div>
        )}
      </div>

      {error && <p className="image-upload__error">{error}</p>}

      <div className="image-upload__meter">
        <div className="image-upload__meter-bar">
          <div
            className="image-upload__meter-fill"
            style={{ width: `${usedPct}%` }}
          />
        </div>
        <span className="image-upload__meter-label">{usedMB} / {limitMB} MB</span>
      </div>
    </div>
  );
}
