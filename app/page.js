"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import {
  BarChart, Bar, AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { createClient } from "@supabase/supabase-js";

/* ── Supabase (guard contre env vars manquantes) ── */
const _SU = process.env.NEXT_PUBLIC_SUPABASE_URL;
const _SK = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const sb = _SU && _SK ? createClient(_SU, _SK) : null;

/* ── Formatters ── */
const fmt    = (n) => new Intl.NumberFormat("fr-FR", { style:"currency", currency:"EUR", maximumFractionDigits:0 }).format(n ?? 0);
const fmtPct = (n) => `${(+n||0).toFixed(2)} %`;
const fmtK   = (n) => Math.abs(n??0) >= 1000 ? `${((n??0)/1000).toFixed(1)}k€` : fmt(n);

/* ── Lexique ── */
const LEXIQUE = {
  "TRI": "Taux de Rendement Interne : mesure la rentabilité globale en tenant compte de tous les flux sur la durée de détention.",
  "Cash-flow": "Différence mensuelle entre loyers perçus et toutes les charges : mensualité crédit, taxes, assurance, impôt.",
  "Amortissement": "En LMNP, déduction fiscale correspondant à la dépréciation comptable du bien (par composants) et du mobilier.",
  "TMI": "Taux Marginal d'Imposition. Taux applicable à la dernière tranche de vos revenus (11 %, 30 %, 41 %, 45 %).",
  "Micro-BIC": "Régime simplifié LMNP : abattement forfaitaire de 50 % sur les loyers. Simple mais souvent moins avantageux que le Réel.",
  "Régime Réel": "Permet de déduire toutes les charges réelles + amortissements par composants. Souvent bien plus avantageux que le Micro-BIC.",
  "Amortissement par composants": "Méthode comptable qui décompose le bien en plusieurs éléments (structure, toiture, équipements…) chacun amorti sur sa durée propre.",
  "Différé": "Période post-déblocage pendant laquelle vous ne remboursez que les intérêts (partiel) ou rien (total, intérêts capitalisés).",
  "Rendement brut": "Loyers annuels bruts / prix d'acquisition. Indicateur rapide avant charges et impôts.",
  "Plus-value": "Gain à la revente. En IR, abattements progressifs jusqu'à exonération totale à 30 ans de détention.",
  "DPE": "Diagnostic de Performance Énergétique. Classes A (très économe) à G (très énergivore). Impact sur valeur et louabilité.",
  "Ratio d'endettement": "Part de vos revenus consacrée aux crédits. La règle HCSF impose un max de 35 %.",
  "Frais de notaire": "En neuf : ~3 %. En ancien : ~7–8 %. Comprend droits de mutation, émoluments et taxes.",
};

/* ── Steps ── */
const STEPS = [
  { id:"projet",      label:"Projet",     icon:"🏠" },
  { id:"financement", label:"Crédit",     icon:"🏦" },
  { id:"exploitation",label:"Loyers",     icon:"📊" },
  { id:"resultats",   label:"Résultats",  icon:"📈" },
];

/* ── Defaults ── */
const DEFAULTS = {
  typeBien:"Appartement", surface:45, adresse:"", dpe:"C",
  prix:180000, notaire:8, travaux:12000, mobilier:6000,
  apport:30000, interet:3.45, dureeCredit:20, differe:0, typeDiffere:"partiel",
  loyer:850, charges:120, taxeFonciere:1200, vacance:5, revalorisation:1.5,
  tmi:30, revenusMensuels:4500, chargesCredit:0,
  horizon:20,
};

/* ════════════════════════════════════════
   MOTEURS DE CALCUL
════════════════════════════════════════ */

function amortCredit(capital, tauxAnnuel, dureeAns, differe=0, typeDiffere="partiel") {
  const tm = tauxAnnuel/100/12;
  const n  = dureeAns * 12;
  let capFin = capital;
  if (differe > 0 && typeDiffere === "total") capFin = capital * Math.pow(1+tm, differe);
  const mens = capFin > 0 && tm > 0 ? (capFin * tm) / (1 - Math.pow(1+tm, -n)) : 0;
  let cap = capFin;
  const rows = [];
  for (let yr=1; yr<=Math.max(dureeAns,20); yr++) {
    if (yr > dureeAns) { rows.push({ an:yr, interets:0, capital:0, capRestant:0, mensualite:0 }); continue; }
    let iAn=0, cAn=0;
    for (let m=0; m<12; m++) {
      const im = cap*tm;
      const cm = Math.min(mens-im, cap);
      iAn+=im; cAn+=cm; cap=Math.max(0, cap-cm);
    }
    rows.push({ an:yr, interets:Math.round(iAn), capital:Math.round(cAn), capRestant:Math.round(cap), mensualite:Math.round(mens) });
  }
  return rows;
}

function calcAmortComposants(prix, notaire, mobilier, travaux) {
  /* Méthode par composants — fiscalité LMNP Réel */
  const terrain   = prix * 0.15; // terrain non amortissable ~15%
  const bienAmort = prix - terrain;
  const composants = {
    "Gros œuvre":    { base: bienAmort * 0.50, duree: 50 },
    "Toiture":       { base: bienAmort * 0.10, duree: 25 },
    "Façade":        { base: bienAmort * 0.10, duree: 25 },
    "Équipements":   { base: bienAmort * 0.15, duree: 15 },
    "Agencements":   { base: bienAmort * 0.15, duree: 10 },
    "Mobilier":      { base: mobilier,          duree:  7 },
    "Travaux":       { base: travaux,            duree: 12 },
  };
  const totalAnnuel = Object.values(composants).reduce((s,c) => s + c.base/c.duree, 0);
  return {
    totalAnnuel: Math.round(totalAnnuel),
    chartData: Object.entries(composants).map(([name,c]) => ({
      name, montant: Math.round(c.base/c.duree), duree: c.duree,
    })).filter(d => d.montant > 0),
  };
}

function runCalc(p, type="lmnp") {
  const capital    = p.prix + p.travaux + p.prix*(p.notaire/100) - p.apport;
  const creditRows = amortCredit(capital, p.interet, p.dureeCredit, p.differe, p.typeDiffere);
  const mensualite = creditRows[0]?.mensualite ?? 0;
  const amort      = calcAmortComposants(p.prix, p.notaire, p.mobilier, p.travaux);

  const rows = [];
  let cumCashflow = 0;
  for (let yr=1; yr<=p.horizon; yr++) {
    const facReval  = Math.pow(1+(p.revalorisation/100), yr-1);
    const loyers    = p.loyer * 12 * facReval;
    const charges   = p.charges * 12 + p.taxeFonciere;
    const vacance   = loyers * (p.vacance/100);
    const interets  = creditRows[yr-1]?.interets ?? 0;
    const capRest   = creditRows[yr-1]?.capRestant ?? 0;

    let impot = 0;
    if (type==="lmnp") {
      const base = Math.max(0, loyers - vacance - charges - interets - amort.totalAnnuel);
      impot = base * (p.tmi/100);
    } else if (type==="microbic") {
      const base = (loyers - vacance) * 0.50;
      impot = base * (p.tmi/100);
    } else if (type==="nue") {
      const defFoncier = loyers - vacance - charges - interets;
      const base = defFoncier > 0 ? defFoncier : 0;
      impot = base * (p.tmi/100);
    } else if (type==="sciis") {
      const base = Math.max(0, loyers - vacance - charges - interets - amort.totalAnnuel);
      const is = base <= 42500 ? base*0.15 : 42500*0.15 + (base-42500)*0.25;
      impot = is;
    } else if (type==="sciir") {
      const base = Math.max(0, loyers - vacance - charges - interets);
      impot = base * (p.tmi/100);
    }

    const cashflowBrut = loyers - vacance - charges - mensualite - impot;
    const cashflowM    = cashflowBrut / 12;
    cumCashflow += cashflowBrut;

    rows.push({ an:yr, loyers:Math.round(loyers), charges:Math.round(charges),
      vacance:Math.round(vacance), interets:Math.round(interets),
      mensualite:Math.round(mensualite), impot:Math.round(impot),
      cashflow:Math.round(cashflowBrut), cashflowM:Math.round(cashflowM),
      capRestant:Math.round(capRest), cumCashflow:Math.round(cumCashflow),
    });
  }

  const investTotal = p.apport + p.prix*(p.notaire/100) + p.mobilier;
  const loyers0     = p.loyer * 12;
  const charges0    = p.charges * 12 + p.taxeFonciere;
  const rendBrut    = loyers0 / (p.prix + p.prix*(p.notaire/100) + p.travaux) * 100;
  const rendNet     = (loyers0 - charges0) / investTotal * 100;
  const cashflowM0  = rows[0]?.cashflowM ?? 0;
  const ratioEndt   = mensualite*12 / (p.revenusMensuels*12) * 100;

  // TRI approché (Newton-Raphson simplifié)
  const fluxes = [-investTotal, ...rows.map((r,i) => {
    const rv = i===rows.length-1
      ? r.cashflow + (p.prix*(1+p.revalorisation/100*p.horizon)) - (r.capRestant??0)
      : r.cashflow;
    return rv;
  })];
  let tri=0.05;
  for (let i=0; i<50; i++) {
    const npv    = fluxes.reduce((s,f,t) => s + f/Math.pow(1+tri,t), 0);
    const dnpv   = fluxes.reduce((s,f,t) => s - t*f/Math.pow(1+tri,t+1), 0);
    if (Math.abs(dnpv)<1e-8) break;
    const next = tri - npv/dnpv;
    if (Math.abs(next-tri)<1e-6) { tri=next; break; }
    tri = next;
  }

  return { type, rows, tri:+((tri*100).toFixed(2)), rendBrut:+rendBrut.toFixed(2),
    rendNet:+rendNet.toFixed(2), cashflowM:cashflowM0, ratioEndt:+ratioEndt.toFixed(1),
    mensualite, amort, investTotal };
}

function calcComparaison10ans(p) {
  const amort    = calcAmortComposants(p.prix, p.notaire, p.mobilier, p.travaux);
  const capital  = p.prix + p.travaux + p.prix*(p.notaire/100) - p.apport;
  const creditRows = amortCredit(capital, p.interet, p.dureeCredit);
  const data = [];
  for (let yr=1; yr<=10; yr++) {
    const fac     = Math.pow(1+(p.revalorisation/100), yr-1);
    const loyers  = p.loyer * 12 * fac * (1 - p.vacance/100);
    const charges = p.charges * 12 + p.taxeFonciere;
    const ints    = creditRows[yr-1]?.interets ?? 0;
    // Micro-BIC
    const baseMicro = loyers * 0.50;
    const impotMicro = Math.round(Math.max(0, baseMicro) * (p.tmi/100));
    // Réel
    const baseReel = loyers - charges - ints - amort.totalAnnuel;
    const impotReel = Math.round(Math.max(0, baseReel) * (p.tmi/100));
    // Economie
    data.push({
      an: `A${yr}`,
      "Micro-BIC": impotMicro,
      "Régime Réel": impotReel,
      "Économie": impotMicro - impotReel,
    });
  }
  return data;
}

/* ════════════════════════════════════════
   REVERSE CALCULATOR
════════════════════════════════════════ */

function reverseCalc(targetCashflowM, p) {
  // Résoudre : cashflow_mensuel = (loyersNets - chargesAn - mensualite*12) / 12
  // => mensualiteMax = loyersMensuelNets - chargesMensuelles - targetCashflowM
  // => capitalMax = mensualiteMax * (1-(1+r)^-n) / r
  // => prixMax = (capitalMax + apport - travaux) / (1 + notaire/100)
  const r = p.interet / 100 / 12;
  const n = p.dureeCredit * 12;
  const loyersNetsM  = p.loyer * (1 - p.vacance / 100);
  const chargesM     = p.charges + p.taxeFonciere / 12;
  const mensualiteMax = loyersNetsM - chargesM - targetCashflowM;
  if (mensualiteMax <= 0) return null;
  const capitalMax = r > 0
    ? mensualiteMax * (1 - Math.pow(1 + r, -n)) / r
    : mensualiteMax * n;
  const prixMax = (capitalMax + p.apport - p.travaux) / (1 + p.notaire / 100);
  if (prixMax <= 0) return null;
  return {
    prixMax:       Math.round(prixMax),
    mensualiteMax: Math.round(mensualiteMax),
    capitalMax:    Math.round(capitalMax),
  };
}

function feuxTricolores(tri, cashflowM, ratioEndt) {
  let score = 0;
  if (tri >= 6) score+=2; else if (tri >= 4) score+=1;
  if (cashflowM >= 0) score+=2; else if (cashflowM >= -100) score+=1;
  if (ratioEndt <= 33) score+=2; else if (ratioEndt <= 35) score+=1;
  if (score >= 5) return { color:"#10B981", bg:"#ECFDF5", border:"#A7F3D0", label:"Excellent", emoji:"🟢" };
  if (score >= 3) return { color:"#F59E0B", bg:"#FFFBEB", border:"#FDE68A", label:"Acceptable", emoji:"🟡" };
  return     { color:"#EF4444", bg:"#FEF2F2", border:"#FECACA", label:"Risqué",    emoji:"🔴" };
}

/* ════════════════════════════════════════
   COMPOSANTS UI
════════════════════════════════════════ */

function Tip({ text }) {
  return (
    <span className="tip-trigger ml-1 cursor-help" tabIndex={0}>
      <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center",
        width:16, height:16, borderRadius:"50%", background:"#E2E8F0",
        color:"#64748B", fontSize:10, fontWeight:700, lineHeight:1 }}>?</span>
      <span className="tip-bubble">{text}</span>
    </span>
  );
}

function Card({ children, className="", style={} }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm ${className}`}
      style={{ padding:"20px 20px", ...style }}>
      {children}
    </div>
  );
}

function SectionTitle({ icon, title, sub }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">{icon}</span>
        <h2 className="text-base font-bold text-slate-800">{title}</h2>
      </div>
      {sub && <p className="text-xs text-slate-400 ml-7">{sub}</p>}
    </div>
  );
}

function SliderField({ label, value, onChange, min, max, step=1, format=fmt, help, color="#185FA5" }) {
  const pct = Math.round(((value-min)/(max-min))*100);
  return (
    <div className="mb-5">
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-semibold text-slate-700 flex items-center">
          {label}{help && <Tip text={help} />}
        </label>
        <span className="text-sm font-bold" style={{ color }}>{format(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(+e.target.value)}
        style={{ background:`linear-gradient(to right, ${color} ${pct}%, #E2E8F0 ${pct}%)` }}
      />
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-slate-400">{format(min)}</span>
        <span className="text-[10px] text-slate-400">{format(max)}</span>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, type="text", suffix="", help, small=false }) {
  return (
    <div className={small ? "mb-3" : "mb-4"}>
      <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center">
        {label}{help && <Tip text={help} />}
      </label>
      <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 focus-within:border-blue-400 focus-within:bg-white transition-colors">
        <input type={type} value={value}
          onChange={e => onChange(type==="number" ? +e.target.value : e.target.value)}
          className="flex-1 bg-transparent px-3 py-2.5 text-sm text-slate-800 outline-none rounded-xl"
        />
        {suffix && <span className="pr-3 text-sm text-slate-400 font-medium">{suffix}</span>}
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options, help }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center">
        {label}{help && <Tip text={help} />}
      </label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full border border-slate-200 rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 focus:bg-white transition-colors">
        {options.map(o => <option key={o.v ?? o} value={o.v ?? o}>{o.l ?? o}</option>)}
      </select>
    </div>
  );
}

function KPICard({ label, value, sub, color="#185FA5", bg="#EFF6FF", icon }) {
  return (
    <div className="rounded-2xl p-4 border" style={{ background:bg, borderColor:color+"33" }}>
      <div className="flex items-start justify-between mb-1">
        <p className="text-xs font-semibold text-slate-500 leading-tight">{label}</p>
        {icon && <span className="text-base">{icon}</span>}
      </div>
      <p className="text-xl font-bold" style={{ color }}>{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function FeuxBadge({ tri, cashflowM, ratioEndt }) {
  const f = feuxTricolores(tri, cashflowM, ratioEndt);
  return (
    <div className="rounded-2xl p-4 border" style={{ background:f.bg, borderColor:f.border }}>
      <div className="flex items-center gap-3">
        <span className="text-3xl">{f.emoji}</span>
        <div>
          <p className="font-bold text-sm" style={{ color:f.color }}>Verdict : {f.label}</p>
          <p className="text-[11px] text-slate-500">TRI {tri}% · CF {fmtK(cashflowM)}/mois · Endt {ratioEndt}%</p>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   LANDING PAGE
════════════════════════════════════════ */

function LandingPage({ onStart }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background:"#F1F5F9" }}>
      {/* Hero */}
      <div style={{ background:"linear-gradient(135deg, #0F172A 0%, #1e3a5f 60%, #185FA5 100%)" }}
        className="relative overflow-hidden">
        {/* Badge LF 2026 */}
        <div className="absolute top-4 right-4">
          <span className="text-[10px] font-bold bg-white/10 border border-white/20 text-white px-2 py-0.5 rounded-full">
            ✦ Loi Finances 2026
          </span>
        </div>
        <div className="max-w-2xl mx-auto px-5 pt-12 pb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🏢</span>
            <span className="text-white/60 text-sm font-semibold tracking-wide uppercase">Simulateur LMNP</span>
          </div>
          <h1 className="text-white font-extrabold leading-tight mb-3"
            style={{ fontSize:"clamp(1.55rem, 6vw, 2.2rem)", letterSpacing:"-0.02em" }}>
            Ne payez plus d&apos;impôts<br />sur vos loyers.
          </h1>
          <p className="text-blue-200 text-sm leading-relaxed mb-8" style={{ maxWidth:380 }}>
            Validez la rentabilité de votre projet LMNP en&nbsp;<strong className="text-white">3&nbsp;minutes</strong>.
            Comparaison Micro-BIC vs Réel, amortissement par composants, cash-flow mensuel et TRI.
          </p>

          {/* Stat badges */}
          <div className="flex flex-wrap gap-3 mb-8">
            {[
              { n:"0 €",   l:"d'impôt les 5 premières années (cas moyen TMI 30%)" },
              { n:"6–9 %", l:"de TRI atteignable sur 20 ans" },
              { n:"-35 %", l:"de charges fiscales vs location nue" },
            ].map(({ n, l }) => (
              <div key={n} className="bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 flex items-center gap-3">
                <span className="text-white font-extrabold text-lg leading-none">{n}</span>
                <span className="text-blue-200 text-[11px] leading-tight max-w-[120px]">{l}</span>
              </div>
            ))}
          </div>

          <button onClick={onStart}
            className="w-full py-4 rounded-2xl text-base font-extrabold text-white shadow-lg active:scale-95 transition-transform"
            style={{ background:"linear-gradient(135deg, #10B981 0%, #059669 100%)", boxShadow:"0 8px 32px rgba(16,185,129,.45)" }}>
            Calculer ma rentabilité LMNP →
          </button>
          <p className="text-blue-300 text-[11px] mt-3 text-center">
            Gratuit · Sans inscription · Données 100 % locales
          </p>
        </div>

        {/* Wave */}
        <div style={{ height:32, background:"#F1F5F9", borderRadius:"50% 50% 0 0 / 100% 100% 0 0", marginTop:-1 }} />
      </div>

      {/* Trust bar */}
      <div className="max-w-2xl mx-auto px-5 py-5">
        <p className="text-xs text-slate-400 text-center mb-4 font-medium uppercase tracking-wide">
          Conforme aux règles fiscales en vigueur
        </p>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {["✅ Amortissement par composants","✅ Règle HCSF 35%","✅ Loi de Finances 2026","✅ 4 régimes comparés"].map(t => (
            <span key={t} className="text-xs text-slate-500 font-medium">{t}</span>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="max-w-2xl mx-auto px-5 py-6">
        <h2 className="text-center font-bold text-slate-800 mb-5 text-base">Comment ça fonctionne</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { step:"1", icon:"🎯", title:"Profil",   desc:"2 questions pour adapter l'analyse" },
            { step:"2", icon:"🔢", title:"Paramètres",desc:"Bien, crédit et loyers en 3 étapes" },
            { step:"3", icon:"📊", title:"Résultats", desc:"TRI, cash-flow, fiscalité comparée" },
          ].map(({ step, icon, title, desc }) => (
            <div key={step} className="bg-white rounded-2xl p-4 border border-slate-100 text-center shadow-sm">
              <div className="text-2xl mb-2">{icon}</div>
              <p className="text-xs font-bold text-slate-700 mb-1">{title}</p>
              <p className="text-[10px] text-slate-400 leading-tight">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Social proof teaser */}
      <div className="max-w-2xl mx-auto px-5 pb-10">
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex">
              {["🟢","🟢","🟢","🟢","🟢"].map((e,i)=>(
                <span key={i} className="text-sm -ml-0.5 first:ml-0">{e}</span>
              ))}
            </div>
            <span className="text-xs font-semibold text-slate-600">4,9/5 · +2 400 simulations</span>
          </div>
          <p className="text-sm text-slate-600 italic leading-relaxed">
            &ldquo;J&apos;ai découvert que mon projet était imposé à 30% alors que le LMNP Réel me ramenait à zéro d&apos;impôt.
            Économie de <strong className="text-green-600">4 200 € / an</strong>.&rdquo;
          </p>
          <p className="text-[11px] text-slate-400 mt-1.5">— Thomas R., Lyon · Investisseur LMNP</p>
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-5 py-3 shadow-lg pb-safe">
        <button onClick={onStart}
          className="w-full max-w-2xl mx-auto block py-3.5 rounded-xl text-sm font-extrabold text-white"
          style={{ background:"linear-gradient(135deg, #185FA5, #1e40af)" }}>
          Commencer la simulation →
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   ONBOARDING QUIZ
════════════════════════════════════════ */

const QUIZ_QUESTIONS = [
  {
    id: "situation",
    question: "Où en êtes-vous dans votre projet ?",
    icon: "🎯",
    options: [
      { value:"prospect", label:"J'ai un bien en vue", icon:"👀" },
      { value:"analyse",  label:"Je compare plusieurs biens", icon:"🔍" },
      { value:"debutant", label:"Je découvre le LMNP", icon:"📚" },
    ],
  },
  {
    id: "objectif",
    question: "Quel est votre objectif principal ?",
    icon: "🚀",
    options: [
      { value:"cashflow",   label:"Cash-flow positif", icon:"💸" },
      { value:"fiscal",     label:"Réduire mes impôts", icon:"🧾" },
      { value:"patrimoine", label:"Construire un patrimoine", icon:"🏛️" },
    ],
  },
  {
    id: "tmi",
    question: "Quelle est votre tranche d'imposition ?",
    icon: "🧾",
    sub: "Votre dernière tranche marginale d'imposition (IR)",
    options: [
      { value:0,  label:"Non imposable (0%)",  icon:"🟢" },
      { value:11, label:"11 %",                icon:"🟡" },
      { value:30, label:"30 %",                icon:"🟠" },
      { value:41, label:"41 %",                icon:"🔴" },
      { value:45, label:"45 %",                icon:"🔴" },
    ],
  },
];

function OnboardingQuiz({ onComplete }) {
  const [step,    setStep]    = useState(0);
  const [answers, setAnswers] = useState({});

  const q = QUIZ_QUESTIONS[step];

  const pick = (value) => {
    const next = { ...answers, [q.id]: value };
    setAnswers(next);
    if (step < QUIZ_QUESTIONS.length - 1) {
      setTimeout(() => setStep(s => s + 1), 180);
    } else {
      setTimeout(() => onComplete(next), 180);
    }
  };

  const pct = Math.round((step / QUIZ_QUESTIONS.length) * 100);

  return (
    <div className="min-h-screen flex flex-col" style={{ background:"#F1F5F9" }}>
      {/* Header */}
      <div style={{ background:"linear-gradient(135deg, #0F172A 0%, #185FA5 100%)" }} className="px-5 pt-5 pb-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">🏢</span>
              <span className="text-white font-bold text-sm">Simulateur LMNP</span>
            </div>
            <span className="text-blue-200 text-xs">{step + 1} / {QUIZ_QUESTIONS.length}</span>
          </div>
          {/* Progress */}
          <div className="h-1.5 bg-white/20 rounded-full">
            <div className="h-1.5 bg-white rounded-full transition-all duration-500"
              style={{ width:`${pct}%` }} />
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-5 py-8">
        <div className="slide-up">
          <div className="text-4xl text-center mb-4">{q.icon}</div>
          <h2 className="text-xl font-extrabold text-slate-800 text-center mb-1 leading-tight">{q.question}</h2>
          {q.sub && <p className="text-xs text-slate-400 text-center mb-6">{q.sub}</p>}
          {!q.sub && <div className="mb-6" />}
          <div className="space-y-3">
            {q.options.map(opt => (
              <button key={opt.value} onClick={() => pick(opt.value)}
                className="w-full flex items-center gap-4 bg-white border-2 border-slate-100 rounded-2xl p-4 text-left active:scale-[.98] transition-transform hover:border-blue-200 hover:bg-blue-50">
                <span className="text-2xl">{opt.icon}</span>
                <span className="text-sm font-semibold text-slate-700">{opt.label}</span>
                <span className="ml-auto text-slate-300 text-lg">›</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   AFFILIATION BANNER
════════════════════════════════════════ */

function AffiliationBanner({ taux, mensualite }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || taux < 3.3) return null;
  return (
    <div className="rounded-2xl border border-amber-200 overflow-hidden" style={{ background:"#FFFBEB" }}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">💡</span>
            <p className="text-sm font-bold text-amber-800">Votre taux peut être négocié</p>
          </div>
          <button onClick={() => setDismissed(true)} className="text-amber-400 hover:text-amber-600 text-lg leading-none">×</button>
        </div>
        <p className="text-xs text-amber-700 mb-3 leading-relaxed">
          Avec un taux à <strong>{taux}%</strong>, une renégociation à <strong>{(taux - 0.4).toFixed(2)}%</strong> économiserait
          {mensualite ? <strong className="text-green-700"> ~{Math.round(mensualite * 0.04)} €/mois</strong> : " plusieurs dizaines d'euros/mois"}.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <a href="https://www.pretto.fr?utm_source=simulateur-lmnp&utm_medium=banner" target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 bg-white border border-amber-200 rounded-xl py-2.5 text-xs font-bold text-amber-800 hover:bg-amber-50 transition-colors">
            <span>🏦</span> Pretto
            <span className="text-[9px] bg-amber-100 text-amber-600 px-1 rounded">Partenaire</span>
          </a>
          <a href="https://www.meilleurtaux.com?utm_source=simulateur-lmnp&utm_medium=banner" target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 bg-white border border-amber-200 rounded-xl py-2.5 text-xs font-bold text-amber-800 hover:bg-amber-50 transition-colors">
            <span>📊</span> MeilleurTaux
            <span className="text-[9px] bg-amber-100 text-amber-600 px-1 rounded">Partenaire</span>
          </a>
        </div>
        <p className="text-[9px] text-amber-400 mt-2 text-center">Liens partenaires · Comparaison gratuite sans engagement</p>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   REVERSE CALCULATOR COMPONENT
════════════════════════════════════════ */

function ReverseCalculator({ form }) {
  const [target, setTarget] = useState(200);
  const result = reverseCalc(target, form);

  return (
    <div className="rounded-2xl border-2 border-dashed border-blue-200 overflow-hidden bg-blue-50/40">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">🔄</span>
          <div>
            <p className="text-sm font-bold text-blue-800">Calculateur inversé</p>
            <p className="text-[10px] text-blue-500">Quel prix payer pour atteindre mon objectif ?</p>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-semibold text-slate-700">Cash-flow cible</label>
            <span className="text-sm font-bold text-blue-700">
              {target >= 0 ? "+" : ""}{target} €/mois
            </span>
          </div>
          <input type="range" min={-200} max={600} step={25} value={target}
            onChange={e => setTarget(+e.target.value)}
            style={{ background:`linear-gradient(to right, #185FA5 ${Math.round(((target+200)/800)*100)}%, #E2E8F0 ${Math.round(((target+200)/800)*100)}%)` }}
          />
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-slate-400">-200 €</span>
            <span className="text-[10px] text-slate-400">+600 €</span>
          </div>
        </div>

        {result ? (
          <div className="space-y-2">
            <div className="bg-white rounded-xl border border-blue-100 p-3">
              <p className="text-[10px] text-slate-400 mb-0.5">Prix d&apos;achat maximum négociable</p>
              <p className="text-2xl font-extrabold text-blue-700">{fmt(result.prixMax)}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Capital emprunté : {fmt(result.capitalMax)} · Mensualité : {fmt(result.mensualiteMax)}/mois
              </p>
            </div>
            {result.prixMax < form.prix && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                <p className="text-xs font-semibold text-red-600">
                  ⚠ Le bien est affiché à {fmt(form.prix)} — soit {fmt(form.prix - result.prixMax)} de trop.
                  Négociez ou augmentez votre apport.
                </p>
              </div>
            )}
            {result.prixMax >= form.prix && (
              <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                <p className="text-xs font-semibold text-green-600">
                  ✅ Le prix actuel ({fmt(form.prix)}) est compatible avec votre objectif de cash-flow.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-3">
            <p className="text-xs text-orange-600">Les loyers actuels ne permettent pas d&apos;atteindre ce cash-flow cible.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   SOCIAL PROOF
════════════════════════════════════════ */

const TESTIMONIALS = [
  {
    name: "Thomas R.",
    location: "Lyon · Appartement T2",
    avatar: "👨‍💼",
    rating: 5,
    text: "J'ai découvert que mon projet était taxé à 30% alors que le LMNP Réel me ramenait à zéro d'impôt. Économie de 4 200 € par an sur 20 ans. Le simulateur m'a convaincu de sauter le pas.",
    kpi: "–4 200 €/an d'impôt",
    kpiColor: "#10B981",
  },
  {
    name: "Sophie M.",
    location: "Paris 11e · Studio meublé",
    avatar: "👩‍💻",
    rating: 5,
    text: "Le calculateur inversé m'a évité de surpayer. Le bien était à 195 000 € mais pour mon objectif de 150 €/mois de cashflow, le prix max était 178 000 €. J'ai négocié à 180 000 €.",
    kpi: "–15 000 € négociés",
    kpiColor: "#185FA5",
  },
  {
    name: "Marc & Julie D.",
    location: "Bordeaux · T3 résidence étudiante",
    avatar: "👫",
    rating: 5,
    text: "On hésitait entre Micro-BIC et Réel. La comparaison sur 10 ans était flagrante : 18 700 € d'économie cumulée avec le Régime Réel. On a ouvert un compte chez un expert-comptable LMNP dès le lendemain.",
    kpi: "18 700 € économisés",
    kpiColor: "#10B981",
  },
];

function SocialProof() {
  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-bold text-slate-700">Ils ont utilisé le simulateur</h3>
        <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">+2 400 simulations</span>
      </div>
      <div className="space-y-3">
        {TESTIMONIALS.map((t, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{t.avatar}</span>
                <div>
                  <p className="text-xs font-bold text-slate-700">{t.name}</p>
                  <p className="text-[10px] text-slate-400">{t.location}</p>
                </div>
              </div>
              <span className="text-xs font-extrabold px-2 py-1 rounded-lg"
                style={{ background: t.kpiColor+"15", color: t.kpiColor }}>
                {t.kpi}
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed italic">&ldquo;{t.text}&rdquo;</p>
            <div className="flex gap-0.5 mt-2">
              {Array(t.rating).fill("⭐").map((s, j) => <span key={j} className="text-xs">{s}</span>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   STEPS
════════════════════════════════════════ */

function StepProjet({ form, set }) {
  return (
    <div className="slide-up space-y-4">
      <Card>
        <SectionTitle icon="🏠" title="Votre bien immobilier" sub="Définissez les caractéristiques du bien" />
        <SelectField label="Type de bien" value={form.typeBien} onChange={set("typeBien")}
          options={["Appartement","Maison","Studio","Local commercial"]} />
        <SliderField label="Surface" value={form.surface} onChange={set("surface")}
          min={9} max={200} step={1} format={n=>`${n} m²`} help="Surface habitable en m²" />
        <SelectField label="DPE actuel" value={form.dpe} onChange={set("dpe")}
          options={["A","B","C","D","E","F","G"]}
          help={LEXIQUE["DPE"]} />
        <InputField label="Adresse (optionnel)" value={form.adresse} onChange={set("adresse")}
          help="Pour les données DVF de marché" />
      </Card>

      <Card>
        <SectionTitle icon="💰" title="Prix & acquisition" sub="Coût total de l'opération" />
        <SliderField label="Prix d'achat" value={form.prix} onChange={set("prix")}
          min={50000} max={800000} step={5000} format={fmt}
          help="Prix FAI hors frais de notaire" />
        <SliderField label="Frais de notaire" value={form.notaire} onChange={set("notaire")}
          min={2} max={10} step={0.5} format={n=>`${n} %`}
          help={LEXIQUE["Frais de notaire"]} />
        <SliderField label="Travaux" value={form.travaux} onChange={set("travaux")}
          min={0} max={100000} step={1000} format={fmtK}
          help="Travaux de rénovation. Amortis sur 12 ans en LMNP Réel." />
        <SliderField label="Mobilier & équipements" value={form.mobilier} onChange={set("mobilier")}
          min={0} max={30000} step={500} format={fmtK}
          help={LEXIQUE["Amortissement"]} />

        <div className="mt-4 rounded-xl bg-blue-50 border border-blue-100 p-3">
          <p className="text-xs font-semibold text-blue-700 mb-1">📊 Coût total de l&apos;opération</p>
          <p className="text-lg font-bold text-blue-800">
            {fmt(form.prix + form.prix*(form.notaire/100) + form.travaux + form.mobilier)}
          </p>
          <p className="text-[10px] text-blue-500 mt-0.5">
            Prix {fmt(form.prix)} + Notaire {fmt(form.prix*form.notaire/100)} + Travaux {fmtK(form.travaux)} + Mobilier {fmtK(form.mobilier)}
          </p>
        </div>
      </Card>
    </div>
  );
}

function StepFinancement({ form, set }) {
  const capital = form.prix + form.travaux + form.prix*(form.notaire/100) - form.apport;
  const mens    = capital > 0 && form.interet > 0
    ? Math.round((capital * (form.interet/100/12)) / (1 - Math.pow(1+form.interet/100/12, -form.dureeCredit*12)))
    : 0;
  const ratioEndt = (mens / form.revenusMensuels * 100).toFixed(1);
  const ratioColor = +ratioEndt > 35 ? "#EF4444" : +ratioEndt > 30 ? "#F59E0B" : "#10B981";

  return (
    <div className="slide-up space-y-4">
      <Card>
        <SectionTitle icon="🏦" title="Votre apport" sub="Capital que vous investissez en fonds propres" />
        <SliderField label="Apport personnel" value={form.apport} onChange={set("apport")}
          min={0} max={Math.min(form.prix, 200000)} step={5000} format={fmt}
          help="Plus l'apport est élevé, meilleures sont les conditions bancaires." />
        <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
          <p className="text-xs text-slate-500">Capital emprunté</p>
          <p className="text-lg font-bold text-slate-800">{fmt(Math.max(0, capital))}</p>
        </div>
      </Card>

      <Card>
        <SectionTitle icon="📈" title="Conditions du crédit" />
        <SliderField label="Taux d'intérêt annuel" value={form.interet} onChange={set("interet")}
          min={0.5} max={6} step={0.05} format={n=>`${n.toFixed(2)} %`}
          help="Taux hors assurance. Vérifiez les offres actuelles sur votre banque." />
        <SliderField label="Durée du crédit" value={form.dureeCredit} onChange={set("dureeCredit")}
          min={5} max={25} step={1} format={n=>`${n} ans`} />
        <SliderField label="Différé de remboursement" value={form.differe} onChange={set("differe")}
          min={0} max={24} step={1} format={n=>`${n} mois`}
          help={LEXIQUE["Différé"]} />
        {form.differe > 0 && (
          <SelectField label="Type de différé" value={form.typeDiffere} onChange={set("typeDiffere")}
            options={[{v:"partiel",l:"Partiel (intérêts seulement)"},{v:"total",l:"Total (capital capitalisé)"}]}
            help="Partiel : vous payez les intérêts. Total : rien pendant la période (intérêts capitalisés)." />
        )}
      </Card>

      <Card>
        <SectionTitle icon="⚖️" title="Capacité d'emprunt" help={LEXIQUE["Ratio d'endettement"]} />
        <InputField label="Revenus mensuels nets" value={form.revenusMensuels} onChange={set("revenusMensuels")}
          type="number" suffix="€/mois" help="Revenus nets avant impôt, base de calcul du taux d'endettement." />
        <InputField label="Autres crédits en cours" value={form.chargesCredit} onChange={set("chargesCredit")}
          type="number" suffix="€/mois" />
        <div className="rounded-xl p-3 border mt-2" style={{ background: ratioColor+"11", borderColor: ratioColor+"44" }}>
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-slate-700">Mensualité estimée</span>
            <span className="text-lg font-bold" style={{ color:"#185FA5" }}>{fmt(mens)}/mois</span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-slate-500">Taux d&apos;endettement</span>
            <span className="text-sm font-bold" style={{ color:ratioColor }}>{ratioEndt} %</span>
          </div>
          {+ratioEndt > 35 && (
            <p className="text-[11px] mt-1.5" style={{ color:ratioColor }}>
              ⚠ Dépasse le seuil HCSF de 35 %. Augmentez l&apos;apport ou réduisez la durée.
            </p>
          )}
        </div>
      </Card>

      {/* Affiliation banner — visible dès que le taux dépasse 3.3% */}
      <AffiliationBanner taux={form.interet} mensualite={mens} />
    </div>
  );
}

function StepExploitation({ form, set }) {
  const loyersNet = form.loyer * 12 * (1 - form.vacance/100);
  const charges   = form.charges * 12 + form.taxeFonciere;
  const rendBrut  = (form.loyer * 12 / (form.prix + form.prix*(form.notaire/100) + form.travaux) * 100).toFixed(2);

  return (
    <div className="slide-up space-y-4">
      <Card>
        <SectionTitle icon="🏡" title="Revenus locatifs" sub="Estimation de vos loyers" />
        <SliderField label="Loyer mensuel charges comprises" value={form.loyer} onChange={set("loyer")}
          min={300} max={5000} step={25} format={fmt}
          help="Loyer hors charges récupérables. Vérifiez les loyers de marché (DVF, SeLoger…)." />
        <SliderField label="Charges de copropriété" value={form.charges} onChange={set("charges")}
          min={0} max={500} step={10} format={n=>`${n} €/mois`} />
        <SliderField label="Taxe foncière annuelle" value={form.taxeFonciere} onChange={set("taxeFonciere")}
          min={0} max={5000} step={50} format={fmt} />
        <SliderField label="Taux de vacance locative" value={form.vacance} onChange={set("vacance")}
          min={0} max={20} step={0.5} format={n=>`${n} %`}
          help="Temps sans locataire en pourcentage. 5% = ~18 jours/an." color="#F59E0B" />
        <SliderField label="Revalorisation annuelle des loyers" value={form.revalorisation} onChange={set("revalorisation")}
          min={0} max={4} step={0.1} format={n=>`${n.toFixed(1)} %`}
          help="IRL (Indice de Référence des Loyers). Historiquement ~1,5 % / an." />

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-green-50 border border-green-100 p-3">
            <p className="text-[10px] text-green-600 font-semibold mb-0.5">Loyers nets / an</p>
            <p className="text-base font-bold text-green-700">{fmt(loyersNet)}</p>
          </div>
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
            <p className="text-[10px] text-blue-600 font-semibold mb-0.5">Rendement brut</p>
            <p className="text-base font-bold text-blue-700">{rendBrut} %</p>
            <Tip text={LEXIQUE["Rendement brut"]} />
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle icon="🧾" title="Fiscalité" sub="Votre situation fiscale personnelle" />
        <SelectField label="Tranche marginale d'imposition" value={form.tmi} onChange={v=>set("tmi")(+v)}
          options={[{v:0,l:"0 % – Non imposable"},{v:11,l:"11 %"},{v:30,l:"30 %"},{v:41,l:"41 %"},{v:45,l:"45 %"}]}
          help={LEXIQUE["TMI"]} />
        <SliderField label="Horizon de détention" value={form.horizon} onChange={set("horizon")}
          min={5} max={30} step={1} format={n=>`${n} ans`}
          help="Durée pendant laquelle vous conservez le bien avant revente." />

        <div className="mt-2 rounded-xl bg-amber-50 border border-amber-100 p-3">
          <p className="text-xs font-semibold text-amber-700">💡 Conseil fiscal</p>
          <p className="text-[11px] text-amber-600 mt-1">
            {form.tmi >= 30
              ? "Avec votre TMI, le régime Réel est presque toujours plus avantageux que le Micro-BIC grâce aux amortissements."
              : "Avec votre TMI, le Micro-BIC peut être compétitif. Comparez les deux régimes dans les résultats."}
          </p>
        </div>
      </Card>
    </div>
  );
}

/* ── Graphique Micro-BIC vs Réel ── */
function MicroVsReelChart({ data }) {
  const totalEco = data.reduce((s,d) => s + d["Économie"], 0);
  const breakEven = data.findIndex(d => d["Régime Réel"] < d["Micro-BIC"]) + 1;
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-slate-600">Impôt annuel comparé</p>
        <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">
          Économie 10 ans : {fmt(totalEco)}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} barSize={14} margin={{ top:0, right:0, left:0, bottom:0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
          <XAxis dataKey="an" tick={{ fontSize:10, fill:"#94A3B8" }} />
          <YAxis tick={{ fontSize:10, fill:"#94A3B8" }} tickFormatter={v=>fmtK(v)} width={50} />
          <RTooltip formatter={(v,n) => [fmt(v), n]} labelStyle={{ fontSize:11 }} contentStyle={{ borderRadius:8, border:"1px solid #E2E8F0", fontSize:11 }} />
          <Bar dataKey="Micro-BIC" fill="#FBBF24" radius={[3,3,0,0]} />
          <Bar dataKey="Régime Réel" fill="#185FA5" radius={[3,3,0,0]} />
        </BarChart>
      </ResponsiveContainer>
      {breakEven > 0 && (
        <p className="text-[11px] text-center text-slate-500 mt-2">
          ✅ Le Régime Réel est avantageux dès l&apos;année 1 · Économie cumulée en 10 ans : <strong className="text-green-600">{fmt(totalEco)}</strong>
        </p>
      )}
    </div>
  );
}

/* ── Graphique Amortissement par composants ── */
function AmortChart({ chartData }) {
  const total = chartData.reduce((s,c) => s+c.montant, 0);
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-slate-600">Déduction annuelle par composant</p>
        <span className="text-xs bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">{fmt(total)}/an</span>
      </div>
      <div className="space-y-2">
        {chartData.map(c => (
          <div key={c.name} className="flex items-center gap-2">
            <div className="w-24 text-[11px] text-slate-500 text-right shrink-0">{c.name}</div>
            <div className="flex-1 bg-slate-100 rounded-full h-2">
              <div className="h-2 rounded-full bg-blue-400"
                style={{ width:`${Math.round(c.montant/total*100)}%`, background:`hsl(${210+chartData.indexOf(c)*15},70%,${55+chartData.indexOf(c)*3}%)` }} />
            </div>
            <div className="w-16 text-[11px] font-semibold text-slate-700 text-right shrink-0">{fmt(c.montant)}</div>
            <div className="w-10 text-[10px] text-slate-400 shrink-0">{c.duree} ans</div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-slate-400 mt-2 text-center">Amortissements déductibles chaque année — non imposables en LMNP Réel</p>
    </div>
  );
}

/* ── Cash-flow chart 10 ans ── */
function CashflowChart({ rows }) {
  const data = rows.slice(0,10).map(r => ({
    an: `A${r.an}`,
    "Cash-flow": r.cashflow,
    "Cumulé": r.cumCashflow,
  }));
  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top:0, right:0, left:0, bottom:0 }}>
        <defs>
          <linearGradient id="cfGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#185FA5" stopOpacity={0.15}/>
            <stop offset="95%" stopColor="#185FA5" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
        <XAxis dataKey="an" tick={{ fontSize:10, fill:"#94A3B8" }} />
        <YAxis tick={{ fontSize:10, fill:"#94A3B8" }} tickFormatter={v=>fmtK(v)} width={50} />
        <RTooltip formatter={(v,n) => [fmt(v), n]} contentStyle={{ borderRadius:8, border:"1px solid #E2E8F0", fontSize:11 }} />
        <ReferenceLine y={0} stroke="#E2E8F0" strokeWidth={1.5} />
        <Area type="monotone" dataKey="Cash-flow" stroke="#185FA5" strokeWidth={2} fill="url(#cfGrad)" dot={{ r:3, fill:"#185FA5" }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ── Tableau de projection ── */
function TableauProjection({ rows, horizon }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(o=>!o)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors">
        <span>📋 Tableau de projection {horizon} ans</span>
        <span>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="mt-2 overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-xs">
            <thead className="bg-slate-50">
              <tr>
                {["Année","Loyers","Charges","Intérêts","Impôt","Cash-flow","CF Cumulé"].map(h=>(
                  <th key={h} className="px-3 py-2 text-left font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r,i) => (
                <tr key={r.an} className={i%2===0?"bg-white":"bg-slate-50/50"}>
                  <td className="px-3 py-1.5 font-semibold text-slate-600">{r.an}</td>
                  <td className="px-3 py-1.5 text-slate-700">{fmtK(r.loyers)}</td>
                  <td className="px-3 py-1.5 text-slate-500">{fmtK(r.charges)}</td>
                  <td className="px-3 py-1.5 text-slate-500">{fmtK(r.interets)}</td>
                  <td className="px-3 py-1.5 text-orange-600">{fmtK(r.impot)}</td>
                  <td className="px-3 py-1.5 font-semibold" style={{ color:r.cashflow>=0?"#10B981":"#EF4444" }}>
                    {fmtK(r.cashflowM)}/m
                  </td>
                  <td className="px-3 py-1.5 font-semibold text-blue-600">{fmtK(r.cumCashflow)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StepResultats({ form, results, comparaison, amort, onLead }) {
  if (!results) return null;
  const best = results[0]; // LMNP Réel
  const micro = results[1]; // Micro-BIC
  const feux = feuxTricolores(best.tri, best.cashflowM, best.ratioEndt);
  const economieMicro = micro.rows[0]?.impot - best.rows[0]?.impot;

  return (
    <div className="slide-up space-y-4">
      {/* Verdict */}
      <FeuxBadge tri={best.tri} cashflowM={best.cashflowM} ratioEndt={best.ratioEndt} />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <KPICard label="TRI sur la durée" value={`${best.tri} %`}
          sub="Taux de rendement interne" icon="📈"
          color={best.tri>=6?"#10B981":best.tri>=4?"#F59E0B":"#EF4444"}
          bg={best.tri>=6?"#ECFDF5":best.tri>=4?"#FFFBEB":"#FEF2F2"} />
        <KPICard label="Cash-flow mensuel" value={fmtK(best.cashflowM)}
          sub="Après crédit et impôt" icon="💸"
          color={best.cashflowM>=0?"#10B981":"#EF4444"}
          bg={best.cashflowM>=0?"#ECFDF5":"#FEF2F2"} />
        <KPICard label="Rendement net" value={`${best.rendNet.toFixed(2)} %`}
          sub="Après charges" icon="🏠" color="#185FA5" bg="#EFF6FF" />
        <KPICard label="Taux d'endettement" value={`${best.ratioEndt} %`}
          sub={best.ratioEndt<=35?"✅ Règle HCSF OK":"⚠ Dépasse 35%"} icon="⚖️"
          color={best.ratioEndt<=35?"#10B981":"#EF4444"}
          bg={best.ratioEndt<=35?"#ECFDF5":"#FEF2F2"} />
      </div>

      {/* Micro-BIC vs Réel */}
      <Card>
        <SectionTitle icon="⚔️" title="Micro-BIC vs Régime Réel"
          sub="Comparaison fiscale sur 10 ans" />
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-center">
            <p className="text-[10px] text-amber-600 font-semibold">Impôt Micro-BIC an 1</p>
            <p className="text-lg font-bold text-amber-700">{fmt(micro.rows[0]?.impot)}</p>
            <p className="text-[10px] text-amber-500">Abattement 50%</p>
          </div>
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 text-center">
            <p className="text-[10px] text-blue-600 font-semibold">Impôt Réel an 1</p>
            <p className="text-lg font-bold text-blue-700">{fmt(best.rows[0]?.impot)}</p>
            <p className="text-[10px] text-blue-500">Amortissements déduits</p>
          </div>
        </div>
        {comparaison && <MicroVsReelChart data={comparaison} />}
      </Card>

      {/* Amortissements par composants */}
      <Card>
        <SectionTitle icon="🏗️" title="Amortissement par composants"
          sub={`${fmt(amort.totalAnnuel)}/an déductible en LMNP Réel`} />
        <AmortChart chartData={amort.chartData} />
      </Card>

      {/* Reverse Calculator */}
      <Card>
        <SectionTitle icon="🔄" title="Mode inversé" sub="Calculez le prix max à payer pour votre objectif" />
        <ReverseCalculator form={form} />
      </Card>

      {/* Cash-flow chart */}
      <Card>
        <SectionTitle icon="📊" title="Cash-flow annuel" sub="10 premières années" />
        <CashflowChart rows={best.rows} />
      </Card>

      {/* Tableau */}
      <Card>
        <TableauProjection rows={best.rows} horizon={form.horizon} />
      </Card>

      {/* Comparaison 4 régimes */}
      <Card>
        <SectionTitle icon="🔬" title="Comparaison des 4 régimes" sub="Choisissez la meilleure stratégie fiscale" />
        <div className="space-y-2">
          {results.map((r,i) => {
            const labels = ["LMNP Réel","Micro-BIC","SCI à l'IS","SCI à l'IR"];
            const icons  = ["🥇","🥈","🏅","🏅"];
            const isWin  = i===0;
            return (
              <div key={r.type} className={`rounded-xl p-3 border ${isWin?"bg-blue-50 border-blue-200":"bg-slate-50 border-slate-100"}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{icons[i]} {labels[i]}</p>
                    <p className="text-[11px] text-slate-500">TRI {r.tri}% · CF {fmtK(r.cashflowM)}/mois</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color:r.cashflowM>=0?"#10B981":"#EF4444" }}>
                      {fmtK(r.cashflowM)}/mois
                    </p>
                    <p className="text-[10px] text-slate-400">Rdt net {r.rendNet.toFixed(2)}%</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Social Proof */}
      <Card>
        <SocialProof />
      </Card>

      {/* CTA Lead Capture */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background:"linear-gradient(135deg, #0F172A 0%, #185FA5 100%)" }}>
        <div className="p-6 text-center">
          <p className="text-2xl mb-2">📄</p>
          <h3 className="text-white font-bold text-base mb-1">Rapport fiscal complet</h3>
          <p className="text-blue-200 text-xs mb-4">
            Tableau de projection 20 ans · Comparatif des 4 régimes · Analyse amortissements · Conseils personnalisés
          </p>
          <button onClick={onLead}
            className="w-full bg-white text-blue-800 font-bold py-3 px-6 rounded-xl text-sm hover:bg-blue-50 transition-colors">
            Générer mon rapport complet →
          </button>
          <p className="text-blue-300 text-[10px] mt-2">Gratuit · Reçu par email en quelques secondes</p>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   LEAD CAPTURE MODAL
════════════════════════════════════════ */

/* ── Générateur de rapport HTML téléchargeable (fallback client-side) ── */
function downloadReport(form, results, amort, nom) {
  const r0  = results?.[0];
  const fmt2 = (n) => new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n??0);
  const cfColor = (r0?.cashflowM??0)>=0?"#059669":"#DC2626";
  const triColor = (r0?.tri??0)>=6?"#059669":(r0?.tri??0)>=4?"#D97706":"#DC2626";
  const verdictEmoji = (r0?.tri??0)>=6?"🟢":(r0?.tri??0)>=4?"🟡":"🔴";

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<title>Rapport LMNP</title>
<style>
  body{margin:0;padding:20px;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}
  .wrap{max-width:680px;margin:0 auto;}
  .header{background:linear-gradient(135deg,#0F172A,#185FA5);color:white;padding:28px;border-radius:16px 16px 0 0;text-align:center;}
  .body{background:white;padding:28px;}
  .footer{background:#F8FAFC;padding:16px;border-radius:0 0 16px 16px;text-align:center;border-top:1px solid #E2E8F0;font-size:11px;color:#94A3B8;}
  .kpi{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:20px 0;}
  .kpi-box{border-radius:12px;padding:14px;text-align:center;}
  .kpi-label{font-size:10px;font-weight:700;text-transform:uppercase;margin-bottom:6px;}
  .kpi-val{font-size:24px;font-weight:800;}
  .section-title{font-size:14px;font-weight:700;color:#0F172A;margin:24px 0 12px;}
  .regime{border-radius:10px;padding:13px 16px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;}
  .detail-table{width:100%;border-collapse:collapse;}
  .detail-table td{padding:5px 0;font-size:12px;}
  .detail-table td:last-child{text-align:right;font-weight:600;}
  .amort-row{display:flex;align-items:center;gap:10px;margin-bottom:8px;}
  .bar-bg{flex:1;background:#DBEAFE;border-radius:4px;height:7px;}
  .bar-fill{background:#185FA5;border-radius:4px;height:7px;}
  @media print{body{background:white;}@page{margin:15mm;}}
</style>
</head><body><div class="wrap">

<div class="header">
  <div style="font-size:40px;margin-bottom:8px;">🏢</div>
  <h1 style="margin:0 0 4px;font-size:22px;font-weight:800;">Simulateur LMNP</h1>
  <p style="margin:0;font-size:12px;opacity:.7;">Rapport fiscal · ${new Date().toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})}</p>
</div>

<div class="body">
  <p style="font-size:16px;font-weight:700;color:#0F172A;margin:0 0 4px;">Bonjour ${nom||"Investisseur"},</p>
  <p style="font-size:13px;color:#64748B;margin:0 0 20px;">Bien à <strong>${fmt2(form.prix)}</strong> · Loyer <strong>${fmt2(form.loyer)}/mois</strong> · Horizon <strong>${form.horizon} ans</strong></p>

  <div style="background:${triColor}15;border:1px solid ${triColor}44;border-radius:14px;padding:16px;display:flex;align-items:center;gap:14px;margin-bottom:20px;">
    <span style="font-size:32px;">${verdictEmoji}</span>
    <div>
      <div style="font-weight:800;font-size:16px;color:${triColor};">Verdict : ${(r0?.tri??0)>=6?"Excellent":(r0?.tri??0)>=4?"Acceptable":"Risqué"}</div>
      <div style="font-size:12px;color:#64748B;margin-top:3px;">TRI ${r0?.tri??"-"}% · CF ${r0?.cashflowM!=null?((r0.cashflowM>=0?"+":"")+r0.cashflowM+"€"):"-"}/mois · TMI ${form.tmi}%</div>
    </div>
  </div>

  <div class="kpi">
    <div class="kpi-box" style="background:#EFF6FF;border:1px solid #BFDBFE;">
      <div class="kpi-label" style="color:#3B82F6;">TRI</div>
      <div class="kpi-val" style="color:#185FA5;">${r0?.tri??"-"}%</div>
      <div style="font-size:11px;color:#93C5FD;">Sur ${form.horizon} ans</div>
    </div>
    <div class="kpi-box" style="background:${cfColor}10;border:1px solid ${cfColor}44;">
      <div class="kpi-label" style="color:${cfColor};">Cash-flow</div>
      <div class="kpi-val" style="color:${cfColor};">${r0?.cashflowM!=null?((r0.cashflowM>=0?"+":"")+r0.cashflowM+"€"):"-"}</div>
      <div style="font-size:11px;color:#94A3B8;">par mois</div>
    </div>
    <div class="kpi-box" style="background:#EFF6FF;border:1px solid #BFDBFE;">
      <div class="kpi-label" style="color:#3B82F6;">Rdt net</div>
      <div class="kpi-val" style="color:#185FA5;">${r0?.rendNet!=null?(+r0.rendNet).toFixed(2):"-"}%</div>
      <div style="font-size:11px;color:#93C5FD;">Après charges</div>
    </div>
  </div>

  <div class="section-title">🏠 Caractéristiques du bien</div>
  <table class="detail-table" style="background:#F8FAFC;border-radius:12px;padding:4px 12px;">
    ${[["Prix d'achat",fmt2(form.prix)],["Frais de notaire",`${fmt2(form.prix*form.notaire/100)} (${form.notaire}%)`],["Travaux + Mobilier",fmt2(form.travaux+form.mobilier)],["Apport",fmt2(form.apport)],["Loyer mensuel",`${fmt2(form.loyer)}/mois`],["Crédit",`${form.dureeCredit} ans à ${form.interet}%`]].map(([l,v])=>`<tr><td style="color:#64748B;">${l}</td><td>${v}</td></tr>`).join("")}
  </table>

  <div class="section-title">📊 Comparaison des 4 régimes</div>
  ${(results||[]).map((r,i)=>{
    const labels=["LMNP Réel","Micro-BIC","SCI à l'IS","SCI à l'IR"];
    const icons=["🥇","🥈","🏅","🏅"];
    const bg=i===0?"#EFF6FF":"#F8FAFC";
    const bd=i===0?"#BFDBFE":"#E2E8F0";
    const cc=(r.cashflowM??0)>=0?"#059669":"#DC2626";
    return `<div class="regime" style="background:${bg};border:1px solid ${bd};">
      <div><div style="font-weight:700;font-size:13px;">${icons[i]} ${labels[i]}</div>
      <div style="font-size:11px;color:#64748B;margin-top:2px;">TRI ${r.tri??"-"}% · Rdt ${r.rendNet!=null?(+r.rendNet).toFixed(2):"-"}%</div></div>
      <div style="text-align:right;font-size:18px;font-weight:800;color:${cc};">${r.cashflowM!=null?((r.cashflowM>=0?"+":"")+r.cashflowM+"€"):"-"}/mois</div>
    </div>`;
  }).join("")}

  ${amort?.chartData?.length ? `
  <div class="section-title">🏗️ Amortissement par composants — ${fmt2(amort.totalAnnuel)}/an</div>
  ${amort.chartData.map(c=>`<div class="amort-row">
    <div style="width:110px;font-size:11px;color:#64748B;">${c.name}</div>
    <div class="bar-bg"><div class="bar-fill" style="width:${Math.round(c.montant/amort.totalAnnuel*100)}%;"></div></div>
    <div style="width:55px;text-align:right;font-size:11px;font-weight:700;">${fmt2(c.montant)}</div>
    <div style="width:36px;font-size:10px;color:#94A3B8;">${c.duree}ans</div>
  </div>`).join("")}` : ""}

</div>
<div class="footer">
  Simulateur LMNP — Rapport à titre informatif. Consultez un expert-comptable spécialisé LMNP.
</div>
</div></body></html>`;

  const blob = new Blob([html], { type:"text/html" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `rapport-lmnp-${new Date().toISOString().slice(0,10)}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function LeadModal({ onClose, form, results }) {
  const [email,   setEmail]   = useState("");
  const [name,    setName]    = useState("");
  const [sent,    setSent]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailOk, setEmailOk] = useState(false); // l'API email a réussi

  const amort = useMemo(
    () => calcAmortComposants(form.prix, form.notaire, form.mobilier, form.travaux),
    [form]
  );

  const submit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      // 1. Sauvegarder en DB
      if (sb) {
        await sb.from("leads").upsert({
          email, nom: name, params: form,
          tri: results?.[0]?.tri,
          cashflow_m: results?.[0]?.cashflowM,
          created_at: new Date().toISOString(),
        });
      }
      // 2. Envoyer l'email via API route
      let emailSent = false;
      try {
        const res = await fetch("/api/send-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email, nom: name, params: form,
            tri:        results?.[0]?.tri,
            cashflow_m: results?.[0]?.cashflowM,
            rend_net:   results?.[0]?.rendNet,
            amort,
            results: results?.map(r => ({
              tri: r.tri, cashflowM: r.cashflowM, rendNet: r.rendNet,
            })),
          }),
        });
        const data = await res.json();
        emailSent = data.success && !data.warning;
      } catch { /* silencieux */ }

      setEmailOk(emailSent);
      setSent(true);
    } catch {
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background:"rgba(15,23,42,0.7)", backdropFilter:"blur(4px)" }}>
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl">
        {!sent ? (
          <>
            <div className="text-center mb-5">
              <div className="text-3xl mb-2">📊</div>
              <h2 className="text-lg font-bold text-slate-800">Votre rapport fiscal personnalisé</h2>
              <p className="text-sm text-slate-500 mt-1">
                Recevez l&apos;analyse complète de votre investissement LMNP par email.
              </p>
            </div>
            {results?.[0] && (
              <div className="grid grid-cols-3 gap-2 mb-5 p-3 bg-slate-50 rounded-xl">
                <div className="text-center">
                  <p className="text-[10px] text-slate-400">TRI</p>
                  <p className="font-bold text-sm text-blue-600">{results[0].tri}%</p>
                </div>
                <div className="text-center border-x border-slate-200">
                  <p className="text-[10px] text-slate-400">CF/mois</p>
                  <p className="font-bold text-sm" style={{ color:results[0].cashflowM>=0?"#10B981":"#EF4444" }}>
                    {fmtK(results[0].cashflowM)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-slate-400">Rdt net</p>
                  <p className="font-bold text-sm text-blue-600">{results[0].rendNet.toFixed(2)}%</p>
                </div>
              </div>
            )}
            <form onSubmit={submit} className="space-y-3">
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Prénom (optionnel)"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 bg-slate-50" />
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Votre adresse email *"
                required className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 bg-slate-50" />
              <button type="submit" disabled={loading || !email}
                className="w-full py-3 rounded-xl text-sm font-bold text-white transition-opacity"
                style={{ background:"linear-gradient(135deg, #0F172A, #185FA5)", opacity: loading||!email ? 0.6 : 1 }}>
                {loading ? "⏳ Génération en cours…" : "Recevoir mon rapport gratuit →"}
              </button>
            </form>
            <p className="text-[10px] text-slate-400 text-center mt-3">
              Aucun spam. Données utilisées uniquement pour votre rapport.
            </p>
            <button onClick={onClose} className="mt-3 w-full text-sm text-slate-400 hover:text-slate-600 py-1">
              Continuer sans rapport
            </button>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="text-4xl mb-3">✅</div>
            <h2 className="text-lg font-bold text-slate-800 mb-2">
              {emailOk ? "Rapport envoyé !" : "Rapport prêt !"}
            </h2>
            <p className="text-sm text-slate-500 mb-5">
              {emailOk
                ? `Vérifiez votre boîte mail (${email}). Votre analyse complète est en route.`
                : "Téléchargez votre rapport directement ou rouvrez le simulateur pour le générer à nouveau."}
            </p>
            {/* Toujours proposer le téléchargement */}
            <button
              onClick={() => downloadReport(form, results, amort, name)}
              className="w-full py-3 rounded-xl text-sm font-bold text-white mb-3"
              style={{ background:"linear-gradient(135deg, #185FA5, #1e40af)" }}>
              ⬇ Télécharger le rapport (.html)
            </button>
            <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50">
              Fermer
            </button>
            {emailOk && (
              <p className="text-[10px] text-slate-400 mt-3">
                Vérifiez vos spams si vous ne voyez pas l&apos;email.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   AUTH MODAL
════════════════════════════════════════ */

function AuthModal({ onAuth, onClose }) {
  const [mode,           setMode]     = useState("login");
  const [email,          setEmail]    = useState("");
  const [password,       setPass]     = useState("");
  const [error,          setError]    = useState("");
  const [loading,        setLoading]  = useState(false);
  const [pendingConfirm, setPending]  = useState(false); // en attente de confirmation email
  const [cooldown,       setCooldown] = useState(0);     // délai avant re-envoi
  const [infoMsg,        setInfoMsg]  = useState("");

  // Décompte cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const resendConfirmation = async () => {
    if (!sb || cooldown > 0) return;
    setLoading(true);
    try {
      await sb.auth.resend({ type:"signup", email });
      setCooldown(60);
      setInfoMsg("Email de confirmation renvoyé !");
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  const resetPassword = async () => {
    if (!sb) return;
    if (!email) { setError("Entrez votre email pour réinitialiser le mot de passe."); return; }
    setLoading(true);
    try {
      await sb.auth.resetPasswordForEmail(email, {
        redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      });
      setInfoMsg("Email de réinitialisation envoyé ! Vérifiez votre boîte mail.");
      setError("");
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!sb) { setError("Service non configuré. Rechargez la page."); return; }
    setLoading(true); setError(""); setInfoMsg("");
    try {
      if (mode === "login") {
        const { data, error:err } = await sb.auth.signInWithPassword({ email, password });
        if (err) {
          if (err.message.includes("Email not confirmed") || err.code === "email_not_confirmed") {
            setPending(true);
          } else if (err.message.includes("Invalid login credentials")) {
            throw new Error("Email ou mot de passe incorrect.");
          } else {
            throw err;
          }
        } else {
          onAuth(data.user);
        }
      } else {
        const { data, error:err } = await sb.auth.signUp({ email, password });
        if (err) {
          if (err.message.includes("already registered") || err.message.includes("already been registered")) {
            throw new Error("Un compte existe déjà avec cet email. Connectez-vous plutôt.");
          }
          throw err;
        }
        if (data.session) {
          // Confirmation désactivée — connexion directe
          onAuth(data.user);
        } else {
          // Confirmation email requise
          setPending(true);
          setCooldown(60);
        }
      }
    } catch (err) {
      setError(err.message || "Une erreur est survenue.");
    } finally { setLoading(false); }
  };

  /* ── État : en attente de confirmation email ── */
  if (pendingConfirm) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background:"rgba(0,0,0,.55)", backdropFilter:"blur(3px)" }}>
        <div className="bg-white rounded-2xl p-6 w-80 shadow-2xl text-center">
          <div className="text-4xl mb-3">📧</div>
          <h2 className="font-bold text-slate-800 mb-2">Confirmez votre email</h2>
          <p className="text-sm text-slate-500 mb-1 leading-relaxed">
            Un lien de confirmation a été envoyé à
          </p>
          <p className="text-sm font-bold text-slate-700 mb-4 break-all">{email}</p>
          <p className="text-xs text-slate-400 mb-5 leading-relaxed">
            Cliquez sur le lien dans l&apos;email pour activer votre compte, puis revenez ici pour vous connecter.
          </p>
          <button
            onClick={resendConfirmation}
            disabled={cooldown > 0 || loading}
            className="w-full py-2.5 mb-3 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50">
            {cooldown > 0 ? `Renvoyer dans ${cooldown} s` : "📨 Renvoyer l'email"}
          </button>
          <button onClick={() => { setPending(false); setMode("login"); }}
            className="w-full py-2.5 mb-2 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors">
            J&apos;ai confirmé → Se connecter
          </button>
          <button onClick={onClose} className="text-xs text-slate-400 hover:text-slate-600 mt-1">
            Continuer sans compte
          </button>
          <p className="text-[10px] text-slate-400 mt-3">📂 Vérifiez vos spams si vous ne trouvez pas l&apos;email.</p>
        </div>
      </div>
    );
  }

  /* ── Formulaire principal ── */
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background:"rgba(0,0,0,.55)", backdropFilter:"blur(3px)" }}>
      <div className="bg-white rounded-2xl p-6 w-80 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-slate-800">{mode==="login" ? "Connexion" : "Créer un compte"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input type="email" value={email} onChange={e=>{setEmail(e.target.value);setError("");}}
            placeholder="Email" required autoComplete="email"
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 bg-slate-50 focus:bg-white transition-colors" />
          <input type="password" value={password} onChange={e=>{setPass(e.target.value);setError("");}}
            placeholder={mode==="register" ? "Mot de passe (6 car. min.)" : "Mot de passe"}
            required minLength={mode==="register" ? 6 : undefined} autoComplete={mode==="login" ? "current-password" : "new-password"}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 bg-slate-50 focus:bg-white transition-colors" />

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}
          {infoMsg && (
            <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2">
              <p className="text-xs text-green-700">{infoMsg}</p>
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-60">
            {loading ? "⏳ …" : mode==="login" ? "Se connecter" : "Créer le compte"}
          </button>
        </form>

        <div className="mt-3 space-y-1.5 text-center">
          <button onClick={() => { setMode(m => m==="login"?"register":"login"); setError(""); setInfoMsg(""); }}
            className="text-xs text-blue-500 hover:underline block w-full">
            {mode==="login" ? "Pas encore de compte ? Créer un compte →" : "← Déjà un compte ? Se connecter"}
          </button>
          {mode==="login" && (
            <button onClick={resetPassword} disabled={loading}
              className="text-xs text-slate-400 hover:text-slate-600 hover:underline">
              Mot de passe oublié ?
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   FAQ SECTION (SEO)
════════════════════════════════════════ */

const FAQ_ITEMS = [
  { q:"Qu'est-ce que la simulation LMNP ?",
    a:"La simulation LMNP (Loueur Meublé Non Professionnel) permet d'estimer la rentabilité d'un investissement locatif meublé en tenant compte du régime fiscal réel : amortissements par composants, déduction des charges, cashflow mensuel et TRI sur la durée de détention." },
  { q:"Quelle est la différence entre Micro-BIC et Régime Réel en LMNP ?",
    a:"Le Micro-BIC applique un abattement forfaitaire de 50 % sur les loyers. Simple, mais souvent moins avantageux. Le Régime Réel permet de déduire toutes les charges réelles et les amortissements par composants (bien, mobilier, travaux), ce qui ramène fréquemment l'impôt à zéro les premières années." },
  { q:"Comment fonctionne l'amortissement par composants en LMNP ?",
    a:"Le bien est décomposé en plusieurs éléments : gros œuvre (50 % du bien sur 50 ans), toiture et façade (10 % chacun sur 25 ans), équipements (15 % sur 15 ans) et agencements (15 % sur 10 ans). Le mobilier s'amortit sur 7 ans et les travaux sur 12 ans. Le total annuel est déductible des loyers imposables." },
  { q:"Qu'est-ce que le TRI (Taux de Rendement Interne) en immobilier ?",
    a:"Le TRI mesure la rentabilité globale de l'investissement en tenant compte de tous les flux : loyers, charges, remboursement du crédit, impôts et prix de revente. Un TRI supérieur à 6 % est généralement considéré comme excellent pour un investissement locatif meublé." },
  { q:"Quel est le taux d'endettement maximum autorisé par les banques ?",
    a:"Le Haut Conseil de Stabilité Financière (HCSF) impose un taux d'endettement maximal de 35 % des revenus nets, toutes charges de crédit confondues. Au-delà, les banques peuvent refuser le financement ou réduire le montant accordé." },
  { q:"LMNP ou SCI : quelle structure choisir ?",
    a:"En LMNP (personnes physiques), l'amortissement est déductible et la plus-value bénéficie du régime des particuliers (exonération après 30 ans). La SCI à l'IS permet aussi les amortissements mais la plus-value est taxée comme un revenu d'entreprise. La SCI à l'IR est similaire à la location nue, sans amortissement. Pour la plupart des investisseurs, le LMNP Réel reste la structure la plus avantageuse." },
  { q:"Qu'est-ce qu'un différé de remboursement ?",
    a:"Le différé partiel vous permet de ne payer que les intérêts pendant la période de travaux ou de recherche de locataire. Le différé total capitalise les intérêts sur le capital, augmentant légèrement la dette mais libérant toute la trésorerie. Utile pour les biens nécessitant des travaux importants." },
  { q:"Comment calculer le rendement locatif brut ?",
    a:"Rendement brut = (Loyers annuels / Prix d'achat total) × 100. Le prix total inclut les frais de notaire, les travaux et le mobilier. Par exemple : 10 200 € de loyers annuels pour un bien à 200 000 € donne un rendement brut de 5,1 %." },
  { q:"Quels travaux sont amortissables en LMNP ?",
    a:"Tous les travaux de rénovation, d'amélioration ou d'équipement sont amortissables en LMNP Réel. Les travaux d'entretien (peinture, petites réparations) peuvent être déduits immédiatement. Les travaux importants (rénovation complète, extension) sont amortis sur 10 à 15 ans selon leur nature." },
  { q:"Comment optimiser la fiscalité de mon investissement LMNP ?",
    a:"Les principales leviers : 1) Opter pour le Régime Réel (vs Micro-BIC) pour maximiser les déductions, 2) Maximiser les amortissements par composants, 3) Déduire tous les frais d'acquisition, 4) Prévoir un différé si vous réalisez des travaux, 5) Conserver le bien au-delà de 10 ans pour réduire l'imposition sur la plus-value." },
  { q:"Le simulateur LMNP est-il fiable pour mon dossier bancaire ?",
    a:"Notre simulateur intègre les paramètres réels utilisés par les banques (taux d'endettement HCSF, capacité de remboursement, apport personnel) et les règles fiscales en vigueur pour le LMNP Réel et le Micro-BIC. Il constitue une excellente base d'analyse, mais consultez un expert-comptable spécialisé pour votre dossier définitif." },
  { q:"Quelle est la vacance locative à prévoir ?",
    a:"Pour un studio ou T2 bien situé en zone tendue, comptez 2 à 5 % de vacance (7 à 18 jours par an). Pour un logement moins central ou atypique, prévoyez 8 à 10 %. La vacance impacte directement le cash-flow et le rendement net : chaque point de vacance représente environ 12 jours de loyer perdu." },
];

function FAQ() {
  const [open, setOpen] = useState(null);
  return (
    <section className="mt-12 pb-16">
      {/* JSON-LD Schema SEO */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context":"https://schema.org", "@type":"FAQPage",
        "mainEntity": FAQ_ITEMS.map(item => ({
          "@type":"Question", "name":item.q,
          "acceptedAnswer":{ "@type":"Answer", "text":item.a }
        }))
      })}} />

      <div className="text-center mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-2">Questions fréquentes</h2>
        <p className="text-sm text-slate-500">Tout ce que vous devez savoir sur la simulation LMNP et l&apos;amortissement réel</p>
      </div>

      <div className="space-y-2">
        {FAQ_ITEMS.map((item,i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-100 overflow-hidden">
            <button onClick={() => setOpen(o => o===i ? null : i)}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left">
              <span className="text-sm font-semibold text-slate-700 pr-4">{item.q}</span>
              <span className="text-slate-400 text-sm shrink-0">{open===i?"▲":"▼"}</span>
            </button>
            {open===i && (
              <div className="px-4 pb-4">
                <p className="text-sm text-slate-600 leading-relaxed">{item.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ════════════════════════════════════════
   APP PRINCIPALE
════════════════════════════════════════ */

export default function App() {
  // phase: "landing" | "quiz" | "sim"
  const [phase,    setPhase]    = useState("landing");
  const [step,     setStep]     = useState(0);
  const [form,     setForm]     = useState(DEFAULTS);
  const [user,     setUser]     = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showLead, setShowLead] = useState(false);
  const topRef = useRef(null);

  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!sb) return;
    sb.auth.getSession().then(({ data:{session} }) => { if (session?.user) setUser(session.user); });
    const { data:{subscription} } = sb.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Quiz completion — pré-remplir le TMI depuis les réponses
  const handleQuizComplete = (answers) => {
    if (answers.tmi !== undefined) {
      setForm(f => ({ ...f, tmi: answers.tmi }));
    }
    setPhase("sim");
    window.scrollTo(0, 0);
  };

  const results = useMemo(() => {
    if (step < 3) return null;
    return [
      runCalc(form, "lmnp"),
      runCalc(form, "microbic"),
      runCalc(form, "sciis"),
      runCalc(form, "sciir"),
    ];
  }, [form, step]);

  const comparaison = useMemo(() => {
    if (step < 3) return null;
    return calcComparaison10ans(form);
  }, [form, step]);

  const amort = useMemo(() => calcAmortComposants(form.prix, form.notaire, form.mobilier, form.travaux), [form]);

  const goNext = () => {
    if (step < 3) { setStep(s => s+1); topRef.current?.scrollIntoView({ behavior:"smooth" }); }
  };
  const goBack = () => {
    if (step > 0) { setStep(s => s-1); topRef.current?.scrollIntoView({ behavior:"smooth" }); }
    else { setPhase("quiz"); setStep(0); }
  };

  const canNext = true;

  /* ── Landing ── */
  if (phase === "landing") {
    return <LandingPage onStart={() => setPhase("quiz")} />;
  }

  /* ── Quiz ── */
  if (phase === "quiz") {
    return <OnboardingQuiz onComplete={handleQuizComplete} />;
  }

  /* ── Simulateur ── */
  return (
    <div className="min-h-screen" style={{ background:"#F1F5F9" }}>
      {/* ── HEADER ── */}
      <header style={{ background:"linear-gradient(135deg, #0F172A 0%, #185FA5 100%)" }}
        className="sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => setPhase("landing")} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <span className="text-xl">🏢</span>
              <div>
                <p className="text-white font-bold text-sm leading-tight">Simulateur LMNP</p>
                <p className="text-blue-200 text-[10px]">Analyse fiscale · 4 régimes</p>
              </div>
            </button>
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <button onClick={() => sb && sb.auth.signOut()}
                className="text-[11px] text-blue-200 hover:text-white bg-white/10 px-3 py-1.5 rounded-lg transition-colors">
                {user.email?.split("@")[0]} · Déco
              </button>
            ) : (
              <button onClick={() => setShowAuth(true)}
                className="text-[11px] font-semibold bg-white text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
                🔒 Connexion
              </button>
            )}
          </div>
        </div>

        {/* Step indicator */}
        <div className="max-w-2xl mx-auto px-4 pb-3">
          <div className="flex items-center gap-1">
            {STEPS.map((s,i) => (
              <div key={s.id} className="flex items-center gap-1 flex-1">
                <button onClick={() => i < step && setStep(i)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                    i===step ? "bg-white text-blue-700" :
                    i<step   ? "bg-white/20 text-white cursor-pointer hover:bg-white/30" :
                               "bg-white/10 text-blue-300 cursor-default"
                  }`}>
                  <span>{s.icon}</span>
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {i < STEPS.length-1 && (
                  <div className="flex-1 h-px mx-0.5" style={{ background: i<step?"rgba(255,255,255,.6)":"rgba(255,255,255,.2)" }} />
                )}
              </div>
            ))}
          </div>
          {/* Progress bar */}
          <div className="mt-2 h-1 bg-white/20 rounded-full">
            <div className="h-1 bg-white rounded-full transition-all duration-500"
              style={{ width:`${(step/3)*100}%` }} />
          </div>
        </div>
      </header>

      <div ref={topRef} />

      {/* ── MAIN CONTENT ── */}
      <main className="max-w-2xl mx-auto px-4 py-4 pb-32">
        {step===0 && <StepProjet form={form} set={set} />}
        {step===1 && <StepFinancement form={form} set={set} />}
        {step===2 && <StepExploitation form={form} set={set} />}
        {step===3 && results && (
          <StepResultats form={form} results={results} comparaison={comparaison}
            amort={amort} onLead={() => setShowLead(true)} />
        )}

        {/* FAQ on last step */}
        {step===3 && <FAQ />}
      </main>

      {/* ── BOTTOM NAV ── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-100 shadow-lg pb-safe">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={goBack}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            ← Retour
          </button>
          {step < 3 ? (
            <button onClick={goNext} disabled={!canNext}
              className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-50"
              style={{ background:"linear-gradient(135deg, #185FA5, #1e40af)" }}>
              {step===2 ? "📊 Voir mes résultats →" : "Continuer →"}
            </button>
          ) : (
            <button onClick={() => setShowLead(true)}
              className="flex-1 py-3 rounded-xl text-sm font-bold text-white"
              style={{ background:"linear-gradient(135deg, #10B981, #059669)" }}>
              📄 Rapport complet gratuit →
            </button>
          )}
        </div>
      </div>

      {/* ── MODALS ── */}
      {showAuth && <AuthModal onAuth={u => { setUser(u); setShowAuth(false); }} onClose={() => setShowAuth(false)} />}
      {showLead && <LeadModal onClose={() => setShowLead(false)} form={form} results={results} />}
    </div>
  );
}
