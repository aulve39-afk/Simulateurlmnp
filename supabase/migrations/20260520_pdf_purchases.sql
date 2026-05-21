-- =============================================================================
-- Migration : pdf_purchases
-- Stocke les achats du Rapport Pro PDF via Stripe Checkout
-- =============================================================================

create table if not exists pdf_purchases (
  id              bigserial primary key,
  session_id      text        not null unique,          -- Stripe Checkout session_id
  payment_intent  text,                                  -- Stripe PaymentIntent id
  customer_email  text,
  amount_total    int,                                   -- en centimes (999 = 9,99€)
  currency        text        not null default 'eur',
  status          text        not null default 'paid',   -- paid | refunded
  metadata        jsonb,                                 -- metadata Stripe (simulation, source…)
  expires_at      timestamptz not null,                  -- token valide 48h apres achat
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Index pour lookup rapide par email ou session
create index if not exists idx_pdf_purchases_email      on pdf_purchases (customer_email);
create index if not exists idx_pdf_purchases_expires_at on pdf_purchases (expires_at);

-- Trigger updated_at
create or replace function set_pdf_purchases_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_pdf_purchases_updated_at on pdf_purchases;
create trigger trg_pdf_purchases_updated_at
  before update on pdf_purchases
  for each row execute function set_pdf_purchases_updated_at();

-- RLS : service_role uniquement (pas d'acces client direct)
alter table pdf_purchases enable row level security;

drop policy if exists "service_role_only_pdf_purchases" on pdf_purchases;
create policy "service_role_only_pdf_purchases"
  on pdf_purchases
  using (auth.role() = 'service_role');

-- Commentaires
comment on table  pdf_purchases                is 'Achats du Rapport Pro PDF via Stripe Checkout (token 48h)';
comment on column pdf_purchases.session_id     is 'Stripe Checkout session_id — cle unique';
comment on column pdf_purchases.expires_at     is 'Date expiration du token de telechargement (48h apres paiement)';
comment on column pdf_purchases.metadata       is 'Metadonnees Stripe : source, email, simulation (JSON)';
