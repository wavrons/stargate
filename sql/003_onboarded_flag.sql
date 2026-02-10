-- ============================================================
-- Migration 003: Add onboarded flag to profiles
-- Run this in your Supabase SQL Editor
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarded boolean NOT NULL DEFAULT false;
