-- apps/backend/supabase/schemas/211_triggers.sql
-- Maintain updated_at timestamps on update

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'set_updated_at_surveys'
  ) then
    create trigger set_updated_at_surveys
    before update on public.surveys
    for each row execute function public.set_updated_at();
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'set_updated_at_survey_responses'
  ) then
    create trigger set_updated_at_survey_responses
    before update on public.survey_responses
    for each row execute function public.set_updated_at();
  end if;
end$$;


