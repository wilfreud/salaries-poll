-- Ensure required extension for UUID generation is available
create extension if not exists "pgcrypto";

-- Create salaries table if it does not exist yet
create table if not exists public.salaries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc'::text, now()),
  formation text not null,
  speciality text not null,
  contract_type text not null,
  salary integer not null,
  participant_type text not null,
  job_title text
);

-- Columns alignment (idempotent guards to avoid failures on re-run)
alter table public.salaries
  add column if not exists created_at timestamptz not null default timezone('utc'::text, now());

alter table public.salaries
  add column if not exists formation text;

alter table public.salaries
  add column if not exists speciality text;

alter table public.salaries
  add column if not exists contract_type text;

alter table public.salaries
  add column if not exists salary integer;

alter table public.salaries
  add column if not exists participant_type text;

alter table public.salaries
  add column if not exists job_title text;

alter table public.salaries
  alter column salary set not null;

alter table public.salaries
  alter column formation set not null;

alter table public.salaries
  alter column speciality set not null;

alter table public.salaries
  alter column contract_type set not null;

alter table public.salaries
  alter column participant_type set not null;

alter table public.salaries
  alter column salary type integer using salary::integer;

-- Data quality constraints (drop + recreate to keep list in sync)
alter table public.salaries drop constraint if exists salaries_salary_positive;
alter table public.salaries
  add constraint salaries_salary_positive
  check (salary > 0);

alter table public.salaries drop constraint if exists salaries_formation_check;
alter table public.salaries
  add constraint salaries_formation_check
  check (formation in ('Master', 'DIC', 'DIT'));

alter table public.salaries drop constraint if exists salaries_speciality_check;
alter table public.salaries
  add constraint salaries_speciality_check
  check (speciality in ('SSI', 'IABD', 'INFO'));

alter table public.salaries drop constraint if exists salaries_contract_type_check;
alter table public.salaries
  add constraint salaries_contract_type_check
  check (contract_type in ('Stage', 'Alternance', 'CDD', 'CDI', 'Prestation de service'));

alter table public.salaries drop constraint if exists salaries_participant_type_check;
alter table public.salaries
  add constraint salaries_participant_type_check
  check (participant_type in ('Étudiant', 'Alumni'));

-- Indexes for faster dashboards
create index if not exists salaries_created_at_idx on public.salaries (created_at desc);
create index if not exists salaries_contract_type_idx on public.salaries (contract_type);
create index if not exists salaries_formation_idx on public.salaries (formation);
create index if not exists salaries_speciality_idx on public.salaries (speciality);

-- Security (allow public read/write for anonymous usage - adjust for production)
alter table public.salaries enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'salaries'
      and policyname = 'Allow anonymous inserts'
  ) then
    create policy "Allow anonymous inserts" on public.salaries for insert with check (true);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'salaries'
      and policyname = 'Allow read access'
  ) then
    create policy "Allow read access" on public.salaries for select using (true);
  end if;
end
$$;
