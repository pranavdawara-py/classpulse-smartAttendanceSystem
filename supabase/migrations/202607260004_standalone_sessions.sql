-- Standalone attendance sessions for Personal Mode users.
-- These sessions are NOT tied to an institution — they belong to individual users.
-- Users without a school account can also create a lightweight auth account to save here.

create table public.standalone_sessions (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  label       text        check (label is null or char_length(trim(label)) between 1 and 200),
  input_mode  text        not null default 'manual',
  -- entries: [{ name, rollNumber, status }] — flat JSON, no school relational structure needed
  entries     jsonb       not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);

alter table public.standalone_sessions enable row level security;

-- Users can only see and insert their own sessions.
create policy standalone_read_own   on public.standalone_sessions for select    to authenticated using          (user_id = auth.uid());
create policy standalone_insert_own on public.standalone_sessions for insert    to authenticated with check    (user_id = auth.uid());
create policy standalone_delete_own on public.standalone_sessions for delete    to authenticated using          (user_id = auth.uid());

create index standalone_sessions_user_idx on public.standalone_sessions (user_id, created_at desc);
