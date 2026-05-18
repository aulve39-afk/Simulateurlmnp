-- Migration RGPD : désinscription propre via colonne dédiée
-- À appliquer dans Supabase Dashboard → SQL Editor, ou via `supabase db push`
--
-- Avant cette migration, la désinscription était simulée en mettant
-- emailed_j14 et emailed_j30 à "2099-01-01" (hack fragile).
-- Désormais, unsubscribed_at IS NOT NULL = désabonné.

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMPTZ;

-- Index partiel : ne couvre que les leads encore abonnés (IS NULL)
-- → très compact, requêtes cron ultra-rapides
CREATE INDEX IF NOT EXISTS idx_leads_unsubscribed
  ON leads(unsubscribed_at)
  WHERE unsubscribed_at IS NULL;

-- Index sur les colonnes utilisées par les requêtes cron
CREATE INDEX IF NOT EXISTS idx_leads_created_at
  ON leads(created_at);

CREATE INDEX IF NOT EXISTS idx_leads_emailed_j14
  ON leads(emailed_j14);

CREATE INDEX IF NOT EXISTS idx_leads_emailed_j30
  ON leads(emailed_j30);
