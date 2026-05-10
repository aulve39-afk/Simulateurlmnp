"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

/* ── Helpers ── */
const fmt    = (n) => new Intl.NumberFormat("fr-FR", { style:"currency", currency:"EUR", maximumFractionDigits:0 }).format(n ?? 0);
const fmtPct = (n) => `${(+n || 0).toFixed(2)} %`;

export default function MonEspacePage() {
  const [user,         setUser]         = useState(undefined); // undefined = loading
  const [simulations,  setSimulations]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [deleting,     setDeleting]     = useState(null);
  const [renaming,     setRenaming]     = useState(null); // id en cours de renommage
  const [newName,      setNewName]      = useState("");

  /* ── Auth ── */
  useEffect(() => {
    if (!supabase) { setUser(null); setLoading(false); return; }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchSimulations();
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchSimulations();
      else { setSimulations([]); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Chargement des simulations ── */
  const fetchSimulations = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("simulations")
      .select("id, nom, form_data, results, created_at, updated_at")
      .order("created_at", { ascending: false });
    if (!error) setSimulations(data ?? []);
    setLoading(false);
  };

  /* ── Supprimer une simulation ── */
  const deleteSimulation = async (id) => {
    setDeleting(id);
    await supabase.from("simulations").delete().eq("id", id);
    setSimulations(prev => prev.filter(s => s.id !== id));
    setDeleting(null);
  };

  /* ── Renommer une simulation ── */
  const renameSimulation = async (id) => {
    if (!newName.trim()) return;
    await supabase.from("simulations").update({ nom: newName.trim() }).eq("id", id);
    setSimulations(prev => prev.map(s => s.id === id ? { ...s, nom: newName.trim() } : s));
    setRenaming(null);
    setNewName("");
  };

  /* ── Construire l'URL de restauration ── */
  const buildSimUrl = (sim) => {
    const f = sim.form_data ?? {};
    const params = new URLSearchParams();
    const numKeys = ["prix","notaire","travaux","mobilier","apport","interet","dureeCredit","loyer","charges","taxeFonciere","vacance","tmi","revenusMensuels"];
    const strKeys = ["typeBien","adresse","modeExploitation"];
    numKeys.forEach(k => { if (f[k] !== undefined) params.set(k, f[k]); });
    strKeys.forEach(k => { if (f[k]) params.set(k, f[k]); });
    params.set("step", "3");
    return `/lmnp?${params.toString()}`;
  };

  /* ── État non connecté ── */
  if (user === null) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <div className="text-4xl mb-3">🔐</div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Accéder à mon espace</h1>
          <p className="text-slate-500 text-sm mb-5">
            Connectez-vous pour retrouver vos simulations sauvegardées.
          </p>
          <Link href="/lmnp"
            className="inline-flex items-center gap-2 bg-orange-500 text-white rounded-xl px-5 py-2.5 text-sm font-bold hover:bg-orange-600 transition-colors">
            ← Retour au simulateur
          </Link>
        </div>
      </main>
    );
  }

  /* ── Chargement ── */
  if (user === undefined || loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Chargement…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30 pb-20">
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-orange-500 font-bold text-sm">ImmoVerdict</Link>
          <span className="text-slate-300">›</span>
          <span className="text-slate-900 text-sm font-medium">Mon espace</span>
        </div>
        <button onClick={() => supabase.auth.signOut()}
          className="text-xs text-slate-500 hover:text-slate-700 transition-colors">
          Déconnexion
        </button>
      </nav>

      <div className="max-w-2xl mx-auto px-4 pt-8">
        {/* ── En-tête ── */}
        <header className="mb-8">
          <h1 className="text-2xl font-extrabold text-slate-900 mb-1">Mon espace</h1>
          <p className="text-slate-500 text-sm">
            Connecté en tant que <strong>{user.email}</strong> · {simulations.length} simulation{simulations.length !== 1 ? "s" : ""} sauvegardée{simulations.length !== 1 ? "s" : ""}
          </p>
        </header>

        {/* ── CTA nouvelle simulation ── */}
        <Link href="/lmnp"
          className="flex items-center gap-3 mb-6 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 p-4 text-white shadow-md hover:shadow-lg transition-shadow">
          <span className="text-2xl">➕</span>
          <div>
            <p className="font-bold text-sm">Nouvelle simulation</p>
            <p className="text-xs opacity-80">Analysez un nouveau bien LMNP</p>
          </div>
          <span className="ml-auto text-lg">→</span>
        </Link>

        {/* ── Liste des simulations ── */}
        {simulations.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="font-semibold text-slate-700 mb-1">Aucune simulation sauvegardée</p>
            <p className="text-slate-400 text-sm">
              Lancez une simulation et cliquez sur ☁️ Sauvegarder pour la retrouver ici.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {simulations.map(sim => {
              const r0   = sim.results?.[0];
              const date = new Date(sim.created_at).toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric" });
              const prix = sim.form_data?.prix;

              return (
                <div key={sim.id}
                  className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                  {/* Nom + date */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 pr-3">
                      {renaming === sim.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            autoFocus
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") renameSimulation(sim.id); if (e.key === "Escape") setRenaming(null); }}
                            className="text-sm font-bold border border-orange-300 rounded-lg px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-orange-400"
                          />
                          <button onClick={() => renameSimulation(sim.id)}
                            className="text-xs text-green-600 font-semibold whitespace-nowrap">OK</button>
                          <button onClick={() => setRenaming(null)}
                            className="text-xs text-slate-400">Annuler</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setRenaming(sim.id); setNewName(sim.nom); }}
                          className="text-sm font-bold text-slate-900 hover:text-orange-500 text-left truncate w-full transition-colors"
                          title="Cliquer pour renommer">
                          {sim.nom}
                        </button>
                      )}
                      <p className="text-[11px] text-slate-400 mt-0.5">Sauvegardée le {date}</p>
                    </div>
                    <button onClick={() => deleteSimulation(sim.id)}
                      disabled={deleting === sim.id}
                      className="text-slate-300 hover:text-red-400 transition-colors text-sm disabled:opacity-50"
                      title="Supprimer">
                      {deleting === sim.id ? "…" : "✕"}
                    </button>
                  </div>

                  {/* Métriques clés */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="rounded-lg bg-slate-50 p-2 text-center">
                      <p className="text-[10px] text-slate-400">Prix</p>
                      <p className="text-xs font-bold text-slate-700">{prix ? fmt(prix) : "—"}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2 text-center">
                      <p className="text-[10px] text-slate-400">TRI</p>
                      <p className="text-xs font-bold text-slate-700">{r0?.tri != null ? fmtPct(r0.tri) : "—"}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2 text-center">
                      <p className="text-[10px] text-slate-400">Cash-flow/mois</p>
                      <p className={`text-xs font-bold ${(r0?.cashflowM ?? 0) >= 0 ? "text-green-600" : "text-red-500"}`}>
                        {r0?.cashflowM != null ? fmt(r0.cashflowM) : "—"}
                      </p>
                    </div>
                  </div>

                  {/* Régime optimal */}
                  {r0?.regime && (
                    <p className="text-[11px] text-slate-500 mb-3">
                      Régime optimal : <strong className="text-slate-700">{r0.regime}</strong>
                    </p>
                  )}

                  {/* CTA restaurer */}
                  <Link href={buildSimUrl(sim)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 text-white px-3 py-1.5 text-xs font-bold hover:bg-orange-600 transition-colors">
                    Reprendre cette simulation →
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
