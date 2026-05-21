import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * @file app/api/lead/route.js
 * Route POST — Capture de leads qualifiés pour mise en relation expert.
 *
 * Pipeline :
 *  1. Validation (email requis, téléphone optionnel, consentement vérifié côté client)
 *  2. Déduplication + upsert Supabase table `expert_leads`
 *  3. Forward vers webhook Make/Zapier (LEAD_WEBHOOK_URL) avec tous les champs de contexte
 *
 * Variables d'environnement requises :
 *   NEXT_PUBLIC_SUPABASE_URL   — URL du projet Supabase
 *   SUPABASE_SERVICE_ROLE_KEY  — Clé service (jamais exposée côté client)
 *   LEAD_WEBHOOK_URL           — URL Make / Zapier / n8n (optionnel — silencieux si absent)
 *   LEAD_WEBHOOK_SECRET        — Shared secret pour vérifier l'origine (optionnel)
 */

// ─── Supabase ─────────────────────────────────────────────────────────────────

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// ─── Validation ───────────────────────────────────────────────────────────────

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RE_PHONE = /^(\+33|0)[0-9]{9}$/;

function validateBody(body) {
  const errors = [];
  if (!body.email || !RE_EMAIL.test(body.email.trim())) {
    errors.push("Email invalide ou manquant");
  }
  if (!body.prenom || body.prenom.trim().length < 2) {
    errors.push("Prénom manquant");
  }
  if (body.telephone && !RE_PHONE.test(body.telephone)) {
    errors.push("Numéro de téléphone invalide");
  }
  return errors;
}

// ─── Sanitisation ─────────────────────────────────────────────────────────────

function sanitize(str, max = 100) {
  if (typeof str !== "string") return null;
  return str.trim().slice(0, max).replace(/[<>]/g, "");
}

function sanitizeNum(v, min, max) {
  const n = parseFloat(v);
  if (isNaN(n) || n < min || n > max) return null;
  return Math.round(n * 100) / 100;
}

// ─── Handler POST ─────────────────────────────────────────────────────────────

export async function POST(request) {
  try {
    // ── 1. Parse ──
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
    }

    // ── 2. Validation ──
    const errors = validateBody(body);
    if (errors.length > 0) {
      return NextResponse.json({ error: errors[0] }, { status: 400 });
    }

    // ── 3. Construction du payload Supabase ──
    const record = {
      prenom:      sanitize(body.prenom),
      email:       body.email.trim().toLowerCase(),
      telephone:   body.telephone ? sanitize(body.telephone, 20) : null,
      variant:     sanitize(body.variant, 40),
      expert_type: sanitize(body.expert_type, 80),
      source:      sanitize(body.source, 40) ?? "lmnp_simulator",

      // Données de simulation (qualificatif du lead)
      tri:         sanitizeNum(body.tri,        -50, 200),
      cashflow_m:  sanitizeNum(body.cashflow_m, -5000, 10000),
      ratio_endt:  sanitizeNum(body.ratio_endt,  0,   100),
      impot_an1:   sanitizeNum(body.impot_an1,   0,   500000),
      prix:        sanitizeNum(body.prix,         0,   50000000),
      surface:     sanitizeNum(body.surface,      0,   5000),
      adresse:     sanitize(body.adresse, 150),

      // Tracking
      created_at:  new Date().toISOString(),
      ip_hash:     null, // On ne stocke pas l'IP brute (RGPD)
    };

    // ── 4. Supabase upsert ──
    const sb = getSupabase();
    if (sb) {
      const { error: dbError } = await sb
        .from("expert_leads")
        .upsert(record, {
          onConflict:      "email",
          ignoreDuplicates: false, // Met à jour si même email (nouveau projet)
        });

      if (dbError) {
        // On log mais on ne bloque pas (le webhook peut quand même partir)
        console.error("[api/lead] Supabase error:", dbError.message);
      }
    } else {
      console.warn("[api/lead] Supabase non configuré — lead non persisté");
    }

    // ── 5. Webhook Make / Zapier / n8n ──
    const webhookUrl = process.env.LEAD_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        const webhookPayload = {
          ...record,
          // Champs supplémentaires pour le CRM/workflow
          score_lead: computeLeadScore(record),
          source_url: `https://www.immoverdict.com/lmnp`,
          webhook_secret: process.env.LEAD_WEBHOOK_SECRET ?? undefined,
        };

        const webhookRes = await fetch(webhookUrl, {
          method:  "POST",
          headers: {
            "Content-Type": "application/json",
            ...(process.env.LEAD_WEBHOOK_SECRET
              ? { "X-Webhook-Secret": process.env.LEAD_WEBHOOK_SECRET }
              : {}),
          },
          body: JSON.stringify(webhookPayload),
        });

        if (!webhookRes.ok) {
          console.error("[api/lead] Webhook error:", webhookRes.status, await webhookRes.text());
        }
      } catch (webhookErr) {
        // Erreur webhook non bloquante — le lead est déjà en base
        console.error("[api/lead] Webhook fetch failed:", webhookErr.message);
      }
    }

    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error("[api/lead] Unhandled error:", err.message);
    return NextResponse.json({ error: "Erreur serveur interne" }, { status: 500 });
  }
}

// ─── Score de qualification du lead (0–100) ───────────────────────────────────

/**
 * Calcule un score de priorité pour le CRM partenaire.
 * Un lead "comptable" avec un impôt élevé vaut plus qu'un lead générique.
 *
 * @param {Object} r  record Supabase
 * @returns {number}  score 0–100
 */
function computeLeadScore(r) {
  let score = 50; // base

  // TRI
  if (r.tri >= 6)  score += 15;
  else if (r.tri >= 4) score += 8;
  else if (r.tri !== null && r.tri < 2) score -= 10;

  // Cash-flow
  if (r.cashflow_m >= 200)  score += 15;
  else if (r.cashflow_m >= 0) score += 8;
  else if (r.cashflow_m < -200) score -= 5;

  // Impôt — lead comptable à fort potentiel de valeur
  if (r.impot_an1 >= 2000)  score += 20;
  else if (r.impot_an1 >= 500) score += 10;

  // Prix — ticket élevé = commission partenaire élevée
  if (r.prix >= 400000)     score += 10;
  else if (r.prix >= 200000) score += 5;

  // Téléphone renseigné → lead plus chaud
  if (r.telephone) score += 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

// ─── GET : non autorisé ───────────────────────────────────────────────────────

export function GET() {
  return NextResponse.json({ error: "Méthode non autorisée" }, { status: 405 });
}
