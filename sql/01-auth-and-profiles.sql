-- Feature: Authentication and customer/admin profiles
-- Run this module first in the Supabase SQL Editor.

create table if not exists public.trythrifty_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.trythrifty_profiles enable row level security;

create or replace function public.trythrifty_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.trythrifty_profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke all on function public.trythrifty_is_admin() from public;
grant execute on function public.trythrifty_is_admin() to anon, authenticated;

create or replace function public.trythrifty_create_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.trythrifty_profiles (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do update set email = excluded.email, updated_at = now();
  return new;
end;
$$;

drop trigger if exists trythrifty_auth_user_created on auth.users;
create trigger trythrifty_auth_user_created
  after insert on auth.users
  for each row execute procedure public.trythrifty_create_profile();

drop policy if exists "Users read own trythrifty profile" on public.trythrifty_profiles;
create policy "Users read own trythrifty profile"
  on public.trythrifty_profiles for select to authenticated
  using (id = (select auth.uid()));

grant select on public.trythrifty_profiles to authenticated;

-- New signups create their own customer profile through the auth trigger.
-- Role changes are intentionally reserved for the manual promotion SQL module.
