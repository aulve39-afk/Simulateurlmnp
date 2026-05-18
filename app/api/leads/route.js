import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialisation lazy : évite le crash au build si les env vars sont absentes
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, nom, source, params, tri, cashflow_m } = body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Email invalide" }, { status: 400 });
    }

    const sb = getSupabase();
    if (!sb) return NextResponse.json({ error: "Base de données non configurée" }, { status: 503 });

    const { error } = await sb.from("leads").upsert(
      {
        email:      email.toLowerCase().trim(),
        nom:        nom        ?? null,
        source:     source     ?? "homepage",
        params:     params     ?? null,
        tri:        tri        ?? null,
        cashflow_m: cashflow_m ?? null,
      },
      { onConflict: "email", ignoreDuplicates: false }
    );

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/leads]", e.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
