-- ClassPulse initial schema. Create locally; do not apply until reviewed.
-- Application writes use FastAPI with a Supabase secret key. Browser clients use
-- Supabase Auth plus RLS-backed reads only; no client-side privileged writes.

create extension if not exists pgcrypto;

create type public.app_role as enum ('unassigned', 'admin', 'teacher', 'student');
create type public.field_owner as enum ('school', 'student');
create type public.lecture_status as enum ('scheduled', 'cancelled', 'completed');
create type public.audience_mode as enum ('batch', 'custom');
create type public.attendance_status as enum ('present', 'absent');
create type public.session_status as enum ('draft', 'processing', 'review_required', 'confirmed', 'cancelled');
create type public.face_enrolment_status as enum ('pending', 'approved', 'rejected', 'disabled');
create type public.match_status as enum ('matched', 'low_confidence', 'unknown');

create table public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 160),
  timezone text not null default 'Asia/Kolkata',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  institution_id uuid references public.institutions(id) on delete restrict,
  role public.app_role not null default 'unassigned',
  email text not null,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_role_requires_institution check (role = 'unassigned' or institution_id is not null)
);
create unique index profiles_email_lower_unique on public.profiles (lower(email));
create index profiles_institution_idx on public.profiles (institution_id);

create table public.teacher_profiles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  institution_id uuid not null references public.institutions(id) on delete restrict,
  full_name text not null check (char_length(trim(full_name)) between 2 and 160),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.student_profiles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  institution_id uuid not null references public.institutions(id) on delete restrict,
  full_name text not null check (char_length(trim(full_name)) between 2 and 160),
  roll_number text,
  phone_number text,
  whatsapp_number text,
  profile_enrolment_id uuid,
  field_values jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, roll_number)
);

create table public.student_field_definitions (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  key text not null check (key ~ '^[a-z][a-z0-9_]{0,62}$'),
  label text not null check (char_length(trim(label)) between 1 and 100),
  field_type text not null check (field_type in ('text', 'email', 'phone', 'date', 'number', 'select', 'textarea')),
  options jsonb not null default '[]'::jsonb,
  owner public.field_owner not null,
  required boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, key)
);

create table public.batches (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  parent_batch_id uuid references public.batches(id) on delete restrict,
  name text not null check (char_length(trim(name)) between 1 and 120),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, parent_batch_id, name)
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  code text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, name)
);

create table public.batch_memberships (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  batch_id uuid not null references public.batches(id) on delete cascade,
  student_id uuid not null references public.student_profiles(profile_id) on delete cascade,
  starts_on date not null default current_date,
  ends_on date,
  created_at timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on),
  unique (batch_id, student_id, starts_on)
);

create table public.teacher_assignments (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  teacher_id uuid not null references public.teacher_profiles(profile_id) on delete cascade,
  batch_id uuid not null references public.batches(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete restrict,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (teacher_id, batch_id, course_id)
);

create table public.schedule_templates (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  assignment_id uuid not null references public.teacher_assignments(id) on delete restrict,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  classroom text,
  active_from date not null default current_date,
  active_until date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time),
  check (active_until is null or active_until >= active_from)
);

create table public.lectures (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  source_template_id uuid references public.schedule_templates(id) on delete set null,
  assignment_id uuid references public.teacher_assignments(id) on delete restrict,
  teacher_id uuid not null references public.teacher_profiles(profile_id) on delete restrict,
  batch_id uuid not null references public.batches(id) on delete restrict,
  course_id uuid not null references public.courses(id) on delete restrict,
  audience_mode public.audience_mode not null default 'batch',
  status public.lecture_status not null default 'scheduled',
  scheduled_starts_at timestamptz not null,
  scheduled_ends_at timestamptz not null,
  original_starts_at timestamptz,
  original_ends_at timestamptz,
  classroom text,
  change_note text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (scheduled_ends_at > scheduled_starts_at),
  check ((original_starts_at is null and original_ends_at is null) or original_ends_at > original_starts_at)
);
create index lectures_institution_starts_idx on public.lectures (institution_id, scheduled_starts_at);
create index lectures_teacher_starts_idx on public.lectures (teacher_id, scheduled_starts_at);

create table public.temporary_attendees (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  lecture_id uuid not null references public.lectures(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 2 and 160),
  roll_number text,
  temporary_reference text,
  resolved_student_id uuid references public.student_profiles(profile_id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  check (roll_number is not null or temporary_reference is not null)
);

create table public.lecture_students (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  lecture_id uuid not null references public.lectures(id) on delete cascade,
  student_id uuid references public.student_profiles(profile_id) on delete restrict,
  temporary_attendee_id uuid references public.temporary_attendees(id) on delete restrict,
  added_by uuid not null references public.profiles(id) on delete restrict,
  added_at timestamptz not null default now(),
  removed_at timestamptz,
  check ((student_id is not null) <> (temporary_attendee_id is not null)),
  unique (lecture_id, student_id),
  unique (lecture_id, temporary_attendee_id)
);

create table public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  lecture_id uuid not null unique references public.lectures(id) on delete restrict,
  started_by uuid not null references public.profiles(id) on delete restrict,
  input_mode text not null check (input_mode in ('live_camera', 'uploaded_video')),
  status public.session_status not null default 'draft',
  capture_object_path text,
  started_at timestamptz not null default now(),
  confirmed_at timestamptz,
  confirmed_by uuid references public.profiles(id) on delete restrict,
  updated_at timestamptz not null default now()
);

create table public.face_enrolments (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  student_id uuid not null references public.student_profiles(profile_id) on delete cascade,
  object_path text not null,
  content_type text not null,
  bytes integer not null check (bytes > 0),
  status public.face_enrolment_status not null default 'pending',
  quality_score numeric(5,4),
  matches_identity boolean,
  model_version text,
  embedding_reference text,
  consent_version text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  disabled_at timestamptz,
  unique (object_path)
);
alter table public.student_profiles
  add constraint student_profile_enrolment_fk
  foreign key (profile_enrolment_id) references public.face_enrolments(id) on delete set null;
create index face_enrolments_student_idx on public.face_enrolments (student_id, status);

create table public.attendance_entries (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  session_id uuid not null references public.attendance_sessions(id) on delete cascade,
  lecture_student_id uuid not null references public.lecture_students(id) on delete restrict,
  status public.attendance_status not null default 'absent',
  suggestion public.match_status,
  confidence numeric(6,5),
  manually_changed boolean not null default false,
  changed_by uuid references public.profiles(id) on delete restrict,
  changed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, lecture_student_id)
);

create table public.attendance_audit_events (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  lecture_id uuid references public.lectures(id) on delete cascade,
  attendance_entry_id uuid references public.attendance_entries(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  event_type text not null,
  previous_value jsonb,
  next_value jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Auth profile creation is deliberately minimal. Role and institution are assigned by
-- the onboarding/API flow; a signed-in but unassigned user has no tenant data access.
create or replace function public.handle_auth_user_created()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, coalesce(new.email, ''), new.raw_user_meta_data ->> 'display_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_auth_user_created();

-- First authenticated user creates exactly one school and becomes its administrator.
create or replace function public.bootstrap_institution(institution_name text, institution_timezone text default 'Asia/Kolkata')
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare created_institution_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if exists (select 1 from public.profiles where id = auth.uid() and institution_id is not null) then
    raise exception 'User is already assigned to an institution';
  end if;
  insert into public.institutions (name, timezone)
  values (trim(institution_name), institution_timezone)
  returning id into created_institution_id;
  update public.profiles
  set institution_id = created_institution_id, role = 'admin', updated_at = now()
  where id = auth.uid();
  return created_institution_id;
end;
$$;

create schema if not exists app;
create or replace function app.current_institution_id()
returns uuid language sql stable security definer set search_path = public
as $$ select institution_id from public.profiles where id = auth.uid() $$;
create or replace function app.current_role()
returns public.app_role language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;
create or replace function app.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce(app.current_role() = 'admin', false) $$;
revoke all on schema app from public;
grant usage on schema app to authenticated;
revoke all on function app.current_institution_id(), app.current_role(), app.is_admin() from public;
grant execute on function app.current_institution_id(), app.current_role(), app.is_admin() to authenticated;

-- Update timestamps on mutable records.
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public
as $$ begin new.updated_at = now(); return new; end; $$;
create trigger institutions_updated_at before update on public.institutions for each row execute procedure public.set_updated_at();
create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
create trigger teachers_updated_at before update on public.teacher_profiles for each row execute procedure public.set_updated_at();
create trigger students_updated_at before update on public.student_profiles for each row execute procedure public.set_updated_at();
create trigger fields_updated_at before update on public.student_field_definitions for each row execute procedure public.set_updated_at();
create trigger batches_updated_at before update on public.batches for each row execute procedure public.set_updated_at();
create trigger courses_updated_at before update on public.courses for each row execute procedure public.set_updated_at();
create trigger templates_updated_at before update on public.schedule_templates for each row execute procedure public.set_updated_at();
create trigger lectures_updated_at before update on public.lectures for each row execute procedure public.set_updated_at();
create trigger sessions_updated_at before update on public.attendance_sessions for each row execute procedure public.set_updated_at();
create trigger entries_updated_at before update on public.attendance_entries for each row execute procedure public.set_updated_at();

-- Private buckets. No browser storage policies are intentionally granted: FastAPI checks
-- authorisation, writes with the server-only secret key, and issues signed read URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('student-enrolments', 'student-enrolments', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('attendance-captures', 'attendance-captures', false, 104857600, array['video/mp4', 'video/webm', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- RLS: client reads are tenant-aware and intentionally conservative. All mutation and
-- broad operational queries go through FastAPI after server-side authorisation.
alter table public.institutions enable row level security;
alter table public.profiles enable row level security;
alter table public.teacher_profiles enable row level security;
alter table public.student_profiles enable row level security;
alter table public.student_field_definitions enable row level security;
alter table public.batches enable row level security;
alter table public.courses enable row level security;
alter table public.batch_memberships enable row level security;
alter table public.teacher_assignments enable row level security;
alter table public.schedule_templates enable row level security;
alter table public.lectures enable row level security;
alter table public.temporary_attendees enable row level security;
alter table public.lecture_students enable row level security;
alter table public.attendance_sessions enable row level security;
alter table public.face_enrolments enable row level security;
alter table public.attendance_entries enable row level security;
alter table public.attendance_audit_events enable row level security;

create policy institutions_read_own on public.institutions for select to authenticated using (id = app.current_institution_id());
create policy profiles_read_self_or_admin on public.profiles for select to authenticated using (id = auth.uid() or (app.is_admin() and institution_id = app.current_institution_id()));
create policy teachers_read_self_or_admin on public.teacher_profiles for select to authenticated using (profile_id = auth.uid() or (app.is_admin() and institution_id = app.current_institution_id()));
create policy students_read_self_or_admin on public.student_profiles for select to authenticated using (profile_id = auth.uid() or (app.is_admin() and institution_id = app.current_institution_id()));
create policy fields_read_tenant on public.student_field_definitions for select to authenticated using (institution_id = app.current_institution_id());
create policy batches_read_tenant on public.batches for select to authenticated using (institution_id = app.current_institution_id());
create policy courses_read_tenant on public.courses for select to authenticated using (institution_id = app.current_institution_id());
create policy memberships_read_self_or_admin on public.batch_memberships for select to authenticated using (student_id = auth.uid() or (app.is_admin() and institution_id = app.current_institution_id()));
create policy assignments_read_self_or_admin on public.teacher_assignments for select to authenticated using (teacher_id = auth.uid() or (app.is_admin() and institution_id = app.current_institution_id()));
create policy templates_read_teacher_or_admin on public.schedule_templates for select to authenticated using (app.is_admin() and institution_id = app.current_institution_id() or exists (select 1 from public.teacher_assignments a where a.id = assignment_id and a.teacher_id = auth.uid()));
create policy lectures_read_authorised on public.lectures for select to authenticated using (
  (app.is_admin() and institution_id = app.current_institution_id())
  or teacher_id = auth.uid()
  or exists (select 1 from public.lecture_students ls where ls.lecture_id = id and ls.student_id = auth.uid() and ls.removed_at is null)
);
create policy lecture_students_read_authorised on public.lecture_students for select to authenticated using (
  student_id = auth.uid()
  or exists (select 1 from public.lectures l where l.id = lecture_id and (l.teacher_id = auth.uid() or (app.is_admin() and l.institution_id = app.current_institution_id())))
);
create policy temporary_attendees_read_authorised on public.temporary_attendees for select to authenticated using (exists (select 1 from public.lectures l where l.id = lecture_id and (l.teacher_id = auth.uid() or (app.is_admin() and l.institution_id = app.current_institution_id()))));
create policy sessions_read_authorised on public.attendance_sessions for select to authenticated using (exists (select 1 from public.lectures l where l.id = lecture_id and (l.teacher_id = auth.uid() or (app.is_admin() and l.institution_id = app.current_institution_id()))));
create policy enrolments_read_self_or_admin on public.face_enrolments for select to authenticated using (student_id = auth.uid() or (app.is_admin() and institution_id = app.current_institution_id()));
create policy entries_read_authorised on public.attendance_entries for select to authenticated using (
  exists (select 1 from public.lecture_students ls where ls.id = lecture_student_id and ls.student_id = auth.uid())
  or exists (select 1 from public.attendance_sessions s join public.lectures l on l.id = s.lecture_id where s.id = session_id and (l.teacher_id = auth.uid() or (app.is_admin() and l.institution_id = app.current_institution_id())))
);
create policy audit_read_admin_only on public.attendance_audit_events for select to authenticated using (app.is_admin() and institution_id = app.current_institution_id());

grant execute on function public.bootstrap_institution(text, text) to authenticated;
