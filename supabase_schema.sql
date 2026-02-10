-- Run this in your Supabase SQL Editor

-- 1. Create the trips table
create table public.trips (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  country text not null,
  name text not null,
  link text,
  notes text,
  image_url text,
  created_at timestamptz default now()
);

-- 2. Create the trip_members table for sharing
create table public.trip_members (
  id uuid default gen_random_uuid() primary key,
  trip_id uuid references public.trips(id) on delete cascade not null,
  user_email text not null,
  role text check (role in ('viewer', 'editor')) not null default 'viewer',
  created_at timestamptz default now(),
  unique(trip_id, user_email)
);

-- 3. Enable Row Level Security (RLS)
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;

-- 4. Trips Policies

-- VIEW: Owner OR Member can view
create policy "Users can view own or shared trips"
  on public.trips for select
  using (
    auth.uid() = user_id 
    or 
    exists (
      select 1 from public.trip_members 
      where trip_id = trips.id 
      and user_email = (select email from auth.users where id = auth.uid())
    )
  );

-- INSERT: Only registered users can create trips
create policy "Users can create trips"
  on public.trips for insert
  with check (auth.uid() = user_id);

-- UPDATE: Owner OR Editor can update
create policy "Users can update own or shared editable trips"
  on public.trips for update
  using (
    auth.uid() = user_id 
    or 
    exists (
      select 1 from public.trip_members 
      where trip_id = trips.id 
      and user_email = (select email from auth.users where id = auth.uid())
      and role = 'editor'
    )
  );

-- DELETE: Only Owner can delete
create policy "Only owner can delete trips"
  on public.trips for delete
  using (auth.uid() = user_id);

-- 5. Trip Members Policies (Managing the "Share List")

-- VIEW: Users can see who else is on the trip if they have access
create policy "Members can view other members"
  on public.trip_members for select
  using (
    exists (
      select 1 from public.trips 
      where id = trip_members.trip_id 
      and (
        user_id = auth.uid() -- Owner
        or exists ( -- Or another member
          select 1 from public.trip_members tm 
          where tm.trip_id = trip_members.trip_id 
          and tm.user_email = (select email from auth.users where id = auth.uid())
        )
      )
    )
  );

-- MANAGE: Only Owner can add/remove members
create policy "Only owner can manage members"
  on public.trip_members for all
  using (
    exists (
      select 1 from public.trips 
      where id = trip_members.trip_id 
      and user_id = auth.uid()
    )
  );
