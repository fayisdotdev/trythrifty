-- Feature: User profile display names
-- Apply after sql/01-auth-and-profiles.sql.

alter table public.trythrifty_profiles
  add column if not exists display_name text not null default 'User';

update public.trythrifty_profiles
set display_name = 'User'
where display_name is null or btrim(display_name) = '';

create or replace function public.trythrifty_create_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_name text;
begin
  profile_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
    'User'
  );

  insert into public.trythrifty_profiles (id, email, display_name)
  values (new.id, coalesce(new.email, ''), profile_name)
  on conflict (id) do update
  set email = excluded.email,
      display_name = case
        when btrim(public.trythrifty_profiles.display_name) = 'User'
          then excluded.display_name
        else public.trythrifty_profiles.display_name
      end,
      updated_at = now();
  return new;
end;
$$;

drop policy if exists "Users update own trythrifty profile name" on public.trythrifty_profiles;
create policy "Users update own trythrifty profile name"
  on public.trythrifty_profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

grant update (display_name) on public.trythrifty_profiles to authenticated;
