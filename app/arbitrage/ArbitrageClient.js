"use client";

/**
 * @file ArbitrageClient.js
 * Simulateur d'Arbitrage Fiscal LMNP — Revente vs Poursuite de l'activité
 *
 * UI : formulaire 2 niveaux (simplifié + accordéon expert), verdict dynamique,
 * graphiques SVG dynamiques, prefill depuis localStorage (clé: immo_arbitrage_prefill).
 */

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { computeArbitrageTimeline } from "../../lib/calcul-arbitrage";

// ─── Chargement dynamique des graphiques (ssr: false) ─────────────────────────

const ChartLoading = () => (
  <div className="h-48 bg-slate-100 animate-pulse rounded-xl" />
);

const ArbitrageTimelineChart = dynamic(
  () => import("./ArbitrageCharts").then(m => m.ArbitrageTimelineChart),
  { ssr: false, loading: ChartLoading },
);
const BouclierDecomposChart = dynamic(
  () => import("./ArbitrageCharts").then(m => m.BouclierDecomposChart),
  { ssr: false, loading: ChartLoading },
);
const ReventeOptimaleChart = dynamic(
  () => import("./ArbitrageCharts").then(m => m.ReventeOptimaleChart),
  { ssr: false, loading: ChartLoading },
);

// ─── Valeurs par défaut ───────────────────────────────────────────────────────

const DEFAULT_FORM = {
  // Bien
  valeurActuelle:   200000,
  prixAcquisition:  180000,
  fraisNotaire:     7.5,
  travauxInitiaux:  10000,
  mobilierInitial:  5000,
  terrainPct:       15,
  anneeAcquisition: 5,

  // Crédit
  capitalRestantDu: 120000,
  tauxInteret:      2.5,
  dureeRestante:    15,

  // Exploitation
  loyerMensuel:     850,
  chargesAnnuelles: 3600,
  vacance:          5,
  revalorisation:   2,
  tmi:              30,

  // Comptabilité
  deficitReportable: 0,
  horizonSimulation: 20,

  // Expert (optionnel — vide = mode simplifié)
  amortBienAnnuelOverride:     "",
  anneesBienRestantesOverride: "",
  mobilierVncOverride:         "",
  anneesMobilierRestOverride:  "",
  travauxVncOverride:          "",
  anneesTravauxRestOverride:   "",
};

// ─── Utilitaires UI ──────────────────────────────────────────────────────────

function fmt(v) {
  return Number(v).toLocaleString("fr-FR");
}

function fmtEur(v, sign = false) {
  const abs = Math.abs(Math.round(v)).toLocaleString("fr-FR");
  const prefix = v < 0 ? "−" : sign && v > 0 ? "+" : "";
  return `${prefix}${abs} €`;
}

/** Champ texte sombre (style LmnpClient) */
function InputField({ label, value, onChange, type = "number", suffix = "", help, small = false }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-400">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type={type}
          value={value}
          onChange={e => onChange(type === "number" ? parseFloat(e.target.value) || 0 : e.target.value)}
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1.5px solid rgba(255,255,255,0.12)",
            borderRadius: 8,
            color: "#f1f5f9",
            padding: small ? "4px 8px" : "8px 12px",
            fontSize: small ? 13 : 15,
            width: "100%",
            outline: "none",
          }}
          onFocus={e => (e.target.style.borderColor = "#F97316")}
          onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
        />
        {suffix && <span className="text-xs text-slate-400 whitespace-nowrap">{suffix}</span>}
      </div>
      {help && <span className="text-xs text-slate-500">{help}</span>}
    </label>
  );
}

/** Slider */
function SliderField({ label, value, onChange, min, max, step = 1, format = fmt, help, color = "#F97316" }) {
  return (
    <label className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-slate-400">{label}</span>
        <span className="text-sm font-semibold" style={{ color }}>{format(value)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ accentColor: color, width: "100%" }}
      />
      {help && <span className="text-xs text-slate-500">{help}</span>}
    </label>
  );
}

/** Select */
function SelectField({ label, value, onChange, options, help }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-400">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          background: "rgba(255,255,255,0.07)",
          border: "1.5px solid rgba(255,255,255,0.12)",
          borderRadius: 8,
          color: "#f1f5f9",
          padding: "8px 12px",
          fontSize: 15,
          width: "100%",
        }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value} style={{ background: "#1e293b" }}>
            {o.label}
          </option>
        ))}
      </select>
      {help && <span className="text-xs text-slate-500">{help}</span>}
    </label>
  );
}

/** Card blanche */
function Card({ children, className = "", style = {} }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-5 ${className}`} style={style}>
      {children}
    </div>
  );
}

/** KPI card */
function KPICard({ label, value, sub, color = "#F97316", bg = "rgba(249,115,22,0.10)", icon, help }) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-1" style={{ background: bg }}>
      <div className="flex items-center gap-2">
        {icon && <span className="text-xl">{icon}</span>}
        <span className="text-xs font-medium text-slate-500">{label}</span>
      </div>
      <div className="text-2xl font-bold" style={{ color }}>{value}</div>
      {sub && <div className="text-xs text-slate-400">{sub}</div>}
      {help && <div className="text-xs text-slate-400 italic mt-1">{help}</div>}
    </div>
  );
}

/** Section title */
function SectionTitle({ icon, title, sub }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-1">
        {icon && <span className="text-xl">{icon}</span>}
        <h2 className="text-base font-bold text-slate-800">{title}</h2>
      </div>
      {sub && <p className="text-sm text-slate-500">{sub}</p>}
    </div>
  );
}

/** Séparateur de section formulaire */
function FormSection({ title, children }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{title}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

// ─── Options TMI ─────────────────────────────────────────────────────────────

const TMI_OPTIONS = [
  { value: "0",  label: "0 % (non imposable)" },
  { value: "11", label: "11 %" },
  { value: "30", label: "30 %" },
  { value: "41", label: "41 %" },
  { value: "45", label: "45 %" },
];

// ─── Composant principal ──────────────────────────────────────────────────────

export default function ArbitrageClient() {
  const [form, setForm]               = useState(DEFAULT_FORM);
  const [showExpert, setShowExpert]   = useState(false);
  const [result, setResult]           = useState(null);
  const [copied, setCopied]           = useState(false);

  // ── Prefill depuis localStorage (si venant de /lmnp) ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem("immo_arbitrage_prefill");
      if (!raw) return;
      const data = JSON.parse(raw);
      // Ne consommer qu'une fois
      localStorage.removeItem("immo_arbitrage_prefill");
      setForm(prev => ({
        ...prev,
        valeurActuelle:   data.valeurActuelle   ?? prev.valeurActuelle,
        prixAcquisition:  data.prixAcquisition  ?? prev.prixAcquisition,
        fraisNotaire:     data.fraisNotaire      ?? prev.fraisNotaire,
        travauxInitiaux:  data.travauxInitiaux   ?? prev.travauxInitiaux,
        mobilierInitial:  data.mobilierInitial   ?? prev.mobilierInitial,
        terrainPct:       data.terrainPct        ?? prev.terrainPct,
        anneeAcquisition: data.anneeAcquisition  ?? prev.anneeAcquisition,
        capitalRestantDu: data.capitalRestantDu  ?? prev.capitalRestantDu,
        tauxInteret:      data.tauxInteret       ?? prev.tauxInteret,
        dureeRestante:    data.dureeRestante      ?? prev.dureeRestante,
        loyerMensuel:     data.loyerMensuel       ?? prev.loyerMensuel,
        chargesAnnuelles: data.chargesAnnuelles   ?? prev.chargesAnnuelles,
        vacance:          data.vacance            ?? prev.vacance,
        revalorisation:   data.revalorisation     ?? prev.revalorisation,
        tmi:              data.tmi                ?? prev.tmi,
        deficitReportable: data.deficitReportable ?? prev.deficitReportable,
        horizonSimulation: data.horizonSimulation  ?? prev.horizonSimulation,
      }));
    } catch {
      // JSON invalide ou localStorage indisponible → ignorer
    }
  }, []);

  // ── Calcul réactif ──
  useEffect(() => {
    try {
      const inputs = buildInputs(form);
      const res    = computeArbitrageTimeline(inputs);
      setResult(res);
    } catch (err) {
      console.error("[ArbitrageClient] calcul échoué :", err);
      setResult(null);
    }
  }, [form]);

  // ── Setter générique ──
  const set = useCallback((key, val) => {
    setForm(prev => ({ ...prev, [key]: val }));
  }, []);

  // ── Copier le lien ──
  const copyLink = useCallback(() => {
    try {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* noop */
    }
  }, []);

  const verdict   = result?.verdict;
  const timeline  = result?.timeline ?? [];

  return (
    <div
      className="min-h-screen text-slate-100 pb-16"
      style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)" }}
    >
      {/* ── En-tête ── */}
      <div className="max-w-3xl mx-auto px-4 pt-10 pb-6">
        <Link href="/lmnp" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 mb-6 transition-colors">
          ← Retour au simulateur LMNP
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-extrabold text-white mb-2 leading-tight">
              Arbitrage Fiscal LMNP
            </h1>
            <p className="text-slate-300 text-sm max-w-lg">
              Simulez l&apos;évolution fiscale de votre bien sur 20 ans et déterminez le moment optimal pour vendre, conserver ou restructurer.
            </p>
          </div>
          <button
            onClick={copyLink}
            className="shrink-0 flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all"
            style={{
              background: copied ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.08)",
              border: "1.5px solid rgba(255,255,255,0.15)",
              color: copied ? "#22c55e" : "#94a3b8",
            }}
            title="Copier le lien de cette simulation (Cmd+Shift+C)"
          >
            {copied ? "✓ Lien copié !" : "🔗 Copier le lien"}
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 space-y-6">

        {/* ══════════ FORMULAIRE ══════════ */}
        <Card>
          <SectionTitle
            icon="🏠"
            title="Votre bien"
            sub="Renseignez les paramètres actuels de votre investissement LMNP"
          />

          <FormSection title="Bien & acquisition">
            <InputField label="Valeur actuelle estimée (€)"
              value={form.valeurActuelle} onChange={v => set("valeurActuelle", v)} />
            <InputField label="Prix d'acquisition initial (€)"
              value={form.prixAcquisition} onChange={v => set("prixAcquisition", v)} />
            <InputField label="Frais de notaire (%)"
              value={form.fraisNotaire} onChange={v => set("fraisNotaire", v)} suffix="%" />
            <InputField label="Travaux capitalisés à l'achat (€)"
              value={form.travauxInitiaux} onChange={v => set("travauxInitiaux", v)} />
            <InputField label="Mobilier capitalisé à l'achat (€)"
              value={form.mobilierInitial} onChange={v => set("mobilierInitial", v)} />
            <InputField label="Quote-part terrain (%)"
              value={form.terrainPct} onChange={v => set("terrainPct", v)} suffix="%"
              help="Non amortissable (généralement 15–20 %)" />
          </FormSection>

          <FormSection title="Ancienneté">
            <div className="sm:col-span-2">
              <SliderField
                label="Depuis combien d'années louez-vous ce bien en meublé ?"
                value={form.anneeAcquisition}
                onChange={v => set("anneeAcquisition", v)}
                min={0} max={30} step={1}
                format={v => `${v} an${v > 1 ? "s" : ""}`}
                help="Correspond à l'année de détention absolue. Les amortissements sont calculés automatiquement à partir de cette date."
              />
            </div>
          </FormSection>

          <FormSection title="Crédit en cours">
            <InputField label="Capital restant dû (€)"
              value={form.capitalRestantDu} onChange={v => set("capitalRestantDu", v)} />
            <InputField label="Taux d'intérêt (%)"
              value={form.tauxInteret} onChange={v => set("tauxInteret", v)} suffix="%" />
            <InputField label="Durée restante (ans)"
              value={form.dureeRestante} onChange={v => set("dureeRestante", v)} suffix="ans" />
          </FormSection>

          <FormSection title="Exploitation">
            <InputField label="Loyer mensuel HC (€)"
              value={form.loyerMensuel} onChange={v => set("loyerMensuel", v)} />
            <InputField label="Charges annuelles totales (€)"
              value={form.chargesAnnuelles} onChange={v => set("chargesAnnuelles", v)}
              help="Copro + gestion + assurances + taxe foncière + CFE (hors intérêts)" />
            <SliderField label="Vacance locative" value={form.vacance}
              onChange={v => set("vacance", v)} min={0} max={30} step={1}
              format={v => `${v} %`} />
            <SliderField label="Revalorisation annuelle" value={form.revalorisation}
              onChange={v => set("revalorisation", v)} min={0} max={8} step={0.5}
              format={v => `${v} %`} />
          </FormSection>

          <FormSection title="Fiscalité">
            <SelectField label="Tranche marginale d'imposition (TMI)"
              value={String(form.tmi)} onChange={v => set("tmi", parseFloat(v))}
              options={TMI_OPTIONS} />
            <InputField label="Déficit LMNP reportable (€)"
              value={form.deficitReportable} onChange={v => set("deficitReportable", v)}
              help="Stock de déficits accumulés non encore imputés (CGI Art. 156)" />
          </FormSection>

          <FormSection title="Horizon">
            <div className="sm:col-span-2">
              <SliderField label="Horizon de simulation"
                value={form.horizonSimulation} onChange={v => set("horizonSimulation", v)}
                min={5} max={30} step={1} format={v => `${v} ans`} />
            </div>
          </FormSection>

          {/* ── Accordéon expert ── */}
          <div className="mt-4 border-t border-slate-100 pt-4">
            <button
              onClick={() => setShowExpert(v => !v)}
              className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-slate-600 transition-colors"
            >
              <span>{showExpert ? "▼" : "▶"}</span>
              <span>Mode expert — saisie manuelle des amortissements (optionnel)</span>
            </button>

            {showExpert && (
              <div className="mt-4 p-4 rounded-xl bg-slate-50 space-y-4">
                <p className="text-xs text-slate-500">
                  Renseignez ces champs si vous connaissez les valeurs exactes de votre comptabilité LMNP.
                  Laissez vides pour utiliser le calcul automatique basé sur l&apos;ancienneté.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField label="Dotation amortissement bien (€/an)"
                    value={form.amortBienAnnuelOverride}
                    onChange={v => set("amortBienAnnuelOverride", v || "")}
                    help="Montant annuel hors mobilier et travaux" />
                  <InputField label="Années restantes — bien"
                    value={form.anneesBienRestantesOverride}
                    onChange={v => set("anneesBienRestantesOverride", v || "")} />
                  <InputField label="VNC mobilier restant (€)"
                    value={form.mobilierVncOverride}
                    onChange={v => set("mobilierVncOverride", v || "")} />
                  <InputField label="Années restantes — mobilier"
                    value={form.anneesMobilierRestOverride}
                    onChange={v => set("anneesMobilierRestOverride", v || "")} />
                  <InputField label="VNC travaux restant (€)"
                    value={form.travauxVncOverride}
                    onChange={v => set("travauxVncOverride", v || "")} />
                  <InputField label="Années restantes — travaux"
                    value={form.anneesTravauxRestOverride}
                    onChange={v => set("anneesTravauxRestOverride", v || "")} />
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* ══════════ VERDICT ══════════ */}
        {verdict && (
          <Card>
            <SectionTitle
              icon={verdict.decision === "hold" ? "✅" : verdict.decision === "sell_now" ? "🚨" : "⚠️"}
              title="Verdict ImmoVerdict"
              sub="Analyse de votre situation fiscale sur l'horizon simulé"
            />

            {/* Badge verdict */}
            <div
              className="rounded-xl p-5 mb-5 text-center"
              style={{ background: `${verdict.color}18`, border: `2px solid ${verdict.color}40` }}
            >
              <div className="text-3xl font-extrabold mb-1" style={{ color: verdict.color }}>
                {verdict.decision === "hold"         && "CONSERVER"}
                {verdict.decision === "sell_now"     && "VENDRE MAINTENANT"}
                {verdict.decision === "sell_year_N"  && `VENDRE À L'ANNÉE ${verdict.anneeOptimale}`}
                {verdict.decision === "restructure"  && "RESTRUCTURER EN SCI IS"}
              </div>
              <p className="text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
                {verdict.message}
              </p>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <KPICard
                icon="🛡️"
                label="Fin du bouclier fiscal"
                value={verdict.finBouclier ? `Année ${verdict.finBouclier}` : "Jamais"}
                color={verdict.finBouclier ? "#f97316" : "#16a34a"}
                bg={verdict.finBouclier ? "rgba(249,115,22,0.08)" : "rgba(22,163,74,0.08)"}
              />
              <KPICard
                icon="💸"
                label="Impôt cumulé (horizon)"
                value={fmtEur(verdict.impotCumul)}
                color="#ef4444"
                bg="rgba(239,68,68,0.08)"
              />
              <KPICard
                icon="📅"
                label="Année de vente optimale"
                value={verdict.anneeOptimale ? `Année ${verdict.anneeOptimale}` : "—"}
                color="#6366f1"
                bg="rgba(99,102,241,0.08)"
              />
              <KPICard
                icon="🏦"
                label="Produit net — vente optimale"
                value={fmtEur(verdict.produitNetOptimal)}
                color="#22c55e"
                bg="rgba(34,197,94,0.08)"
              />
              <KPICard
                icon="📊"
                label="Produit net — vente aujourd'hui"
                value={fmtEur(verdict.produitNetActuel)}
                color="#94a3b8"
                bg="rgba(148,163,184,0.08)"
              />
              <KPICard
                icon="⚡"
                label="Gain potentiel arbitrage"
                value={fmtEur(verdict.economieArbitrage, true)}
                color={verdict.economieArbitrage >= 0 ? "#22c55e" : "#ef4444"}
                bg={verdict.economieArbitrage >= 0 ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)"}
                help="vs vente immédiate"
              />
            </div>
          </Card>
        )}

        {/* ══════════ GRAPHIQUE — TIMELINE ══════════ */}
        {timeline.length > 0 && (
          <Card>
            <SectionTitle
              icon="📈"
              title="Évolution fiscale & cash-flow"
              sub="Amortissements (bleu), impôt (rouge), cash-flow net (vert) — la zone bleue claire marque les années protégées"
            />
            <ArbitrageTimelineChart
              rows={timeline}
              finBouclier={verdict?.finBouclier ?? null}
            />
          </Card>
        )}

        {/* ══════════ GRAPHIQUE — DÉCOMPOSITION BOUCLIER ══════════ */}
        {timeline.length > 0 && (
          <Card>
            <SectionTitle
              icon="🧱"
              title="Décomposition des amortissements"
              sub="Bien (indigo), Travaux (violet), Mobilier (lavande) — la barre orange marque la base imposable brute"
            />
            <BouclierDecomposChart rows={timeline} />
            <p className="text-xs text-slate-400 mt-3">
              Quand les couches courts (mobilier 7 ans, travaux 12 ans) expirent avant la structure (50 ans),
              la base imposable dépasse les amortissements restants : c&apos;est l&apos;effet &laquo;&nbsp;falaise&nbsp;&raquo;.
            </p>
          </Card>
        )}

        {/* ══════════ GRAPHIQUE — REVENTE OPTIMALE ══════════ */}
        {timeline.length > 0 && (
          <Card>
            <SectionTitle
              icon="🎯"
              title="Produit net de revente par année"
              sub="Combine revalorisation du bien, abattements plus-value progressifs et capital restant dû"
            />
            <ReventeOptimaleChart
              rows={timeline}
              anneeOptimale={verdict?.anneeOptimale ?? null}
            />
          </Card>
        )}

        {/* ══════════ TABLEAU DÉTAILLÉ ══════════ */}
        {timeline.length > 0 && (
          <Card>
            <SectionTitle
              icon="📋"
              title="Tableau de projection détaillé"
              sub="Toutes les valeurs année par année"
            />
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-xs text-slate-600" style={{ minWidth: 640 }}>
                <thead>
                  <tr className="text-left text-slate-400 border-b border-slate-100">
                    <th className="py-2 px-2 font-semibold">Année</th>
                    <th className="py-2 px-2 font-semibold text-right">Valeur</th>
                    <th className="py-2 px-2 font-semibold text-right">Loyers nets</th>
                    <th className="py-2 px-2 font-semibold text-right">Amortts</th>
                    <th className="py-2 px-2 font-semibold text-right">Intérêts</th>
                    <th className="py-2 px-2 font-semibold text-right">Impôt</th>
                    <th className="py-2 px-2 font-semibold text-right">Cash-flow</th>
                    <th className="py-2 px-2 font-semibold text-right">Produit net revente</th>
                  </tr>
                </thead>
                <tbody>
                  {timeline.map(r => (
                    <tr
                      key={r.yr}
                      className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                      style={r.bouclierActif ? { background: "rgba(59,130,246,0.04)" } : {}}
                    >
                      <td className="py-2 px-2 font-medium text-slate-700">
                        A{r.yr}
                        {r.bouclierActif && (
                          <span className="ml-1 text-blue-400" title="Bouclier actif">🛡</span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-right">{fmt(Math.round(r.valeurBien))} €</td>
                      <td className="py-2 px-2 text-right">{fmt(Math.round(r.loyersNets))} €</td>
                      <td className="py-2 px-2 text-right text-blue-600">{fmt(Math.round(r.amortTotal))} €</td>
                      <td className="py-2 px-2 text-right">{fmt(Math.round(r.interets))} €</td>
                      <td className="py-2 px-2 text-right" style={{ color: r.impot > 0 ? "#ef4444" : "#22c55e" }}>
                        {fmt(Math.round(r.impot))} €
                      </td>
                      <td className="py-2 px-2 text-right" style={{ color: r.cashflowNet >= 0 ? "#16a34a" : "#ef4444" }}>
                        {r.cashflowNet >= 0 ? "+" : ""}{fmt(Math.round(r.cashflowNet))} €
                      </td>
                      <td className="py-2 px-2 text-right font-medium" style={{ color: r.produitNetRevente >= 0 ? "#6366f1" : "#ef4444" }}>
                        {fmt(Math.round(r.produitNetRevente))} €
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* ══════════ CTA — LIEN VERS LE SIMULATEUR COMPLET ══════════ */}
        <div className="rounded-2xl p-6 text-center" style={{ background: "rgba(99,102,241,0.10)", border: "1.5px solid rgba(99,102,241,0.25)" }}>
          <p className="text-slate-300 text-sm mb-3">
            Vous n&apos;avez pas encore simulé ce bien en détail ?
          </p>
          <Link
            href="/lmnp"
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
          >
            Simuler avec le calculateur LMNP complet →
          </Link>
        </div>

        {/* Mention légale */}
        <p className="text-xs text-center text-slate-500 pb-4">
          Simulation indicative à titre pédagogique — non opposable à l&apos;administration fiscale.
          Consultez un expert-comptable pour toute décision d&apos;investissement.
        </p>
      </div>
    </div>
  );
}

// ─── Builder inputs ───────────────────────────────────────────────────────────

/**
 * Convertit le state du formulaire en ArbitrageInputs pour le moteur.
 * Gère le passage mode simplifié ↔ expert.
 * @param {typeof DEFAULT_FORM} f
 * @returns {import("../../lib/calcul-arbitrage").ArbitrageInputs}
 */
function buildInputs(f) {
  const base = {
    valeurActuelle:    f.valeurActuelle,
    anneeAcquisition:  f.anneeAcquisition,
    prixAcquisition:   f.prixAcquisition,
    fraisNotaire:      f.fraisNotaire,
    travauxInitiaux:   f.travauxInitiaux,
    mobilierInitial:   f.mobilierInitial,
    terrainPct:        f.terrainPct,
    capitalRestantDu:  f.capitalRestantDu,
    tauxInteret:       f.tauxInteret,
    dureeRestante:     f.dureeRestante,
    loyerMensuel:      f.loyerMensuel,
    chargesAnnuelles:  f.chargesAnnuelles,
    vacance:           f.vacance,
    revalorisation:    f.revalorisation,
    tmi:               f.tmi,
    deficitReportable: f.deficitReportable,
    horizonSimulation: f.horizonSimulation,
  };

  // Mode expert : ajouter les overrides non-vides
  const parseOpt = v => (v !== "" && v !== undefined ? parseFloat(v) : undefined);

  const amortBienAnnuelOverride     = parseOpt(f.amortBienAnnuelOverride);
  const anneesBienRestantesOverride = parseOpt(f.anneesBienRestantesOverride);
  const mobilierVncOverride         = parseOpt(f.mobilierVncOverride);
  const anneesMobilierRestOverride  = parseOpt(f.anneesMobilierRestOverride);
  const travauxVncOverride          = parseOpt(f.travauxVncOverride);
  const anneesTravauxRestOverride   = parseOpt(f.anneesTravauxRestOverride);

  if (amortBienAnnuelOverride !== undefined || anneesBienRestantesOverride !== undefined) {
    return {
      ...base,
      amortBienAnnuelOverride,
      anneesBienRestantesOverride,
      mobilierVncOverride,
      anneesMobilierRestOverride,
      travauxVncOverride,
      anneesTravauxRestOverride,
    };
  }

  return base;
}
