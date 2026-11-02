-- Feature: Customizable product badge in the storefront collection
-- Apply after sql/06-storefront-content.sql.

alter table public.trythrifty_store_settings
  add column if not exists collection_badge_enabled boolean not null default true,
  add column if not exists collection_badge_text text not null default 'PRE-LOVED FIND';
