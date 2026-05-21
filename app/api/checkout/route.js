import { NextResponse } from "next/server";
import Stripe from "stripe";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: "2024-04-10" });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, simulationData } = body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Email invalide" }, { status: 400 });
    }

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: "Paiement non configure" }, { status: 503 });
    }

    // Metadonnees simulation (max 500 chars par cle Stripe)
    const meta = {};
    if (simulationData) {
      try {
        const s =
          typeof simulationData === "string"
            ? simulationData
            : JSON.stringify(simulationData);
        meta.simulation = s.slice(0, 499);
      } catch {
        /* noop */
      }
    }

    const priceId = process.env.STRIPE_PRICE_ID;
    const lineItems = priceId
      ? [{ price: priceId, quantity: 1 }]
      : [
          {
            price_data: {
              currency: "eur",
              product_data: {
                name: "Dossier Bancaire LMNP Pro",
                description:
                  "Rapport complet : graphiques comparatifs, simulation revente, 4 regimes fiscaux, dossier pret pour banque",
              },
              unit_amount: 999,
            },
            quantity: 1,
          },
        ];

    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://www.immoverdict.com";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      customer_email: email.toLowerCase().trim(),
      success_url: `${origin}/lmnp?session_id={CHECKOUT_SESSION_ID}&download=true`,
      cancel_url: `${origin}/lmnp?download=cancelled`,
      locale: "fr",
      payment_method_types: ["card"],
      metadata: {
        source: "immoverdict_lmnp",
        email: email.toLowerCase().trim(),
        ...meta,
      },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (e) {
    console.error("[api/checkout]", e.message);
    return NextResponse.json(
      { error: "Erreur lors de la creation du paiement" },
      { status: 500 }
    );
  }
}
