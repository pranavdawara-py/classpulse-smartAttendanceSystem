-- Migration: make lectures ad-hoc friendly.
-- The lectures table was designed for structured timetables.
-- Per product decision, teachers must be able to mark attendance without
-- any pre-existing schedule, batch, or course. This migration relaxes the
-- NOT NULL constraints so both structured and ad-hoc sessions coexist.

alter table public.lectures alter column batch_id  drop not null;
alter table public.lectures alter column course_id drop not null;

-- Free-text label for ad-hoc sessions (e.g. "Chemistry revision", "Morning roll call").
-- Structured lectures still use course.name; ad-hoc uses this label.
alter table public.lectures
  add column if not exists label text
  check (label is null or char_length(trim(label)) between 1 and 200);

-- Convenience: index for fast ad-hoc lookup by teacher + date
create index if not exists lectures_teacher_adhoc_idx
  on public.lectures (teacher_id, scheduled_starts_at)
  where batch_id is null;
