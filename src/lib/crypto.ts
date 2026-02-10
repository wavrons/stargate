/**
 * PBKDF2 iterations - higher is safer but slower
 */
const ITERATIONS = 100000;
const SALT_SIZE = 16;
const IV_SIZE = 12; // AES-GCM standard IV size

/**
 * Derives a crypto key from a PIN/Password using PBKDF2
 */
async function deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a secret (PAT) with a PIN.
 * Returns a base64 string containing salt + iv + ciphertext
 */
export async function encryptSecret(pin: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = window.crypto.getRandomValues(new Uint8Array(SALT_SIZE));
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_SIZE));

  const key = await deriveKey(pin, salt);
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(secret)
  );

  // Combine salt + iv + ciphertext
  const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypts a base64 string using a PIN.
 * Returns the original secret (PAT) or throws error if PIN is wrong.
 */
export async function decryptSecret(pin: string, encryptedData: string): Promise<string> {
  try {
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    
    // Extract parts
    const salt = combined.slice(0, SALT_SIZE);
    const iv = combined.slice(SALT_SIZE, SALT_SIZE + IV_SIZE);
    const ciphertext = combined.slice(SALT_SIZE + IV_SIZE);

    const key = await deriveKey(pin, salt);
    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    const dec = new TextDecoder();
    return dec.decode(decrypted);
  } catch (e) {
    throw new Error('Invalid PIN or corrupted data');
  }
}

// ── Binary encryption for files (images) ──

/**
 * Derives a deterministic encryption key from a trip ID + app secret.
 * This means all images in a trip share the same key, derived from the trip ID.
 */
export async function deriveTripKey(tripId: string, appSecret: string): Promise<CryptoKey> {
  const salt = new TextEncoder().encode(`stargate-trip-${tripId}`);
  return deriveKey(appSecret, salt);
}

/**
 * Encrypts binary data (e.g. an image ArrayBuffer).
 * Returns a Uint8Array containing iv + ciphertext.
 */
export async function encryptBinary(key: CryptoKey, data: ArrayBuffer): Promise<Uint8Array> {
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_SIZE));
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  const combined = new Uint8Array(IV_SIZE + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), IV_SIZE);
  return combined;
}

/**
 * Decrypts binary data previously encrypted with encryptBinary.
 * Returns the original ArrayBuffer.
 */
export async function decryptBinary(key: CryptoKey, encrypted: Uint8Array): Promise<ArrayBuffer> {
  const iv = encrypted.slice(0, IV_SIZE);
  const ciphertext = encrypted.slice(IV_SIZE);

  return window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );
}

/**
 * Convert Uint8Array to base64 string (for GitHub API).
 */
export function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to Uint8Array (from GitHub API).
 */
export function base64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
