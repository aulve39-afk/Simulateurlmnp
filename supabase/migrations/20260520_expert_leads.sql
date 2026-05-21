-- Migration : table expert_leads (Levier 1 monétisation ImmoVerdict)
-- À exécuter dans l'éditeur SQL Supabase ou via CLI : supabase db push

create table if not exists public.expert_leads (
  id           bigint          generated always as identity primary key,
  email        text            not null,
  prenom       text,
  telephone    text,

  -- Qualification du lead
  variant      text,           -- "courtier_top"|"comptable_impot"|"courtier_cf"|"courtier_endt"|"audit"
  expert_type  text,           -- Label affiché à l'expert partenaire
  score_lead   smallint,       -- 0–100 calculé côté API

  -- Données de simulation
  tri          numeric(5,2),
  cashflow_m   numeric(8,2),
  ratio_endt   numeric(5,2),
  impot_an1    numeric(10,2),
  prix         numeric(12,2),
  surface      numeric(7,2),
  adresse      text,
  source       text default 'lmnp_simulator',

  -- Workflow
  status       text default 'new',   -- "new"|"contacted"|"converted"|"rejected"
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  ip_hash      text         -- Optionnel (RGPD — hash uniquement, pas IP brute)
);

-- Index pour dédupliquer par email
create unique index if not exists expert_leads_email_idx on public.expert_leads (email);

-- Index pour trier par score (CRM partenaire)
create index if not exists expert_leads_score_idx on public.expert_leads (score_lead desc, created_at desc);

-- Row Level Security
alter table public.expert_leads enable row level security;

-- Seul le service role peut lire/écrire (pas d'accès anon)
create policy "service_role_only" on public.expert_leads
  using (auth.role() = 'service_role');

-- Trigger updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists expert_leads_updated_at on public.expert_leads;
create trigger expert_leads_updated_at
  before update on public.expert_leads
  for each row execute function public.set_updated_at();
