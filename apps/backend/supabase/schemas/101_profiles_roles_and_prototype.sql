-- Extend profiles with role-based access and prototype flag

-- Add role column with default 'patient' and constrain allowed values
alter table if exists public.profiles
  add column if not exists role text;

update public.profiles set role = 'patient' where role is null;

alter table if exists public.profiles
  alter column role set default 'patient';

alter table if exists public.profiles
  alter column role set not null;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS chk_profiles_role,
  ADD CONSTRAINT chk_profiles_role
  CHECK (role IN ('admin','patient','clinician','guest','moderator'));

-- Add prototype_enabled flag defaulting to false
alter table if exists public.profiles
  add column if not exists prototype_enabled boolean not null default false;


