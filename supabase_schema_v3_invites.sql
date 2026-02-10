-- Run this AFTER supabase_schema_v2.sql to add invitation system

-- 1. Create invite_codes table
create table public.invite_codes (
  id uuid default gen_random_uuid() primary key,
  code text unique not null check (length(code) = 6),
  created_by uuid references auth.users(id) not null,
  created_for_name text,
  created_for_email text,
  used_by uuid references auth.users(id),
  used_at timestamptz,
  created_at timestamptz default now(),
  expires_at timestamptz
);

-- 2. Create waitlist table
create table public.waitlist (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text not null unique,
  message text,
  status text check (status in ('pending', 'approved', 'rejected')) default 'pending',
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

-- 3. Create admin_users table (simple approach: list of admin user IDs)
create table public.admin_users (
  user_id uuid references auth.users(id) primary key,
  created_at timestamptz default now()
);

-- 4. Enable RLS
alter table public.invite_codes enable row level security;
alter table public.waitlist enable row level security;
alter table public.admin_users enable row level security;

-- 5. Helper function to check if user is admin
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.admin_users 
    where user_id = auth.uid()
  );
end;
$$ language plpgsql security definer;

-- 6. Policies for INVITE_CODES

-- Anyone can view unused codes (for validation during signup)
create policy "Anyone can view unused codes"
  on public.invite_codes for select
  using (used_by is null);

-- Admins can view all codes
create policy "Admins can view all codes"
  on public.invite_codes for select
  using (public.is_admin());

-- Admins can create codes
create policy "Admins can create codes"
  on public.invite_codes for insert
  with check (public.is_admin() and auth.uid() = created_by);

-- System can mark codes as used (via service role or trigger)
create policy "System can update codes"
  on public.invite_codes for update
  using (true);

-- Admins can delete codes
create policy "Admins can delete codes"
  on public.invite_codes for delete
  using (public.is_admin());

-- 7. Policies for WAITLIST

-- Anyone can submit to waitlist
create policy "Anyone can join waitlist"
  on public.waitlist for insert
  with check (true);

-- Admins can view all waitlist entries
create policy "Admins can view waitlist"
  on public.waitlist for select
  using (public.is_admin());

-- Admins can update waitlist status
create policy "Admins can update waitlist"
  on public.waitlist for update
  using (public.is_admin());

-- 8. Policies for ADMIN_USERS

-- Only admins can view admin list
create policy "Admins can view admin list"
  on public.admin_users for select
  using (public.is_admin());

-- 9. Function to generate random 6-digit code
create or replace function public.generate_invite_code()
returns text as $$
declare
  new_code text;
  code_exists boolean;
begin
  loop
    -- Generate random 6-digit code (uppercase letters and numbers)
    new_code := upper(substring(md5(random()::text) from 1 for 6));
    
    -- Check if code already exists
    select exists(select 1 from public.invite_codes where code = new_code) into code_exists;
    
    exit when not code_exists;
  end loop;
  
  return new_code;
end;
$$ language plpgsql;

-- 10. Insert your user as the first admin (REPLACE WITH YOUR ACTUAL USER EMAIL)
-- Run this AFTER you've created your account:
-- insert into public.admin_users (user_id)
-- select id from auth.users where email = 'your-email@example.com';
