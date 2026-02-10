// This file holds the encrypted GitHub PAT.
// You will generate this string using the "Setup" mode in the Login screen.
export const ENCRYPTED_PAT = import.meta.env.VITE_ENCRYPTED_PAT || '';

// Configuration for the private data repo
export const REPO_CONFIG = {
  owner: 'AlNino77',
  repo: 'gate_records',
  path: 'data/travel-data.json',
  branch: 'main'
};

// Storage limits
export const TRIP_STORAGE_LIMIT_BYTES = 100 * 1024 * 1024; // 100MB per trip
export const MAX_MEMBERS_PER_TRIP = 10;

// Secret used to derive per-trip encryption keys for image storage.
// Set VITE_IMAGE_ENCRYPTION_SECRET in your .env file.
export const IMAGE_ENCRYPTION_SECRET = import.meta.env.VITE_IMAGE_ENCRYPTION_SECRET || '';
