-- Run this AFTER supabase_schema_v2.sql and supabase_schema_v3_invites.sql

-- Account / Profile / Settings / Frequent flyer accounts

-- 1) Profiles
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_path text,
  deactivated_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2) User settings (theme for future)
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text check (theme in ('system', 'light', 'dark')) default 'system',
  avatar_bg text check (avatar_bg in ('taipei', 'rio', 'los_angeles', 'amsterdam', 'tokyo', 'seoul', 'santorini', 'arjeplog')) default 'taipei',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3) Frequent flyer accounts
create table if not exists public.frequent_flyer_accounts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  airline_code text not null,
  airline_name text,
  member_number text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, airline_code, member_number)
);

-- updated_at helpers
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_user_settings_updated_at on public.user_settings;
create trigger trg_user_settings_updated_at
before update on public.user_settings
for each row execute function public.set_updated_at();

drop trigger if exists trg_ff_updated_at on public.frequent_flyer_accounts;
create trigger trg_ff_updated_at
before update on public.frequent_flyer_accounts
for each row execute function public.set_updated_at();

-- Create rows on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (user_id) do nothing;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.frequent_flyer_accounts enable row level security;

-- Profiles policies
drop policy if exists "Profiles: read own" on public.profiles;
create policy "Profiles: read own"
  on public.profiles for select
  using (auth.uid() = user_id);

drop policy if exists "Profiles: update own" on public.profiles;
create policy "Profiles: update own"
  on public.profiles for update
  using (auth.uid() = user_id);

drop policy if exists "Profiles: insert own" on public.profiles;
create policy "Profiles: insert own"
  on public.profiles for insert
  with check (auth.uid() = user_id);

-- Settings policies
drop policy if exists "Settings: read own" on public.user_settings;
create policy "Settings: read own"
  on public.user_settings for select
  using (auth.uid() = user_id);

drop policy if exists "Settings: upsert own" on public.user_settings;
create policy "Settings: upsert own"
  on public.user_settings for all
  using (
    auth.uid() = user_id
    and (avatar_bg is distinct from 'arjeplog' or public.is_admin())
  )
  with check (
    auth.uid() = user_id
    and (avatar_bg is distinct from 'arjeplog' or public.is_admin())
  );

-- Frequent flyer policies
drop policy if exists "FF: read own" on public.frequent_flyer_accounts;
create policy "FF: read own"
  on public.frequent_flyer_accounts for select
  using (auth.uid() = user_id);

drop policy if exists "FF: insert own" on public.frequent_flyer_accounts;
create policy "FF: insert own"
  on public.frequent_flyer_accounts for insert
  with check (auth.uid() = user_id);

drop policy if exists "FF: update own" on public.frequent_flyer_accounts;
create policy "FF: update own"
  on public.frequent_flyer_accounts for update
  using (auth.uid() = user_id);

drop policy if exists "FF: delete own" on public.frequent_flyer_accounts;
create policy "FF: delete own"
  on public.frequent_flyer_accounts for delete
  using (auth.uid() = user_id);

-- Reactivation helper: clear deactivated_at for current user
create or replace function public.reactivate_me()
returns void as $$
begin
  update public.profiles
  set deactivated_at = null
  where user_id = auth.uid();
end;
$$ language plpgsql security definer;

-- Deactivate helper: set deactivated_at for current user
create or replace function public.deactivate_me()
returns void as $$
begin
  update public.profiles
  set deactivated_at = now()
  where user_id = auth.uid();
end;
$$ language plpgsql security definer;
