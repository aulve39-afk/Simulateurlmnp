import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId || sessionId.length < 10) {
      return NextResponse.json({ paid: false }, { status: 400 });
    }

    const sb = getSupabase();
    if (!sb) {
      return NextResponse.json({ paid: false }, { status: 503 });
    }

    const { data, error } = await sb
      .from("pdf_purchases")
      .select("status, expires_at")
      .eq("session_id", sessionId)
      .single();

    if (error || !data) {
      return NextResponse.json({ paid: false });
    }

    const expired = new Date(data.expires_at) < new Date();
    const paid    = data.status === "paid" && !expired;

    return NextResponse.json({ paid });
  } catch (e) {
    console.error("[api/checkout/verify]", e.message);
    return NextResponse.json({ paid: false }, { status: 500 });
  }
}
