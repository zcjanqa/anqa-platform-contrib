-- Minimal profiles table to support soft deletion and compliance retention
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  deleted boolean not null default false,
  deleted_at timestamptz,
  original_email text
);

-- Helpful index for auditing
create index if not exists idx_profiles_deleted on public.profiles (deleted);


