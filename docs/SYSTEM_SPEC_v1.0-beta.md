# Stargate v1.0 Beta — System Spec & Limitations

**Date:** 2026-02-11

---

## Architecture

```
Browser (React SPA)
  ├── Supabase Auth (email/password, magic link)
  ├── Supabase PostgreSQL (trips, trip_items, board_items, profiles, user_settings)
  ├── Supabase Edge Function (og-parse, Deno runtime)
  └── GitHub API (Octokit)
        └── Private repo: AlNino77/gate_records
              └── data/images/{tripId}/{uuid}.jpg.enc (AES-256-GCM encrypted)
```

---

## Known Limitations

### Authentication & Access
- **Invite-only access.** New users must receive an invite code or be approved from the waitlist. There is no open registration.
- **No OAuth providers.** Only email/password and magic link authentication are supported. No Google, GitHub, or Apple sign-in.
- **Single session.** No multi-device session management. Logging in on a new device does not invalidate other sessions, but there is no session list or remote logout.

### Collaboration
- **Polling-based, not real-time.** Version changes are detected by polling every 30 seconds. There are no WebSocket subscriptions or Supabase Realtime channels.
- **No conflict resolution.** If two users edit the same trip simultaneously, the last write wins. There is no merge or diff UI.
- **No per-item locking.** Any editor can modify or delete any item on a shared trip.
- **Member limit: 10.** Enforced by SQL trigger. No UI to increase this.

### Board & Content
- **No drag-and-drop reordering.** Board items have a `sort_order` column but no UI to reorder them. Items display in reverse chronological order.
- **No inline editing.** Board cards cannot be edited after creation. To change content, delete and re-add.
- **No tagging UI beyond color dots.** The 5 color dots are the only tagging mechanism. No text tags, search, or filter by tag.
- **Group-by "Group" requires manual `group_label`.** There is no UI to assign group labels yet. This group-by option will show "Ungrouped" for all items until group labels are supported.
- **OG parsing may fail on some sites.** Sites that require JavaScript rendering (SPAs), block server-side fetches, or use non-standard meta tags may return incomplete or empty metadata.
- **Video embeds are link-only.** YouTube/Instagram/TikTok URLs are detected and tagged as video type with embed URLs, but there is no inline video player. Cards link out to the original URL.

### Image Storage
- **100MB per trip.** Hard limit enforced both client-side and server-side. No way to increase per trip.
- **10MB per file.** Individual file size limit enforced client-side only.
- **Accepted formats:** JPEG, PNG, GIF, WebP only.
- **No image thumbnails.** Full encrypted images are stored and downloaded. There is no server-side thumbnail generation or progressive loading.
- **Download requires decryption.** Every image view requires a full GitHub API fetch + AES decryption. No caching layer beyond browser memory.
- **GitHub API rate limits.** Unauthenticated: 60 req/hr. Authenticated (PAT): 5,000 req/hr. Heavy image usage on a trip with many collaborators could hit this.
- **No image deletion from GitHub on board item delete.** The `board_items` row is deleted and `storage_used_bytes` is decremented, but the encrypted file remains in the GitHub repo. Manual cleanup required.

### Encryption
- **Client-side only.** All encryption/decryption happens in the browser via Web Crypto API. The server never sees plaintext image data.
- **Single master secret.** `VITE_IMAGE_ENCRYPTION_SECRET` is the root of all per-trip key derivation. If compromised, all trip images across all users are at risk.
- **No key rotation.** There is no mechanism to rotate the master secret or re-encrypt existing images with a new key.
- **Secret is in `.env`.** The master secret is a build-time environment variable bundled into the client JS. It is not truly secret from anyone who can inspect the built bundle. This is a known trade-off for a client-side-only architecture.

### UI & Theming
- **No dark mode.** All 8 city themes are light-mode only.
- **No responsive mobile optimization.** The app is usable on mobile but not optimized for small screens. Some layouts may overflow or feel cramped.
- **Theme changes require a full overlay transition.** There is no instant theme switch; every change plays the loading screen animation.

### Edge Function (og-parse)
- **Cold start latency.** First invocation after idle may take 1–3 seconds due to Deno cold start on Supabase Edge Functions.
- **100KB HTML limit.** Only the first 100KB of a page's HTML is read. Sites with very large DOMs or late-injected meta tags may not be parsed correctly.
- **No caching.** Every URL paste triggers a fresh fetch. There is no server-side or client-side cache for previously parsed URLs.
- **CORS proxy only.** The Edge Function acts as a CORS proxy for OG metadata. It does not store any fetched content.

### Database
- **No soft delete.** Deleting trips, items, or board items is permanent (hard delete with `ON DELETE CASCADE`).
- **No audit log.** There is no record of who created, modified, or deleted items.
- **No backup strategy.** Supabase provides daily backups on paid plans, but there is no app-level export or backup feature.
- **RLS policies are basic.** Row-level security allows trip owners and members to access data, but there is no fine-grained permission model beyond viewer/editor/admin roles.

### Deployment
- **No CI/CD pipeline.** Deployment is manual (`npm run build` + host). Edge Function deployment is via `npx supabase functions deploy`.
- **No staging environment.** Only one Supabase project (production). No separate staging or preview deployments.
- **Docker not required.** The Supabase CLI warned about Docker not running, but Edge Function deployment works without it (remote deploy).

---

## System Requirements

| Component | Requirement |
|---|---|
| **Browser** | Chrome 90+, Firefox 90+, Safari 15+, Edge 90+ (Web Crypto API required) |
| **Node.js** | 18+ (for local development) |
| **Supabase** | Free tier or above (Edge Functions, PostgreSQL, Auth) |
| **GitHub** | Private repo with PAT (classic, `repo` scope) |

---

## File Structure (Key Files)

```
stargate/
├── docs/
│   ├── RELEASE_NOTES_v1.0-beta.md
│   └── SYSTEM_SPEC_v1.0-beta.md
├── sql/
│   ├── 001_trip_versioning_and_board.sql
│   ├── 002_board_color_tag.sql
│   └── 003_onboarded_flag.sql
├── supabase/functions/og-parse/index.ts
├── src/
│   ├── components/
│   │   ├── BoardCard.tsx
│   │   ├── BoardPasteInput.tsx
│   │   ├── ConfirmModal.tsx
│   │   ├── ImageUpload.tsx
│   │   ├── RefreshBanner.tsx
│   │   ├── Select.tsx
│   │   └── ShareModal.tsx
│   ├── hooks/
│   │   └── useTripVersionPoll.ts
│   ├── lib/
│   │   ├── crypto.ts
│   │   ├── github.ts
│   │   ├── imageStorage.ts
│   │   ├── ogParse.ts
│   │   └── supabase.ts
│   ├── pages/
│   │   ├── Account.tsx
│   │   ├── Auth.tsx
│   │   ├── Board.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Home.tsx
│   │   ├── Itinerary.tsx
│   │   ├── Onboarding.tsx
│   │   ├── TripDetail.tsx
│   │   ├── UpdatePassword.tsx
│   │   └── Waitlist.tsx
│   ├── config.ts
│   ├── App.tsx
│   └── index.css
├── .env
├── .env.example
└── package.json
```
