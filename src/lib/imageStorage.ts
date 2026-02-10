import { Octokit } from 'octokit';
import { REPO_CONFIG } from '../config';
import {
  deriveTripKey,
  encryptBinary,
  decryptBinary,
  uint8ToBase64,
  base64ToUint8,
} from './crypto';

const IMAGE_DIR = 'data/images';

/**
 * Encrypted image storage backed by a private GitHub repo.
 *
 * Flow:
 *   Upload: File → ArrayBuffer → AES-256-GCM encrypt → base64 → GitHub commit
 *   Download: GitHub raw → base64 decode → AES-256-GCM decrypt → blob URL
 *
 * Each trip derives its own encryption key from (tripId + appSecret) via PBKDF2,
 * so even if the repo is compromised, images are unreadable without the secret.
 */
export class ImageStorage {
  private octokit: Octokit;
  private owner: string;
  private repo: string;
  private branch: string;
  private appSecret: string;

  // SHA cache for updates (GitHub requires the blob SHA to update a file)
  private shaCache = new Map<string, string>();

  constructor(token: string, appSecret: string) {
    this.octokit = new Octokit({ auth: token });
    this.owner = REPO_CONFIG.owner;
    this.repo = REPO_CONFIG.repo;
    this.branch = REPO_CONFIG.branch;
    this.appSecret = appSecret;
  }

  /**
   * Upload an image file, encrypt it, and push to the private repo.
   * Returns the repo-relative file path (e.g. "data/images/{tripId}/{uuid}.enc").
   */
  async upload(
    tripId: string,
    file: File,
    onProgress?: (pct: number) => void
  ): Promise<{ filePath: string; sizeBytes: number }> {
    onProgress?.(10);

    // Read file into ArrayBuffer
    const buffer = await file.arrayBuffer();
    const sizeBytes = buffer.byteLength;
    onProgress?.(30);

    // Encrypt
    const key = await deriveTripKey(tripId, this.appSecret);
    const encrypted = await encryptBinary(key, buffer);
    onProgress?.(60);

    // Generate a unique filename
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
    const uuid = crypto.randomUUID();
    const filePath = `${IMAGE_DIR}/${tripId}/${uuid}.${ext}.enc`;

    // Base64 encode for GitHub API
    const content = uint8ToBase64(encrypted);
    onProgress?.(75);

    // Push to GitHub
    await this.octokit.rest.repos.createOrUpdateFileContents({
      owner: this.owner,
      repo: this.repo,
      path: filePath,
      message: `Upload image: ${file.name} [trip:${tripId}]`,
      content,
      branch: this.branch,
    });
    onProgress?.(100);

    return { filePath, sizeBytes };
  }

  /**
   * Download and decrypt an image from the repo.
   * Returns an object URL that can be used as an <img> src.
   * Caller is responsible for revoking the URL when done.
   */
  async download(tripId: string, filePath: string): Promise<string> {
    const { data } = await this.octokit.rest.repos.getContent({
      owner: this.owner,
      repo: this.repo,
      path: filePath,
      ref: this.branch,
    });

    if (!('content' in data) || typeof data.content !== 'string') {
      throw new Error('File not found or not a file');
    }

    this.shaCache.set(filePath, data.sha);

    // GitHub returns base64 with newlines; strip them
    const cleanB64 = data.content.replace(/\n/g, '');
    const encrypted = base64ToUint8(cleanB64);

    // Decrypt
    const key = await deriveTripKey(tripId, this.appSecret);
    const decrypted = await decryptBinary(key, encrypted);

    // Detect MIME from original extension (strip .enc suffix)
    const origName = filePath.replace(/\.enc$/, '');
    const ext = origName.split('.').pop()?.toLowerCase() ?? '';
    const mime = MIME_MAP[ext] ?? 'application/octet-stream';

    const blob = new Blob([decrypted], { type: mime });
    return URL.createObjectURL(blob);
  }

  /**
   * Delete an encrypted image from the repo.
   */
  async delete(filePath: string): Promise<void> {
    // We need the SHA — try cache first, otherwise fetch it
    let sha = this.shaCache.get(filePath);
    if (!sha) {
      const { data } = await this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: filePath,
        ref: this.branch,
      });
      if ('sha' in data) sha = data.sha;
    }

    if (!sha) throw new Error('Cannot resolve SHA for deletion');

    await this.octokit.rest.repos.deleteFile({
      owner: this.owner,
      repo: this.repo,
      path: filePath,
      message: `Delete image: ${filePath}`,
      sha,
      branch: this.branch,
    });

    this.shaCache.delete(filePath);
  }
}

const MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  heic: 'image/heic',
  heif: 'image/heif',
  tiff: 'image/tiff',
  ico: 'image/x-icon',
};
