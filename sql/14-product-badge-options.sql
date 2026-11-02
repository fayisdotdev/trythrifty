-- Feature: Per-product floating badge settings
-- Apply after sql/13-collection-product-badge.sql.

alter table public.trythrifty_products
  add column if not exists badge_enabled boolean not null default true,
  add column if not exists badge_text text not null default '';
