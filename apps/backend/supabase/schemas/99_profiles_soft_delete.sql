-- Soft-delete support for profiles: keep records for compliance
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deleted boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Optionally store the original email for audit purposes
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS original_email text;


