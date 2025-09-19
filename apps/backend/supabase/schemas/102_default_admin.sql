-- Ensure the first admin user is set based on email

-- Create or update profile for julius@anqa.cloud to role=admin
insert into public.profiles (id, role, prototype_enabled)
select u.id, 'admin', coalesce(p.prototype_enabled, false)
from auth.users u
left join public.profiles p on p.id = u.id
where lower(u.email) = 'julius@anqa.cloud'
on conflict (id) do update set role = excluded.role;




-- Enable Row Level Security and restrict access to owners by default
alter table if exists public.profiles enable row level security;

-- Owners can select their own profile
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (id = auth.uid());

-- Owners can insert their own profile row (e.g., from client flows)
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

-- Owners can update their own profile row
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Admins and moderators can update any profile
drop policy if exists "profiles_update_admins" on public.profiles;
create policy "profiles_update_admins"
on public.profiles for update
to authenticated
using (
  exists (
    select 1 from public.profiles as my
    where my.id = auth.uid()
      and my.role in ('admin','moderator_editor')
  )
)
with check (
  exists (
    select 1 from public.profiles as my
    where my.id = auth.uid()
      and my.role in ('admin','moderator_editor')
  )
);


