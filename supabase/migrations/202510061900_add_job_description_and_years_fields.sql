-- Add job description and years since graduation fields to salaries table

-- Add the new optional columns
alter table public.salaries
  add column if not exists job_description text;

alter table public.salaries
  add column if not exists years_since_graduation integer;

-- Add constraint to ensure years_since_graduation is non-negative when provided
alter table public.salaries drop constraint if exists salaries_years_since_graduation_check;
alter table public.salaries
  add constraint salaries_years_since_graduation_check
  check (years_since_graduation is null or years_since_graduation >= 0);

-- Update speciality constraint to include TELECOM
alter table public.salaries drop constraint if exists salaries_speciality_check;
alter table public.salaries
  add constraint salaries_speciality_check
  check (speciality in ('SSI', 'IABD', 'INFO', 'TELECOM'));