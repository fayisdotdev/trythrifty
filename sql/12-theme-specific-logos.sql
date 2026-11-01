-- Feature: Separate storefront logos for light and dark themes
-- Apply after sql/10-storefront-theme.sql.

alter table public.trythrifty_store_settings
  add column if not exists logo_light_url text,
  add column if not exists logo_dark_url text;

update public.trythrifty_store_settings
set logo_light_url = coalesce(nullif(btrim(logo_light_url), ''), nullif(btrim(logo_url), ''), ''),
    logo_dark_url = coalesce(nullif(btrim(logo_dark_url), ''), nullif(btrim(logo_url), ''), '');
