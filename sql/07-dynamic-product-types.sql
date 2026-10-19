-- Feature: Dynamic product types and color variants
-- Apply after the existing catalog and auth modules have been installed.

create table if not exists public.trythrifty_product_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  fields jsonb not null default '[]'::jsonb
    check (jsonb_typeof(fields) = 'array'),
  created_at timestamptz not null default now()
);

alter table public.trythrifty_products
  add column if not exists type_id uuid references public.trythrifty_product_types (id),
  add column if not exists attributes jsonb default '{}'::jsonb,
  add column if not exists brand text,
  add column if not exists condition text,
  add column if not exists common_images text[] default '{}';

create table if not exists public.trythrifty_product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.trythrifty_products (id) on delete cascade,
  color_name text not null,
  color_hex text not null,
  stock integer not null default 0 check (stock >= 0),
  images text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists trythrifty_products_attributes_gin_idx
  on public.trythrifty_products using gin (attributes);

create index if not exists trythrifty_product_variants_product_idx
  on public.trythrifty_product_variants (product_id);

alter table public.trythrifty_product_types enable row level security;
alter table public.trythrifty_product_variants enable row level security;

drop policy if exists "Public read trythrifty product types" on public.trythrifty_product_types;
create policy "Public read trythrifty product types"
  on public.trythrifty_product_types for select to anon, authenticated
  using (true);

drop policy if exists "Admins manage trythrifty product types" on public.trythrifty_product_types;
create policy "Admins manage trythrifty product types"
  on public.trythrifty_product_types for all to authenticated
  using (public.trythrifty_is_admin())
  with check (public.trythrifty_is_admin());

drop policy if exists "Public read trythrifty product variants" on public.trythrifty_product_variants;
create policy "Public read trythrifty product variants"
  on public.trythrifty_product_variants for select to anon, authenticated
  using (true);

drop policy if exists "Admins manage trythrifty product variants" on public.trythrifty_product_variants;
create policy "Admins manage trythrifty product variants"
  on public.trythrifty_product_variants for all to authenticated
  using (public.trythrifty_is_admin())
  with check (public.trythrifty_is_admin());

drop policy if exists "Public read active trythrifty products" on public.trythrifty_products;
create policy "Public read active trythrifty products"
  on public.trythrifty_products for select to anon, authenticated
  using (true);

grant select on public.trythrifty_product_types to anon, authenticated;
grant insert, update, delete on public.trythrifty_product_types to authenticated;
grant select on public.trythrifty_product_variants to anon, authenticated;
grant insert, update, delete on public.trythrifty_product_variants to authenticated;

insert into public.trythrifty_product_types (name, fields)
values (
  'Clothes',
  '[
    {"key":"category","label":"Category","type":"text","required":true},
    {"key":"sizes","label":"Sizes","type":"text","required":false}
  ]'::jsonb
)
on conflict (name) do nothing;

update public.trythrifty_products as product
set type_id = product_type.id,
    attributes = coalesce(product.attributes, '{}'::jsonb)
      || jsonb_build_object(
        'category', product.category,
        'sizes', array_to_string(product.sizes, ', ')
      ),
    common_images = case
      when coalesce(cardinality(product.common_images), 0) = 0 and product.image_url <> ''
        then array[product.image_url]
      else product.common_images
    end
from public.trythrifty_product_types as product_type
where product_type.name = 'Clothes'
  and product.type_id is null;

insert into public.trythrifty_product_variants
  (product_id, color_name, color_hex, stock, images)
select product.id,
       color.value ->> 'name',
       coalesce(color.value ->> 'hex', '#888888'),
       0,
       '{}'
from public.trythrifty_products as product
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(product.colors) = 'array' then product.colors else '[]'::jsonb end
) as color(value)
where nullif(color.value ->> 'name', '') is not null
  and not exists (
    select 1
    from public.trythrifty_product_variants as variant
    where variant.product_id = product.id
      and variant.color_name = color.value ->> 'name'
      and variant.color_hex = coalesce(color.value ->> 'hex', '#888888')
  );
