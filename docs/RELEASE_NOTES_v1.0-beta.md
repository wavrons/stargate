# Stargate v1.0 Beta — Release Notes

**Release Date:** 2026-02-11

---

## Overview

Stargate v1.0 Beta is the first feature-complete release of the collaborative trip planning platform. It introduces a full onboarding experience, a rich media board for organizing trip content, encrypted image storage, real-time collaboration awareness, and a themed UI system.

---

## Features

### Home Page
- Public landing page with a quote and a single "Bon Voyage" call-to-action.
- Accessible without authentication; serves as the entry point to the app.

### Onboarding Flow (First-Time Users)
- **Welcome Screen** — Full-screen Taipei-themed welcome with animated city name and "Tap to start" button.
- **Display Name** — Prompt to set a display name ("How should we address you?").
- **Privacy Card** — iOS App Store-style data privacy disclosure covering:
  - AES-256-GCM end-to-end encryption for uploaded images.
  - Per-trip PBKDF2 key derivation.
  - Supabase Auth session security.
  - Private GitHub repository storage.
  - No analytics, cookies, or third-party tracking.
  - OpenGraph metadata-only parsing (no content stored server-side).
  - "Data not linked to you" section (location, browsing history, device ID, contacts, usage data, diagnostics).
  - Continuing implies agreement to Terms of Service and Privacy Policy.
- **Theme Picker** — Choose from 8 city themes (Taipei, Rio, LA, Amsterdam, Tokyo, Seoul, Santorini, Arjeplog). On apply, the chosen city's loading screen plays.

### Board Page (`/trip/:id/board`)
- **Paste a URL** — Auto-detects URLs, calls the OpenGraph parsing Edge Function, and creates a rich link/video card with thumbnail, title, description, and site name.
- **Type a note** — Plain text entries saved as note-type board items.
- **Upload images** — Drag-and-drop or click-to-browse with client-side validation (type, size).
- **Board cards** — Responsive grid display with type badges (link, video, image, note).
- **Color dot tags** — 5 colors (red, orange, green, blue, purple). Click the dot on any card to cycle through colors or remove.
- **Group by** — Toggle between Time (date), Type (links/videos/images/notes), or Group label.
- **Delete** — Remove board items with themed confirmation modal.

### OpenGraph Parsing (Supabase Edge Function)
- Deployed Edge Function (`og-parse`) fetches and parses OpenGraph metadata from any URL.
- Extracts: `og:title`, `og:description`, `og:image`, `og:site_name`, `og:type`.
- Detects YouTube, Instagram, and TikTok URLs and returns `content_type: 'video'` with embed URLs.
- Reads only the first 100KB of HTML to stay fast and lightweight.

### Encrypted Image Storage
- Images are encrypted client-side with AES-256-GCM before upload.
- Each trip derives a unique encryption key from `(tripId + appSecret)` via PBKDF2.
- Encrypted files are pushed to a private GitHub repository (`AlNino77/gate_records`) at `data/images/{tripId}/{uuid}.jpg.enc`.
- Download reverses the process: fetch from GitHub → decrypt → display as blob URL.

### 100MB Storage Cap (Per Trip)
- **Client-side** — `ImageUpload` component checks `storageUsed + file.size` before uploading.
- **Server-side** — SQL trigger `check_trip_storage_limit` rejects inserts exceeding 104,857,600 bytes.
- **Auto-tracking** — SQL trigger `update_trip_storage` keeps `trips.storage_used_bytes` in sync on every insert/delete.
- **Visual meter** — Storage usage bar displayed in the upload area.

### Version Polling & Refresh Banner
- `useTripVersionPoll` hook polls `trips.version` every 30 seconds.
- SQL triggers auto-increment `trips.version` on any `trip_items` or `board_items` change.
- When a collaborator makes changes, a themed banner slides down: "A collaborator made changes. [Refresh]".

### Trip Sharing & Collaboration
- Invite members by email with role assignment (viewer/editor/admin).
- Member limit enforced at 10 per trip (SQL trigger).

### City Themes
- 8 city themes with full CSS variable theming: Taipei, Rio de Janeiro, Los Angeles, Amsterdam, Tokyo, Seoul, Santorini, Arjeplog.
- Theme transitions use a branded loading overlay with progress animation.
- Theme persists across sessions via `user_settings` table.

### UI Components
- Custom `Select` dropdown (replaces native `<select>`).
- Custom `ConfirmModal` (replaces native `confirm()`/`alert()`).
- Themed `RefreshBanner` for collaboration notifications.
- `BoardPasteInput` with auto-URL detection.
- `BoardCard` with rich media display and color tags.
- `ImageUpload` with drag-and-drop, progress, and quota meter.

---

## Database Migrations

| Migration | Description |
|---|---|
| `001_trip_versioning_and_board.sql` | Trip versioning, `board_items` table, version bump triggers, RLS policies, storage cap triggers |
| `002_board_color_tag.sql` | Replace `tags` array with `color_tag` enum column |
| `003_onboarded_flag.sql` | Add `onboarded` boolean to `profiles` table |

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public key |
| `VITE_ENCRYPTED_PAT` | Encrypted GitHub Personal Access Token |
| `VITE_IMAGE_ENCRYPTION_SECRET` | Master secret for AES image encryption key derivation |

---

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide icons
- **Backend:** Supabase (Auth, PostgreSQL, Edge Functions, RLS)
- **Storage:** GitHub private repository (encrypted)
- **Encryption:** AES-256-GCM, PBKDF2 key derivation (Web Crypto API)
- **Edge Functions:** Deno runtime (Supabase)
