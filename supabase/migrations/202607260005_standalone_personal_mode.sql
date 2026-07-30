-- Personal Mode full schema.
-- Standalone students (a personal teacher's own roster, not tied to any school institution),
-- their face-recognition photos, proper attendance entries, and a private storage bucket.
--
-- Supersedes the simplified JSONB approach in migration 004.
-- Migration 004 (standalone_sessions with JSONB entries) stays in place and is referenced here.

-- ── Student roster ─────────────────────────────────────────────────────────────

create table public.standalone_students (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  name         text        not null check (char_length(trim(name)) between 1 and 160),
  roll_number  text,
  active       boolean     not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index standalone_students_user_idx on public.standalone_students (user_id, created_at);

create trigger standalone_students_updated_at
  before update on public.standalone_students
  for each row execute procedure public.set_updated_at();

-- ── Face photos per student (stored in Supabase storage) ────────────────────────

create table public.standalone_student_photos (
  id           uuid        primary key default gen_random_uuid(),
  student_id   uuid        not null references public.standalone_students(id) on delete cascade,
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  object_path  text        not null unique,  -- path in storage bucket: personal/{user_id}/{student_id}/{id}.jpg
  content_type text        not null default 'image/jpeg',
  bytes        integer     not null check (bytes > 0),
  created_at   timestamptz not null default now()
);

create index standalone_photos_student_idx on public.standalone_student_photos (student_id);

-- ── Proper per-student attendance entries ──────────────────────────────────────
-- References the standalone_sessions table created in migration 004.

create table public.standalone_attendance_entries (
  id           uuid        primary key default gen_random_uuid(),
  session_id   uuid        not null references public.standalone_sessions(id) on delete cascade,
  student_id   uuid        references public.standalone_students(id) on delete set null,
  -- Snapshot fields so the record is meaningful even if the student is later deleted.
  student_name text        not null,
  roll_number  text,
  status       text        not null check (status in ('present', 'absent')),
  created_at   timestamptz not null default now(),
  unique (session_id, student_id)
);

create index standalone_entries_session_idx on public.standalone_attendance_entries (session_id);

-- ── RLS ────────────────────────────────────────────────────────────────────────

alter table public.standalone_students           enable row level security;
alter table public.standalone_student_photos     enable row level security;
alter table public.standalone_attendance_entries enable row level security;

-- standalone_students: full ownership
create policy standalone_students_select on public.standalone_students for select    to authenticated using       (user_id = auth.uid());
create policy standalone_students_insert on public.standalone_students for insert    to authenticated with check  (user_id = auth.uid());
create policy standalone_students_update on public.standalone_students for update    to authenticated using       (user_id = auth.uid()) with check (user_id = auth.uid());
create policy standalone_students_delete on public.standalone_students for delete    to authenticated using       (user_id = auth.uid());

-- standalone_student_photos: full ownership
create policy standalone_photos_select on public.standalone_student_photos for select    to authenticated using       (user_id = auth.uid());
create policy standalone_photos_insert on public.standalone_student_photos for insert    to authenticated with check  (user_id = auth.uid());
create policy standalone_photos_delete on public.standalone_student_photos for delete    to authenticated using       (user_id = auth.uid());

-- standalone_attendance_entries: via session ownership
create policy standalone_entries_select on public.standalone_attendance_entries for select to authenticated
  using (exists (select 1 from public.standalone_sessions s where s.id = session_id and s.user_id = auth.uid()));
create policy standalone_entries_insert on public.standalone_attendance_entries for insert to authenticated
  with check (exists (select 1 from public.standalone_sessions s where s.id = session_id and s.user_id = auth.uid()));

-- ── Private storage bucket for Personal Mode face photos ───────────────────────
-- Path convention: personal/{user_id}/{student_id}/{photo_id}.jpg
-- Writes go through the service role in Server Actions only (same pattern as school enrolments).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('standalone-photos', 'standalone-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public            = excluded.public,
  file_size_limit   = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
