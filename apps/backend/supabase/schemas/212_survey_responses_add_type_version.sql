-- apps/backend/supabase/schemas/212_survey_responses_add_type_version.sql
-- Add survey_type and survey_version to survey_responses, backfill, and generate survey_id from them

do $$
begin
  -- 1) Add columns if missing
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'survey_responses' and column_name = 'survey_type'
  ) then
    alter table public.survey_responses add column survey_type text;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'survey_responses' and column_name = 'survey_version'
  ) then
    alter table public.survey_responses add column survey_version text;
  end if;
end$$;

-- 2) Backfill from current survey_id "type:version" convention
update public.survey_responses
set
  survey_type = coalesce(survey_type, split_part(survey_id, ':', 1)),
  survey_version = coalesce(survey_version, split_part(survey_id, ':', 2));

-- 3) Enforce NOT NULL after backfill
alter table public.survey_responses
  alter column survey_type set not null,
  alter column survey_version set not null;

-- 4) Keep survey_id in sync from (survey_type || ':' || survey_version)
--    Use a trigger to avoid incompatibilities with altering existing columns to generated
alter table public.survey_responses alter column survey_id drop default;

create or replace function public.sr_set_survey_id()
returns trigger as $$
begin
  new.survey_id := new.survey_type || ':' || new.survey_version;
  return new;
end;
$$ language plpgsql;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'sr_set_survey_id_biud'
  ) then
    create trigger sr_set_survey_id_biud
    before insert or update on public.survey_responses
    for each row execute function public.sr_set_survey_id();
  end if;
end$$;

-- 5) Optional: lightweight check constraint for simple versions like 'v1', 'v2' etc.
-- Uncomment if desired
-- alter table public.survey_responses add constraint chk_survey_version_format check (survey_version ~ '^v[0-9]+' );


-- 6) Add user_agent column to capture client user agent string
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'survey_responses' and column_name = 'user_agent'
  ) then
    alter table public.survey_responses add column user_agent text;
  end if;
end$$;


