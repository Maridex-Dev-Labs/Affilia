-- Additional admin policies for operational access

-- products: admin can read and moderate
create policy "products_admin_select" on products
  for select using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "products_admin_update" on products
  for update using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- affiliate_links: admin read
create policy "links_admin_select" on affiliate_links
  for select using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- click_events: admin read
create policy "clicks_admin_select" on click_events
  for select using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- conversions: admin read
create policy "conversions_admin_select" on conversions
  for select using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- merchant_escrow: admin read/write
create policy "escrow_admin_select" on merchant_escrow
  for select using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "escrow_admin_update" on merchant_escrow
  for update using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "escrow_admin_insert" on merchant_escrow
  for insert with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- payouts: admin update
create policy "payouts_admin_update" on payouts
  for update using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- admin audit log: allow admin to insert
create policy "admin_audit_insert" on admin_audit_log
  for insert with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
