-- Feature: Product catalog
-- Products are not seeded. Add real inventory in /#admin.

create table if not exists public.trythrifty_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  price numeric(10, 2) not null check (price >= 0),
  category text not null,
  image_url text not null,
  sizes text[] not null default '{}',
  colors jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trythrifty_products_active_created_idx
  on public.trythrifty_products (active, created_at desc);

alter table public.trythrifty_products enable row level security;

drop policy if exists "Public read active trythrifty products" on public.trythrifty_products;
create policy "Public read active trythrifty products"
  on public.trythrifty_products for select to anon, authenticated
  using (active or public.trythrifty_is_admin());

drop policy if exists "Admins manage trythrifty products" on public.trythrifty_products;
create policy "Admins manage trythrifty products"
  on public.trythrifty_products for all to authenticated
  using (public.trythrifty_is_admin())
  with check (public.trythrifty_is_admin());

grant select on public.trythrifty_products to anon, authenticated;
grant insert, update, delete on public.trythrifty_products to authenticated;
