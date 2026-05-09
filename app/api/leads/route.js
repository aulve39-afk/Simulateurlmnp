import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL  ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, nom, source, params, tri, cashflow_m } = body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Email invalide" }, { status: 400 });
    }

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
