-- Forum posts and broadcasts

create table if not exists forum_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references profiles(id),
  title text not null,
  content text not null,
  status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists broadcasts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  audience text default 'all',
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

alter table forum_posts enable row level security;
alter table broadcasts enable row level security;

-- forum policies
create policy "forum_insert_auth" on forum_posts
  for insert with check (auth.role() = 'authenticated');
create policy "forum_select_auth" on forum_posts
  for select using (auth.role() = 'authenticated');
create policy "forum_update_admin" on forum_posts
  for update using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- broadcast policies
create policy "broadcast_admin_all" on broadcasts
  for all using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "broadcast_select_auth" on broadcasts
  for select using (auth.role() = 'authenticated');
