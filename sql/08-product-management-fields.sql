-- Feature: Common product management fields
-- Apply after sql/07-dynamic-product-types.sql.
-- Existing columns are retained; storefront visibility continues to use `active`.

alter table public.trythrifty_products
  add column if not exists discount_price numeric(10, 2),
  add column if not exists stock_quantity integer default 0,
  add column if not exists sku text,
  add column if not exists tags text[] not null default '{}',
  add column if not exists status text not null default 'published'
    check (status in ('draft', 'published'));

create unique index if not exists trythrifty_products_sku_unique_idx
  on public.trythrifty_products (sku)
  where sku is not null and sku <> '';

update public.trythrifty_products
set status = case when active then 'published' else 'draft' end
where status is distinct from case when active then 'published' else 'draft' end;

update public.trythrifty_product_types
set fields = '[
  {"key":"garment_type","label":"Garment type","type":"select","required":true,"options":["shirt","t-shirt","hoodie","sweatshirt","jacket","dress","top","vest"]},
  {"key":"sleeve_type","label":"Sleeve type","type":"select","required":true,"options":["sleeveless","half","3/4","full"]},
  {"key":"fit","label":"Fit","type":"select","required":false,"options":["slim","regular","relaxed","oversized"]},
  {"key":"sizes","label":"Sizes","type":"multi_select","required":false,"options":["XS","S","M","L","XL","XXL","One size"]},
  {"key":"gender","label":"Gender","type":"select","required":false,"options":["men","women","unisex"]},
  {"key":"material","label":"Material","type":"text","required":false},
  {"key":"condition","label":"Condition","type":"select","required":false,"options":["new","like new","good","fair"]}
]'::jsonb
where lower(name) in ('clothes', 'clothing');

update public.trythrifty_products as product
set attributes = coalesce(product.attributes, '{}'::jsonb)
  || jsonb_build_object(
    'garment_type', coalesce(
      product.attributes ->> 'garment_type',
      case when lower(product.category) in ('shirt', 't-shirt', 'hoodie', 'sweatshirt', 'jacket', 'dress', 'top', 'vest')
        then lower(product.category) else '' end
    ),
    'sizes', to_jsonb(product.sizes),
    'condition', coalesce(product.attributes -> 'condition', to_jsonb(product.condition))
  )
from public.trythrifty_product_types as product_type
where product.type_id = product_type.id
  and lower(product_type.name) in ('clothes', 'clothing');
