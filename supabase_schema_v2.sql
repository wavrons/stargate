-- Run this in your Supabase SQL Editor (Replace previous schema)

-- 1. Create Trips table (The container)
create table public.trips (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  title text not null,
  start_date date,
  end_date date,
  created_at timestamptz default now()
);

-- 2. Create Trip Items table (The POIs)
create table public.trip_items (
  id uuid default gen_random_uuid() primary key,
  trip_id uuid references public.trips(id) on delete cascade not null,
  country text not null,
  name text not null,
  link text,
  notes text,
  image_url text,
  created_at timestamptz default now(),
  user_id uuid references auth.users(id) not null -- creator of the item
);

-- 3. Create Trip Members table (Sharing)
create table public.trip_members (
  id uuid default gen_random_uuid() primary key,
  trip_id uuid references public.trips(id) on delete cascade not null,
  user_email text not null,
  role text check (role in ('viewer', 'editor')) not null default 'viewer',
  created_at timestamptz default now(),
  unique(trip_id, user_email)
);

-- 4. Enable RLS
alter table public.trips enable row level security;
alter table public.trip_items enable row level security;
alter table public.trip_members enable row level security;

-- 5. Helper function to check access
-- (Makes policies cleaner/faster than repeated subqueries)
create or replace function public.has_trip_access(check_trip_id uuid, check_role text default 'viewer')
returns boolean as $$
begin
  return exists (
    select 1 from public.trips 
    where id = check_trip_id and user_id = auth.uid()
  ) or exists (
    select 1 from public.trip_members 
    where trip_id = check_trip_id 
    and user_email = (select email from auth.users where id = auth.uid())
    and (check_role = 'viewer' or role = 'editor') -- editor implies viewer access
  );
end;
$$ language plpgsql security definer;

-- 6. Policies for TRIPS

create policy "View trips: Owner or Member"
  on public.trips for select
  using (public.has_trip_access(id));

create policy "Create trips: Authenticated users"
  on public.trips for insert
  with check (auth.uid() = user_id);

create policy "Update trips: Owner or Editor"
  on public.trips for update
  using (public.has_trip_access(id, 'editor'));

create policy "Delete trips: Only Owner"
  on public.trips for delete
  using (auth.uid() = user_id);

-- 7. Policies for TRIP ITEMS (POIs)

create policy "View items: Trip access"
  on public.trip_items for select
  using (public.has_trip_access(trip_id));

create policy "Create items: Trip editor access"
  on public.trip_items for insert
  with check (public.has_trip_access(trip_id, 'editor'));

create policy "Update items: Trip editor access"
  on public.trip_items for update
  using (public.has_trip_access(trip_id, 'editor'));

create policy "Delete items: Trip editor access"
  on public.trip_items for delete
  using (public.has_trip_access(trip_id, 'editor'));

-- 8. Policies for TRIP MEMBERS

create policy "View members: Trip access"
  on public.trip_members for select
  using (public.has_trip_access(trip_id));

create policy "Manage members: Only Owner"
  on public.trip_members for all
  using (
    exists (
      select 1 from public.trips 
      where id = trip_members.trip_id 
      and user_id = auth.uid()
    )
  );
