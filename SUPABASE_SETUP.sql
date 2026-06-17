create table if not exists public.ud360_store (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.ud360_store enable row level security;

drop policy if exists "Service role can manage ud360 store" on public.ud360_store;
create policy "Service role can manage ud360 store"
  on public.ud360_store
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
