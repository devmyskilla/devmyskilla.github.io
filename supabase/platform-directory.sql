-- Platform Directory Pro 2.0 public presentation metadata.
-- Idempotent and intentionally read-only for public clients.

alter table public.platforms
  add column if not exists description_ar text,
  add column if not exists description_en text,
  add column if not exists description_tr text,
  add column if not exists category text,
  add column if not exists pricing_model text,
  add column if not exists has_free_content boolean,
  add column if not exists certificate_available boolean,
  add column if not exists languages text[],
  add column if not exists platform_type text,
  add column if not exists best_for_ar text[],
  add column if not exists best_for_en text[],
  add column if not exists best_for_tr text[],
  add column if not exists strengths_ar text[],
  add column if not exists strengths_en text[],
  add column if not exists strengths_tr text[],
  add column if not exists limitations_ar text[],
  add column if not exists limitations_en text[],
  add column if not exists limitations_tr text[],
  add column if not exists featured boolean not null default false,
  add column if not exists display_order integer;

-- Only known pricing states may be stored. Existing NULL remains valid.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.platforms'::regclass
      and conname = 'platforms_pricing_model_check'
  ) then
    alter table public.platforms
      add constraint platforms_pricing_model_check
      check (pricing_model is null or pricing_model in ('free','freemium','paid','mixed','unknown'));
  end if;
end $$;

alter table public.platforms enable row level security;

-- The existing project already has public_read_active_platforms. Only create it
-- when absent; never replace a pre-existing policy automatically.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'platforms'
      and policyname = 'public_read_active_platforms'
  ) then
    create policy public_read_active_platforms
      on public.platforms
      for select
      to anon, authenticated
      using (status = 'active');
  end if;
end $$;

grant select on table public.platforms to anon, authenticated;
