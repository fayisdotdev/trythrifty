-- Feature: Public product/brand images with admin-only uploads and deletion

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'trythrifty-assets',
  'trythrifty-assets',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/x-icon', 'image/vnd.microsoft.icon']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read trythrifty assets" on storage.objects;
create policy "Public read trythrifty assets"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'trythrifty-assets');

drop policy if exists "Admins upload trythrifty assets" on storage.objects;
create policy "Admins upload trythrifty assets"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'trythrifty-assets'
    and public.trythrifty_is_admin()
  );

drop policy if exists "Admins update trythrifty assets" on storage.objects;
create policy "Admins update trythrifty assets"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'trythrifty-assets'
    and public.trythrifty_is_admin()
  )
  with check (
    bucket_id = 'trythrifty-assets'
    and public.trythrifty_is_admin()
  );

drop policy if exists "Admins delete trythrifty assets" on storage.objects;
create policy "Admins delete trythrifty assets"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'trythrifty-assets'
    and public.trythrifty_is_admin()
  );
