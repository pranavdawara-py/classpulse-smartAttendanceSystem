-- Migration 007: Update bootstrap_institution RPC to set slug on institution creation.
-- Migration 006 added generate_institution_slug() and the slug column.
-- This migration updates the RPC so new schools get a slug automatically.

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
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if exists (
    select 1 from public.profiles
    where id = auth.uid() and institution_id is not null
  ) then
    raise exception 'User is already assigned to an institution';
  end if;

  -- Generate a unique slug from the institution name
  institution_slug := public.generate_institution_slug(trim(institution_name));

  insert into public.institutions (name, timezone, slug)
  values (trim(institution_name), institution_timezone, institution_slug)
  returning id into created_institution_id;

  update public.profiles
  set institution_id = created_institution_id, role = 'admin', updated_at = now()
  where id = auth.uid();

  return created_institution_id;
end;
$$;

-- Re-grant (idempotent — the function already existed before)
grant execute on function public.bootstrap_institution(text, text) to authenticated;
