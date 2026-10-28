-- Kør i Supabase SQL Editor (projektets egen database).
create table if not exists public.wines (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists wines_user_id_idx on public.wines(user_id);
alter table public.wines enable row level security;
revoke all on public.wines from anon, authenticated;
grant select, insert, update, delete on public.wines to authenticated;
create policy "Select own wines" on public.wines for select to authenticated using ((select auth.uid()) = user_id);
create policy "Insert own wines" on public.wines for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own wines" on public.wines for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Delete own wines" on public.wines for delete to authenticated using ((select auth.uid()) = user_id);
