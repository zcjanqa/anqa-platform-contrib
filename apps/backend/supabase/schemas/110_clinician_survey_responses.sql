-- apps/backend/supabase/schemas/110_clinician_survey_responses.sql
-- Schema for clinician survey responses with autosave support

create table if not exists public.clinician_survey_responses (
  id uuid primary key default gen_random_uuid(),
  client_session_id text not null,
  auth_user_id uuid null,
  ip_address text null,
  is_autosave boolean not null default false,
  answers jsonb not null default '{}',
  -- Survey lifecycle
  survey_version text not null default 'v1',
  submitted_at timestamptz null,
  finalized boolean not null default false,
  -- Generated columns for common analytics fields
  age int generated always as ((answers->>'age')::int) stored,
  clinician_type text generated always as (answers->>'clinician_type') stored,
  contact_email text generated always as (answers->>'contact_email') stored,
  experience text generated always as (answers->>'experience') stored,
  geo jsonb generated always as (answers->'geo') stored,
  created_at timestamptz not null default now(),
  -- Catalog of questions shown to the user at submission time.
  -- Structure example:
  -- {
  --   "geo_eu": {"ui_question_id": "A1", "question_text": "Primary professional role"},
  --   "ehr_local": {"ui_question_id": "A2", "question_text": "Years of clinical experience"}
  -- }
  question_catalog jsonb not null default '{}'
);

create index if not exists idx_clinician_survey_client_session
  on public.clinician_survey_responses (client_session_id);

-- Indexes for commonly-filtered generated columns
create index if not exists idx_clinician_age on public.clinician_survey_responses (age);
create index if not exists idx_clinician_type on public.clinician_survey_responses (clinician_type);

-- Optional: enable RLS; backend uses service key so policies may be bypassed in API usage
alter table public.clinician_survey_responses enable row level security;

-- Basic insert policy for anon if ever used directly from client (keep restrictive)
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'clinician_survey_responses' and policyname = 'allow_insert_autosave_or_submit'
  ) then
    create policy allow_insert_autosave_or_submit on public.clinician_survey_responses
      for insert to anon, authenticated using (true) with check (true);
  end if;
end$$;


