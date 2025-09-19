-- screenings table for logging recording sessions
create table if not exists public.screenings (
  id uuid primary key,
  user_id uuid references auth.users (id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  client_ip text,
  user_agent text,
  status text check (status in ('in_progress','completed','failed')) not null default 'in_progress',
  storage_recording_key text,
  storage_audio_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- trigger to maintain updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_screenings_updated_at on public.screenings;
create trigger trg_screenings_updated_at
before update on public.screenings
for each row execute function public.set_updated_at();

-- RLS policies (enable and restrict to owner)
alter table public.screenings enable row level security;

-- Owners can see their own screenings
drop policy if exists "screenings_select_own" on public.screenings;
create policy "screenings_select_own"
on public.screenings for select
to authenticated
using (auth.uid() = user_id);

-- Owners can insert their own rows
drop policy if exists "screenings_insert_own" on public.screenings;
create policy "screenings_insert_own"
on public.screenings for insert
to authenticated
with check (auth.uid() = user_id);

-- Owners can update their own rows
drop policy if exists "screenings_update_own" on public.screenings;
create policy "screenings_update_own"
on public.screenings for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);


