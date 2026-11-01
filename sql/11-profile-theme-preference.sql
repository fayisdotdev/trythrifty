-- Feature: Per-user storefront theme preference
-- Apply after sql/09-profile-display-name.sql.

alter table public.trythrifty_profiles
  add column if not exists theme_preference text
    check (theme_preference in ('light', 'dark'));

grant update (theme_preference) on public.trythrifty_profiles to authenticated;
