import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Stripe exige le body brut (non parse) pour verifier la signature
export const config = { api: { bodyParser: false } };

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: "2024-04-10" });
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// Next.js App Router — lire le body en tant que Buffer
async function getRawBody(request) {
  const reader = request.body.getReader();
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((acc, c) => acc + c.length, 0);
  const buf = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    buf.set(chunk, offset);
    offset += chunk.length;
  }
  return Buffer.from(buf);
}

export async function POST(request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe non configure" }, { status: 503 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[webhook/stripe] STRIPE_WEBHOOK_SECRET manquant");
    return NextResponse.json({ error: "Webhook non configure" }, { status: 503 });
  }

  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Signature manquante" }, { status: 400 });
  }

  let event;
  try {
    const rawBody = await getRawBody(request);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (e) {
    console.error("[webhook/stripe] Signature invalide:", e.message);
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    try {
      await handleCheckoutCompleted(session);
    } catch (e) {
      console.error("[webhook/stripe] handleCheckoutCompleted:", e.message);
      // On retourne 200 quand meme pour eviter les retries Stripe
    }
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session) {
  const sb = getSupabase();
  if (!sb) {
    console.warn("[webhook/stripe] Supabase non configure, session non persistee");
    return;
  }

  const email = (
    session.customer_email ||
    session.customer_details?.email ||
    session.metadata?.email ||
    ""
  )
    .toLowerCase()
    .trim();

  // Token valide 48h
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  const { error } = await sb.from("pdf_purchases").upsert(
    {
      session_id:     session.id,
      payment_intent: session.payment_intent ?? null,
      customer_email: email || null,
      amount_total:   session.amount_total ?? null,
      currency:       session.currency ?? "eur",
      status:         "paid",
      metadata:       session.metadata ?? null,
      expires_at:     expiresAt,
    },
    { onConflict: "session_id", ignoreDuplicates: false }
  );

  if (error) {
    console.error("[webhook/stripe] upsert pdf_purchases:", error.message);
    throw error;
  }

  console.info("[webhook/stripe] Achat enregistre:", session.id, email);
}
