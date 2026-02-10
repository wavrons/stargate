-- Run this AFTER supabase_schema_v4_account.sql
-- Migrates from separate theme + avatar_bg to unified city_theme

-- 1) Add new city_theme column to user_settings
alter table public.user_settings 
add column if not exists city_theme text 
check (city_theme in ('taipei', 'rio', 'los_angeles', 'amsterdam', 'tokyo', 'seoul', 'santorini', 'arjeplog')) 
default 'taipei';

-- 2) Migrate existing avatar_bg values to city_theme (if not already set)
update public.user_settings
set city_theme = coalesce(avatar_bg, 'taipei')
where city_theme is null or city_theme = 'taipei';

-- 3) Drop existing RLS policies that depend on old columns
drop policy if exists "Settings: select own" on public.user_settings;
drop policy if exists "Settings: insert own" on public.user_settings;
drop policy if exists "Settings: upsert own" on public.user_settings;
drop policy if exists user_settings_arjeplog_admin_only on public.user_settings;

-- 4) Drop old columns (theme and avatar_bg)
alter table public.user_settings drop column if exists theme;
alter table public.user_settings drop column if exists avatar_bg;

-- 5) Recreate RLS policies with new column
create policy "Settings: select own"
on public.user_settings
for select
using (auth.uid() = user_id);

create policy "Settings: insert own"
on public.user_settings
for insert
with check (auth.uid() = user_id);

create policy "Settings: upsert own"
on public.user_settings
for update
using (auth.uid() = user_id);

-- 6) Add restrictive policy for admin-only arjeplog theme
create policy user_settings_arjeplog_admin_only
on public.user_settings
as restrictive
for update
using (
  city_theme != 'arjeplog' 
  or exists (
    select 1 from public.admin_users where user_id = auth.uid()
  )
);
