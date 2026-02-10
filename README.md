# Stargate

Invitation-only trip planner built with React + Vite + Supabase.

Key features include:

- Trips dashboard + trip detail + itinerary view
- Supabase auth (email/password)
- Invitation-only registration + optional waitlist
- Admin panel (`/admin`) for invite codes + waitlist review
- Per-user city themes

## Local Development

1. Install deps

```bash
npm ci
```

2. Configure env

Create a `.env` file (not committed) based on `.env.example`:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

3. Run dev server

```bash
npm run dev
```

## Supabase Setup

Schemas are provided in the repo:

- `supabase_schema_v3_invites.sql` (invite codes + waitlist + admin users)
- `supabase_schema_v4_account.sql` (account-related)
- `supabase_schema_v5_city_themes.sql` (themes)

See:

- `INVITATION_SYSTEM_SETUP.md`
- `APPLE_AUTH_SETUP.md`

## GitHub Pages

This repo is configured to deploy via GitHub Actions to GitHub Pages.

Notes:

- Router uses `HashRouter` so deep links work on Pages.
- Vite `base` is set to `/stargate/`.
