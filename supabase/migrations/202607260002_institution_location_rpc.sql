-- RPC for a school admin to set their institution's location after signup.
-- Called from the /auth/callback route once the session is established.
-- Uses security definer so the admin can update their own institution row
-- despite RLS not granting write access to the institutions table.
create or replace function public.set_institution_location(
  p_country text,
  p_state   text,
  p_city    text
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not app.is_admin() then
    raise exception 'Only school administrators can update institution details';
  end if;

  update public.institutions
  set
    country    = trim(coalesce(p_country, '')),
    state      = trim(coalesce(p_state, '')),
    city       = trim(coalesce(p_city, '')),
    updated_at = now()
  where id = app.current_institution_id();
end;
$$;

grant execute on function public.set_institution_location(text, text, text) to authenticated;
