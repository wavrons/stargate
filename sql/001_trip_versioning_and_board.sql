-- ============================================================
-- Migration 001: Trip versioning, board_items, member cap
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Add version + storage tracking to trips
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS storage_used_bytes bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 2. Auto-bump version + updated_at on any trip_items change
CREATE OR REPLACE FUNCTION bump_trip_version()
RETURNS trigger AS $$
BEGIN
  UPDATE trips
  SET version = version + 1,
      updated_at = now()
  WHERE id = COALESCE(NEW.trip_id, OLD.trip_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_trip_items_version ON trip_items;
CREATE TRIGGER trg_trip_items_version
  AFTER INSERT OR UPDATE OR DELETE ON trip_items
  FOR EACH ROW EXECUTE FUNCTION bump_trip_version();

-- 3. board_items table (the new pooling board)
CREATE TABLE IF NOT EXISTS board_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  type text NOT NULL CHECK (type IN ('link', 'image', 'video', 'note')),
  title text NOT NULL DEFAULT '',
  description text,
  url text,
  thumbnail_url text,
  file_path text,
  file_size_bytes bigint DEFAULT 0,
  color_tag text CHECK (color_tag IS NULL OR color_tag IN ('red', 'orange', 'green', 'blue', 'purple')),
  source_meta jsonb DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  group_label text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_board_items_trip ON board_items(trip_id);

-- Auto-bump trip version on board_items changes too
DROP TRIGGER IF EXISTS trg_board_items_version ON board_items;
CREATE TRIGGER trg_board_items_version
  AFTER INSERT OR UPDATE OR DELETE ON board_items
  FOR EACH ROW EXECUTE FUNCTION bump_trip_version();

-- 4. Enforce max 10 members per trip
CREATE OR REPLACE FUNCTION check_trip_member_limit()
RETURNS trigger AS $$
DECLARE
  member_count integer;
BEGIN
  SELECT count(*) INTO member_count
  FROM trip_members
  WHERE trip_id = NEW.trip_id;

  IF member_count >= 10 THEN
    RAISE EXCEPTION 'Maximum 10 members per trip';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_trip_member_limit ON trip_members;
CREATE TRIGGER trg_trip_member_limit
  BEFORE INSERT ON trip_members
  FOR EACH ROW EXECUTE FUNCTION check_trip_member_limit();

-- 5. RLS for board_items (same pattern as trip_items)
ALTER TABLE board_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view board items for their trips"
  ON board_items FOR SELECT
  USING (
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
      UNION
      SELECT trip_id FROM trip_members WHERE user_email = auth.email()
    )
  );

CREATE POLICY "Editors can insert board items"
  ON board_items FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND (
      trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid())
      OR trip_id IN (SELECT trip_id FROM trip_members WHERE user_email = auth.email() AND role = 'editor')
    )
  );

CREATE POLICY "Editors can delete their own board items"
  ON board_items FOR DELETE
  USING (
    user_id = auth.uid() AND (
      trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid())
      OR trip_id IN (SELECT trip_id FROM trip_members WHERE user_email = auth.email() AND role = 'editor')
    )
  );

-- ============================================================
-- 6. Storage cap enforcement (100MB = 104857600 bytes per trip)
-- ============================================================

-- Auto-update storage_used_bytes when board_items with file_size_bytes are inserted/deleted
CREATE OR REPLACE FUNCTION update_trip_storage()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE trips
    SET storage_used_bytes = storage_used_bytes + COALESCE(NEW.file_size_bytes, 0)
    WHERE id = NEW.trip_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE trips
    SET storage_used_bytes = GREATEST(0, storage_used_bytes - COALESCE(OLD.file_size_bytes, 0))
    WHERE id = OLD.trip_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_board_items_storage ON board_items;
CREATE TRIGGER trg_board_items_storage
  AFTER INSERT OR DELETE ON board_items
  FOR EACH ROW EXECUTE FUNCTION update_trip_storage();

-- Check constraint: prevent inserting a board_item that would exceed 100MB
-- (This is a belt-and-suspenders check; the client also validates before upload)
CREATE OR REPLACE FUNCTION check_trip_storage_limit()
RETURNS trigger AS $$
DECLARE
  current_bytes bigint;
  max_bytes bigint := 104857600; -- 100MB
BEGIN
  SELECT storage_used_bytes INTO current_bytes
  FROM trips WHERE id = NEW.trip_id;

  IF (COALESCE(current_bytes, 0) + COALESCE(NEW.file_size_bytes, 0)) > max_bytes THEN
    RAISE EXCEPTION 'Trip storage limit exceeded (100MB max)';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_board_items_storage_check ON board_items;
CREATE TRIGGER trg_board_items_storage_check
  BEFORE INSERT ON board_items
  FOR EACH ROW EXECUTE FUNCTION check_trip_storage_limit();
