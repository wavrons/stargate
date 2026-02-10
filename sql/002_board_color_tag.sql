-- ============================================================
-- Migration 002: Replace tags array with color_tag column
-- Run this in your Supabase SQL Editor
-- ============================================================

-- If board_items already has a 'tags' column from migration 001, drop it
ALTER TABLE board_items DROP COLUMN IF EXISTS tags;

-- Add color_tag column
ALTER TABLE board_items
  ADD COLUMN IF NOT EXISTS color_tag text
  CHECK (color_tag IS NULL OR color_tag IN ('red', 'orange', 'green', 'blue', 'purple'));
