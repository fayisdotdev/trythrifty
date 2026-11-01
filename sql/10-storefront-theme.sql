-- Feature: Accessible storefront theme presets
-- Apply after sql/03-storefront-settings.sql.

alter table public.trythrifty_store_settings
  add column if not exists theme text default 'light'
    check (theme in ('light', 'dark'));

update public.trythrifty_store_settings
set theme = 'light'
where theme is null or theme not in ('light', 'dark');
