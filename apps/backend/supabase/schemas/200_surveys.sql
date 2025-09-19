-- apps/backend/supabase/schemas/200_surveys.sql
-- Canonical survey catalog: one row per (survey_type, survey_version)

create table if not exists public.surveys (
  id text primary key, -- convention: `${survey_type}:${survey_version}`
  survey_type text not null,
  survey_version text not null,
  title text null,
  description text null,
  -- JSON definition used by the frontend to render dynamically
  -- Example structure (flexible):
  -- {
  --   "sections": [
  --     { "legend": "A. Background", "items": [
  --         { "component": "Checkbox", "name": "role", "id": "role_psychologist", "label": "Psychologist" },
  --         { "component": "Radio", "name": "experience", "options": [ ... ] }
  --     ]}
  --   ]
  -- }
  definition jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_surveys_type_version
  on public.surveys (survey_type, survey_version);

alter table public.surveys enable row level security;

-- Note: Backend uses service role; explicit RLS policies can be added if client-side access is needed.


