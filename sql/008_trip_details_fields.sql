-- ============================================================
-- Migration 008: Trip details fields (Vault / Logbook)
-- Run this AFTER your base schema and migration 001
-- ============================================================

ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS date_mode text NOT NULL DEFAULT 'fixed' CHECK (date_mode IN ('fixed', 'flex')),
  ADD COLUMN IF NOT EXISTS duration_nights integer,
  ADD COLUMN IF NOT EXISTS flight_number text,
  ADD COLUMN IF NOT EXISTS flight_airline text,
  ADD COLUMN IF NOT EXISTS flight_status text,
  ADD COLUMN IF NOT EXISTS stay_name text,
  ADD COLUMN IF NOT EXISTS stay_address text,
  ADD COLUMN IF NOT EXISTS stay_checkin_time text,
  ADD COLUMN IF NOT EXISTS transport_notes text;
