"use client";
import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export function useAuth() {
  const [user,    setUser]    = useState(undefined); // undefined = loading
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Guard : supabase peut être null si les env vars sont absentes
    if (!supabase) {
      setUser(null);
      setLoading(false);
      return;
    }

    // Session initiale
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Écoute les changements d'état
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = () => supabase?.auth.signOut();

  return { user, loading, signOut };
}
