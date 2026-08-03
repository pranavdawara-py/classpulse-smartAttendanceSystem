-- Migration 010: Fix all places that UPDATE profiles to use UPSERT instead.
--
-- Root cause: bootstrap_institution, inviteTeacher, createStudent, and importStudentsFromZip
-- all do: UPDATE profiles SET role=... WHERE id = <user_id>
-- If the on_auth_user_created trigger hasn't yet created the profile row
-- (race condition, transient error, or missing trigger), the UPDATE matches
-- zero rows and succeeds silently — leaving the user with no role or institution.
--
-- Fix: Use INSERT ... ON CONFLICT (id) DO UPDATE (UPSERT) in bootstrap_institution.
-- The TypeScript actions (teachers.ts, students.ts) are fixed in their own files.

create or replace function public.bootstrap_institution(
  institution_name text,
  institution_timezone text default 'Asia/Kolkata'
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  created_institution_id uuid;
  institution_slug       text;
  current_user_email     text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  -- Prevent double-bootstrap: check existing assignment
  if exists (
    select 1 from public.profiles
    where id = auth.uid() and institution_id is not null
  ) then
    raise exception 'User is already assigned to an institution';
  end if;

  -- Fetch email for UPSERT (trigger may not have run yet)
  select email into current_user_email
  from auth.users
  where id = auth.uid();

  -- Generate a unique slug from the institution name
  institution_slug := public.generate_institution_slug(trim(institution_name));

  -- Create the institution
  insert into public.institutions (name, timezone, slug)
  values (trim(institution_name), institution_timezone, institution_slug)
  returning id into created_institution_id;

  -- UPSERT the profile.
  -- Covers two cases:
  --   1. Trigger already created the row (normal): UPDATE it with role + institution.
  --   2. Trigger didn't run or failed (edge case): INSERT the full row.
  insert into public.profiles (id, email, institution_id, role, updated_at)
  values (
    auth.uid(),
    coalesce(current_user_email, ''),
    created_institution_id,
    'admin',
    now()
  )
  on conflict (id) do update
    set institution_id = excluded.institution_id,
        role           = excluded.role,
        updated_at     = excluded.updated_at;

  return created_institution_id;
end;
$$;

-- Re-grant (idempotent — function existed before this migration)
grant execute on function public.bootstrap_institution(text, text) to authenticated;
