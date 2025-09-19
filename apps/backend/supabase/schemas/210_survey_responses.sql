-- apps/backend/supabase/schemas/210_survey_responses.sql
-- Responses keyed by (survey_id, client_session_id) to avoid redundant inserts

create table if not exists public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  survey_id text not null references public.surveys(id) on delete restrict,
  client_session_id text not null,
  auth_user_id uuid null,
  ip_address text null,
  is_autosave boolean not null default false,
  answers jsonb not null default '{}'::jsonb,
  -- Human-readable mapping: { fieldName: { ui_question_id, question, answer, is_other?, other_text? } }
  answers_text jsonb not null default '{}'::jsonb,
  submitted_at timestamptz null,
  finalized boolean not null default false,
  -- Common extracted fields for analytics
  contact_email text generated always as (answers->>'contact_email') stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_survey_responses_per_session
  on public.survey_responses (survey_id, client_session_id);

create index if not exists idx_survey_responses_survey_id on public.survey_responses (survey_id);
create index if not exists idx_survey_responses_auth_user on public.survey_responses (auth_user_id);

alter table public.survey_responses enable row level security;

-- Optional minimal policy examples (commented until needed)
-- create policy insert_responses_via_backend on public.survey_responses for insert to authenticated using (true) with check (true);
-- create policy update_own_session on public.survey_responses for update to authenticated using (true) with check (true);


