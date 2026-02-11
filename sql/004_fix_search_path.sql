-- ============================================================
-- Migration 004: Fix function search_path warnings
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Drop debug function
DROP FUNCTION IF EXISTS public.test_auth_uid();

-- Fix search_path for all functions (security best practice)
ALTER FUNCTION public.has_trip_access(uuid, text) SET search_path = public;
ALTER FUNCTION public.bump_trip_version() SET search_path = public;
ALTER FUNCTION public.check_trip_member_limit() SET search_path = public;
ALTER FUNCTION public.update_trip_storage() SET search_path = public;
ALTER FUNCTION public.check_trip_storage_limit() SET search_path = public;
ALTER FUNCTION public.is_admin() SET search_path = public;
ALTER FUNCTION public.generate_invite_code() SET search_path = public;
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.reactivate_me() SET search_path = public;
ALTER FUNCTION public.deactivate_me() SET search_path = public;
