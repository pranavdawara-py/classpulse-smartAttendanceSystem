-- Add location fields to institutions.
-- Country, state/province, city are free-text — no validation against a list.
-- All nullable so existing institutions remain valid.
alter table public.institutions
  add column if not exists country text,
  add column if not exists state   text,
  add column if not exists city    text;
