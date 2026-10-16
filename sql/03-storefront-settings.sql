-- Feature: Store identity, homepage copy and WhatsApp contact

create table if not exists public.trythrifty_store_settings (
  id smallint primary key default 1 check (id = 1),
  store_name text not null default 'trythrifty',
  logo_url text not null default '',
  favicon_url text not null default '',
  accent_color text not null default '#f59e0b',
  background_color text not null default '#08080a',
  whatsapp_number text not null default '',
  hero_title text not null default 'Good clothes deserve another story.',
  hero_description text not null default 'Thoughtfully found pre-loved pieces, ready for their next chapter.',
  about_text text not null default 'A little more considered. A lot more loved. Discover pre-loved pieces selected for a new life.',
  updated_at timestamptz not null default now()
);

insert into public.trythrifty_store_settings (id)
values (1)
on conflict (id) do nothing;

alter table public.trythrifty_store_settings enable row level security;

drop policy if exists "Public read trythrifty store settings" on public.trythrifty_store_settings;
create policy "Public read trythrifty store settings"
  on public.trythrifty_store_settings for select to anon, authenticated
  using (true);

drop policy if exists "Admins manage trythrifty store settings" on public.trythrifty_store_settings;
create policy "Admins manage trythrifty store settings"
  on public.trythrifty_store_settings for all to authenticated
  using (public.trythrifty_is_admin())
  with check (public.trythrifty_is_admin());

grant select on public.trythrifty_store_settings to anon, authenticated;
grant insert, update, delete on public.trythrifty_store_settings to authenticated;
