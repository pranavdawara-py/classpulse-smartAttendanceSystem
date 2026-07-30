-- Migration 006: Add institution slug (for student ID login fake email)
-- and student_profiles.login_id (stores the roll_number used at account creation)
-- Also adds field_values GIN index for custom field queries.

-- ── institutions.slug ─────────────────────────────────────────────────────────
-- URL-safe unique identifier for each school.
-- Used to build fake emails: {login_id}@{slug}.students.classpulse.app
-- Auto-generated from the school name on institution creation.

alter table public.institutions
  add column if not exists slug text;

-- Back-fill slugs for existing institutions (safe, idempotent)
update public.institutions
set slug = regexp_replace(
             lower(trim(name)),
             '[^a-z0-9]+', '-', 'g'
           )
where slug is null;

-- Make it NOT NULL after back-fill
alter table public.institutions
  alter column slug set not null;

create unique index if not exists institutions_slug_unique on public.institutions (slug);

-- RLS: allow public read of institutions (name + slug) so student login page
-- can populate the school dropdown without auth.
do $$ begin
  create policy institutions_public_read on public.institutions
    for select to anon, authenticated using (true);
exception when duplicate_object then null; end $$;

alter table public.institutions enable row level security;

-- ── student_profiles.login_id ─────────────────────────────────────────────────
-- The roll_number used at account creation — stable, used for student ID login.
-- May differ from roll_number if admin changes roll later.
-- Format: string, e.g. "42" or "2023CSE042"

alter table public.student_profiles
  add column if not exists login_id text;

create unique index if not exists student_profiles_login_institution_unique
  on public.student_profiles (institution_id, login_id)
  where login_id is not null;

-- ── field_values GIN index ────────────────────────────────────────────────────
-- Makes querying custom attributes (blood_group, parent_name, etc.) fast.

create index if not exists student_profiles_field_values_gin
  on public.student_profiles using gin (field_values);

-- ── Helper function: generate_institution_slug ────────────────────────────────
-- Ensures slug uniqueness by appending a counter if needed.
-- Called by the bootstrap_institution RPC when creating a new school.

create or replace function public.generate_institution_slug(base_name text)
returns text
language plpgsql
as $$
declare
  slug_candidate text;
  counter        int := 0;
begin
  slug_candidate := regexp_replace(lower(trim(base_name)), '[^a-z0-9]+', '-', 'g');
  slug_candidate := trim(both '-' from slug_candidate);

  loop
    if counter = 0 then
      exit when not exists (
        select 1 from public.institutions where slug = slug_candidate
      );
      counter := 1;
    else
      exit when not exists (
        select 1 from public.institutions where slug = slug_candidate || '-' || counter::text
      );
      slug_candidate := slug_candidate || '-' || counter::text;
      counter := counter + 1;
    end if;
    counter := counter + 1;
  end loop;

  return slug_candidate;
end;
$$;
