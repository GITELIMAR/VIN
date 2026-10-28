-- Offentlig, skrivebeskyttet visning. Kør ÉN GANG i Supabase SQL Editor.
-- Rører ikke den private wines-tabel.
create table if not exists public.public_wines (
  owner_id uuid not null references auth.users(id) on delete cascade,
  id uuid not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (owner_id,id)
);
alter table public.public_wines enable row level security;
revoke all on public.public_wines from anon, authenticated;
grant select on public.public_wines to anon, authenticated;
grant insert, update, delete on public.public_wines to authenticated;

create policy "Public can view shared wines"
  on public.public_wines for select to anon, authenticated using (true);
create policy "Owner can publish wines"
  on public.public_wines for insert to authenticated
  with check ((select auth.uid()) = owner_id);
create policy "Owner can update shared wines"
  on public.public_wines for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
create policy "Owner can remove shared wines"
  on public.public_wines for delete to authenticated
  using ((select auth.uid()) = owner_id);
