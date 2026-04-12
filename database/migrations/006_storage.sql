-- Supabase Storage buckets
insert into storage.buckets (id, name, public) values
('merchant-docs', 'merchant-docs', false),
('product-images', 'product-images', true),
('avatars', 'avatars', true),
('receipts', 'receipts', false)
on conflict (id) do nothing;

-- Merchant docs: owner can upload/read their own
create policy "merchant_docs_insert_own" on storage.objects
  for insert
  with check (
    bucket_id = 'merchant-docs'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "merchant_docs_select_own" on storage.objects
  for select
  using (
    bucket_id = 'merchant-docs'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Product images: authenticated users can upload, public read
create policy "product_images_insert_auth" on storage.objects
  for insert
  with check (
    bucket_id = 'product-images'
    and auth.role() = 'authenticated'
  );

create policy "product_images_select_public" on storage.objects
  for select
  using (bucket_id = 'product-images');

-- Avatars: user can upload, public read
create policy "avatars_insert_auth" on storage.objects
  for insert
  with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

create policy "avatars_select_public" on storage.objects
  for select
  using (bucket_id = 'avatars');

-- Receipts: only recipient/admin should read (use signed URLs)
create policy "receipts_insert_admin" on storage.objects
  for insert
  with check (
    bucket_id = 'receipts'
    and exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "receipts_select_recipient_or_admin" on storage.objects
  for select
  using (
    bucket_id = 'receipts'
    and (
      exists (select 1 from profiles where id = auth.uid() and role = 'admin')
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );
