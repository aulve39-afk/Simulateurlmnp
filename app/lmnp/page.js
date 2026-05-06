"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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
  "TRI": "Taux de Rendement Interne : mesure la rentabilité globale en tenant compte de tous les flux (loyers, impôts, crédit, revente) sur la durée de détention. Un TRI > 6 % est excellent.",
  "Cash-flow": "Différence mensuelle entre loyers perçus et toutes les charges : mensualité crédit, taxes, assurance, impôt et prélèvements sociaux. Un cash-flow positif = l'investissement s'autofinance.",
  "Amortissement": "En LMNP, déduction fiscale correspondant à la dépréciation comptable du bien (par composants) et du mobilier. Réduit le revenu imposable sans sortie d'argent réelle.",
  "TMI": "Taux Marginal d'Imposition. Taux applicable à la dernière tranche de vos revenus : 0 %, 11 %, 30 %, 41 % ou 45 %. Plus votre TMI est élevé, plus le LMNP Réel vous fait économiser.",
  "Micro-BIC": "Régime simplifié LMNP : abattement forfaitaire de 50 % sur les loyers (71 % pour meublé tourisme classé). Aucune comptabilité, mais aucune déduction de charges réelles ni amortissement.",
  "Régime Réel": "Permet de déduire toutes les charges réelles (intérêts, assurance, taxe foncière…) + amortissements par composants. Presque toujours plus avantageux que le Micro-BIC dès TMI ≥ 30 %.",
  "LMNP Réel": "Loueur Meublé Non Professionnel au régime réel simplifié. Vous déduisez charges + amortissements, ce qui génère souvent un revenu imposable nul pendant 10–15 ans. Plus-value taxée au régime des particuliers (exonération à 30 ans).",
  "SCI IS": "Société Civile Immobilière soumise à l'Impôt sur les Sociétés. Amortissements déductibles comme en LMNP, taux IS 15 % jusqu'à 42 500 € puis 25 %. Inconvénient majeur : la plus-value à la revente est taxée comme un bénéfice d'entreprise (pas d'exonération durée).",
  "SCI IR": "SCI transparente fiscalement, revenus imposés entre les mains des associés comme des revenus fonciers. Pas d'amortissement possible. Régime proche de la location nue — généralement moins avantageux que le LMNP Réel.",
  "Amortissement par composants": "Méthode comptable qui décompose le bien en éléments (gros œuvre 50 ans, toiture 25 ans, équipements 15 ans, mobilier 7 ans…) chacun amorti sur sa durée propre. Conforme CGI Art. 39 C.",
  "Différé": "Période post-déblocage pendant laquelle vous ne remboursez que les intérêts (différé partiel) ou rien (différé total, intérêts capitalisés). Utile pour absorber les travaux avant la première mise en location.",
  "Rendement brut": "Loyers annuels bruts / prix total d'acquisition. Indicateur rapide avant déduction des charges et impôts. Au-dessus de 6 %, le bien est généralement rentable.",
  "Rendement net": "(Loyers − toutes les charges annuelles) / prix total. Indicateur plus précis. Au-dessus de 4 % net, l'investissement est solide.",
  "Plus-value": "Gain à la revente = prix de vente − prix d'achat. En LMNP (régime particuliers), abattements progressifs sur l'IR : exonération totale à 22 ans et sur les prélèvements sociaux à 30 ans.",
  "Bouclier fiscal": "Période pendant laquelle les amortissements absorbent entièrement le revenu imposable → impôt = 0 €. Dure typiquement 10–15 ans. Anticipez la fin du bouclier pour planifier une revente ou un refinancement.",
  "Prélèvements sociaux": "17,2 % prélevés sur le bénéfice net BIC positif (après déduction des charges et amortissements). En plus de l'IR au TMI.",
  "CFE": "Cotisation Foncière des Entreprises. Taxe locale due par tout loueur meublé, calculée sur la valeur locative du bien. Généralement entre 100 € et 500 € / an selon commune.",
  "DPE": "Diagnostic de Performance Énergétique. Classes A (très économe) à G (très énergivore). Les logements F et G sont progressivement interdits à la location (gel des loyers dès 2022, interdiction G en 2025, F en 2028).",
  "Ratio d'endettement": "Part de vos revenus consacrée à toutes vos mensualités de crédit. La règle HCSF impose un maximum de 35 % (assurance incluse). Au-delà, les banques refusent généralement le financement.",
  "Frais de notaire": "En neuf : ~2–3 %. En ancien : ~7–8 % du prix. Comprend les droits de mutation (majoritaires), les émoluments du notaire et diverses taxes. Non récupérables à la revente.",
  "Vacance locative": "Période sans locataire, exprimée en % annuel. 5 % ≈ 18 jours/an. Prévoir 5–8 % selon le marché. Réduit directement le rendement effectif.",
};

/* ── Steps ── */
const STEPS = [
  { id:"projet",      label:"Projet",     icon:"🏠" },
  { id:"financement", label:"Crédit",     icon:"🏦" },
  { id:"exploitation",label:"Loyers",     icon:"📊" },
  { id:"resultats",   label:"Résultats",  icon:"📈" },
  { id:"dossier",     label:"Dossier",    icon:"📋" },
];

/* ── Defaults ── */
const DEFAULTS = {
  typeBien:"Appartement", surface:45, adresse:"", dpe:"C",
  typeAcquisition:"ancien", // "ancien" ~8% | "neuf" ~2.5%
  prix:180000, notaire:8, travaux:12000, mobilier:6000, terrain:15,
  apport:30000, interet:3.45, dureeCredit:20, differe:0, typeDiffere:"partiel",
  loyer:850, charges:120, taxeFonciere:1200, vacance:5, revalorisation:1.5,
  tmi:30, revenusMensuels:4500, chargesCredit:0,
  horizon:20,
  tourismeClass:false, // meublé tourisme classé → abattement Micro-BIC 71 %
  cfe:200,             // Cotisation Foncière des Entreprises (€/an)
  // ── Dossier bancaire ──
  age:35, profession:"", typeContrat:"CDI",
  epargneResiduelle:10000,
  nbPieces:2, etatGeneral:"Bon", quartier:"",
  modeExploitation:"LMNP meublé",
  assurancePNO:200,    // Assurance Propriétaire Non Occupant (€/an)
  fraisGestion:0,      // Frais de gestion locative (€/an)
  objetTravaux:"",     // Description des travaux (rénovation énergétique, rafraîchissement…)
};

/* ── Presets de biens ── */
const PRESETS = [
  {
    label:"Studio Paris", icon:"🏙️",
    typeBien:"Studio", surface:28, prix:235000, notaire:8, travaux:8000, mobilier:5000, terrain:28,
    loyer:1050, charges:150, taxeFonciere:1600, vacance:5, revalorisation:1.5,
  },
  {
    label:"T2 Province", icon:"🏘️",
    typeBien:"Appartement", surface:45, prix:130000, notaire:8, travaux:10000, mobilier:5000, terrain:15,
    loyer:620, charges:100, taxeFonciere:900, vacance:6, revalorisation:1.2,
  },
  {
    label:"Résidence étud.", icon:"🎓",
    typeBien:"Studio", surface:22, prix:85000, notaire:8, travaux:5000, mobilier:4000, terrain:12,
    loyer:480, charges:60, taxeFonciere:600, vacance:8, revalorisation:1.0,
  },
  {
    label:"T3 Banlieue", icon:"🏠",
    typeBien:"Appartement", surface:65, prix:190000, notaire:8, travaux:15000, mobilier:7000, terrain:15,
    loyer:850, charges:130, taxeFonciere:1300, vacance:5, revalorisation:1.5,
  },
  {
    label:"Maison locative", icon:"🏡",
    typeBien:"Maison", surface:90, prix:280000, notaire:8, travaux:25000, mobilier:9000, terrain:30,
    loyer:1200, charges:80, taxeFonciere:1800, vacance:4, revalorisation:1.5,
  },
];

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

function calcAmortComposants(prix, notaire, mobilier, travaux, terrainPct=15) {
  /* Méthode par composants — fiscalité LMNP Réel */
  const terrain   = prix * (terrainPct / 100); // terrain non amortissable
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
  const terrainPct = p.terrain ?? 15;
  const amort      = calcAmortComposants(p.prix, p.notaire, p.mobilier, p.travaux, terrainPct);

  // Prélèvements sociaux : 17.2% sur BIC net positif (LMNP non-professionnel)
  const PS_RATE = 0.172;

  const rows = [];
  let cumCashflow   = 0;
  let deficitPool   = 0; // déficit reportable LMNP — art. 156 CGI, 10 ans
  let deficitPoolIS = 0; // déficit reportable SCI IS

  for (let yr=1; yr<=p.horizon; yr++) {
    const facReval  = Math.pow(1+(p.revalorisation/100), yr-1);
    const loyers    = p.loyer * 12 * facReval;
    const charges   = p.charges * 12 + p.taxeFonciere + (p.cfe || 200);
    const vacance   = loyers * (p.vacance/100);
    const loyersNets = loyers - vacance;
    const interets  = creditRows[yr-1]?.interets ?? 0;
    const capRest   = creditRows[yr-1]?.capRestant ?? 0;

    let impot = 0;
    if (type==="lmnp") {
      // Déficit reportable sur 10 ans (CGI art. 156)
      const baseRaw = loyersNets - charges - interets - amort.totalAnnuel;
      const baseApresReport = baseRaw + deficitPool; // deficitPool ≤ 0
      if (baseApresReport <= 0) {
        deficitPool = Math.max(baseApresReport, -loyersNets * 10); // cap sécurité 10 ans
        impot = 0;
      } else {
        deficitPool = 0;
        impot = baseApresReport * (p.tmi/100 + PS_RATE);
      }
    } else if (type==="microbic") {
      // Micro-BIC : abattement 50% (71% si meublé tourisme classé), pas de déficit possible
      const abatt = p.tourismeClass ? 0.71 : 0.50;
      const base = loyersNets * (1 - abatt);
      impot = Math.max(0, base) * (p.tmi/100 + PS_RATE);
    } else if (type==="nue") {
      const base = Math.max(0, loyersNets - charges - interets);
      impot = base * (p.tmi/100 + PS_RATE);
    } else if (type==="sciis") {
      // IS : 15% jusqu'à 42 500 €, puis 25% — déficit reportable illimité
      const baseRaw = loyersNets - charges - interets - amort.totalAnnuel;
      const baseIS  = baseRaw + deficitPoolIS;
      if (baseIS <= 0) {
        deficitPoolIS = baseIS;
        impot = 0;
      } else {
        deficitPoolIS = 0;
        impot = baseIS <= 42500 ? baseIS*0.15 : 42500*0.15 + (baseIS-42500)*0.25;
      }
    } else if (type==="sciir") {
      const base = Math.max(0, loyersNets - charges - interets);
      impot = base * (p.tmi/100 + PS_RATE);
    }

    const cashflowBrut = loyersNets - charges - mensualite - impot;
    const cashflowM    = cashflowBrut / 12;
    cumCashflow += cashflowBrut;

    rows.push({ an:yr, loyers:Math.round(loyers), charges:Math.round(charges),
      vacance:Math.round(vacance), interets:Math.round(interets),
      mensualite:Math.round(mensualite), impot:Math.round(impot),
      cashflow:Math.round(cashflowBrut), cashflowM:Math.round(cashflowM),
      capRestant:Math.round(capRest), cumCashflow:Math.round(cumCashflow),
    });
  }

  // Prix total d'acquisition (base correcte pour rendements)
  const prixTotal   = p.prix + p.prix*(p.notaire/100) + p.travaux;
  const investTotal = p.apport + p.mobilier; // flux initial cash (TRI)
  const loyers0     = p.loyer * 12;
  const charges0    = p.charges * 12 + p.taxeFonciere;
  const rendBrut    = loyers0 / prixTotal * 100;
  const rendNet     = (loyers0 - charges0) / prixTotal * 100;  // base prixTotal, pas apport
  const cashflowM0  = rows[0]?.cashflowM ?? 0;
  // Ratio d'endettement HCSF : inclut crédits existants
  const totalMens   = mensualite + (+p.chargesCredit || 0);
  const ratioEndt   = totalMens / (p.revenusMensuels || 1) * 100;

  // TRI approché (Newton-Raphson simplifié)
  // Prix de revente : revalorisation composée (Math.pow) × (1 - 5,5 % frais de cession)
  const prixRevente = p.prix * Math.pow(1 + p.revalorisation/100, p.horizon) * 0.945;
  const fluxes = [-investTotal, ...rows.map((r,i) => {
    const rv = i===rows.length-1
      ? r.cashflow + prixRevente - (r.capRestant??0)
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
  const terrainPct = p.terrain ?? 15;
  const amort      = calcAmortComposants(p.prix, p.notaire, p.mobilier, p.travaux, terrainPct);
  const capital    = p.prix + p.travaux + p.prix*(p.notaire/100) - p.apport;
  const creditRows = amortCredit(capital, p.interet, p.dureeCredit);
  const PS_RATE    = 0.172;
  const data       = [];
  let deficitReel  = 0;
  for (let yr=1; yr<=10; yr++) {
    const fac      = Math.pow(1+(p.revalorisation/100), yr-1);
    const loyers   = p.loyer * 12 * fac * (1 - p.vacance/100);
    const charges  = p.charges * 12 + p.taxeFonciere + (p.cfe || 200);
    const ints     = creditRows[yr-1]?.interets ?? 0;
    // Micro-BIC : abattement 50% (71% si tourisme classé), IR+PS
    const abatt      = p.tourismeClass ? 0.71 : 0.50;
    const baseMicro  = loyers * (1 - abatt);
    const impotMicro = Math.round(Math.max(0, baseMicro) * (p.tmi/100 + PS_RATE));
    // Réel : déficit carry-forward, IR+PS
    const baseRaw    = loyers - charges - ints - amort.totalAnnuel;
    const baseApres  = baseRaw + deficitReel;
    let impotReel    = 0;
    if (baseApres <= 0) {
      deficitReel = Math.max(baseApres, -loyers * 10);
    } else {
      deficitReel = 0;
      impotReel = Math.round(baseApres * (p.tmi/100 + PS_RATE));
    }
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
  if (score >= 5) return { color:"#10B981", bg:"rgba(16,185,129,0.15)", border:"rgba(16,185,129,0.4)", label:"Excellent", emoji:"🟢" };
  if (score >= 3) return { color:"#F59E0B", bg:"rgba(245,158,11,0.12)", border:"rgba(245,158,11,0.4)", label:"Acceptable", emoji:"🟡" };
  return     { color:"#EF4444", bg:"rgba(239,68,68,0.15)", border:"rgba(239,68,68,0.4)", label:"Risqué",    emoji:"🔴" };
}

/* ════════════════════════════════════════
   COMPOSANTS UI
════════════════════════════════════════ */

function Tip({ text }) {
  return (
    <span className="tip-trigger ml-1 cursor-help" tabIndex={0}>
      <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center",
        width:16, height:16, borderRadius:"50%", background:"rgba(249,115,22,0.12)",
        color:"#F97316", fontSize:10, fontWeight:700, lineHeight:1, flexShrink:0 }}>ⓘ</span>
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

function SliderField({ label, value, onChange, min, max, step=1, format=fmt, help, color="#F97316" }) {
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
      <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 focus-within:border-orange-400 focus-within:bg-slate-900 transition-colors">
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
        className="w-full border border-slate-200 rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-orange-400 focus:bg-slate-900 transition-colors">
        {options.map(o => <option key={o.v ?? o} value={o.v ?? o}>{o.l ?? o}</option>)}
      </select>
    </div>
  );
}

function KPICard({ label, value, sub, color="#F97316", bg="rgba(124,58,237,0.12)", icon, help }) {
  return (
    <div className="rounded-2xl p-4 border" style={{ background:bg, borderColor:color+"33" }}>
      <div className="flex items-start justify-between mb-1">
        <p className="text-xs font-semibold text-slate-500 leading-tight flex items-center">
          {label}{help && <Tip text={help} />}
        </p>
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
   SCORE DE BANCABILITÉ
════════════════════════════════════════ */

function ScoreBancabilite({ ratioEndt, cashflowM, tri, apport, prix, rendBrut }) {
  let score = 0;
  const details = [];

  // 1. Taux d'endettement (25 pts)
  if (ratioEndt <= 28)      { score += 25; details.push({ label:"Taux endettement",  val:`${ratioEndt}%`,        ok:true,  note:"Excellent" }); }
  else if (ratioEndt <= 33) { score += 18; details.push({ label:"Taux endettement",  val:`${ratioEndt}%`,        ok:true,  note:"Bon" }); }
  else if (ratioEndt <= 35) { score += 10; details.push({ label:"Taux endettement",  val:`${ratioEndt}%`,        ok:null,  note:"Limite HCSF" }); }
  else                      { score +=  0; details.push({ label:"Taux endettement",  val:`${ratioEndt}%`,        ok:false, note:"Hors limite" }); }

  // 2. Cash-flow mensuel (25 pts)
  if (cashflowM >= 200)      { score += 25; details.push({ label:"Cash-flow mensuel", val:`+${cashflowM}€/mois`,  ok:true,  note:"Excellent" }); }
  else if (cashflowM >= 50)  { score += 20; details.push({ label:"Cash-flow mensuel", val:`+${cashflowM}€/mois`,  ok:true,  note:"Positif" }); }
  else if (cashflowM >= 0)   { score += 15; details.push({ label:"Cash-flow mensuel", val:`${cashflowM}€/mois`,   ok:true,  note:"Équilibré" }); }
  else if (cashflowM >= -100){ score +=  8; details.push({ label:"Cash-flow mensuel", val:`${cashflowM}€/mois`,   ok:null,  note:"Effort modéré" }); }
  else                       { score +=  0; details.push({ label:"Cash-flow mensuel", val:`${cashflowM}€/mois`,   ok:false, note:"Effort élevé" }); }

  // 3. Rendement brut (20 pts)
  if (rendBrut >= 7)      { score += 20; details.push({ label:"Rendement brut",   val:`${rendBrut}%`, ok:true,  note:"Très attractif" }); }
  else if (rendBrut >= 5.5){ score += 15; details.push({ label:"Rendement brut",   val:`${rendBrut}%`, ok:true,  note:"Attractif" }); }
  else if (rendBrut >= 4)  { score += 10; details.push({ label:"Rendement brut",   val:`${rendBrut}%`, ok:null,  note:"Acceptable" }); }
  else                     { score +=  3; details.push({ label:"Rendement brut",   val:`${rendBrut}%`, ok:false, note:"Faible" }); }

  // 4. Apport (20 pts)
  const apportPct = prix > 0 ? Math.round(apport / prix * 100) : 0;
  if (apportPct >= 20)      { score += 20; details.push({ label:"Apport personnel",  val:`${apportPct}%`, ok:true,  note:"Rassure la banque" }); }
  else if (apportPct >= 15) { score += 15; details.push({ label:"Apport personnel",  val:`${apportPct}%`, ok:true,  note:"Bon" }); }
  else if (apportPct >= 10) { score +=  8; details.push({ label:"Apport personnel",  val:`${apportPct}%`, ok:null,  note:"Minimum" }); }
  else                      { score +=  2; details.push({ label:"Apport personnel",  val:`${apportPct}%`, ok:false, note:"Insuffisant" }); }

  // 5. TRI (10 pts)
  if (tri >= 6)      { score += 10; details.push({ label:"TRI global", val:`${tri}%`, ok:true,  note:"Solide" }); }
  else if (tri >= 4) { score +=  7; details.push({ label:"TRI global", val:`${tri}%`, ok:null,  note:"Correct" }); }
  else               { score +=  2; details.push({ label:"TRI global", val:`${tri}%`, ok:false, note:"Faible" }); }

  const scoreColor = score >= 75 ? "#10B981" : score >= 55 ? "#F59E0B" : score >= 40 ? "#FB923C" : "#EF4444";
  const scoreLabel = score >= 75 ? "Très bancable" : score >= 55 ? "Bancable" : score >= 40 ? "Dossier fragile" : "Difficile à financer";
  const scoreBg    = score >= 75 ? "rgba(16,185,129,0.15)" : score >= 55 ? "rgba(245,158,11,0.12)" : score >= 40 ? "rgba(249,115,22,0.12)" : "rgba(239,68,68,0.15)";

  return (
    <div className="rounded-2xl border p-4" style={{ background:scoreBg, borderColor:scoreColor+"33" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏦</span>
          <div>
            <p className="text-sm font-bold text-slate-800">Score de bancabilité</p>
            <p className="text-[11px] text-slate-500">Estimation de l&apos;éligibilité au financement</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-extrabold leading-none" style={{ color:scoreColor }}>{score}</p>
          <p className="text-[10px] font-bold mt-0.5" style={{ color:scoreColor }}>/100 · {scoreLabel}</p>
        </div>
      </div>

      {/* Barre de progression */}
      <div className="h-2.5 bg-slate-100 rounded-full mb-3 overflow-hidden">
        <div className="h-2.5 rounded-full transition-all duration-700"
          style={{ width:`${score}%`, background:scoreColor }} />
      </div>

      {/* Détails des critères */}
      <div className="space-y-1.5">
        {details.map(d => (
          <div key={d.label} className="flex items-center justify-between">
            <span className="text-xs text-slate-600">{d.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">{d.val}</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                d.ok === true  ? "bg-green-100 text-green-700" :
                d.ok === false ? "bg-red-100 text-red-600" :
                                 "bg-amber-100 text-amber-700"
              }`}>{d.note}</span>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-slate-400 mt-3">
        {score >= 70
          ? "✅ Dossier solide — présentez ce projet à votre banque ou courtier."
          : score < 55
          ? "💡 Augmentez l'apport ou renégociez le prix pour renforcer votre dossier."
          : "⚠ Dossier passable — quelques ajustements amélioreront vos chances."}
      </p>
    </div>
  );
}

/* ════════════════════════════════════════
   GAIN VS LOCATION NUE
════════════════════════════════════════ */

function GainVsNue({ results }) {
  const lmnp = results?.[0]; // LMNP Réel
  const nue  = results?.[3]; // SCI IR ≈ location nue (revenus fonciers)
  if (!lmnp || !nue) return null;
  const impotNue10  = nue.rows.slice(0,10).reduce((s,r) => s + (r.impot||0), 0);
  const impotLmnp10 = lmnp.rows.slice(0,10).reduce((s,r) => s + (r.impot||0), 0);
  const gain10ans   = impotNue10 - impotLmnp10;
  if (gain10ans <= 500) return null;
  return (
    <div className="rounded-2xl p-4 border border-green-200"
      style={{ background:"rgba(249,115,22,0.06)" }}>
      <div className="flex items-center gap-3">
        <span className="text-3xl">🏆</span>
        <div>
          <p className="text-xs font-bold text-green-700 uppercase tracking-wide">LMNP Réel vs Location Nue</p>
          <p className="text-2xl font-extrabold text-green-600 leading-tight">{fmt(gain10ans)}</p>
          <p className="text-[11px] text-green-600">d&apos;économie fiscale cumulée sur 10 ans</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs text-green-500 font-medium">soit</p>
          <p className="text-base font-bold text-green-700">{fmt(Math.round(gain10ans/120))}/mois</p>
          <p className="text-[10px] text-green-500">en moyenne</p>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   LANDING PAGE
════════════════════════════════════════ */

function LandingPage({ onStart }) {
  const router = useRouter();
  return (
    <div className="min-h-screen flex flex-col" style={{ background:"#0C0C10" }}>
      {/* Hero */}
      <div style={{ background:"#131318" }}
        className="relative overflow-hidden">
        {/* Back to hub + Badge */}
        <div className="absolute top-4 left-4">
          <button onClick={() => router.push("/")}
            style={{ fontSize:11, fontWeight:700, background:"rgba(255,255,255,0.12)",
              color:"rgba(255,255,255,0.8)", border:"1px solid rgba(255,255,255,0.2)",
              padding:"5px 12px", borderRadius:20, cursor:"pointer" }}>
            ← Accueil
          </button>
        </div>
        <div className="absolute top-4 right-4">
          <span className="text-[10px] font-bold bg-green-400/20 border border-green-400/30 text-green-300 px-2.5 py-1 rounded-full">
            🟢 Mis à jour · Avril 2026
          </span>
        </div>
        <div className="max-w-2xl mx-auto px-5 pt-12 pb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🏢</span>
            <span className="text-white/60 text-sm font-semibold tracking-wide uppercase">Simulateur LMNP</span>
          </div>

          {/* Badges conformité */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-[10px] font-bold bg-green-400/20 border border-green-400/30 text-green-300 px-2.5 py-1 rounded-full">
              📋 Dossier bancaire inclus
            </span>
            <span className="text-[10px] font-bold bg-white/10 border border-white/20 text-white/70 px-2.5 py-1 rounded-full">
              ⚖️ Conforme CGI Art. 39 C
            </span>
            <span className="text-[10px] font-bold bg-white/10 border border-white/20 text-white/70 px-2.5 py-1 rounded-full">
              ✦ LF 2026
            </span>
          </div>

          <h1 className="text-white font-extrabold leading-tight mb-3"
            style={{ fontSize:"clamp(1.55rem, 6vw, 2.25rem)", letterSpacing:"-0.03em" }}>
            Devenez intouchable<br />fiscalement.
          </h1>
          <p className="text-orange-200 text-sm leading-relaxed mb-2" style={{ maxWidth:400 }}>
            Validez votre projet LMNP et économisez jusqu&apos;à{" "}
            <strong className="text-white">4 200 €/an</strong> d&apos;impôts.
          </p>
          <p className="text-orange-300 text-sm leading-relaxed mb-8" style={{ maxWidth:400 }}>
            Dossier bancaire généré en <strong className="text-white">3 minutes</strong>.
            Comparaison Micro-BIC vs Réel · Amortissements par composants · TRI.
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
                <span className="text-orange-200 text-[11px] leading-tight max-w-[120px]">{l}</span>
              </div>
            ))}
          </div>

          <button onClick={onStart}
            className="w-full py-4 rounded-2xl text-base font-extrabold text-white shadow-lg active:scale-95 transition-transform"
            style={{ background:"#F97316", boxShadow:"0 8px 32px rgba(249,115,22,0.45)" }}>
            Calculer ma rentabilité LMNP →
          </button>
          <p className="text-orange-300 text-[11px] mt-3 text-center">
            Gratuit · Sans inscription · Données 100 % locales
          </p>
        </div>

        {/* Wave */}
        <div style={{ height:32, background:"#0C0C10", borderRadius:"50% 50% 0 0 / 100% 100% 0 0", marginTop:-1 }} />
      </div>

      {/* Trust bar */}
      <div className="max-w-2xl mx-auto px-5 py-5">
        <p className="text-xs text-slate-400 text-center mb-4 font-medium uppercase tracking-wide">
          Conforme aux règles fiscales en vigueur
        </p>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {["✅ Amortissement par composants","✅ Règle HCSF 35%","✅ LF 2026 · Mis à jour Avril 2026","✅ 4 régimes comparés"].map(t => (
            <span key={t} className="text-xs text-slate-500 font-medium">{t}</span>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="max-w-2xl mx-auto px-5 py-6">
        <h2 className="text-center font-bold text-white mb-5 text-base">Comment ça fonctionne</h2>
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

      {/* Banner RP */}
      <div className="max-w-2xl mx-auto px-5 pb-24">
        <div onClick={() => router.push("/rp")}
          style={{ background:"#131318",
            borderRadius:16, padding:"16px 18px", cursor:"pointer",
            display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:24 }}>🏠</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:800, color:"white" }}>Primo-accédant ?</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.65)" }}>
              5 outils gratuits : PTZ, DPE, DVF, Louer vs Acheter, checklist visite
            </div>
          </div>
          <span style={{ color:"rgba(255,255,255,0.6)", fontSize:18 }}>→</span>
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-5 py-3 shadow-lg pb-safe">
        <button onClick={onStart}
          className="w-full max-w-2xl mx-auto block py-3.5 rounded-xl text-sm font-extrabold text-white"
          style={{ background:"linear-gradient(135deg, #F97316, #F97316)" }}>
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
    <div className="min-h-screen flex flex-col" style={{ background:"#0C0C10" }}>
      {/* Header */}
      <div style={{ background:"#131318" }} className="px-5 pt-5 pb-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">🏢</span>
              <span className="text-white font-bold text-sm">Simulateur LMNP</span>
            </div>
            <span className="text-orange-200 text-xs">{step + 1} / {QUIZ_QUESTIONS.length}</span>
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
                className="w-full flex items-center gap-4 bg-white border-2 border-slate-100 rounded-2xl p-4 text-left active:scale-[.98] transition-transform hover:border-orange-200 hover:bg-orange-50">
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
    <div className="rounded-2xl border border-amber-200 overflow-hidden" style={{ background:"rgba(245,158,11,0.08)" }}>
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
          <a href={`https://www.pretto.fr?utm_source=immoverdict&utm_medium=banner&utm_campaign=lmnp-taux&utm_content=taux-${taux}`}
            target="_blank" rel="noopener noreferrer"
            onClick={() => { try { window.gtag?.("event","clic_affiliation",{ partner:"Pretto", source:"banner", taux }); } catch(_){} }}
            className="flex items-center justify-center gap-1.5 bg-white border border-amber-200 rounded-xl py-2.5 text-xs font-bold text-amber-800 hover:bg-amber-50 transition-colors">
            <span>🏦</span> Pretto
            <span className="text-[9px] bg-amber-100 text-amber-600 px-1 rounded">Partenaire</span>
          </a>
          <a href={`https://www.meilleurtaux.com?utm_source=immoverdict&utm_medium=banner&utm_campaign=lmnp-taux&utm_content=taux-${taux}`}
            target="_blank" rel="noopener noreferrer"
            onClick={() => { try { window.gtag?.("event","clic_affiliation",{ partner:"MeilleurTaux", source:"banner", taux }); } catch(_){} }}
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
    <div className="rounded-2xl border-2 border-dashed border-orange-200 overflow-hidden bg-orange-50/20">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">🔄</span>
          <div>
            <p className="text-sm font-bold text-orange-300">Calculateur inversé</p>
            <p className="text-[10px] text-orange-400">Quel prix payer pour atteindre mon objectif ?</p>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-semibold text-slate-700">Cash-flow cible</label>
            <span className="text-sm font-bold text-orange-400">
              {target >= 0 ? "+" : ""}{target} €/mois
            </span>
          </div>
          <input type="range" min={-200} max={600} step={25} value={target}
            onChange={e => setTarget(+e.target.value)}
            style={{ background:`linear-gradient(to right, #F97316 ${Math.round(((target+200)/800)*100)}%, #E2E8F0 ${Math.round(((target+200)/800)*100)}%)` }}
          />
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-slate-400">-200 €</span>
            <span className="text-[10px] text-slate-400">+600 €</span>
          </div>
        </div>

        {result ? (
          <div className="space-y-2">
            <div className="bg-white rounded-xl border border-orange-100 p-3">
              <p className="text-[10px] text-slate-400 mb-0.5">Prix d&apos;achat maximum négociable</p>
              <p className="text-2xl font-extrabold text-orange-400">{fmt(result.prixMax)}</p>
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
    kpiColor: "#F97316",
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
   STRESS TEST
════════════════════════════════════════ */

function StressTest({ form, results }) {
  const normal = results?.[0];
  // Scénario stress : TF +15% + vacance 2 mois/an min
  const stressedForm = {
    ...form,
    taxeFonciere: Math.round(form.taxeFonciere * 1.15),
    vacance: Math.max(form.vacance, 16.7),
  };
  const stressed  = runCalc(stressedForm, "lmnp");
  const resists   = stressed.cashflowM >= -50;
  const cfColor   = (v) => v >= 0 ? "#F97316" : "#DC2626";

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="rounded-xl bg-green-50 border border-green-100 p-3 text-center">
          <p className="text-[10px] font-bold text-green-600 mb-1">📊 Scénario normal</p>
          <p className="text-xl font-extrabold" style={{ color: cfColor(normal?.cashflowM ?? 0) }}>
            {fmtK(normal?.cashflowM)}/mois
          </p>
          <p className="text-[10px] text-green-500 mt-0.5">TRI {normal?.tri}%</p>
        </div>
        <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-center">
          <p className="text-[10px] font-bold text-red-600 mb-1">🔴 Stress test</p>
          <p className="text-xl font-extrabold" style={{ color: cfColor(stressed.cashflowM) }}>
            {fmtK(stressed.cashflowM)}/mois
          </p>
          <p className="text-[10px] text-red-500 mt-0.5">TRI {stressed.tri}%</p>
        </div>
      </div>
      <div className={`rounded-xl p-3 text-center border ${
        resists ? "bg-green-50 border-green-100" : "bg-orange-50 border-orange-100"
      }`}>
        <p className={`text-xs font-semibold ${resists ? "text-green-700" : "text-orange-700"}`}>
          {resists
            ? "✅ Votre investissement résiste au stress test — vous pouvez négocier en confiance."
            : "⚠ Cash-flow dégradé en scénario stress — augmentez votre marge de sécurité ou renégociez le prix."}
        </p>
        <p className="text-[10px] text-slate-400 mt-1.5">Hypothèses : Taxe foncière +15% · Vacance 2 mois/an</p>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   ARGUMENTAIRE VENDEUR
════════════════════════════════════════ */

function ArgumentaireModal({ form, results, onClose }) {
  const r       = results?.[0];
  const rc      = reverseCalc(0, form);
  const [copied, setCopied] = useState(false);

  const prixMax = rc?.prixMax ?? form.prix;
  const ecart   = form.prix - prixMax;
  const pctBaisse = ecart > 0 ? ((ecart / form.prix) * 100).toFixed(1) : 0;

  const texte = `ARGUMENTAIRE DE NÉGOCIATION
Généré le ${new Date().toLocaleDateString("fr-FR")} · Simulateur LMNP

═══ IDENTIFICATION DU BIEN ═══
Type       : ${form.typeBien} · ${form.surface} m² · DPE ${form.dpe}
Prix affiché : ${fmt(form.prix)}
Loyer estimé : ${fmt(form.loyer)}/mois (${form.vacance}% de vacance prévu)

═══ RENTABILITÉ AU PRIX AFFICHÉ ═══
• TRI sur ${form.horizon} ans  : ${r?.tri ?? "—"}%${(r?.tri ?? 0) < 5 ? "  ⚠ sous le seuil recommandé de 5%" : "  ✅"}
• Cash-flow mensuel : ${fmtK(r?.cashflowM ?? 0)}${(r?.cashflowM ?? 0) < 0 ? " (effort financier)" : ""}
• Taux d'endettement : ${r?.ratioEndt ?? "—"}% / 35% max HCSF
• Rendement net     : ${r?.rendNet?.toFixed(2) ?? "—"}%
• Crédit            : ${fmt(r?.mensualite ?? 0)}/mois sur ${form.dureeCredit} ans à ${form.interet}%

═══ PRIX MAXIMUM JUSTIFIÉ ═══
${ecart > 0
  ? `Pour atteindre le seuil d'équilibre (0 €/mois de cash-flow) :
→ Prix maximum : ${fmt(prixMax)}
→ Négociation demandée : ${fmt(ecart)} (-${pctBaisse}%)

ARGUMENTS CHIFFRÉS :
1. Au prix actuel, l'effort mensuel est de ${fmtK(Math.abs(r?.cashflowM ?? 0))} pendant ${form.dureeCredit} ans.
   Soit un effort total de ${fmt(Math.abs(r?.cashflowM ?? 0) * form.dureeCredit * 12)}.
2. Les travaux estimés (${fmtK(form.travaux)}) pèsent sur la rentabilité nette.
3. Les frais de notaire à ${form.notaire}% représentent ${fmt(form.prix * form.notaire / 100)} à financer.
${form.dpe >= "E"
  ? `4. DPE ${form.dpe} : location interdite aux logements F/G à partir de 2025.
   Travaux de rénovation énergétique à prévoir avant mise en location.`
  : ""}`
  : `Le prix actuel de ${fmt(form.prix)} est cohérent avec un cash-flow de ${fmtK(r?.cashflowM ?? 0)}/mois.
Le bien est correctement valorisé au regard du marché locatif local.`}

═══ BASE LÉGALE ═══
• CGI Art. 39 C    — Règles d'amortissement LMNP
• CGI Art. 150 U   — Régime des plus-values immobilières
• HCSF Déc. 2021   — Taux d'endettement max 35%
• BOFiP BIC-AMT    — Amortissement par composants

Simulation : loyer ${fmt(form.loyer)}/mois · apport ${fmt(form.apport)} · crédit ${form.dureeCredit} ans`;

  const copy = () => {
    navigator.clipboard.writeText(texte).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {});
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background:"rgba(15,23,42,0.75)", backdropFilter:"blur(4px)" }}>
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[88vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="font-bold text-slate-800">📝 Argumentaire vendeur</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">Copier-coller pour votre négociation</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
        </div>
        {ecart > 0 && (
          <div className="px-5 py-3 bg-orange-50 border-b border-orange-100 shrink-0">
            <p className="text-xs font-bold text-orange-700">
              💡 Négociation suggérée : <span className="text-orange-800">{fmt(ecart)}</span> soit -{pctBaisse}% pour atteindre l&apos;équilibre
            </p>
          </div>
        )}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          <pre className="text-[11px] text-slate-600 font-mono leading-relaxed whitespace-pre-wrap bg-slate-50 border border-slate-100 rounded-xl p-4 select-all">
            {texte}
          </pre>
        </div>
        <div className="px-5 py-4 border-t border-slate-100 shrink-0">
          <button onClick={copy}
            className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-95"
            style={{ background: copied ? "#10B981" : "#F97316" }}>
            {copied ? "✅ Copié dans le presse-papier !" : "📋 Copier l'argumentaire"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   VEILLE FISCALE
════════════════════════════════════════ */

function VeilleFiscale() {
  const [email,   setEmail]   = useState("");
  const [done,    setDone]    = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      if (sb) {
        await sb.from("leads").upsert({
          email, nom: "Alerte Veille Fiscale",
          params: { source:"veille_fiscale" },
          created_at: new Date().toISOString(),
        });
      }
      setDone(true);
    } catch { setDone(true); }
    finally { setLoading(false); }
  };

  if (done) return (
    <div className="rounded-2xl bg-green-50 border border-green-100 p-4 text-center">
      <p className="text-sm font-bold text-green-700 mb-1">🔔 Alerte activée !</p>
      <p className="text-xs text-green-600">Vous serez notifié si la Loi de Finances modifie les règles LMNP.</p>
    </div>
  );

  return (
    <div className="rounded-2xl p-4" style={{ background:"#0F172A" }}>
      <div className="flex items-start gap-3 mb-3">
        <span className="text-xl mt-0.5">🔔</span>
        <div>
          <p className="text-sm font-bold text-white">Alerte Veille Fiscale LMNP</p>
          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
            Soyez alerté si la Loi de Finances modifie les amortissements, le plafond Micro-BIC ou les abattements LMNP.
          </p>
        </div>
      </div>
      <form onSubmit={submit} className="flex gap-2">
        <input type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="votre@email.fr" required
          className="flex-1 bg-slate-800 border border-slate-600 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-400 outline-none focus:border-orange-400 transition-colors" />
        <button type="submit" disabled={loading || !email}
          className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-orange-500 hover:bg-orange-500 transition-colors disabled:opacity-50 whitespace-nowrap">
          {loading ? "…" : "M'alerter"}
        </button>
      </form>
    </div>
  );
}

/* ════════════════════════════════════════
   WIDGET DVF (prix marché via API officielle)
════════════════════════════════════════ */
function DVFWidget({ adresse, prixSaisi, surface }) {
  const [dvf, setDvf]         = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const query = adresse?.trim();
  if (!query) return null;

  const prixM2Saisi = surface > 0 ? Math.round(prixSaisi / surface) : 0;
  const ecart = dvf?.medianPrixM2 ? Math.round(((prixM2Saisi - dvf.medianPrixM2) / dvf.medianPrixM2) * 100) : null;

  const check = async () => {
    setLoading(true);
    setError(null);
    setDvf(null);
    try {
      const res = await fetch(`/api/dvf?q=${encodeURIComponent(query)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erreur DVF");
      setDvf(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-2 rounded-xl border border-orange-100 bg-orange-50 p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-orange-400">📊 Vérifier le prix du marché (DVF)</p>
          <p className="text-[10px] text-orange-400 mt-0.5">Transactions réelles — Ministère de l&apos;Économie / data.gouv.fr</p>
        </div>
        <button onClick={check} disabled={loading}
          className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
          style={{ background: loading ? "#CBD5E1" : "#F97316", color: "white", border: "none", cursor: loading ? "not-allowed" : "pointer" }}>
          {loading ? "⏳ Chargement…" : "Comparer"}
        </button>
      </div>

      {error && (
        <p className="mt-2 text-[10px] text-red-600 bg-red-50 rounded-lg px-2 py-1.5">{error}</p>
      )}

      {dvf && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-orange-400 uppercase tracking-wide">{dvf.commune}</span>
            <span className="text-[9px] text-orange-400">· {dvf.nbTransactions} ventes · 2 dernières années</span>
          </div>

          {/* Comparaison prix */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label:"Q1 (bas)", val: dvf.q1, col:"#F97316" },
              { label:"Médiane", val: dvf.medianPrixM2, col:"#F97316" },
              { label:"Q3 (haut)", val: dvf.q3, col:"#DC2626" },
            ].map(({ label, val, col }) => (
              <div key={label} className="rounded-lg bg-white border border-orange-100 px-2 py-1.5 text-center">
                <p className="text-[9px] text-slate-500">{label}</p>
                <p className="text-sm font-bold" style={{ color: col }}>{val?.toLocaleString("fr-FR")} €/m²</p>
              </div>
            ))}
          </div>

          {/* Prix saisi vs marché */}
          {prixM2Saisi > 0 && ecart !== null && (
            <div className={`rounded-lg px-3 py-2 text-xs font-semibold ${
              Math.abs(ecart) <= 5 ? "bg-green-50 text-green-700 border border-green-200"
              : ecart > 5 ? "bg-amber-50 text-amber-700 border border-amber-200"
              : "bg-orange-50 text-orange-400 border border-orange-200"
            }`}>
              {ecart > 5
                ? `⚠️ Votre prix (${prixM2Saisi.toLocaleString("fr-FR")} €/m²) est ${ecart} % au-dessus de la médiane du marché. Marge de négociation possible.`
                : ecart < -5
                ? `✅ Votre prix (${prixM2Saisi.toLocaleString("fr-FR")} €/m²) est ${Math.abs(ecart)} % sous la médiane — bonne affaire potentielle.`
                : `✅ Votre prix (${prixM2Saisi.toLocaleString("fr-FR")} €/m²) est dans la fourchette du marché (±5 % de la médiane).`
              }
            </div>
          )}

          <p className="text-[9px] text-orange-400">Source : {dvf.source}</p>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════
   STEPS
════════════════════════════════════════ */

function PresetsBar({ onSelect }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">
        ⚡ Démarrer avec un profil type
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth:"none" }}>
        {PRESETS.map(p => (
          <button key={p.label} onClick={() => onSelect(p)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:border-orange-200 hover:bg-orange-50 active:scale-[.97] transition-all shadow-sm whitespace-nowrap">
            <span>{p.icon}</span>
            <span>{p.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Tableau durées d'amortissement ── */
function AmortDureesTable({ prix, terrain, travaux, mobilier }) {
  const [open, setOpen] = useState(false);
  const baseImmeuble = prix * (1 - terrain / 100);
  const composants = [
    { name:"Gros œuvre",   pct:50, duree:50, base:baseImmeuble },
    { name:"Toiture",      pct:10, duree:25, base:baseImmeuble },
    { name:"Façade",       pct:10, duree:25, base:baseImmeuble },
    { name:"Équipements",  pct:15, duree:15, base:baseImmeuble },
    { name:"Agencements",  pct:15, duree:10, base:baseImmeuble },
  ];
  const totalImmeubleAn = composants.reduce((s,c) => s + (c.base * c.pct/100 / c.duree), 0);
  const mobilierAn  = mobilier / 7;
  const travauxAn   = travaux  / 12;
  const totalAn     = totalImmeubleAn + mobilierAn + travauxAn;

  return (
    <div className="mt-2">
      <button onClick={() => setOpen(o=>!o)}
        className="w-full flex items-center justify-between text-left px-0 py-1.5">
        <span className="text-[11px] font-semibold text-orange-500 flex items-center gap-1">
          🏗️ Voir les durées d&apos;amortissement par composant
        </span>
        <span className="text-orange-400 text-[10px]">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="rounded-xl border border-orange-100 overflow-hidden mt-1">
          <div className="bg-orange-50 px-3 py-2">
            <p className="text-[10px] font-semibold text-orange-400">
              Déduction totale : <span className="text-orange-300 text-xs font-bold">{fmt(totalAn)}/an</span>
              <span className="text-orange-400 ml-2">· Conformément CGI Art. 39 C</span>
            </p>
          </div>
          <table className="w-full text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-slate-500">Composant</th>
                <th className="px-3 py-1.5 text-center text-[10px] font-semibold text-slate-500">Durée</th>
                <th className="px-3 py-1.5 text-right text-[10px] font-semibold text-slate-500">Annuité</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {composants.map(c => (
                <tr key={c.name} className="bg-white">
                  <td className="px-3 py-1.5 text-slate-600">
                    {c.name}
                    <span className="text-slate-400 ml-1">({c.pct}%)</span>
                  </td>
                  <td className="px-3 py-1.5 text-center text-slate-500">{c.duree} ans</td>
                  <td className="px-3 py-1.5 text-right font-semibold text-orange-400">
                    {fmt(c.base * c.pct/100 / c.duree)}
                  </td>
                </tr>
              ))}
              {mobilier > 0 && (
                <tr className="bg-amber-50">
                  <td className="px-3 py-1.5 text-slate-600">Mobilier</td>
                  <td className="px-3 py-1.5 text-center text-slate-500">7 ans</td>
                  <td className="px-3 py-1.5 text-right font-semibold text-amber-700">{fmt(mobilierAn)}</td>
                </tr>
              )}
              {travaux > 0 && (
                <tr className="bg-amber-50">
                  <td className="px-3 py-1.5 text-slate-600">Travaux</td>
                  <td className="px-3 py-1.5 text-center text-slate-500">12 ans</td>
                  <td className="px-3 py-1.5 text-right font-semibold text-amber-700">{fmt(travauxAn)}</td>
                </tr>
              )}
              <tr className="bg-orange-50 font-bold">
                <td className="px-3 py-2 text-orange-300">Total déductible</td>
                <td className="px-3 py-2 text-center text-orange-500">—</td>
                <td className="px-3 py-2 text-right text-orange-300">{fmt(totalAn)}<span className="text-orange-400 text-[10px] font-normal">/an</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StepProjet({ form, set }) {
  const applyPreset = (p) =>
    Object.entries(p)
      .filter(([k]) => k !== "label" && k !== "icon")
      .forEach(([k, v]) => set(k)(v));
  return (
    <div className="slide-up space-y-4">
      <PresetsBar onSelect={applyPreset} />
      <Card>
        <SectionTitle icon="🏠" title="Votre bien immobilier" sub="Définissez les caractéristiques du bien" />
        <SelectField label="Type de bien" value={form.typeBien} onChange={set("typeBien")}
          options={["Appartement","Maison","Studio","Local commercial"]} />
        <SliderField label="Surface" value={form.surface} onChange={set("surface")}
          min={9} max={200} step={1} format={n=>`${n} m²`} help="Surface habitable en m²" />
        <SliderField label="Nombre de pièces" value={form.nbPieces ?? 2} onChange={set("nbPieces")}
          min={1} max={10} step={1} format={n=>`${n} pièce${n>1?"s":""}`}
          help="Nombre de pièces principales (hors cuisine et salle de bain)." />
        <SelectField label="État général du bien" value={form.etatGeneral ?? "Bon"}
          onChange={set("etatGeneral")}
          options={[
            {v:"Excellent",   l:"Excellent — clé en main, refait à neuf"},
            {v:"Bon",         l:"Bon — entretenu, quelques rafraîchissements"},
            {v:"Moyen",       l:"Moyen — travaux de rafraîchissement nécessaires"},
            {v:"À rénover",   l:"À rénover — travaux importants prévus"},
          ]}
          help="L'état du bien influence la valorisation de la banque et la négociation du prix." />
        <SelectField label="DPE actuel" value={form.dpe} onChange={set("dpe")}
          options={["A","B","C","D","E","F","G"]}
          help={LEXIQUE["DPE"]} />
        {(form.dpe === "F" || form.dpe === "G") && (
          <div className="rounded-xl bg-red-50 border border-red-100 p-3 -mt-1">
            <p className="text-xs font-semibold text-red-700">⚠️ DPE {form.dpe} — Attention réglementation</p>
            <p className="text-[10px] text-red-600 mt-0.5">
              Les logements G sont interdits à la location depuis 2025, les F en 2028.
              Prévoyez un budget travaux de rénovation énergétique pour passer en D ou C.
            </p>
          </div>
        )}
        <InputField label="Quartier / Atouts de la zone" value={form.quartier ?? ""}
          onChange={set("quartier")}
          help="Ex : Centre-ville, proche transports, secteur recherché… Renforce le dossier bancaire." />
        <InputField label="Adresse (optionnel)" value={form.adresse} onChange={set("adresse")}
          help="Pour les données DVF de marché" />
        {/* Widget DVF inline */}
        <DVFWidget adresse={form.adresse} prixSaisi={form.prix} surface={form.surface} />
      </Card>

      <Card>
        <SectionTitle icon="🏠" title="Mode d'exploitation" sub="Stratégie locative — impacte la fiscalité et la rentabilité" />
        <SelectField label="Mode d'exploitation" value={form.modeExploitation ?? "LMNP meublé"}
          onChange={set("modeExploitation")}
          options={[
            {v:"LMNP meublé",  l:"LMNP meublé — Amortissements déductibles"},
            {v:"Location nue", l:"Location nue — Revenus fonciers"},
            {v:"Colocation",   l:"Colocation — Rendement optimisé"},
            {v:"Saisonnier",   l:"Saisonnier / Airbnb — Micro-BIC 71%"},
          ]}
          help="Le LMNP meublé au régime réel est presque toujours le plus avantageux fiscalement (amortissements par composants)." />
        {form.modeExploitation === "LMNP meublé" && (
          <div className="rounded-xl bg-orange-50 border border-orange-100 p-3 mt-1">
            <p className="text-[10px] text-orange-300 leading-relaxed">
              🥇 <strong>LMNP Réel recommandé :</strong> Vous pouvez déduire les amortissements par composants (CGI Art. 39 C)
              et générer un bouclier fiscal de 10–15 ans. La plus-value à la revente est taxée au régime des particuliers.
            </p>
          </div>
        )}
        {(form.modeExploitation === "Location nue") && (
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 mt-1">
            <p className="text-[10px] text-slate-600 leading-relaxed">
              📋 <strong>Location nue :</strong> Revenus fonciers imposés au barème + 17,2% PS. Aucun amortissement possible.
              Option intéressante si TMI ≤ 11% ou déficit foncier &gt; 10 700 €/an.
            </p>
          </div>
        )}
        <SliderField label="Assurance PNO (Propriétaire Non Occupant)" value={form.assurancePNO ?? 200}
          onChange={set("assurancePNO")} min={50} max={1000} step={25} format={fmt}
          help="Assurance obligatoire en copropriété. Comptez 150–300 €/an pour un appartement standard." color="#F59E0B" />
        <SliderField label="Frais de gestion locative" value={form.fraisGestion ?? 0}
          onChange={set("fraisGestion")} min={0} max={3000} step={50} format={fmt}
          help="Si vous confiez la gestion à une agence : généralement 6–8% des loyers encaissés. Zéro si gestion en direct." color="#F59E0B" />
        {form.objetTravaux !== undefined && (
          <InputField label="Nature des travaux (si applicable)" value={form.objetTravaux ?? ""}
            onChange={set("objetTravaux")}
            help="Ex : Rénovation énergétique (isolation, fenêtres), rafraîchissement (peinture, sol), cuisine équipée…" />
        )}
      </Card>

      <Card>
        <SectionTitle icon="💰" title="Prix & acquisition" sub="Coût total de l'opération" />
        <SliderField label="Prix d'achat" value={form.prix} onChange={set("prix")}
          min={50000} max={800000} step={5000} format={fmt}
          help="Prix FAI hors frais de notaire" />
        {/* Toggle Neuf / Ancien → pré-remplit le taux de notaire */}
        <div className="mb-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-slate-600">Type d&apos;acquisition</span>
            <div className="flex rounded-lg overflow-hidden border border-slate-200 text-xs font-semibold">
              {[["ancien","Ancien ~8%","#5B21B6","rgba(91,33,182,0.08)"],["neuf","Neuf ~2.5%","#0C0C10","rgba(6,95,70,0.08)"]].map(([val,label,col,bg])=>(
                <button key={val} type="button"
                  onClick={() => { set("typeAcquisition")(val); set("notaire")(val==="neuf" ? 2.5 : 8); }}
                  style={form.typeAcquisition===val ? {background:bg, color:col, borderBottom:`2px solid ${col}`} : {background:"#fff",color:"#94a3b8"}}
                  className="px-3 py-1.5 transition-all">
                  {label}
                </button>
              ))}
            </div>
            <span className="text-[10px] text-slate-400">
              {form.typeAcquisition==="neuf" ? "TVA 20% incluse, droits de mutation réduits" : "Droits de mutation 5,80% + émoluments"}
            </span>
          </div>
        </div>
        <SliderField label="Frais de notaire" value={form.notaire} onChange={set("notaire")}
          min={1} max={10} step={0.5} format={n=>`${n} %`}
          help={LEXIQUE["Frais de notaire"]} />
        <SliderField label="Travaux" value={form.travaux} onChange={set("travaux")}
          min={0} max={100000} step={1000} format={fmtK}
          help="Travaux de rénovation. Amortis sur 12 ans en LMNP Réel." />
        <SliderField label="Mobilier & équipements" value={form.mobilier} onChange={set("mobilier")}
          min={0} max={30000} step={500} format={fmtK}
          help={LEXIQUE["Amortissement"]} />

        <SliderField label="Part estimée du terrain" value={form.terrain ?? 15} onChange={set("terrain")}
          min={5} max={40} step={1} format={n=>`${n} %`}
          help="Le terrain est NON amortissable (art. 39 C CGI). En centre-ville : 20–35 %. En périphérie : 10–20 %. Par défaut : 15 %." />

        <div className="mt-4 rounded-xl bg-orange-50 border border-orange-100 p-3">
          <p className="text-xs font-semibold text-orange-400 mb-1">📊 Coût total de l&apos;opération</p>
          <p className="text-lg font-bold text-orange-300">
            {fmt(form.prix + form.prix*(form.notaire/100) + form.travaux + form.mobilier)}
          </p>
          <p className="text-[10px] text-orange-400 mt-0.5">
            Prix {fmt(form.prix)} + Notaire {fmt(form.prix*form.notaire/100)} + Travaux {fmtK(form.travaux)} + Mobilier {fmtK(form.mobilier)}
          </p>
          <p className="text-[10px] text-amber-600 mt-1">
            ⚠ Terrain non amortissable : {fmt(form.prix * (form.terrain ?? 15) / 100)} ({form.terrain ?? 15}%)
            · Base amortissable immeuble : {fmt(form.prix * (1 - (form.terrain ?? 15) / 100))}
          </p>
        </div>

        <AmortDureesTable prix={form.prix} terrain={form.terrain ?? 15} travaux={form.travaux} mobilier={form.mobilier} />

        {/* Checklist de visite */}
        <button onClick={() => downloadChecklist(form)}
          className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition-all active:scale-95 hover:opacity-90"
          style={{ background:"linear-gradient(135deg,#F97316,#F97316)" }}>
          📋 Télécharger ma checklist de visite
          <span className="text-orange-200 text-[10px] font-normal">6 sections · 40 points</span>
        </button>
      </Card>
    </div>
  );
}

function StepFinancement({ form, set }) {
  const capital = form.prix + form.travaux + form.prix*(form.notaire/100) - form.apport;
  const mens    = capital > 0 && form.interet > 0
    ? Math.round((capital * (form.interet/100/12)) / (1 - Math.pow(1+form.interet/100/12, -form.dureeCredit*12)))
    : 0;
  const totalMens  = mens + (+form.chargesCredit || 0);
  const ratioEndt  = (totalMens / (form.revenusMensuels || 1) * 100).toFixed(1);
  const ratioColor = +ratioEndt > 35 ? "#EF4444" : +ratioEndt > 30 ? "#F59E0B" : "#10B981";
  const rav        = Math.round((+form.revenusMensuels || 0) - totalMens);
  const ravColor   = rav >= 1500 ? "#10B981" : rav >= 1200 ? "#F59E0B" : "#EF4444";
  const ravLabel   = rav >= 1500 ? "Confortable ✅" : rav >= 1200 ? "Juste ⚠️" : "Serré 🔴";

  return (
    <div className="slide-up space-y-4">

      {/* ── Profil emprunteur (dossier bancaire) ── */}
      <Card>
        <SectionTitle icon="👤" title="Profil emprunteur" sub="Informations pour le dossier bancaire" />
        <SliderField label="Âge" value={form.age ?? 35} onChange={set("age")}
          min={18} max={75} step={1} format={n=>`${n} ans`}
          help="La banque vérifie que le crédit est soldé avant vos 75–80 ans." />
        <InputField label="Profession" value={form.profession ?? ""} onChange={set("profession")}
          help="Ex : Ingénieur, Cadre, Médecin, Artisan…" />
        <SelectField label="Type de contrat" value={form.typeContrat ?? "CDI"}
          onChange={set("typeContrat")}
          options={[
            {v:"CDI",           l:"CDI — Salarié"},
            {v:"Fonctionnaire",  l:"Fonctionnaire / Titulaire"},
            {v:"Indépendant",    l:"Indépendant / TNS"},
            {v:"Gérant",         l:"Gérant de société"},
            {v:"Retraité",       l:"Retraité"},
          ]}
          help="Les banques valorisent fortement le CDI et le statut fonctionnaire." />
        <SliderField label="Épargne résiduelle après projet" value={form.epargneResiduelle ?? 10000}
          onChange={set("epargneResiduelle")} min={0} max={200000} step={1000} format={fmt}
          help="Épargne disponible une fois l'apport versé. La banque exige en général 3–6 mois de mensualités en réserve." color="#10B981" />
        {(form.epargneResiduelle ?? 10000) < mens * 3 && mens > 0 && (
          <p className="text-[11px] text-amber-600 px-1">
            ⚠ L&apos;épargne résiduelle est inférieure à 3 mensualités ({fmt(mens * 3)}).
            Les banques peuvent demander un effort supplémentaire.
          </p>
        )}
      </Card>

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
            <span className="text-lg font-bold" style={{ color:"#F97316" }}>{fmt(mens)}/mois</span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-slate-500">
              Taux d&apos;endettement{(+form.chargesCredit||0)>0?" (crédits inclus)":""}
            </span>
            <span className="text-sm font-bold" style={{ color:ratioColor }}>{ratioEndt} %</span>
          </div>
          {(+form.chargesCredit||0)>0 && (
            <p className="text-[10px] text-slate-400 mt-0.5">
              Mensualité LMNP {fmt(mens)} + crédits existants {fmt(+form.chargesCredit)} = {fmt(totalMens)}/mois
            </p>
          )}
          {+ratioEndt > 35 && (
            <p className="text-[11px] mt-1.5" style={{ color:ratioColor }}>
              ⚠ Dépasse le seuil HCSF de 35 %. Augmentez l&apos;apport ou réduisez la durée.
            </p>
          )}
        </div>

        {/* Reste à Vivre */}
        <div className="rounded-xl p-3 border mt-2" style={{ background:ravColor+"11", borderColor:ravColor+"44" }}>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-semibold text-slate-700">Reste à vivre</p>
              <p className="text-[10px] text-slate-400">Revenus − total mensualités crédit</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold" style={{ color:ravColor }}>{fmt(rav)}/mois</p>
              <p className="text-[10px] font-semibold" style={{ color:ravColor }}>{ravLabel}</p>
            </div>
          </div>
          {rav < 1200 && (
            <p className="text-[11px] mt-1.5" style={{ color:ravColor }}>
              Un reste à vivre inférieur à 1 200 €/mois peut fragiliser votre dossier bancaire. Envisagez d&apos;augmenter votre apport.
            </p>
          )}
        </div>

        {/* Répartition budget mensuel */}
        {form.revenusMensuels > 0 && (
          <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100 p-3">
            <p className="text-xs font-semibold text-slate-600 mb-2">📊 Répartition de vos revenus mensuels</p>
            <div className="flex h-5 rounded-lg overflow-hidden w-full mb-2.5 bg-green-100">
              {mens > 0 && (
                <div style={{ width:`${Math.min(mens/form.revenusMensuels*100,100).toFixed(1)}%`, background:"#F97316", transition:"width .4s" }}
                  title={`Crédit LMNP : ${fmt(mens)}`} />
              )}
              {(+form.chargesCredit||0) > 0 && (
                <div style={{ width:`${Math.min((+form.chargesCredit)/form.revenusMensuels*100,100).toFixed(1)}%`, background:"#6366F1", transition:"width .4s" }}
                  title={`Autres crédits : ${fmt(form.chargesCredit)}`} />
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <div className="flex items-center gap-1.5 text-[10px]">
                <div className="w-2.5 h-2.5 rounded-sm bg-orange-600" />
                <span className="text-slate-500">Crédit LMNP — <strong>{fmt(mens)}</strong> ({(mens/form.revenusMensuels*100).toFixed(0)}%)</span>
              </div>
              {(+form.chargesCredit||0) > 0 && (
                <div className="flex items-center gap-1.5 text-[10px]">
                  <div className="w-2.5 h-2.5 rounded-sm bg-orange-500" />
                  <span className="text-slate-500">Autres crédits — <strong>{fmt(+form.chargesCredit)}</strong> ({((+form.chargesCredit)/form.revenusMensuels*100).toFixed(0)}%)</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-[10px]">
                <div className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
                <span className="text-slate-500">Reste à vivre — <strong>{fmt(Math.max(0,rav))}</strong> ({(Math.max(0,rav)/form.revenusMensuels*100).toFixed(0)}%)</span>
              </div>
            </div>
          </div>
        )}
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
        {/* Impact vacance en €/an visible */}
        {form.vacance > 0 && (
          <p className="text-[10px] text-amber-600 -mt-1 px-1">
            ↳ Manque à gagner : <strong>{Math.round(form.loyer * 12 * form.vacance / 100).toLocaleString("fr-FR")} €/an</strong>
            {" "}({Math.round(form.vacance / 100 * 365)} jours sans locataire)
          </p>
        )}
        <SliderField label="Revalorisation annuelle des loyers" value={form.revalorisation} onChange={set("revalorisation")}
          min={0} max={4} step={0.1} format={n=>`${n.toFixed(1)} %`}
          help="IRL (Indice de Référence des Loyers). Historiquement ~1,5 % / an." />

        <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
          <div>
            <p className="text-xs font-semibold text-slate-700">Meublé tourisme classé ?</p>
            <p className="text-[10px] text-slate-500">Abattement Micro-BIC 71 % (vs 50 % standard)</p>
          </div>
          <button
            onClick={() => set("tourismeClass")(!form.tourismeClass)}
            className="relative flex-shrink-0"
            style={{ width:44, height:24, borderRadius:12, background: form.tourismeClass ? "#F97316" : "#CBD5E1",
              transition:"background .2s", cursor:"pointer", border:"none" }}>
            <span style={{ position:"absolute", top:3, left: form.tourismeClass ? 23 : 3,
              width:18, height:18, borderRadius:9, background:"#fff",
              transition:"left .2s", boxShadow:"0 1px 3px rgba(0,0,0,.2)" }} />
          </button>
        </div>

        <SliderField label="CFE annuelle (Cotisation Foncière des Entreprises)" value={form.cfe} onChange={set("cfe")}
          min={0} max={1500} step={50} format={fmt}
          help="Taxe locale due par tout loueur meublé. Varie selon la commune (100–500 €/an en moyenne)." />

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-green-50 border border-green-100 p-3">
            <p className="text-[10px] text-green-600 font-semibold mb-0.5">Loyers nets / an</p>
            <p className="text-base font-bold text-green-700">{fmt(loyersNet)}</p>
          </div>
          <div className="rounded-xl bg-orange-50 border border-orange-100 p-3">
            <p className="text-[10px] text-orange-500 font-semibold mb-0.5">Rendement brut</p>
            <p className="text-base font-bold text-orange-400">{rendBrut} %</p>
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
          <Bar dataKey="Régime Réel" fill="#F97316" radius={[3,3,0,0]} />
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
        <span className="text-xs bg-orange-50 text-orange-400 font-bold px-2 py-0.5 rounded-full">{fmt(total)}/an</span>
      </div>
      <div className="space-y-2">
        {chartData.map(c => (
          <div key={c.name} className="flex items-center gap-2">
            <div className="w-24 text-[11px] text-slate-500 text-right shrink-0">{c.name}</div>
            <div className="flex-1 bg-slate-100 rounded-full h-2">
              <div className="h-2 rounded-full bg-orange-400"
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
            <stop offset="5%" stopColor="#F97316" stopOpacity={0.15}/>
            <stop offset="95%" stopColor="#F97316" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
        <XAxis dataKey="an" tick={{ fontSize:10, fill:"#94A3B8" }} />
        <YAxis tick={{ fontSize:10, fill:"#94A3B8" }} tickFormatter={v=>fmtK(v)} width={50} />
        <RTooltip formatter={(v,n) => [fmt(v), n]} contentStyle={{ borderRadius:8, border:"1px solid #E2E8F0", fontSize:11 }} />
        <ReferenceLine y={0} stroke="#E2E8F0" strokeWidth={1.5} />
        <Area type="monotone" dataKey="Cash-flow" stroke="#F97316" strokeWidth={2} fill="url(#cfGrad)" dot={{ r:3, fill:"#F97316" }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ── Graphique Bouclier Fiscal ── */
function BouclierFiscalChart({ rows }) {
  // Première année où l'impôt devient significatif (> 200 €)
  const finBouclierIdx = rows.findIndex(r => r.impot > 200);
  const finBouclier    = finBouclierIdx >= 0 ? rows[finBouclierIdx].an : null;
  const impotApres     = finBouclier ? rows.slice(finBouclierIdx).reduce((s,r) => s + r.impot, 0) : 0;

  const data = rows.map(r => ({
    an:               `A${r.an}`,
    "Bouclier actif": r.impot <= 200 ? Math.max(0, r.loyers - r.charges) : 0,
    "Impôt payé":     r.impot > 200 ? r.impot : 0,
  }));

  return (
    <div>
      {finBouclier ? (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 mb-3">
          <p className="text-xs font-bold text-amber-800">⏰ Fin du bouclier fiscal : Année {finBouclier}</p>
          <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
            À partir de l&apos;année {finBouclier}, les amortissements s&apos;épuisent et l&apos;impôt redevient exigible.
            Montant total sur la période restante : <strong>{fmt(impotApres)}</strong>.
            Anticipez une revente ou un refinancement avant cette date.
          </p>
        </div>
      ) : (
        <div className="rounded-xl bg-green-50 border border-green-100 p-3 mb-3">
          <p className="text-xs font-bold text-green-700">🛡️ Bouclier fiscal actif sur toute la période</p>
          <p className="text-[11px] text-green-600 mt-0.5">
            Vos amortissements couvrent l&apos;intégralité de votre horizon de détention. Impôt = 0 € chaque année.
          </p>
        </div>
      )}

      <ResponsiveContainer width="100%" height={190}>
        <BarChart data={data} margin={{ top:10, right:4, left:0, bottom:0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
          <XAxis dataKey="an" tick={{ fontSize:10, fill:"#94A3B8" }} />
          <YAxis tick={{ fontSize:10, fill:"#94A3B8" }} tickFormatter={v=>fmtK(v)} width={50} />
          <RTooltip
            formatter={(v,n) => [fmt(v), n]}
            contentStyle={{ borderRadius:8, border:"1px solid #E2E8F0", fontSize:11 }}
          />
          {finBouclier && (
            <ReferenceLine
              x={`A${finBouclier}`} stroke="#F59E0B" strokeWidth={2} strokeDasharray="5 3"
              label={{ value:"Fin bouclier", position:"top", fontSize:9, fill:"#D97706" }}
            />
          )}
          <Bar dataKey="Bouclier actif" fill="#10B981" radius={[3,3,0,0]} name="🛡 Bouclier actif" stackId="a" />
          <Bar dataKey="Impôt payé"     fill="#EF4444" radius={[3,3,0,0]} name="💸 Impôt payé"     stackId="a" />
        </BarChart>
      </ResponsiveContainer>

      <div className="flex items-center justify-center gap-4 mt-1.5">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-green-500" />
          <span className="text-[10px] text-slate-500">Bouclier fiscal actif (0 € d&apos;impôt)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-red-400" />
          <span className="text-[10px] text-slate-500">Impôt dû</span>
        </div>
      </div>
    </div>
  );
}

/* ── Projection patrimoniale ── */
function PatrimoineChart({ rows, form }) {
  const revalo = (form.revalorisation || 1.5) / 100;
  const data = rows.map(r => {
    const valeurBien    = Math.round(form.prix * Math.pow(1 + revalo, r.an));
    const detteRestante = Math.max(0, Math.round(r.capRestant || 0));
    const patrimoineNet = Math.max(0, valeurBien - detteRestante);
    return { an:`A${r.an}`, valeurBien, detteRestante, patrimoineNet };
  });

  const last       = data[data.length - 1] || {};
  const plusvalue  = (last.valeurBien || 0) - form.prix;
  const pvColor    = plusvalue >= 0 ? "#10B981" : "#EF4444";

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="rounded-xl bg-orange-50 border border-orange-100 p-3 text-center">
          <p className="text-[10px] text-orange-400 font-semibold mb-0.5">Valeur finale</p>
          <p className="text-sm font-bold text-orange-400">{fmtK(last.valeurBien)}</p>
          <p className="text-[9px] text-orange-400">À {form.horizon} ans</p>
        </div>
        <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-center">
          <p className="text-[10px] text-red-500 font-semibold mb-0.5">Dette restante</p>
          <p className="text-sm font-bold text-red-600">{fmtK(last.detteRestante)}</p>
          <p className="text-[9px] text-red-400">Capital dû</p>
        </div>
        <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-center">
          <p className="text-[10px] text-emerald-600 font-semibold mb-0.5">Patrimoine net</p>
          <p className="text-sm font-bold text-emerald-700">{fmtK(last.patrimoineNet)}</p>
          <p className="text-[9px]" style={{ color:pvColor }}>
            {plusvalue >= 0 ? "+" : ""}{fmtK(plusvalue)} plus-value
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top:10, right:4, left:0, bottom:0 }}>
          <defs>
            <linearGradient id="gradPatrimoine" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#10B981" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
          <XAxis dataKey="an" tick={{ fontSize:10, fill:"#94A3B8" }} interval={1} />
          <YAxis tick={{ fontSize:10, fill:"#94A3B8" }} tickFormatter={v=>fmtK(v)} width={52} />
          <RTooltip
            formatter={(v,n) => [fmt(v), n]}
            contentStyle={{ borderRadius:8, border:"1px solid #E2E8F0", fontSize:11 }}
          />
          <Area  type="monotone" dataKey="patrimoineNet" name="💚 Patrimoine net"
            stroke="#10B981" fill="url(#gradPatrimoine)" strokeWidth={2} />
          <Line  type="monotone" dataKey="valeurBien"    name="🏠 Valeur du bien"
            stroke="#F97316" strokeWidth={2} dot={false} strokeDasharray="5 3" />
          <Line  type="monotone" dataKey="detteRestante" name="🔴 Dette restante"
            stroke="#EF4444" strokeWidth={2} dot={false} strokeDasharray="3 2" />
        </AreaChart>
      </ResponsiveContainer>

      <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-emerald-500" />
          <span className="text-[10px] text-slate-500">Patrimoine net</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 border-t-2 border-dashed border-orange-500" />
          <span className="text-[10px] text-slate-500">Valeur du bien</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 border-t-2 border-dashed border-red-400" />
          <span className="text-[10px] text-slate-500">Dette restante</span>
        </div>
      </div>
    </div>
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
                  <td className="px-3 py-1.5 font-semibold text-orange-500">{fmtK(r.cumCashflow)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Références légales CGI ── */
const CGI_REFS = [
  {
    code: "CGI Art. 34",
    titre: "Bénéfices industriels et commerciaux (BIC)",
    resume: "Les revenus de la location meublée sont imposés dans la catégorie des BIC. Cet article fixe le champ d'application du régime BIC pour les loueurs en meublé (professionnels et non-professionnels).",
    lien: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006307555",
  },
  {
    code: "CGI Art. 39 C",
    titre: "Amortissements par composants — plafonnement LMNP",
    resume: "Autorise la déduction des amortissements en LMNP Réel, par composants (gros œuvre, toiture, façade, équipements, agencements). L'amortissement est plafonné : il ne peut pas créer de déficit BIC imputable sur le revenu global.",
    lien: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006307707",
  },
  {
    code: "CGI Art. 156",
    titre: "Déficit reportable — carry-forward 10 ans",
    resume: "Les déficits dégagés en LMNP (par les amortissements excédentaires) ne sont pas imputables sur le revenu global, mais sont reportables sur les bénéfices de même nature pendant 10 ans. Ce simulateur en tient compte annuellement.",
    lien: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000045789673",
  },
  {
    code: "CGI Art. 150 U",
    titre: "Plus-value immobilière des particuliers",
    resume: "Régit la taxation de la plus-value à la revente (LMNP relève du régime des particuliers). Abattement pour durée de détention : 6 % / an de 6 à 21 ans puis 4 % la 22e année → exonération IR à 22 ans. Exonération totale (PV + PS) à 30 ans.",
    lien: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006307925",
  },
  {
    code: "CGI Art. 238 bis K",
    titre: "SCI soumise à l'IS",
    resume: "Permet à une SCI d'opter pour l'impôt sur les sociétés. Les amortissements sont déductibles, mais la plus-value à la revente est taxée comme un bénéfice professionnel (pas d'exonération durée). Taux IS réduit 15 % jusqu'à 42 500 €, puis 25 %.",
    lien: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006302988",
  },
  {
    code: "Règle HCSF 2021",
    titre: "Taux d'endettement maximal — Recommandation HCSF",
    resume: "Le Haut Conseil de Stabilité Financière impose aux banques de respecter un taux d'endettement ≤ 35 % des revenus nets (incluant toutes les mensualités crédit). Le simulateur calcule et signale tout dépassement de ce seuil.",
    lien: "https://www.hcsf.fr/hcsf/recommandation-r-hcsf-2021-r-6/",
  },
];

/* ── Alerte LF 2026 — capture email ── */
function AlerteLF2026() {
  const [email,   setEmail]   = useState("");
  const [sent,    setSent]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [open,    setOpen]    = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      if (sb) {
        await sb.from("leads").insert({
          email,
          source: "alerte_fiscale_lf2026",
          created_at: new Date().toISOString(),
        });
      }
      setSent(true);
    } catch {}
    setLoading(false);
  };

  return (
    <div className="rounded-2xl border border-orange-200 overflow-hidden bg-orange-50">
      <button onClick={() => setOpen(o=>!o)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-orange-50/50 transition-colors">
        <div className="flex items-center gap-2.5">
          <span className="text-lg">🔔</span>
          <div>
            <p className="text-sm font-bold text-orange-200">Alerte fiscale LMNP 2026</p>
            <p className="text-[10px] text-orange-500">
              Soyez alerté des changements de la Loi de Finances · Gratuit
            </p>
          </div>
        </div>
        <span className="text-orange-400 text-sm">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="border-t border-orange-100 px-4 pb-4 pt-3">
          {sent ? (
            <div className="flex items-center gap-2 py-2">
              <span className="text-green-500 text-xl">✅</span>
              <p className="text-sm font-semibold text-green-700">
                Inscription confirmée ! Vous recevrez les alertes fiscales LMNP 2026.
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs text-orange-300 mb-3 leading-relaxed">
                La Loi de Finances 2026 peut modifier les règles d&apos;amortissement LMNP, les plafonds Micro-BIC
                ou les taux de prélèvements sociaux. Recevez une alerte dès qu&apos;un changement impacte vos calculs.
              </p>
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="votre@email.fr"
                  required
                  className="flex-1 text-sm px-3 py-2.5 rounded-xl border border-orange-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <button type="submit" disabled={loading}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 transition-colors disabled:opacity-60 whitespace-nowrap">
                  {loading ? "…" : "M'alerter →"}
                </button>
              </form>
              <p className="text-[9px] text-orange-400 mt-2">
                Désabonnement en 1 clic · Données stockées en France · Aucun spam
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Affiliation contextuelle ── */
function AffiliationContextuelle({ results, form }) {
  const best = results?.[0];
  const tri  = best?.tri ?? 0;
  const capital   = form.prix + form.travaux + form.prix*(form.notaire/100) - form.apport;
  const tm        = form.interet/100/12;
  const n         = form.dureeCredit * 12;
  const mens      = capital > 0 && tm > 0
    ? Math.round((capital * tm) / (1 - Math.pow(1+tm, -n))) : 0;

  const showCourtier  = tri >= 3;
  const showComptable = (form.travaux || 0) >= 15000;
  const triIsGreat    = tri >= 6;
  const economie04    = mens ? Math.round(mens * 0.04) : null;

  // Courtiers partenaires
  const COURTIERS = [
    {
      name: "Pretto",
      emoji: "🟣",
      tag: "100% digital",
      desc: "Simulation en 2 min, offre en 48h",
      badge: triIsGreat ? "Recommandé" : null,
      url: `https://www.pretto.fr?utm_source=immoverdict&utm_medium=affiliation&utm_content=tri-${tri}`,
      color: "#F97316",
    },
    {
      name: "MeilleurTaux",
      emoji: "🔵",
      tag: "Leader du marché",
      desc: "200+ banques comparées",
      badge: null,
      url: `https://www.meilleurtaux.com?utm_source=immoverdict&utm_medium=affiliation&utm_content=tri-${tri}`,
      color: "#F97316",
    },
    {
      name: "CAFPI",
      emoji: "🟢",
      tag: "Spécialiste investisseurs",
      desc: "Expertise locatif & LMNP",
      badge: "Expert LMNP",
      url: `https://www.cafpi.fr?utm_source=immoverdict&utm_medium=affiliation`,
      color: "#F97316",
    },
  ];

  if (!showCourtier && !showComptable) return null;

  return (
    <div className="space-y-3">

      {/* ── Bloc courtiers enrichi ── */}
      {showCourtier && (
        <div className="rounded-2xl overflow-hidden" style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(124,58,237,0.25)" }}>
          {/* Header contextuel */}
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{triIsGreat ? "🚀" : "⚡"}</span>
              <p className="text-sm font-bold" style={{ color:"rgba(248,250,252,0.95)" }}>
                {triIsGreat
                  ? `TRI ${tri}% — votre projet est finançable`
                  : `TRI ${tri}% — optimisez votre financement`}
              </p>
            </div>
            <p className="text-xs leading-relaxed" style={{ color:"rgba(248,250,252,0.55)" }}>
              {triIsGreat
                ? `Avec ${form.interet}%, un courtier peut vous faire économiser${economie04 ? ` ~${economie04} €/mois` : " sur votre mensualité"} et booster encore votre TRI.`
                : `Un courtier peut renégocier le taux, allonger la durée ou obtenir un différé pour améliorer votre cash-flow.`}
            </p>
          </div>

          {/* Grille 3 courtiers */}
          <div className="px-4 pb-4 space-y-2">
            {COURTIERS.map(c => (
              <a key={c.name}
                href={c.url}
                target="_blank" rel="noopener noreferrer"
                onClick={() => { try { window.gtag?.("event","clic_courtier",{ courtier:c.name, tri, prix:form.prix }); } catch(_){} }}
                className="flex items-center justify-between rounded-xl px-3 py-2.5 transition-all active:scale-98"
                style={{ background:"rgba(255,255,255,0.06)", border:`1px solid rgba(255,255,255,0.08)` }}>
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{c.emoji}</span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold" style={{ color:"rgba(248,250,252,0.9)" }}>{c.name}</span>
                      {c.badge && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background:`${c.color}25`, color:c.color }}>
                          {c.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px]" style={{ color:"rgba(248,250,252,0.4)" }}>{c.tag} · {c.desc}</p>
                  </div>
                </div>
                <span className="text-xs font-bold shrink-0" style={{ color:c.color }}>Comparer →</span>
              </a>
            ))}
          </div>

          <div className="px-4 pb-3">
            <p className="text-[9px] text-center" style={{ color:"rgba(248,250,252,0.25)" }}>
              Liens partenaires · Comparaison 100% gratuite · Sans engagement
            </p>
          </div>
        </div>
      )}

      {/* ── CTA Comptable — contextuel travaux ── */}
      {showComptable && (
        <div className="rounded-2xl p-4" style={{ background:"rgba(124,58,237,0.08)", border:"1px solid rgba(124,58,237,0.2)" }}>
          <div className="flex items-start gap-3">
            <span className="text-2xl">🧮</span>
            <div className="flex-1">
              <p className="text-sm font-bold mb-0.5" style={{ color:"rgba(248,250,252,0.95)" }}>
                {fmtK(form.travaux)} de travaux — maximisez vos amortissements
              </p>
              <p className="text-xs mb-3 leading-relaxed" style={{ color:"rgba(248,250,252,0.55)" }}>
                Avec ce volume, un expert-comptable LMNP peut optimiser la ventilation par composants et
                potentiellement <strong style={{ color:"#F97316" }}>augmenter vos déductions annuelles</strong>.
                Premier mois souvent offert.
              </p>
              <a href="https://www.compta-lmnp.fr?utm_source=immoverdict&utm_medium=cta-travaux"
                target="_blank" rel="noopener noreferrer"
                onClick={() => { try { window.gtag?.("event","clic_comptable",{ travaux:form.travaux }); } catch(_){} }}
                className="inline-flex items-center gap-1.5 text-white text-xs font-bold px-4 py-2 rounded-xl"
                style={{ background:"linear-gradient(135deg, #F97316, #F97316)" }}>
                🧾 Trouver un comptable LMNP →
              </a>
              <p className="text-[9px] mt-2" style={{ color:"rgba(248,250,252,0.25)" }}>Lien partenaire · Sans engagement</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReferencesLegales() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-slate-50 transition-colors">
        <div className="flex items-center gap-2">
          <span className="text-base">⚖️</span>
          <div>
            <p className="text-sm font-bold text-slate-800">Références légales &amp; fiscales</p>
            <p className="text-[10px] text-slate-400">CGI · HCSF · Base juridique des calculs</p>
          </div>
        </div>
        <span className="text-slate-400 text-sm">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="border-t border-slate-100 divide-y divide-slate-50">
          {CGI_REFS.map(ref => (
            <div key={ref.code} className="px-4 py-3">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <span className="inline-block bg-orange-50 text-orange-400 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                    {ref.code}
                  </span>
                  <p className="text-xs font-semibold text-slate-700">{ref.titre}</p>
                </div>
                <a href={ref.lien} target="_blank" rel="noopener noreferrer"
                  className="shrink-0 text-[10px] text-orange-400 hover:text-orange-400 underline">
                  Texte officiel →
                </a>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">{ref.resume}</p>
            </div>
          ))}
          <div className="px-4 py-3 bg-amber-50">
            <p className="text-[10px] text-amber-700 leading-relaxed">
              ⚠️ Ce simulateur applique les règles fiscales en vigueur à la date de publication (LF 2026).
              Les textes législatifs peuvent évoluer. Consultez un expert-comptable spécialisé LMNP pour votre situation personnelle.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Achat vs Épargne financière ── */
function AchatVsEpargneChart({ rows, form }) {
  const revalo  = (form.revalorisation || 1.5) / 100;
  const apport  = form.apport || 0;
  let breakEven = null;

  const data = rows.map(r => {
    const valeurBien     = Math.round(form.prix * Math.pow(1 + revalo, r.an));
    const patrimoineAchat = Math.max(0, valeurBien - Math.max(0, r.capRestant || 0)) + (r.cumCashflow || 0);
    const patrimoineEpargne = Math.round(apport * Math.pow(1.04, r.an));
    if (breakEven === null && patrimoineAchat > patrimoineEpargne) breakEven = r.an;
    return { an: `A${r.an}`, achat: patrimoineAchat, epargne: patrimoineEpargne };
  });

  return (
    <div>
      {breakEven ? (
        <div className="mb-3 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 flex items-center gap-2">
          <span className="text-base">🏆</span>
          <p className="text-xs font-semibold text-emerald-700">
            L'achat LMNP dépasse l'épargne à partir de <strong>l'an {breakEven}</strong>
          </p>
        </div>
      ) : (
        <div className="mb-3 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2">
          <p className="text-xs text-amber-700">L'achat ne dépasse pas l'épargne sur la période. Ajustez loyer ou apport.</p>
        </div>
      )}
      <ResponsiveContainer width="100%" height={210}>
        <LineChart data={data} margin={{ top:8, right:8, left:0, bottom:0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
          <XAxis dataKey="an" tick={{ fontSize:10 }} interval={Math.floor(rows.length/5)} />
          <YAxis tick={{ fontSize:10 }} width={58}
            tickFormatter={n => n>=1000?`${Math.round(n/1000)}k€`:fmt(n)} />
          <RTooltip formatter={(v,n) => [fmt(v), n==="achat"?"Patrimoine LMNP":"Épargne 4%/an"]}
            contentStyle={{ fontSize:11 }} />
          <Legend iconSize={10} wrapperStyle={{ fontSize:11 }}
            formatter={n => n==="achat"?"Patrimoine LMNP (bien − dette + CF)":"Apport placé à 4%/an"} />
          {breakEven && (
            <ReferenceLine x={`A${breakEven}`} stroke="#10B981" strokeDasharray="4 4"
              label={{ value:"Break-even", position:"insideTopLeft", fill:"#10B981", fontSize:10 }} />
          )}
          <Line type="monotone" dataKey="achat"   stroke="#F97316" strokeWidth={2.5} dot={false} />
          <Line type="monotone" dataKey="epargne" stroke="#F59E0B" strokeWidth={2}   dot={false} strokeDasharray="5 5" />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-[9px] text-slate-400 text-center mt-1">
        Hypothèses : revalorisation bien {form.revalorisation || 1.5}%/an · Épargne 4%/an net · Apport {fmt(apport)}
      </p>
    </div>
  );
}

/* ── Plus-value latente ── */
function PlusValueLatente({ form }) {
  // CGI Art. 150 U — abattements progressifs IR et PS
  const prixAchat  = form.prix + form.prix*(form.notaire/100) + form.travaux;
  const scenarios  = [5, 10, 15];

  const calcScenario = (an) => {
    const prixRevente = Math.round(prixAchat * Math.pow(1.02, an));
    const pvBrute     = Math.max(0, prixRevente - prixAchat);

    // Abattement IR (6%/an de la 6e à la 21e année, 4% en 22e)
    let abattIR = 0;
    for (let y=6; y<=Math.min(an,21); y++) abattIR += 6;
    if (an >= 22) abattIR += 4;
    abattIR = Math.min(abattIR, 100);

    // Abattement PS (1.65%/an 6–21, 1.60% en 22e, 9%/an 23–30)
    let abattPS = 0;
    for (let y=6; y<=Math.min(an,21); y++) abattPS += 1.65;
    if (an >= 22) abattPS += 1.60;
    for (let y=23; y<=Math.min(an,30); y++) abattPS += 9;
    abattPS = Math.min(abattPS, 100);

    const baseIR  = pvBrute * (1 - abattIR/100);
    const basePS  = pvBrute * (1 - abattPS/100);
    const impotIR = Math.round(baseIR * 0.19);
    const impotPS = Math.round(basePS * 0.172);
    const pvNette = pvBrute - impotIR - impotPS;
    return { an, prixRevente, pvBrute, abattIR: +abattIR.toFixed(1), abattPS: +abattPS.toFixed(1), impotIR, impotPS, pvNette };
  };

  const rows = scenarios.map(calcScenario);
  const colors = ["#F97316","#F97316","#10B981"];

  return (
    <div className="space-y-3">
      <p className="text-[10px] text-slate-400">Hypothèse : croissance du marché +2%/an · Prix de revient {fmt(prixAchat)} · Abattements CGI Art. 150 U</p>
      <div className="grid grid-cols-3 gap-2">
        {rows.map((r,i) => (
          <div key={r.an} className="rounded-xl border p-3 text-center"
            style={{ background:colors[i]+"11", borderColor:colors[i]+"33" }}>
            <p className="text-[10px] font-bold mb-1" style={{ color:colors[i] }}>An {r.an}</p>
            <p className="text-xs font-semibold text-slate-700">{fmt(r.prixRevente)}</p>
            <p className="text-[9px] text-slate-400 mb-1.5">Prix de revente</p>
            <div className="border-t pt-1.5 mt-1.5 space-y-0.5" style={{ borderColor:colors[i]+"22" }}>
              <p className="text-[9px] text-slate-500">PV brute <strong className="text-slate-700">{fmt(r.pvBrute)}</strong></p>
              <p className="text-[9px] text-slate-500">Abat. IR <strong>{r.abattIR}%</strong> · PS <strong>{r.abattPS}%</strong></p>
              <p className="text-[9px] text-slate-500">Impôt IR <strong>{fmt(r.impotIR)}</strong> + PS <strong>{fmt(r.impotPS)}</strong></p>
            </div>
            <div className="mt-2 rounded-lg py-1" style={{ background:colors[i], color:"white" }}>
              <p className="text-[9px] font-semibold">Net après impôt</p>
              <p className="text-sm font-bold">{fmt(r.pvNette)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Checklist de visite ── */
function downloadChecklist(form) {
  const adresse = form.adresse || "Bien immobilier";
  const dateStr = new Date().toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"});
  const section = (icon, title, items) => `
    <div class="section">
      <div class="section-title">${icon} ${title}</div>
      <table class="ct"><tbody>
        ${items.map(it => `<tr><td class="cb"><input type="checkbox" onclick="this.parentElement.parentElement.classList.toggle('done',this.checked)"></td><td class="ci">${it}</td></tr>`).join("")}
      </tbody></table>
    </div>`;
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<title>Checklist Visite LMNP — ${adresse}</title>
<style>
  *{box-sizing:border-box;} body{margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0F172A;}
  .wrap{max-width:640px;margin:0 auto;padding:20px;}
  .header{background:#131318;color:white;padding:28px 24px;border-radius:16px;margin-bottom:16px;}
  .header h1{margin:0 0 4px;font-size:20px;} .header p{margin:0;font-size:12px;color:rgba(255,255,255,.7);}
  .section{background:white;border-radius:12px;padding:20px;margin-bottom:14px;box-shadow:0 1px 3px rgba(0,0,0,.06);}
  .section-title{font-size:13px;font-weight:700;color:#0F172A;margin:0 0 12px;padding-bottom:8px;border-bottom:1px solid #F1F5F9;}
  .ct{width:100%;border-collapse:collapse;} .ct tr{border-bottom:1px solid #F8FAFC;}
  .ct tr.done .ci{text-decoration:line-through;color:#94A3B8;}
  .cb{width:28px;padding:7px 6px 7px 0;vertical-align:top;} .cb input{width:16px;height:16px;cursor:pointer;accent-color:#F97316;}
  .ci{font-size:12px;padding:7px 0;line-height:1.4;color:#334155;}
  .footer{text-align:center;font-size:10px;color:#94A3B8;padding:12px 0 4px;}
  @media print{body{background:white;} .header{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
</style></head><body>
<div class="wrap">
  <div class="header">
    <h1>🏠 Checklist de visite LMNP</h1>
    <p>${adresse} · ${dateStr}</p>
  </div>
  ${section("🏗️","Structure & Gros œuvre",[
    "Fissures sur les murs porteurs ou façade extérieure",
    "État de la toiture (tuiles, zinguerie, étanchéité)",
    "Présence d'humidité, traces de moisissures ou salpêtre",
    "État du plancher (souplesse, affaissement, craquements)",
    "Alignement des ouvertures (portes, fenêtres — signe de tassement)",
    "État des fondations (visible en cave/vide sanitaire)",
  ])}
  ${section("📋","Diagnostics DDT (obligatoires)",[
    "DPE fourni (classe énergie — impact location et valeur)",
    "Diagnostic amiante (si avant 1997)",
    "Diagnostic plomb (CREP — si avant 1949)",
    "État des risques naturels et technologiques (ERNT)",
    "Diagnostic électricité (si installation > 15 ans)",
    "Diagnostic gaz (si installation > 15 ans)",
    "Métrage Loi Carrez (surface privative certifiée)",
  ])}
  ${section("🏢","Copropriété (si applicable)",[
    "PV des 3 dernières AG (travaux votés ou à venir ?)",
    "Montant des charges de copropriété mensuelles",
    "Montant du fonds de travaux (Loi Alur : min 5%/an)",
    "Procédures judiciaires en cours contre la copro",
    "État de l'entretien des parties communes",
    "Règlement de copropriété (location meublée autorisée ?)",
  ])}
  ${section("🔧","Technique & Équipements",[
    "État de l'installation électrique (tableau, disjoncteurs)",
    "Pression et état de la plomberie (rouille, fuites)",
    "Chaudière ou système de chauffage (âge, entretien)",
    "Isolation thermique (combles, murs — impact DPE)",
    "Ventilation (VMC — présence et fonctionnement)",
    "Double vitrage (état des joints, condensation entre vitres)",
    "Internet haut débit disponible (fibre / ADSL)",
  ])}
  ${section("📁","Administratif & Juridique",[
    "Titre de propriété (vendeur propriétaire sans litige)",
    "Situation locative actuelle (locataire en place ? bail ?)",
    "Taxe foncière (montant annuel)",
    "Charges déductibles estimées (syndic, assurance PNO)",
    "Zonage PLU (possibilité de transformer ou agrandir)",
    "Servitudes éventuelles",
  ])}
  ${section("🛋️","LMNP spécifique — Location meublée",[
    "Surface suffisante (min 9 m² pour meublé décent)",
    "Liste mobilier obligatoire Décret 2015-981 (lit, table, rangements…)",
    "Cuisine équipée (réfrigérateur, plaques, vaisselle…)",
    "Loyer marché meublé vs nu (prime ~10-30% en meublé)",
    "Cible locataire (étudiant, professionnel, tourisme courte durée ?)",
    "Résidence services éligible CENSI-BOUVARD ? (9 ans engagement)",
    "Bail mobilité possible (1-10 mois, pratique pour étudiants)",
    "Comptable LMNP identifié (déclaration 2031 obligatoire au Réel)",
  ])}
  <div class="footer">Généré par immoverdict.com · ${dateStr} · Fourni à titre indicatif, consultez un expert avant achat</div>
</div></body></html>`;
  const blob = new Blob([html], { type:"text/html" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `checklist-visite-lmnp-${new Date().toISOString().slice(0,10)}.html`;
  a.click();
}

/* ════════════════════════════════════════
   VERDICT SCORE LMNP (0-100)
════════════════════════════════════════ */

function VerdictScore({ form, results }) {
  const best = results?.[0];
  if (!best) return null;

  const { tri, cashflowM, rendBrut, ratioEndt, rows } = best;

  // Durée du bouclier fiscal
  const finBouclierIdx = rows.findIndex(r => r.impot > 200);
  const bouclierAns    = finBouclierIdx >= 0 ? (rows[finBouclierIdx].an - 1) : form.horizon;

  let score = 0;
  const dims = [];

  // 1. Rendement brut (20 pts)
  const rendPts = rendBrut >= 7 ? 20 : rendBrut >= 5.5 ? 15 : rendBrut >= 4 ? 10 : 3;
  score += rendPts;
  dims.push({
    label: "Rendement brut",
    val: `${rendBrut}%`,
    pts: rendPts, max: 20,
    ok: rendBrut >= 5.5, warn: rendBrut >= 4 && rendBrut < 5.5,
    levier: rendBrut < 5.5 ? "Augmentez le loyer ou négociez le prix d'achat" : null,
  });

  // 2. TRI global (20 pts)
  const triPts = tri >= 8 ? 20 : tri >= 6 ? 16 : tri >= 4 ? 10 : 3;
  score += triPts;
  dims.push({
    label: "TRI global",
    val: `${tri}%`,
    pts: triPts, max: 20,
    ok: tri >= 6, warn: tri >= 4 && tri < 6,
    levier: tri < 6 ? "Allongez la durée de détention ou augmentez le loyer" : null,
  });

  // 3. Cash-flow mensuel (20 pts)
  const cfPts = cashflowM >= 200 ? 20 : cashflowM >= 50 ? 16 : cashflowM >= 0 ? 12 : cashflowM >= -100 ? 6 : 0;
  score += cfPts;
  dims.push({
    label: "Cash-flow mensuel",
    val: `${cashflowM >= 0 ? "+" : ""}${cashflowM}€/mois`,
    pts: cfPts, max: 20,
    ok: cashflowM >= 50, warn: cashflowM >= -100 && cashflowM < 50,
    levier: cashflowM < 0 ? "Augmentez l'apport ou négociez un meilleur taux" : null,
  });

  // 4. Protection fiscale — bouclier (20 pts)
  const bouclierPts = bouclierAns >= form.horizon ? 20 : bouclierAns >= 10 ? 15 : bouclierAns >= 5 ? 10 : 5;
  score += bouclierPts;
  dims.push({
    label: "Bouclier fiscal",
    val: bouclierAns >= form.horizon ? "Toute la période" : `${bouclierAns} ans`,
    pts: bouclierPts, max: 20,
    ok: bouclierAns >= form.horizon || bouclierAns >= 10,
    warn: bouclierAns >= 5 && bouclierAns < 10,
    levier: bouclierAns < form.horizon ? "Ajoutez mobilier ou travaux pour allonger la protection" : null,
  });

  // 5. DPE & risque locatif (10 pts)
  const dpe    = form.dpe ?? "C";
  const dpePts = ["A","B"].includes(dpe) ? 10 : ["C","D"].includes(dpe) ? 8 : dpe === "E" ? 5 : 0;
  score += dpePts;
  dims.push({
    label: "DPE & conformité",
    val: `DPE ${dpe}`,
    pts: dpePts, max: 10,
    ok: ["A","B","C"].includes(dpe), warn: dpe === "D" || dpe === "E",
    levier: ["E","F","G"].includes(dpe) ? "Travaux d'isolation indispensables avant location" : null,
  });

  // 6. Ratio d'endettement (10 pts)
  const endtPts = ratioEndt <= 28 ? 10 : ratioEndt <= 33 ? 7 : ratioEndt <= 35 ? 4 : 0;
  score += endtPts;
  dims.push({
    label: "Taux d'endettement",
    val: `${ratioEndt}%`,
    pts: endtPts, max: 10,
    ok: ratioEndt <= 33, warn: ratioEndt > 33 && ratioEndt <= 35,
    levier: ratioEndt > 35 ? "Augmentez l'apport ou réduisez la durée du crédit" : null,
  });

  const scoreColor = score >= 80 ? "#10B981" : score >= 65 ? "#F59E0B" : score >= 50 ? "#FB923C" : "#EF4444";
  const scoreBg    = score >= 80 ? "rgba(16,185,129,0.1)" : score >= 65 ? "rgba(245,158,11,0.08)" : score >= 50 ? "rgba(249,115,22,0.08)" : "rgba(239,68,68,0.1)";
  const scoreLabel = score >= 80 ? "Investissement solide" : score >= 65 ? "Bon investissement" : score >= 50 ? "À consolider" : "À optimiser";
  const scoreEmoji = score >= 80 ? "🏆" : score >= 65 ? "✅" : score >= 50 ? "⚠️" : "🔴";

  const leviers = dims.filter(d => d.levier).slice(0, 3);

  return (
    <div className="rounded-2xl border p-4" style={{ background: scoreBg, borderColor: scoreColor + "44" }}>
      {/* En-tête */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{scoreEmoji}</span>
          <div>
            <p className="text-sm font-bold text-slate-800">Verdict Score LMNP</p>
            <p className="text-[11px] text-slate-500">Qualité globale · 6 dimensions · 100 pts</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-4xl font-extrabold leading-none" style={{ color: scoreColor }}>{score}</p>
          <p className="text-[10px] font-bold mt-0.5" style={{ color: scoreColor }}>/100 · {scoreLabel}</p>
        </div>
      </div>

      {/* Barre globale */}
      <div className="h-2.5 bg-slate-100 rounded-full mb-4 overflow-hidden">
        <div className="h-2.5 rounded-full transition-all duration-700"
          style={{ width: `${score}%`, background: `linear-gradient(to right, ${scoreColor}99, ${scoreColor})` }} />
      </div>

      {/* Grille des 6 dimensions */}
      <div className="space-y-2 mb-4">
        {dims.map(d => (
          <div key={d.label} className="flex items-center gap-2">
            <div className="text-[10px] text-slate-500 shrink-0" style={{ width: 108 }}>{d.label}</div>
            <div className="flex-1 bg-white/70 rounded-full h-1.5 overflow-hidden">
              <div className="h-1.5 rounded-full transition-all duration-500"
                style={{
                  width: `${(d.pts / d.max) * 100}%`,
                  background: d.ok ? "#10B981" : d.warn ? "#F59E0B" : "#EF4444",
                }} />
            </div>
            <span className="text-[10px] font-semibold text-slate-700 shrink-0" style={{ minWidth: 72, textAlign:"right" }}>{d.val}</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
              d.ok ? "bg-green-100 text-green-700" : d.warn ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600"
            }`}>{d.pts}/{d.max}</span>
          </div>
        ))}
      </div>

      {/* Leviers d'amélioration */}
      {leviers.length > 0 && (
        <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.9)" }}>
          <p className="text-[10px] font-bold text-slate-600 mb-1.5">💡 Leviers pour améliorer le score</p>
          {leviers.map(l => (
            <p key={l.label} className="text-[10px] text-slate-600 flex items-start gap-1.5 mb-0.5 last:mb-0">
              <span className="text-amber-500 shrink-0 mt-0.5">→</span>
              <span><strong>{l.label} :</strong> {l.levier}</span>
            </p>
          ))}
        </div>
      )}

      {score >= 80 && (
        <p className="text-[10px] text-green-700 font-semibold mt-2.5 text-center">
          ✅ Projet de haute qualité — présentez-le à votre banque ou courtier en confiance.
        </p>
      )}
    </div>
  );
}

function StepResultats({ form, results, comparaison, amort, onLead, onArgumentaire }) {
  if (!results) return null;
  const best = results[0]; // LMNP Réel
  const micro = results[1]; // Micro-BIC
  const feux = feuxTricolores(best.tri, best.cashflowM, best.ratioEndt);
  const economieMicro = micro.rows[0]?.impot - best.rows[0]?.impot;

  return (
    <div className="slide-up space-y-4">
      {/* Verdict */}
      <FeuxBadge tri={best.tri} cashflowM={best.cashflowM} ratioEndt={best.ratioEndt} />

      {/* Verdict Score LMNP */}
      <VerdictScore form={form} results={results} />

      {/* Gain vs Location Nue */}
      <GainVsNue results={results} />

      {/* Score de bancabilité */}
      <ScoreBancabilite
        ratioEndt={best.ratioEndt} cashflowM={best.cashflowM} tri={best.tri}
        apport={form.apport} prix={form.prix} rendBrut={best.rendBrut}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <KPICard label="TRI sur la durée" value={`${best.tri} %`}
          sub="Taux de rendement interne" icon="📈"
          help={LEXIQUE["TRI"]}
          color={best.tri>=6?"#10B981":best.tri>=4?"#F59E0B":"#EF4444"}
          bg={best.tri>=6?"rgba(16,185,129,0.15)":best.tri>=4?"rgba(245,158,11,0.12)":"rgba(239,68,68,0.15)"} />
        <KPICard label="Cash-flow mensuel" value={fmtK(best.cashflowM)}
          sub="Après crédit, IR + prélèvements sociaux" icon="💸"
          help={LEXIQUE["Cash-flow"]}
          color={best.cashflowM>=0?"#10B981":"#EF4444"}
          bg={best.cashflowM>=0?"rgba(16,185,129,0.15)":"rgba(239,68,68,0.15)"} />
        <KPICard label="Rendement net" value={`${best.rendNet.toFixed(2)} %`}
          sub="(loyers − charges) / prix total achat" icon="🏠"
          help={LEXIQUE["Rendement net"]}
          color="#F97316" bg="rgba(124,58,237,0.12)" />
        <KPICard label="Taux d'endettement" value={`${best.ratioEndt} %`}
          sub={best.ratioEndt<=35?"✅ Règle HCSF OK":"⚠ Dépasse 35%"} icon="⚖️"
          help={LEXIQUE["Ratio d'endettement"]}
          color={best.ratioEndt<=35?"#10B981":"#EF4444"}
          bg={best.ratioEndt<=35?"rgba(16,185,129,0.15)":"rgba(239,68,68,0.15)"} />
      </div>

      {/* ─── Économie fiscale LMNP — l'argument n°1 ─── */}
      {(() => {
        const econIR    = Math.round(amort.totalAnnuel * (form.tmi / 100));
        const terrainEur = Math.round(form.prix * (form.terrain ?? 15) / 100);
        const baseAmort  = form.prix - terrainEur;
        const tmiLabel   = form.tmi === 0 ? "Non imposable" : `${form.tmi} %`;
        return (
          <div className="rounded-2xl overflow-hidden border border-emerald-200"
            style={{ background:"rgba(249,115,22,0.08)" }}>
            <div className="px-4 pt-4 pb-1 flex items-center gap-2">
              <span className="text-xl">🛡️</span>
              <div>
                <p className="text-sm font-bold text-emerald-800 flex items-center">
                  Bouclier fiscal LMNP — votre économie réelle
                  <Tip text={LEXIQUE["Bouclier fiscal"]} />
                </p>
                <p className="text-[10px] text-emerald-600">Calcul basé sur votre TMI {tmiLabel} · CGI Art. 39 C</p>
              </div>
            </div>
            <div className="px-4 py-3 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-white/70 border border-emerald-100 p-3 text-center">
                <p className="text-[9px] font-semibold text-emerald-600 uppercase tracking-wide mb-1">Amortissements / an</p>
                <p className="text-lg font-extrabold text-emerald-700">{fmt(amort.totalAnnuel)}</p>
                <p className="text-[9px] text-emerald-500 mt-0.5">déductibles du revenu imposable</p>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ background:"#F97316", color:"white" }}>
                <p className="text-[9px] font-semibold uppercase tracking-wide mb-1 opacity-80">Économie IR / an</p>
                <p className="text-lg font-extrabold">{fmt(econIR)}</p>
                <p className="text-[9px] mt-0.5 opacity-75">= amort. × TMI {form.tmi}%</p>
              </div>
              <div className="rounded-xl bg-white/70 border border-emerald-100 p-3 text-center">
                <p className="text-[9px] font-semibold text-emerald-600 uppercase tracking-wide mb-1">Économie sur {form.horizon} ans</p>
                <p className="text-lg font-extrabold text-emerald-700">{fmt(econIR * form.horizon)}</p>
                <p className="text-[9px] text-emerald-500 mt-0.5">économisés vs location nue</p>
              </div>
            </div>
            <div className="px-4 pb-3 flex flex-wrap gap-x-4 gap-y-1">
              <p className="text-[9px] text-emerald-600">
                🏗 Base amortissable immeuble : <strong>{fmt(baseAmort)}</strong>
                {" "}(terrain {form.terrain ?? 15}% = {fmt(terrainEur)} <strong>exclu</strong> · art. 39 C CGI ✅)
              </p>
              {form.tmi === 0 && (
                <p className="text-[9px] text-amber-600 font-semibold">⚠ TMI à 0 % : les amortissements ne génèrent pas d'économie IR immédiate mais restent déductibles.</p>
              )}
            </div>
          </div>
        );
      })()}

      {/* Micro-BIC vs Réel */}
      <Card>
        <SectionTitle icon="⚔️" title="Micro-BIC vs Régime Réel"
          sub="Comparaison fiscale sur 10 ans" />
        {form.loyer * 12 > 77700 && (
          <div className="mb-3 rounded-xl px-3 py-2 text-[11px] font-semibold"
            style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.25)", color:"#B91C1C" }}>
            ⛔ Vos loyers annuels ({fmt(form.loyer * 12)}) dépassent le plafond Micro-BIC de 77 700 €. Le régime Réel est obligatoire — la comparaison Micro-BIC est affichée à titre indicatif uniquement.
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-center">
            <p className="text-[10px] text-amber-600 font-semibold">Impôt Micro-BIC an 1</p>
            <p className="text-lg font-bold text-amber-700">{fmt(micro.rows[0]?.impot)}</p>
            <p className="text-[10px] text-amber-500">Abattement {form.tourismeClass ? "71" : "50"}%</p>
          </div>
          <div className="rounded-xl bg-orange-50 border border-orange-100 p-3 text-center">
            <p className="text-[10px] text-orange-500 font-semibold">Impôt Réel an 1</p>
            <p className="text-lg font-bold text-orange-400">{fmt(best.rows[0]?.impot)}</p>
            <p className="text-[10px] text-orange-400">Amortissements déduits</p>
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

      {/* Bouclier fiscal */}
      <Card>
        <SectionTitle icon="🛡️" title="Bouclier fiscal LMNP"
          sub="Années protégées par les amortissements — et quand l'impôt revient" />
        <BouclierFiscalChart rows={best.rows} />
      </Card>

      {/* Projection patrimoniale */}
      <Card>
        <SectionTitle icon="🏗️" title="Projection patrimoniale"
          sub={`Évolution de votre patrimoine sur ${form.horizon} ans`} />
        <PatrimoineChart rows={best.rows} form={form} />
      </Card>

      {/* Achat vs Épargne */}
      <Card>
        <SectionTitle icon="⚖️" title="Achat LMNP vs Épargne financière"
          sub="À quel moment l'immobilier surpasse le placement financier ?" />
        <AchatVsEpargneChart rows={best.rows} form={form} />
      </Card>

      {/* Plus-value latente */}
      <Card>
        <SectionTitle icon="📈" title="Simulation plus-value latente"
          sub="Revente à 5, 10 et 15 ans — abattements CGI Art. 150 U" />
        <PlusValueLatente form={form} />
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
            const labels  = ["LMNP Réel","Micro-BIC","SCI à l'IS","SCI à l'IR"];
            const icons   = ["🥇","🥈","🏅","🏅"];
            const helpMap = [LEXIQUE["LMNP Réel"], LEXIQUE["Micro-BIC"], LEXIQUE["SCI IS"], LEXIQUE["SCI IR"]];
            const isWin   = i===0;
            const isSciIS = r.type === "sciis";
            return (
              <div key={r.type} className={`rounded-xl p-3 border ${isWin?"bg-orange-50 border-orange-200":"bg-slate-50 border-slate-100"}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-800 flex items-center">
                      {icons[i]} <span className="ml-1">{labels[i]}</span>
                      <Tip text={helpMap[i]} />
                    </p>
                    <p className="text-[11px] text-slate-500">TRI {r.tri}% · CF {fmtK(r.cashflowM)}/mois</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color:r.cashflowM>=0?"#10B981":"#EF4444" }}>
                      {fmtK(r.cashflowM)}/mois
                    </p>
                    <p className="text-[10px] text-slate-400">Rdt net {r.rendNet.toFixed(2)}%</p>
                  </div>
                </div>
                {isSciIS && (
                  <p className="mt-1.5 text-[10px] rounded-lg px-2 py-1"
                    style={{ background:"rgba(245,158,11,0.1)", color:"#B45309" }}>
                    ⚠️ Cash perso après distribution = CF × 70 % (flat tax 30 % sur dividendes). Plus-value à la revente taxée à l'IS sans exonération durée.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Stress Test */}
      <Card>
        <SectionTitle icon="🧪" title="Mode Stress Test"
          sub="Scénario dégradé : TF +15% · Vacance 2 mois/an" />
        <StressTest form={form} results={results} />
      </Card>

      {/* Argumentaire vendeur */}
      <button onClick={onArgumentaire}
        className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 px-4 text-sm font-bold text-white transition-all active:scale-95"
        style={{ background:"#F97316" }}>
        📝 Générer l'argumentaire vendeur
        <span className="text-orange-300 text-xs font-normal">CGI Art. 39 C · Négociation bancaire</span>
      </button>

      {/* Veille fiscale */}
      <VeilleFiscale />

      {/* Social Proof */}
      <Card>
        <SocialProof />
      </Card>

      {/* CTA Lead Capture */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background:"#131318" }}>
        <div className="p-6 text-center">
          <p className="text-2xl mb-2">📄</p>
          <h3 className="text-white font-bold text-base mb-1">Rapport fiscal complet</h3>
          <p className="text-orange-200 text-xs mb-4">
            Tableau de projection 20 ans · Comparatif des 4 régimes · Analyse amortissements · Conseils personnalisés
          </p>
          <button onClick={onLead}
            className="w-full bg-white text-orange-300 font-bold py-3 px-6 rounded-xl text-sm hover:bg-orange-50 transition-colors">
            Générer mon rapport complet →
          </button>
          <p className="text-orange-300 text-[10px] mt-2">Gratuit · Reçu par email en quelques secondes</p>
        </div>
      </div>

      {/* CTAs affiliés contextuels */}
      <AffiliationContextuelle results={results} form={form} />

      {/* Alerte LF 2026 */}
      <AlerteLF2026 />

      {/* Références légales CGI */}
      <ReferencesLegales />

      {/* Trust footnotes + disclaimer légal */}
      <div className="text-[10px] text-slate-400 text-center space-y-1 px-2 pb-4">
        <p>⚖️ Calculs basés sur la doctrine fiscale LMNP · <strong>CGI Art. 39 C</strong> (amortissements) · <strong>CGI Art. 34</strong> (BIC)</p>
        <p>📋 <strong>LF 2026</strong> · Plafond Micro-BIC 77 700 € · Abattement 50% maintenu</p>
        <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-left text-[10px] text-slate-500">
          ⚠️ <strong>Avertissement :</strong> Les simulations ImmoVerdict sont fournies à titre purement indicatif et ne constituent pas un conseil fiscal, comptable, juridique ou financier. Elles ne sauraient se substituer à l'avis d'un expert-comptable, d'un notaire ou d'un conseiller en gestion de patrimoine. L'éditeur décline toute responsabilité quant aux décisions prises sur la base de ces estimations.{" "}
          <a href="/mentions-legales" className="underline">Mentions légales</a>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   LEAD CAPTURE MODAL
════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════════
   DOSSIER BANCAIRE PROFESSIONNEL — PDF A4
   Format : document Word/banque, sections numérotées, tableaux formels
══════════════════════════════════════════════════════════════════ */
function downloadReport(form, results, amort, nom) {
  const r0      = results?.[0];
  const fmt     = (n) => new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n??0);
  const dateStr = new Date().toLocaleDateString("fr-FR",{day:"2-digit",month:"long",year:"numeric"});
  const refNum  = `LMNP-${new Date().getFullYear()}-${String(Math.floor(Math.random()*9000)+1000)}`;


  // ── Calculs financiers
  const capital   = Math.max(0, form.prix + form.travaux + form.prix*(form.notaire/100) - form.apport);
  const tm        = (form.interet/100)/12;
  const nn        = form.dureeCredit * 12;
  const mens      = capital>0&&tm>0 ? Math.round((capital*tm)/(1-Math.pow(1+tm,-nn))) : 0;
  const assurCredit = form.assuranceCredit ?? Math.round(capital*0.003/12);
  const totalMens   = mens + (+form.chargesCredit||0) + assurCredit;
  const rav         = Math.round((+form.revenusMensuels||0) - totalMens);
  const pctApport   = Math.round(form.apport / Math.max(form.prix,1) * 100);
  const ratioEndt   = +(totalMens / Math.max(+form.revenusMensuels||1, 1) * 100).toFixed(1);

  // Revenus locatifs
  const assurancePNO     = form.assurancePNO ?? 200;
  const fraisGestion     = form.fraisGestion ?? 0;
  const chargesAnnuelles = (form.charges||0)*12 + (form.taxeFonciere||0) + assurancePNO + fraisGestion + (form.cfe||0);
  const loyerAnnuelBrut  = form.loyer * 12;
  const loyerAnnuelNet   = Math.round(loyerAnnuelBrut * (1-(form.vacance||0)/100));
  const revLocatifPris   = Math.round(loyerAnnuelNet/12*0.7);
  const ratioEndtDiff    = +(totalMens / Math.max((+form.revenusMensuels||0)+revLocatifPris,1)*100).toFixed(1);

  // Score bancabilité
  const rendBrut  = +(r0?.rendBrut||0);
  const epargne   = form.epargneResiduelle ?? 0;
  const scoreEndt = ratioEndt<=28?25:ratioEndt<=33?18:ratioEndt<=35?10:2;
  const scoreCF   = (r0?.cashflowM??-999)>=100?25:(r0?.cashflowM??-999)>=0?18:(r0?.cashflowM??-999)>=-200?10:2;
  const scoreRdt  = rendBrut>=7?20:rendBrut>=5?14:rendBrut>=3?8:2;
  const scoreAppt = pctApport>=20?20:pctApport>=15?15:pctApport>=10?10:3;
  const scoreTRI  = (r0?.tri??0)>=6?10:(r0?.tri??0)>=4?7:2;
  const scoreTot  = scoreEndt+scoreCF+scoreRdt+scoreAppt+scoreTRI;
  const scoreVerdict = scoreTot>=75?"FAVORABLE":scoreTot>=50?"RÉSERVÉ":"DÉFAVORABLE";
  const scoreClass   = scoreTot>=75?"#F97316":scoreTot>=50?"#92400E":"#991B1B";

  // Projection patrimoniale
  const revalo      = (form.revalorisation||1.5)/100;
  const lastRow     = r0?.rows?.[(form.horizon||20)-1];
  const valFinale   = Math.round(form.prix * Math.pow(1+revalo, form.horizon||20));
  const detteFinale = Math.max(0, Math.round(lastRow?.capRestant||0));
  const patriFinal  = Math.max(0, valFinale - detteFinale);

  // Identité
  const nomAffiche  = nom||"—";
  const profession  = form.profession||"—";
  const typeContrat = form.typeContrat||"CDI";
  const age         = form.age||"—";
  const quartier    = form.quartier||form.adresse||"—";
  const modeExploit = form.modeExploitation||"LMNP meublé";
  const objetTravaux= form.objetTravaux||"—";

  // Tableau d'amortissement
  const amortRows = (() => {
    if (capital<=0||tm<=0) return [];
    const jalons = [1,2,3,5,10,15,form.dureeCredit].filter((v,i,a)=>a.indexOf(v)===i&&v<=form.dureeCredit).sort((a,b)=>a-b);
    return jalons.map(annee => {
      const k = annee*12;
      const capRest  = Math.max(0,Math.round(capital*(Math.pow(1+tm,nn)-Math.pow(1+tm,k))/(Math.pow(1+tm,nn)-1)));
      const capAvant = annee===1?capital:Math.max(0,Math.round(capital*(Math.pow(1+tm,nn)-Math.pow(1+tm,(annee-1)*12))/(Math.pow(1+tm,nn)-1)));
      return {annee,mens,capRest,interetsAn:Math.round(mens*12-(capAvant-capRest)),amortAn:Math.round(capAvant-capRest)};
    });
  })();

  const TR = (label,val,hl=false) => `<tr${hl?" style='background:rgba(249,115,22,0.06);font-weight:700;'":" "}>
    <td style="padding:7px 12px;border:1px solid #CBD5E1;color:#475569;font-size:10pt;">${label}</td>
    <td style="padding:7px 12px;border:1px solid #CBD5E1;text-align:right;font-weight:${hl?"700":"500"};font-size:10pt;">${val}</td>
  </tr>`;

  const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8">
<title>Dossier de Financement Bancaire — ${refNum}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;font-size:11pt;color:#1a1a2e;background:white;line-height:1.55;}
.page{max-width:794px;margin:0 auto;padding:14mm 18mm;background:white;}
h1{font-size:18pt;font-weight:700;color:#F97316;}
.sec{background:linear-gradient(135deg,#F97316,#F97316);color:white;padding:8px 14px;font-size:9.5pt;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin:20px 0 12px;border-radius:2px;}
.subsec{font-size:11pt;font-weight:700;color:#F97316;border-bottom:1.5px solid #F97316;padding-bottom:3px;margin:16px 0 10px;}
table{width:100%;border-collapse:collapse;margin:8px 0;}
th{background:rgba(249,115,22,0.06);color:#F97316;font-weight:700;padding:7px 12px;text-align:left;border:1px solid rgba(249,115,22,0.2);font-size:10pt;}
th.r{text-align:right;}
td{padding:7px 12px;border:1px solid #CBD5E1;font-size:10pt;vertical-align:middle;}
td.r{text-align:right;}
td.b{font-weight:700;}
tr.alt td{background:#F8FAFC;}
tr.total td{background:rgba(249,115,22,0.06);font-weight:700;}
.ig{display:grid;grid-template-columns:1fr 1fr;border:1px solid rgba(249,115,22,0.2);margin:10px 0;}
.ic{padding:8px 12px;border-bottom:1px solid rgba(249,115,22,0.2);border-right:1px solid rgba(249,115,22,0.2);}
.ic:nth-child(even){border-right:none;}
.ic-l{font-size:9pt;color:#6D28D9;margin-bottom:2px;}
.ic-v{font-size:11pt;font-weight:600;color:#1a1a2e;}
.kpi-row{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid rgba(249,115,22,0.2);margin:12px 0;}
.kpi-cell{padding:12px;border-right:1px solid rgba(249,115,22,0.2);text-align:center;}
.kpi-cell:last-child{border-right:none;}
.kpi-l{font-size:8.5pt;color:#6D28D9;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;}
.kpi-v{font-size:16pt;font-weight:700;color:#F97316;line-height:1;}
.kpi-s{font-size:9pt;color:#94A3B8;margin-top:3px;}
.score-box{border:2px solid #F97316;padding:14px 18px;margin:12px 0;display:flex;align-items:center;gap:20px;background:#FAFAFF;}
.score-num{font-size:36pt;font-weight:700;line-height:1;}
.score-bar-bg{height:10px;background:#E2E8F0;border-radius:2px;flex:1;}
.score-bar-fill{height:10px;border-radius:2px;}
.score-item{display:flex;align-items:center;gap:8px;margin-bottom:7px;font-size:10pt;}
.reco{border-left:4px solid #F97316;padding:16px 20px;margin:14px 0;background:rgba(249,115,22,0.06);}
.reco-title{font-size:11pt;font-weight:700;color:#F97316;margin-bottom:8px;text-transform:uppercase;letter-spacing:.04em;}
.hl{background:rgba(249,115,22,0.06);border-left:3px solid #F97316;padding:10px 14px;font-size:10.5pt;margin:10px 0;}
.confidential{display:inline-block;border:1px solid rgba(249,115,22,0.2);color:#F97316;font-size:8pt;font-weight:700;padding:2px 8px;letter-spacing:.1em;text-transform:uppercase;background:rgba(249,115,22,0.06);}
.doc-footer{border-top:1.5px solid rgba(249,115,22,0.2);padding-top:8px;margin-top:28px;font-size:8pt;color:#94A3B8;display:flex;justify-content:space-between;}
.pb{page-break-before:always;}
p{margin-bottom:8px;font-size:10.5pt;}
@media print{body{background:white;}.page{padding:8mm 10mm;max-width:100%;}@page{size:A4;margin:8mm 10mm;}.no-print{display:none!important;}}
</style></head>
<body><div class="page">

<!-- EN-TÊTE -->
<div style="background:#131318;border-radius:4px;padding:18px 22px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:flex-start;">
  <div>
    <div style="font-size:7pt;letter-spacing:.18em;color:#F97316;text-transform:uppercase;margin-bottom:6px;">Généré par</div>
    <div style="font-size:20pt;font-weight:800;background:linear-gradient(90deg,#F97316,#FB923C);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;letter-spacing:-.02em;line-height:1;margin-bottom:6px;">ImmoVerdict</div>
    <div style="font-size:11pt;font-weight:700;color:white;margin-bottom:3px;">DOSSIER DE DEMANDE DE FINANCEMENT BANCAIRE</div>
    <div style="font-size:9pt;color:rgba(255,255,255,.55);">Investissement Locatif Meublé — Régime LMNP · Loi de Finances ${new Date().getFullYear()} · CGI Art. 39&nbsp;C</div>
  </div>
  <div style="text-align:right;margin-top:4px;">
    <div class="confidential">Document confidentiel</div>
    <div style="font-size:9pt;color:rgba(255,255,255,.6);margin-top:8px;">Réf. : <strong style="color:white;">${refNum}</strong></div>
    <div style="font-size:9pt;color:rgba(255,255,255,.6);margin-top:3px;">Établi le ${dateStr}</div>
    <div style="font-size:9pt;color:rgba(255,255,255,.6);margin-top:3px;">immoverdict.com</div>
  </div>
</div>

<!-- I. IDENTIFICATION -->
<div class="sec">I. Identification du dossier et de l'emprunteur</div>
<div class="ig">
  ${[
    ["Emprunteur",nomAffiche],
    ["À l'attention de","Établissement bancaire / Courtier en financement"],
    ["Profession",`${profession} — ${typeContrat}`],
    ["Âge",age!=="—"?`${age} ans`:"—"],
    ["Revenus professionnels nets mensuels",`${fmt(form.revenusMensuels)}`],
    ["Épargne résiduelle après opération",`${fmt(epargne)}`],
    ["Localisation du bien",quartier],
    ["Mode d'exploitation envisagé",modeExploit],
  ].map(([l,v])=>`<div class="ic"><div class="ic-l">${l}</div><div class="ic-v">${v}</div></div>`).join("")}
</div>

<!-- II. PROJET IMMOBILIER -->
<div class="sec">II. Présentation du projet immobilier</div>
<div class="subsec">A. Caractéristiques du bien</div>
<div class="ig">
  ${[
    ["Type de bien",`${form.typeBien||"Appartement"} — ${form.surface||"—"} m² — ${form.nbPieces||2} pièce(s)`],
    ["Localisation",quartier],
    ["Diagnostic de performance énergétique (DPE)",`Classe ${form.dpe||"C"}`],
    ["État général du bien",form.etatGeneral||"Bon état"],
    ["Nature des travaux prévus",objetTravaux!=="—"?objetTravaux:"Aucun / Déjà réalisés"],
    ["Destination du bien","Location meublée (régime LMNP)"],
  ].map(([l,v])=>`<div class="ic"><div class="ic-l">${l}</div><div class="ic-v">${v}</div></div>`).join("")}
</div>

<div class="subsec">B. Plan de financement de l'opération</div>
<table>
  <tr><th>Poste</th><th class="r">Montant</th></tr>
  ${TR("Prix d'acquisition",fmt(form.prix))}
  ${TR("Frais d'acquisition (notaire)",`${fmt(form.prix*form.notaire/100)} (${form.notaire}% du prix)`)}
  ${TR("Travaux de rénovation / d'aménagement",fmt(form.travaux))}
  ${TR("Mobilier et équipements",fmt(form.mobilier))}
  ${TR("<strong>Coût total de l'opération</strong>",`<strong>${fmt(form.prix+form.travaux+form.mobilier+form.prix*form.notaire/100)}</strong>`,true)}
  ${TR("Apport personnel",`${fmt(form.apport)} (${pctApport}% du prix d'acquisition)`)}
  ${TR("<strong>Capital à emprunter</strong>",`<strong>${fmt(capital)}</strong>`,true)}
</table>
<div class="hl">
  <strong>Apport personnel :</strong> ${fmt(form.apport)}, représentant <strong>${pctApport}%</strong> du prix d'acquisition.
  ${pctApport>=20?" L'apport couvre intégralement les frais annexes — position très favorable auprès des établissements prêteurs."
  :pctApport>=10?" L'apport couvre les frais de notaire — position acceptable pour un investissement locatif meublé."
  :" L'apport est en deçà des standards bancaires habituels (10–20%). Un effort complémentaire est recommandé."}
</div>

<!-- III. FINANCEMENT ET CAPACITÉ DE REMBOURSEMENT -->
<div class="sec">III. Conditions de crédit et capacité de remboursement</div>
<div class="subsec">A. Conditions du prêt sollicité</div>
<table>
  <tr><th>Paramètre</th><th class="r">Valeur</th></tr>
  ${TR("Capital emprunté",fmt(capital))}
  ${TR("Taux d'intérêt nominal annuel",`${form.interet}% (taux fixe)`)}
  ${TR("Durée d'amortissement",`${form.dureeCredit} ans (${form.dureeCredit*12} mensualités)`)}
  ${TR("Mensualité hors assurance emprunteur",fmt(mens))}
  ${TR("Assurance emprunteur estimée",fmt(assurCredit))}
  ${TR("<strong>Charge mensuelle crédit (tout compris)</strong>",`<strong>${fmt(totalMens)}</strong>`,true)}
  ${TR("<strong>Coût total du crédit (intérêts sur la durée)</strong>",`<strong>${fmt(Math.round(mens*form.dureeCredit*12-capital))}</strong>`,true)}
</table>

<div class="subsec">B. Analyse de la capacité de remboursement</div>
<table>
  <tr><th>Indicateur réglementaire</th><th class="r">Valeur calculée</th><th class="r">Norme HCSF</th><th class="r">Statut</th></tr>
  <tr>
    <td>Taux d'endettement global (brut)</td>
    <td class="r b">${ratioEndt}%</td>
    <td class="r">≤ 35%</td>
    <td class="r" style="color:${ratioEndt<=35?"#F97316":"#DC2626"};font-weight:700;">${ratioEndt<=35?"CONFORME":"DÉPASSÉ"}</td>
  </tr>
  <tr class="alt">
    <td>Taux d'endettement différentiel (70% loyers déduits)</td>
    <td class="r b">${ratioEndtDiff}%</td>
    <td class="r">≤ 35%</td>
    <td class="r" style="color:${ratioEndtDiff<=35?"#F97316":"#DC2626"};font-weight:700;">${ratioEndtDiff<=35?"CONFORME":"À OPTIMISER"}</td>
  </tr>
  <tr>
    <td>Reste à vivre mensuel (après charge crédit)</td>
    <td class="r b">${fmt(rav)}</td>
    <td class="r">≥ 1 200 €</td>
    <td class="r" style="color:${rav>=1200?"#F97316":"#DC2626"};font-weight:700;">${rav>=1500?"CONFORTABLE":rav>=1200?"ACCEPTABLE":"INSUFFISANT"}</td>
  </tr>
  <tr class="alt">
    <td>Épargne de précaution post-opération</td>
    <td class="r b">${fmt(epargne)}</td>
    <td class="r">≥ ${fmt(mens*3)} (3 mens.)</td>
    <td class="r" style="color:${epargne>=mens*3?"#F97316":"#D97706"};font-weight:700;">${epargne>=mens*3?"SUFFISANTE":"À RENFORCER"}</td>
  </tr>
</table>

${amortRows.length?`
<div class="subsec">C. Tableau d'amortissement prévisionnel (jalons)</div>
<table>
  <tr>
    <th>Année</th>
    <th class="r">Mensualité</th>
    <th class="r">Intérêts payés (année)</th>
    <th class="r">Capital remboursé (année)</th>
    <th class="r">Capital restant dû</th>
    <th class="r">% remboursé</th>
  </tr>
  ${amortRows.map((r,i)=>`<tr${i%2===1?' class="alt"':""}>
    <td class="b" style="color:#F97316;">Année ${r.annee}</td>
    <td class="r">${fmt(r.mens)}</td>
    <td class="r" style="color:#92400E;">${fmt(r.interetsAn)}</td>
    <td class="r" style="color:#0C0C10;">${fmt(r.amortAn)}</td>
    <td class="r b">${fmt(r.capRest)}</td>
    <td class="r" style="color:#F97316;">${Math.round((1-r.capRest/capital)*100)}%</td>
  </tr>`).join("")}
  <tr class="total"><td colspan="5"><strong>Total intérêts sur ${form.dureeCredit} ans</strong></td><td class="r b">${fmt(Math.round(mens*form.dureeCredit*12-capital))}</td></tr>
</table>`:""}

<!-- IV. EXPLOITATION LOCATIVE -->
<div class="sec pb">IV. Analyse de l'exploitation locative</div>
<div class="subsec">A. Compte de résultat prévisionnel (année 1)</div>
<table>
  <tr><th>Poste</th><th class="r">Montant annuel</th><th class="r">Mensuel</th></tr>
  ${TR("Loyer mensuel brut hors charges",`${fmt(form.loyer*12)}`,false)}
  ${TR(`Vacance locative estimée (${form.vacance||5}%)`,`− ${fmt(Math.round(form.loyer*12*(form.vacance||5)/100))}`)}
  ${TR("<strong>Revenus locatifs nets encaissés</strong>",`<strong>${fmt(loyerAnnuelNet)}</strong>`,true)}
  ${TR("Charges de copropriété",`− ${fmt((form.charges||0)*12)}`)}
  ${TR("Taxe foncière",`− ${fmt(form.taxeFonciere||0)}`)}
  ${TR("Assurance propriétaire non occupant (PNO)",`− ${fmt(assurancePNO)}`)}
  ${TR("Frais de gestion locative",`− ${fmt(fraisGestion)}`)}
  ${TR("CFE et autres charges",`− ${fmt(form.cfe||0)}`)}
  ${TR("<strong>Total charges d'exploitation annuelles</strong>",`<strong>− ${fmt(chargesAnnuelles)}</strong>`,true)}
  ${TR("<strong>Revenu locatif net de charges (hors crédit)</strong>",`<strong>${fmt(loyerAnnuelNet-chargesAnnuelles)}</strong>`,true)}
</table>

<div class="subsec">B. Indicateurs de performance</div>
<div class="kpi-row">
  ${[
    ["TRI à "+form.horizon+" ans",`${r0?.tri??"-"}%`,"Taux de Rendement Interne"],
    ["Cash-flow mensuel net",`${r0?.cashflowM!=null?((r0.cashflowM>=0?"+":"")+r0.cashflowM+"€"):"-"}`,"Après crédit et charges"],
    ["Rendement brut",`${rendBrut.toFixed(2)}%`,"Loyers / coût total opération"],
    ["Rendement net",`${r0?.rendNet!=null?(+r0.rendNet).toFixed(2):"-"}%`,"Après toutes charges"],
  ].map(([l,v,s])=>`<div class="kpi-cell"><div class="kpi-l">${l}</div><div class="kpi-v">${v}</div><div class="kpi-s">${s}</div></div>`).join("")}
</div>

${amort?.chartData?.length?`
<div class="subsec">C. Amortissement par composants — CGI Art. 39 C (régime LMNP Réel)</div>
<table>
  <tr><th>Composant</th><th class="r">Durée</th><th class="r">Dotation annuelle déductible</th></tr>
  ${amort.chartData.map((c,i)=>`<tr${i%2===1?' class="alt"':""}>
    <td>${c.name}</td>
    <td class="r">${c.duree} ans</td>
    <td class="r b">${fmt(c.montant)}</td>
  </tr>`).join("")}
  <tr class="total"><td colspan="2"><strong>Total amortissement déductible par an</strong></td><td class="r b">${fmt(amort.totalAnnuel)}</td></tr>
</table>
<div class="hl"><strong>Économie fiscale :</strong> ${fmt(amort.totalAnnuel)} × ${form.tmi}% (TMI) = <strong>${fmt(amort.totalAnnuel*form.tmi/100)}/an</strong> d'impôt économisé pendant la période d'amortissement (art. 39 C CGI).</div>
`:""}

<div class="subsec">${amort?.chartData?.length?"D":"C"}. Comparaison des régimes fiscaux applicables</div>
<table>
  <tr><th>Régime fiscal</th><th class="r">Cash-flow net/mois</th><th class="r">TRI</th><th class="r">Rendement net</th><th class="r">Impôt an 1</th></tr>
  ${(results||[]).map((r,i)=>{
    const labels=["LMNP Réel — Recommandé","Micro-BIC","SCI à l'IS","SCI à l'IR"];
    const cc=(r.cashflowM??0)>=0?"#0C0C10":"#991B1B";
    return `<tr${i===0?" style='background:rgba(249,115,22,0.08);'":" "}${i%2===1&&i!==0?' class="alt"':""}>
      <td class="b">${i===0?"★ ":""}${labels[i]}</td>
      <td class="r" style="color:${cc};font-weight:700;">${r.cashflowM!=null?((r.cashflowM>=0?"+":"")+r.cashflowM+"€"):"-"}/mois</td>
      <td class="r">${r.tri??"-"}%</td>
      <td class="r">${r.rendNet!=null?(+r.rendNet).toFixed(2):"-"}%</td>
      <td class="r">${fmt(r.rows?.[0]?.impot)}</td>
    </tr>`;
  }).join("")}
</table>

<!-- V. ANALYSE DES RISQUES -->
<div class="sec">V. Analyse des risques du projet</div>
<table>
  <tr><th>Facteur de risque</th><th class="r">Valeur</th><th class="r">Appréciation</th><th>Observations</th></tr>
  ${[
    {label:"Vacance locative",valeur:`${form.vacance||5}%`,ok:(form.vacance||5)<=7,
     obs:(form.vacance||5)<=5?"Marché tendu, risque de vacance faible":(form.vacance||5)<=7?"Vacance raisonnable — constituer 1 mois de loyer en réserve":"Vacance élevée — analyse de marché local préalable recommandée"},
    {label:"Conformité DPE — loi Climat & Résilience",valeur:`Classe ${form.dpe||"C"}`,ok:["A","B","C","D"].includes(form.dpe||"C"),
     obs:["A","B","C","D"].includes(form.dpe||"C")?"Bien conforme aux exigences 2025–2028":"Classe F ou G : interdiction de louer imminente — travaux obligatoires"},
    {label:"Taux d'endettement HCSF",valeur:`${ratioEndt}%`,ok:ratioEndt<=35,
     obs:ratioEndt<=33?"Dans le quota exceptionnel (33%) — très favorable":ratioEndt<=35?"Conforme au plafond réglementaire (35%)":"Dépassement du seuil HCSF — apport supplémentaire nécessaire"},
    {label:"Épargne de précaution résiduelle",valeur:fmt(epargne),ok:epargne>=mens*3,
     obs:epargne>=mens*6?"Réserve très confortable (supérieure à 6 mensualités)":epargne>=mens*3?"Réserve suffisante (supérieure à 3 mensualités)":"Réserve insuffisante — recommander constitution d'épargne préalable"},
    {label:"Valorisation patrimoniale projetée",valeur:`+${((valFinale/form.prix-1)*100).toFixed(1)}% sur ${form.horizon} ans`,ok:valFinale>form.prix,
     obs:`Hypothèse ${form.revalorisation||1.5}%/an — valeur estimée : ${fmt(valFinale)} dans ${form.horizon} ans vs. ${fmt(form.prix)} à l'acquisition`},
  ].map((item,i)=>`<tr${i%2===1?' class="alt"':""}>
    <td class="b">${item.label}</td>
    <td class="r b">${item.valeur}</td>
    <td class="r" style="color:${item.ok?"#F97316":"#DC2626"};font-weight:700;">${item.ok?"MAÎTRISÉ":"À SURVEILLER"}</td>
    <td style="font-size:9.5pt;color:#475569;">${item.obs}</td>
  </tr>`).join("")}
</table>

<!-- VI. PROJECTION PATRIMONIALE -->
<div class="sec">VI. Projection patrimoniale à ${form.horizon} ans</div>
<table>
  <tr><th>Indicateur</th><th class="r">Situation initiale</th><th class="r">Projection à ${form.horizon} ans</th><th class="r">Variation</th></tr>
  <tr>
    <td class="b">Valeur vénale du bien</td>
    <td class="r">${fmt(form.prix)}</td>
    <td class="r b" style="color:#F97316;">${fmt(valFinale)}</td>
    <td class="r" style="color:#F97316;font-weight:700;">+${fmt(valFinale-form.prix)} (+${((valFinale/form.prix-1)*100).toFixed(1)}%)</td>
  </tr>
  <tr class="alt">
    <td class="b">Capital restant dû</td>
    <td class="r">${fmt(capital)}</td>
    <td class="r b" style="color:#DC2626;">${fmt(detteFinale)}</td>
    <td class="r" style="color:#F97316;font-weight:700;">${fmt(capital-detteFinale)} remboursé</td>
  </tr>
  <tr class="total">
    <td class="b">Patrimoine net constitué</td>
    <td class="r b">${fmt(form.apport)}</td>
    <td class="r b" style="color:#F97316;font-size:13pt;">${fmt(patriFinal)}</td>
    <td class="r" style="color:#F97316;font-weight:700;">× ${(patriFinal/Math.max(form.apport,1)).toFixed(1)} l'apport initial</td>
  </tr>
</table>
<div class="hl"><strong>Effet de levier bancaire :</strong> Pour un apport de <strong>${fmt(form.apport)}</strong>, le patrimoine net estimé atteint <strong>${fmt(patriFinal)}</strong> dans ${form.horizon} ans, soit un coefficient multiplicateur de <strong>${(patriFinal/Math.max(form.apport,1)).toFixed(1)}x</strong>. (Hypothèse revalorisation ${form.revalorisation||1.5}%/an — à titre indicatif)</div>

<!-- VII. SCORE DE BANCABILITÉ -->
<div class="sec">VII. Score de bancabilité et avis motivé</div>
<div class="score-box">
  <div style="min-width:140px;">
    <div style="font-size:9pt;color:#64748B;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px;">Score global</div>
    <div class="score-num" style="color:${scoreClass};">${scoreTot}<span style="font-size:14pt;color:#94A3B8;">/100</span></div>
    <div style="font-size:10pt;font-weight:700;color:${scoreClass};margin-top:4px;letter-spacing:.03em;">Avis : ${scoreVerdict}</div>
  </div>
  <div style="flex:1;">
    ${[
      ["Taux d'endettement (25 pts)",scoreEndt,25],
      ["Cash-flow mensuel (25 pts)", scoreCF,  25],
      ["Rendement brut (20 pts)",    scoreRdt,  20],
      ["Apport personnel (20 pts)",  scoreAppt, 20],
      ["TRI (10 pts)",               scoreTRI,  10],
    ].map(([label,score,max])=>`<div class="score-item">
      <div style="width:210px;font-size:9.5pt;color:#475569;">${label}</div>
      <div class="score-bar-bg"><div class="score-bar-fill" style="width:${Math.round(score/max*100)}%;background:${score/max>=.8?"#F97316":score/max>=.5?"#D97706":"#DC2626"};"></div></div>
      <div style="width:36px;text-align:right;font-weight:700;font-size:10pt;">${score}/${max}</div>
    </div>`).join("")}
  </div>
</div>

<div class="reco">
  <div class="reco-title">Avis motivé — ${scoreVerdict} (Score ${scoreTot}/100)</div>
  <p style="font-size:10.5pt;line-height:1.75;color:#1a1a2e;">
    ${scoreTot>=75
      ? `Le présent dossier réunit les conditions nécessaires à l'obtention d'un financement bancaire dans des conditions standards. Le taux d'endettement de <strong>${ratioEndt}%</strong> s'inscrit dans le respect strict de la réglementation HCSF. L'apport personnel de <strong>${pctApport}%</strong> (${fmt(form.apport)}) est supérieur au seuil minimal habituel. Le cash-flow ${(r0?.cashflowM??0)>=0?`<strong>positif de +${r0?.cashflowM}€/mois</strong> atteste de la capacité du bien à s'autofinancer`:"généré par l'exploitation confirme la viabilité du projet"} ; le TRI de <strong>${r0?.tri??"-"}%</strong> sur ${form.horizon} ans confirme la qualité de l'investissement. <strong>Recommandation : soumettre ce dossier auprès de 2 à 3 établissements bancaires ou d'un courtier spécialisé en investissement locatif.</strong>`
      : scoreTot>=50
      ? `Le présent dossier présente des fondamentaux acceptables mais nécessite des ajustements pour optimiser les conditions d'obtention. Points d'amélioration prioritaires : ${+ratioEndt>35?`le taux d'endettement (<strong>${ratioEndt}%</strong>) dépasse le plafond HCSF — un apport complémentaire permettrait de le ramener sous 35% ; `:""}${pctApport<15?`l'apport personnel (<strong>${pctApport}%</strong>) est en dessous des standards — viser 15 à 20% pour les meilleures conditions ; `:""}${epargne<mens*3?`l'épargne résiduelle (${fmt(epargne)}) est insuffisante — constituer au minimum ${fmt(mens*3)} de réserve. `:""}Parallèlement, un courtier spécialisé pourra identifier les établissements les plus adaptés au profil. <strong>Recommandation : optimiser 1 ou 2 paramètres clés avant dépôt du dossier.</strong>`
      : `Le présent dossier présente des faiblesses significatives rendant difficile l'obtention d'un financement dans les conditions actuelles. Points bloquants identifiés : ${+ratioEndt>35?`taux d'endettement à <strong>${ratioEndt}%</strong> (seuil HCSF dépassé) — nécessite un apport supplémentaire substantiel ou une réduction du capital emprunté ; `:""}${pctApport<10?`apport insuffisant à <strong>${pctApport}%</strong> (minimum recommandé : 10–15%) ; `:""}${(r0?.tri??0)<4?`rentabilité en deçà des standards (TRI <strong>${r0?.tri}%</strong>) — revoir les conditions d'acquisition ou les paramètres locatifs. `:""}Il est fortement recommandé de consulter un conseiller en gestion de patrimoine avant tout dépôt. <strong>Recommandation : restructurer le plan de financement et consulter un courtier spécialisé.</strong>`
    }
  </p>
</div>

<!-- VIII. PIÈCES JUSTIFICATIVES -->
<div class="sec">VIII. Pièces justificatives à joindre au dossier</div>
<table>
  <tr><th style="width:35%;">Catégorie</th><th>Documents requis</th></tr>
  <tr><td class="b">Identité et situation personnelle</td><td>Pièce d'identité en cours de validité, justificatif de domicile (moins de 3 mois), livret de famille le cas échéant</td></tr>
  <tr class="alt"><td class="b">Revenus professionnels</td><td>${typeContrat==="CDI"||typeContrat==="Fonctionnaire"?"3 derniers bulletins de salaire, contrat de travail (ou attestation employeur), 2 derniers avis d'imposition":typeContrat==="TNS"||typeContrat==="Indépendant"?"3 derniers bilans comptables certifiés, liasses fiscales, 2 derniers avis d'imposition":"Bulletins de salaire ou justificatifs de revenus, 2 derniers avis d'imposition"}</td></tr>
  <tr><td class="b">Patrimoine et épargne</td><td>3 derniers relevés de tous comptes bancaires, justificatifs d'épargne et placements (livrets, assurance-vie), tableau d'amortissement des prêts en cours</td></tr>
  <tr class="alt"><td class="b">Projet immobilier</td><td>Compromis ou promesse de vente signé, diagnostics techniques (DPE, plomb, amiante), plans et descriptif des travaux le cas échéant, estimation immobilière</td></tr>
  <tr><td class="b">Exploitation locative LMNP</td><td>Prévisionnel d'exploitation établi par expert-comptable, bail de location meublée type (loi Alur), attestation d'immatriculation SIREN si LMNP déjà déclaré, statuts si SCI</td></tr>
  <tr class="alt"><td class="b">Assurances et garanties</td><td>Devis assurance emprunteur (délégation possible), attestation d'assurance PNO (propriétaire non-occupant), garantie loyers impayés (GLI) le cas échéant</td></tr>
</table>

<!-- IX. ATTESTATION -->
<div class="sec">IX. Attestation sur l'honneur</div>
<div class="reco" style="background:white;">
  <p style="font-size:10.5pt;color:#1a1a2e;line-height:1.7;">
    Je soussigné(e) <strong>${nomAffiche}</strong>, atteste sur l'honneur que les informations contenues dans le présent dossier sont exactes, sincères et complètes à la date de signature. Je m'engage à informer l'établissement prêteur de toute modification de ma situation survenant en cours d'instruction, et à fournir tout document complémentaire nécessaire à l'examen de ma demande de financement.
  </p>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:24px;">
    <div>
      <div style="font-size:9.5pt;color:#64748B;margin-bottom:24px;">Fait à _________________________________, le ${dateStr}</div>
      <div style="border-top:1px solid #CBD5E1;padding-top:6px;font-size:9pt;color:#64748B;">Signature de l'emprunteur(e)</div>
    </div>
    <div>
      <div style="font-size:9.5pt;color:#64748B;margin-bottom:24px;">Cachet, nom et signature du conseiller</div>
      <div style="border-top:1px solid #CBD5E1;padding-top:6px;font-size:9pt;color:#64748B;">Conseiller bancaire / Courtier</div>
    </div>
  </div>
</div>

<!-- PIED DE PAGE -->
<div class="doc-footer">
  <div style="color:#F97316;font-weight:700;">ImmoVerdict · immoverdict.com</div>
  <div>Dossier Bancaire LMNP · Réf. ${refNum} · ${dateStr}</div>
  <div>LF ${new Date().getFullYear()} · CGI Art. 39 C · HCSF 35% · Document confidentiel</div>
</div>

</div></body></html>`;

  const htmlWithPrint = html.replace("</body>",
    `<script>window.addEventListener('load',function(){setTimeout(function(){window.print();window.addEventListener('afterprint',function(){window.close();});},800);});</scr`+`ipt></body>`);
  const blob = new Blob([htmlWithPrint],{type:"text/html"});
  const url  = URL.createObjectURL(blob);
  const w    = window.open(url,"_blank");
  if (!w) {
    const a = document.createElement("a");
    a.href = url; a.download = `dossier-bancaire-lmnp-${new Date().toISOString().slice(0,10)}.html`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}

/* ════════════════════════════════════════
   STEP DOSSIER — Vue inline professionnelle
════════════════════════════════════════ */
function StepDossier({ form, results, amort }) {
  const r0      = results?.[0];
  const fmt     = (n) => new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n??0);
  const dateStr = new Date().toLocaleDateString("fr-FR",{day:"2-digit",month:"long",year:"numeric"});

  const capital   = Math.max(0, form.prix + form.travaux + form.prix*(form.notaire/100) - form.apport);
  const tm        = (form.interet/100)/12;
  const nn        = form.dureeCredit * 12;
  const mens      = capital>0&&tm>0 ? Math.round((capital*tm)/(1-Math.pow(1+tm,-nn))) : 0;
  const assurCredit = form.assuranceCredit ?? Math.round(capital*0.003/12);
  const totalMens   = mens + (+form.chargesCredit||0) + assurCredit;
  const rav         = Math.round((+form.revenusMensuels||0) - totalMens);
  const pctApport   = Math.round(form.apport / Math.max(form.prix,1) * 100);
  const ratioEndt   = +(totalMens / Math.max(+form.revenusMensuels||1, 1) * 100).toFixed(1);

  const assurancePNO     = form.assurancePNO ?? 200;
  const fraisGestion     = form.fraisGestion ?? 0;
  const chargesAnnuelles = (form.charges||0)*12 + (form.taxeFonciere||0) + assurancePNO + fraisGestion + (form.cfe||0);
  const loyerAnnuelNet   = Math.round(form.loyer*12*(1-(form.vacance||0)/100));
  const revLocatifPris   = Math.round(loyerAnnuelNet/12*0.7);
  const ratioEndtDiff    = +(totalMens/Math.max((+form.revenusMensuels||0)+revLocatifPris,1)*100).toFixed(1);
  const rendBrut         = +(r0?.rendBrut||0);
  const epargne          = form.epargneResiduelle ?? 0;

  const revalo      = (form.revalorisation||1.5)/100;
  const lastRow     = r0?.rows?.[(form.horizon||20)-1];
  const valFinale   = Math.round(form.prix * Math.pow(1+revalo, form.horizon||20));
  const detteFinale = Math.max(0, Math.round(lastRow?.capRestant||0));
  const patriFinal  = Math.max(0, valFinale - detteFinale);

  const scoreEndt = ratioEndt<=28?25:ratioEndt<=33?18:ratioEndt<=35?10:2;
  const scoreCF   = (r0?.cashflowM??-999)>=100?25:(r0?.cashflowM??-999)>=0?18:(r0?.cashflowM??-999)>=-200?10:2;
  const scoreRdt  = rendBrut>=7?20:rendBrut>=5?14:rendBrut>=3?8:2;
  const scoreAppt = pctApport>=20?20:pctApport>=15?15:pctApport>=10?10:3;
  const scoreTRI  = (r0?.tri??0)>=6?10:(r0?.tri??0)>=4?7:2;
  const scoreTot  = scoreEndt+scoreCF+scoreRdt+scoreAppt+scoreTRI;
  const scoreColor   = scoreTot>=75?"#F97316":scoreTot>=50?"#92400E":"#991B1B";
  const scoreVerdict = scoreTot>=75?"FAVORABLE":scoreTot>=50?"RÉSERVÉ":"DÉFAVORABLE";
  const scoreLabel   = scoreTot>=75?"Dossier solide":scoreTot>=50?"Dossier acceptable":"Dossier à améliorer";

  const profession  = form.profession||"—";
  const typeContrat = form.typeContrat||"CDI";
  const age         = form.age||"—";
  const quartier    = form.quartier||form.adresse||"—";
  const modeExploit = form.modeExploitation||"LMNP meublé";

  const amortRows = (() => {
    if (capital<=0||tm<=0) return [];
    const jalons=[1,2,3,5,10,15,form.dureeCredit].filter((v,i,a)=>a.indexOf(v)===i&&v<=form.dureeCredit).sort((a,b)=>a-b);
    return jalons.map(annee=>{
      const k=annee*12;
      const capRest=Math.max(0,Math.round(capital*(Math.pow(1+tm,nn)-Math.pow(1+tm,k))/(Math.pow(1+tm,nn)-1)));
      const capAvant=annee===1?capital:Math.max(0,Math.round(capital*(Math.pow(1+tm,nn)-Math.pow(1+tm,(annee-1)*12))/(Math.pow(1+tm,nn)-1)));
      return {annee,mens,capRest,interetsAn:Math.round(mens*12-(capAvant-capRest)),amortAn:Math.round(capAvant-capRest)};
    });
  })();

  /* ── Composants UI ── */
  const navy = "#F97316";
  const Card = ({children,style={}}) => (
    <div style={{background:"white",border:"1px solid #CBD5E1",borderRadius:4,marginBottom:12,overflow:"hidden",...style}}>{children}</div>
  );
  const SecHeader = ({children}) => (
    <div style={{background:navy,color:"white",padding:"8px 14px",fontSize:11,fontWeight:700,letterSpacing:".06em",textTransform:"uppercase"}}>{children}</div>
  );
  const SubSec = ({children}) => (
    <div style={{fontSize:12,fontWeight:700,color:navy,borderBottom:`1.5px solid ${navy}`,paddingBottom:3,margin:"14px 14px 10px"}}>{children}</div>
  );
  const InfoGrid = ({items}) => (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",borderTop:"1px solid #E2E8F0"}}>
      {items.map(([l,v],i)=>(
        <div key={i} style={{padding:"8px 14px",borderBottom:"1px solid #E2E8F0",borderRight:i%2===0?"1px solid #E2E8F0":"none",background:i%4>=2?"#F8FAFC":"white"}}>
          <div style={{fontSize:9,color:"#64748B",marginBottom:2,textTransform:"uppercase",letterSpacing:".04em"}}>{l}</div>
          <div style={{fontSize:12,fontWeight:600,color:"#1a1a2e"}}>{v}</div>
        </div>
      ))}
    </div>
  );
  const TRow = ({label,value,hl=false,color=""}) => (
    <tr style={{background:hl?"rgba(249,115,22,0.08)":"transparent"}}>
      <td style={{padding:"7px 14px",borderBottom:"1px solid #E2E8F0",fontSize:11,color:"#475569"}}>{label}</td>
      <td style={{padding:"7px 14px",borderBottom:"1px solid #E2E8F0",fontSize:11,fontWeight:hl?700:500,textAlign:"right",color:color||"#1a1a2e"}}>{value}</td>
    </tr>
  );

  return (
    <div className="slide-up" style={{fontFamily:"Arial,'Helvetica Neue',sans-serif"}}>

      {/* ── EN-TÊTE DOCUMENT ── */}
      <div style={{background:navy,color:"white",borderRadius:4,padding:"20px 18px",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <div style={{fontSize:16,fontWeight:700,letterSpacing:".01em",marginBottom:4}}>DOSSIER DE FINANCEMENT BANCAIRE</div>
          <div style={{fontSize:11,opacity:.75}}>Investissement Locatif Meublé — Régime LMNP · LF 2026</div>
          <div style={{display:"flex",gap:16,marginTop:14}}>
            {[
              ["Emprunteur", `${profession !== "—" ? profession : typeContrat}${age!=="—"?`, ${age} ans`:""}` ],
              ["Bien", `${form.typeBien||"—"} · ${form.surface||"—"} m²`],
              ["Montant", fmt(form.prix)],
              ["Durée", `${form.dureeCredit} ans`],
            ].map(([l,v])=>(
              <div key={l} style={{background:"rgba(255,255,255,.1)",borderRadius:3,padding:"7px 10px",minWidth:80}}>
                <div style={{fontSize:8,opacity:.6,textTransform:"uppercase",letterSpacing:".05em",marginBottom:2}}>{l}</div>
                <div style={{fontSize:11,fontWeight:700}}>{v}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{border:"1px solid rgba(255,255,255,.3)",fontSize:9,fontWeight:700,padding:"2px 8px",letterSpacing:".1em",display:"inline-block",marginBottom:6}}>CONFIDENTIEL</div>
          <div style={{fontSize:10,opacity:.7}}>{dateStr}</div>
        </div>
      </div>

      {/* ── VERDICT + SCORE ── */}
      <Card>
        <SecHeader>Avis motivé sur la bancabilité</SecHeader>
        <div style={{padding:"16px 14px",display:"flex",alignItems:"center",gap:16}}>
          <div style={{border:`2px solid ${scoreColor}`,padding:"12px 18px",textAlign:"center",minWidth:110}}>
            <div style={{fontSize:32,fontWeight:700,color:scoreColor,lineHeight:1}}>{scoreTot}</div>
            <div style={{fontSize:10,color:"#64748B",marginTop:2}}>/100 pts</div>
            <div style={{fontSize:11,fontWeight:700,color:scoreColor,marginTop:4,letterSpacing:".03em"}}>{scoreVerdict}</div>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:700,color:scoreColor,marginBottom:6}}>{scoreLabel}</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
              {[
                ["TRI",`${r0?.tri??"-"}%`],
                ["Cash-flow",`${r0?.cashflowM!=null?((r0.cashflowM>=0?"+":"")+r0.cashflowM+"€"):"-"}/mois`],
                ["Rdt net",`${r0?.rendNet!=null?(+r0.rendNet).toFixed(2):"-"}%`],
                ["Endettement",`${ratioEndt}%`],
                ["Reste à vivre",`${fmt(rav)}/mois`],
              ].map(([l,v])=>(
                <div key={l} style={{background:"#F8FAFC",border:"1px solid #E2E8F0",borderRadius:3,padding:"5px 10px"}}>
                  <div style={{fontSize:9,color:"#64748B",textTransform:"uppercase",letterSpacing:".04em"}}>{l}</div>
                  <div style={{fontSize:13,fontWeight:700,color:navy}}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{padding:"0 14px 14px"}}>
          {[
            ["Taux d'endettement",scoreEndt,25],
            ["Cash-flow mensuel", scoreCF,  25],
            ["Rendement brut",    scoreRdt,  20],
            ["Apport personnel",  scoreAppt, 20],
            ["TRI",               scoreTRI,  10],
          ].map(([label,score,max])=>(
            <div key={label} style={{display:"flex",alignItems:"center",gap:8,marginBottom:5,fontSize:11}}>
              <div style={{width:140,color:"#475569",fontSize:10}}>{label}</div>
              <div style={{flex:1,background:"#E2E8F0",borderRadius:2,height:6}}>
                <div style={{height:6,borderRadius:2,background:score/max>=.8?"#F97316":score/max>=.5?"#D97706":"#DC2626",width:`${Math.round(score/max*100)}%`}} />
              </div>
              <div style={{width:36,textAlign:"right",fontWeight:700,fontSize:10}}>{score}/{max}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── EMPRUNTEUR ── */}
      <Card>
        <SecHeader>I. Profil emprunteur et projet immobilier</SecHeader>
        <InfoGrid items={[
          ["Profession", profession],
          ["Type de contrat", typeContrat],
          ["Âge", age!=="—"?`${age} ans`:"—"],
          ["Revenus nets mensuels", fmt(form.revenusMensuels)],
          ["Épargne résiduelle", fmt(epargne)],
          ["Localisation", quartier],
          ["Type de bien", `${form.typeBien||"—"} · ${form.surface||"—"} m² · ${form.nbPieces||2} p.`],
          ["DPE", `Classe ${form.dpe||"C"}`],
          ["Mode d'exploitation", modeExploit],
          ["Travaux prévus", fmt(form.travaux)],
        ]} />
      </Card>

      {/* ── PLAN DE FINANCEMENT ── */}
      <Card>
        <SecHeader>II. Plan de financement</SecHeader>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <tbody>
            <TRow label="Prix d'acquisition" value={fmt(form.prix)} />
            <TRow label={`Frais de notaire (${form.notaire}%)`} value={fmt(form.prix*form.notaire/100)} />
            <TRow label="Travaux / Mobilier" value={fmt(form.travaux+form.mobilier)} />
            <TRow label="Coût total de l'opération" value={fmt(form.prix+form.travaux+form.mobilier+form.prix*form.notaire/100)} hl />
            <TRow label={`Apport personnel (${pctApport}%)`} value={fmt(form.apport)} />
            <TRow label="Capital à emprunter" value={fmt(capital)} hl />
            <TRow label={`Mensualité à ${form.interet}% sur ${form.dureeCredit} ans`} value={`${fmt(mens)}/mois`} />
            <TRow label="Charge mensuelle totale (avec assurance)" value={`${fmt(totalMens)}/mois`} hl />
            <TRow label="Taux d'endettement global" value={`${ratioEndt}%`} color={ratioEndt<=35?"#F97316":"#DC2626"} />
            <TRow label="Taux d'endettement différentiel (70% loyers)" value={`${ratioEndtDiff}%`} color={ratioEndtDiff<=35?"#F97316":"#DC2626"} />
            <TRow label="Reste à vivre mensuel" value={`${fmt(rav)}/mois`} color={rav>=1200?"#F97316":"#DC2626"} />
          </tbody>
        </table>
      </Card>

      {/* ── TABLEAU D'AMORTISSEMENT ── */}
      {amortRows.length > 0 && (
        <Card>
          <SecHeader>III. Tableau d'amortissement prévisionnel</SecHeader>
          <div style={{overflowX:"auto",padding:"8px 0"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead>
                <tr style={{background:"#F0F4F8"}}>
                  {["Année","Mensualité","Intérêts (an)","Capital remb.","Capital restant","% remb."].map(h=>(
                    <th key={h} style={{padding:"7px 10px",textAlign:h==="Année"?"left":"right",color:navy,fontWeight:700,border:"1px solid #CBD5E1",fontSize:10}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {amortRows.map((r,i)=>(
                  <tr key={r.annee} style={{background:i%2===0?"white":"#F8FAFC"}}>
                    <td style={{padding:"6px 10px",border:"1px solid #CBD5E1",fontWeight:700,color:navy}}>An {r.annee}</td>
                    <td style={{padding:"6px 10px",border:"1px solid #CBD5E1",textAlign:"right"}}>{fmt(r.mens)}</td>
                    <td style={{padding:"6px 10px",border:"1px solid #CBD5E1",textAlign:"right",color:"#92400E"}}>{fmt(r.interetsAn)}</td>
                    <td style={{padding:"6px 10px",border:"1px solid #CBD5E1",textAlign:"right",color:"#0C0C10"}}>{fmt(r.amortAn)}</td>
                    <td style={{padding:"6px 10px",border:"1px solid #CBD5E1",textAlign:"right",fontWeight:700}}>{fmt(r.capRest)}</td>
                    <td style={{padding:"6px 10px",border:"1px solid #CBD5E1",textAlign:"right",color:navy}}>{Math.round((1-r.capRest/capital)*100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── EXPLOITATION LOCATIVE ── */}
      <Card>
        <SecHeader>IV. Exploitation locative et rentabilité</SecHeader>
        <SubSec>A. Compte de résultat prévisionnel (année 1)</SubSec>
        <table style={{width:"100%",borderCollapse:"collapse",margin:"0 0 4px"}}>
          <tbody>
            <TRow label={`Loyer mensuel brut (${fmt(form.loyer)}/mois × 12)`} value={fmt(form.loyer*12)} />
            <TRow label={`Vacance locative (${form.vacance||5}%)`} value={`− ${fmt(Math.round(form.loyer*12*(form.vacance||5)/100))}`} />
            <TRow label="Revenus locatifs nets encaissés" value={fmt(loyerAnnuelNet)} hl />
            <TRow label="Charges (copro + foncier + PNO + gestion)" value={`− ${fmt(chargesAnnuelles)}`} />
            <TRow label="Revenu locatif net de charges" value={fmt(loyerAnnuelNet-chargesAnnuelles)} hl />
          </tbody>
        </table>
        <SubSec>B. Indicateurs de performance</SubSec>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:1,borderTop:"1px solid #E2E8F0"}}>
          {[
            ["TRI à "+form.horizon+" ans",`${r0?.tri??"-"}%`],
            ["Cash-flow mensuel net",`${r0?.cashflowM!=null?((r0.cashflowM>=0?"+":"")+r0.cashflowM+"€"):"-"}/mois`],
            ["Rendement brut",`${rendBrut.toFixed(2)}%`],
            ["Rendement net après charges",`${r0?.rendNet!=null?(+r0.rendNet).toFixed(2):"-"}%`],
          ].map(([l,v])=>(
            <div key={l} style={{padding:"9px 14px",borderBottom:"1px solid #E2E8F0",borderRight:"1px solid #E2E8F0"}}>
              <div style={{fontSize:9,color:"#64748B",textTransform:"uppercase",letterSpacing:".04em",marginBottom:2}}>{l}</div>
              <div style={{fontSize:14,fontWeight:700,color:navy}}>{v}</div>
            </div>
          ))}
        </div>

        {/* Comparaison régimes */}
        <SubSec>C. Comparaison des régimes fiscaux</SubSec>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
          <thead>
            <tr style={{background:"#F0F4F8"}}>
              {["Régime","Cash-flow/mois","TRI","Rdt net","Impôt an 1"].map(h=>(
                <th key={h} style={{padding:"6px 10px",textAlign:h==="Régime"?"left":"right",color:navy,fontWeight:700,border:"1px solid #CBD5E1",fontSize:10}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(results||[]).map((r,i)=>{
              const labels=["LMNP Réel ★","Micro-BIC","SCI IS","SCI IR"];
              const cc=(r.cashflowM??0)>=0?"#0C0C10":"#991B1B";
              return (
                <tr key={i} style={{background:i===0?"rgba(249,115,22,0.08)":i%2===1?"#F8FAFC":"white",fontWeight:i===0?700:400}}>
                  <td style={{padding:"6px 10px",border:"1px solid #CBD5E1",fontWeight:600}}>{labels[i]}</td>
                  <td style={{padding:"6px 10px",border:"1px solid #CBD5E1",textAlign:"right",color:cc,fontWeight:700}}>{r.cashflowM!=null?((r.cashflowM>=0?"+":"")+r.cashflowM+"€"):"-"}/mois</td>
                  <td style={{padding:"6px 10px",border:"1px solid #CBD5E1",textAlign:"right"}}>{r.tri??"-"}%</td>
                  <td style={{padding:"6px 10px",border:"1px solid #CBD5E1",textAlign:"right"}}>{r.rendNet!=null?(+r.rendNet).toFixed(2):"-"}%</td>
                  <td style={{padding:"6px 10px",border:"1px solid #CBD5E1",textAlign:"right"}}>{fmt(r.rows?.[0]?.impot)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* ── AMORTISSEMENTS PAR COMPOSANTS ── */}
      {amort?.chartData?.length > 0 && (
        <Card>
          <SecHeader>V. Amortissement par composants — CGI Art. 39 C</SecHeader>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead>
              <tr style={{background:"#F0F4F8"}}>
                {["Composant","Durée","Dotation annuelle déductible"].map(h=>(
                  <th key={h} style={{padding:"6px 10px",textAlign:h==="Composant"?"left":"right",color:navy,fontWeight:700,border:"1px solid #CBD5E1",fontSize:10}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {amort.chartData.map((c,i)=>(
                <tr key={c.name} style={{background:i%2===1?"#F8FAFC":"white"}}>
                  <td style={{padding:"6px 10px",border:"1px solid #CBD5E1"}}>{c.name}</td>
                  <td style={{padding:"6px 10px",border:"1px solid #CBD5E1",textAlign:"right"}}>{c.duree} ans</td>
                  <td style={{padding:"6px 10px",border:"1px solid #CBD5E1",textAlign:"right",fontWeight:700}}>{fmt(c.montant)}</td>
                </tr>
              ))}
              <tr style={{background:"rgba(249,115,22,0.08)",fontWeight:700}}>
                <td colSpan={2} style={{padding:"7px 10px",border:"1px solid #CBD5E1"}}>Total déductible par an</td>
                <td style={{padding:"7px 10px",border:"1px solid #CBD5E1",textAlign:"right",color:navy}}>{fmt(amort.totalAnnuel)}</td>
              </tr>
            </tbody>
          </table>
          <div style={{background:"rgba(249,115,22,0.08)",padding:"10px 14px",fontSize:11,color:navy,borderTop:"1px solid #CBD5E1"}}>
            <strong>Économie fiscale :</strong> {fmt(amort.totalAnnuel)} × {form.tmi}% TMI = <strong>{fmt(amort.totalAnnuel*form.tmi/100)}/an</strong> d'impôt évité
          </div>
        </Card>
      )}

      {/* ── RISQUES ── */}
      <Card>
        <SecHeader>VI. Analyse des risques</SecHeader>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
          <thead>
            <tr style={{background:"#F0F4F8"}}>
              {["Facteur","Valeur","Statut"].map(h=>(
                <th key={h} style={{padding:"6px 10px",textAlign:h==="Valeur"||h==="Statut"?"right":"left",color:navy,fontWeight:700,border:"1px solid #CBD5E1",fontSize:10}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              {l:"Vacance locative",v:`${form.vacance||5}%`,ok:(form.vacance||5)<=7},
              {l:"Conformité DPE (loi Climat)",v:`Classe ${form.dpe||"C"}`,ok:["A","B","C","D"].includes(form.dpe||"C")},
              {l:"Taux d'endettement HCSF",v:`${ratioEndt}%`,ok:ratioEndt<=35},
              {l:"Épargne de précaution",v:fmt(epargne),ok:epargne>=mens*3},
              {l:"Valorisation patrimoniale",v:`+${((valFinale/form.prix-1)*100).toFixed(1)}% sur ${form.horizon} ans`,ok:valFinale>form.prix},
            ].map((item,i)=>(
              <tr key={i} style={{background:i%2===1?"#F8FAFC":"white"}}>
                <td style={{padding:"7px 10px",border:"1px solid #CBD5E1",fontWeight:600}}>{item.l}</td>
                <td style={{padding:"7px 10px",border:"1px solid #CBD5E1",textAlign:"right"}}>{item.v}</td>
                <td style={{padding:"7px 10px",border:"1px solid #CBD5E1",textAlign:"right",fontWeight:700,color:item.ok?"#F97316":"#DC2626"}}>{item.ok?"MAÎTRISÉ":"À SURVEILLER"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* ── PROJECTION PATRIMONIALE ── */}
      <Card>
        <SecHeader>VII. Projection patrimoniale à {form.horizon} ans</SecHeader>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
          <thead>
            <tr style={{background:"#F0F4F8"}}>
              {["Indicateur","Valeur initiale",`Dans ${form.horizon} ans`,"Évolution"].map(h=>(
                <th key={h} style={{padding:"6px 10px",textAlign:h==="Indicateur"?"left":"right",color:navy,fontWeight:700,border:"1px solid #CBD5E1",fontSize:10}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{padding:"7px 10px",border:"1px solid #CBD5E1",fontWeight:600}}>Valeur vénale du bien</td>
              <td style={{padding:"7px 10px",border:"1px solid #CBD5E1",textAlign:"right"}}>{fmt(form.prix)}</td>
              <td style={{padding:"7px 10px",border:"1px solid #CBD5E1",textAlign:"right",fontWeight:700,color:navy}}>{fmt(valFinale)}</td>
              <td style={{padding:"7px 10px",border:"1px solid #CBD5E1",textAlign:"right",color:"#F97316",fontWeight:700}}>+{fmt(valFinale-form.prix)}</td>
            </tr>
            <tr style={{background:"#F8FAFC"}}>
              <td style={{padding:"7px 10px",border:"1px solid #CBD5E1",fontWeight:600}}>Capital restant dû</td>
              <td style={{padding:"7px 10px",border:"1px solid #CBD5E1",textAlign:"right"}}>{fmt(capital)}</td>
              <td style={{padding:"7px 10px",border:"1px solid #CBD5E1",textAlign:"right",fontWeight:700,color:"#DC2626"}}>{fmt(detteFinale)}</td>
              <td style={{padding:"7px 10px",border:"1px solid #CBD5E1",textAlign:"right",color:"#F97316",fontWeight:700}}>−{fmt(capital-detteFinale)}</td>
            </tr>
            <tr style={{background:"rgba(249,115,22,0.08)",fontWeight:700}}>
              <td style={{padding:"8px 10px",border:"1px solid #CBD5E1"}}>Patrimoine net constitué</td>
              <td style={{padding:"8px 10px",border:"1px solid #CBD5E1",textAlign:"right"}}>{fmt(form.apport)}</td>
              <td style={{padding:"8px 10px",border:"1px solid #CBD5E1",textAlign:"right",color:navy,fontSize:14}}>{fmt(patriFinal)}</td>
              <td style={{padding:"8px 10px",border:"1px solid #CBD5E1",textAlign:"right",color:"#F97316"}}>×{(patriFinal/Math.max(form.apport,1)).toFixed(1)}</td>
            </tr>
          </tbody>
        </table>
      </Card>

      {/* ── BOUTON PDF ── */}
      <div style={{paddingBottom:8}}>
        <button
          onClick={()=>downloadReport(form,results,amort,profession!=="—"?profession:"")}
          style={{width:"100%",padding:"14px",background:navy,color:"white",border:"none",borderRadius:4,fontSize:13,fontWeight:700,cursor:"pointer",letterSpacing:".03em",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          <span style={{fontSize:16}}>📄</span>
          TÉLÉCHARGER LE DOSSIER EN PDF
        </button>
        <p style={{textAlign:"center",fontSize:11,color:"#94A3B8",marginTop:8,fontFamily:"Arial,sans-serif"}}>
          S'ouvre dans un nouvel onglet · <strong>Fichier → Imprimer → Enregistrer en PDF</strong> · Format A4
        </p>
      </div>

    </div>
  );
}
function LeadModal({ onClose, form, results }) {
  const [email,   setEmail]   = useState("");
  const [name,    setName]    = useState("");
  const [sent,    setSent]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailOk, setEmailOk] = useState(false); // l'API email a réussi
  const [rgpd,    setRgpd]    = useState(false); // consentement RGPD

  const amort = useMemo(
    () => calcAmortComposants(form.prix, form.notaire, form.mobilier, form.travaux, form.terrain ?? 15),
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
                  <p className="font-bold text-sm text-orange-500">{results[0].tri}%</p>
                </div>
                <div className="text-center border-x border-slate-200">
                  <p className="text-[10px] text-slate-400">CF/mois</p>
                  <p className="font-bold text-sm" style={{ color:results[0].cashflowM>=0?"#10B981":"#EF4444" }}>
                    {fmtK(results[0].cashflowM)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-slate-400">Rdt net</p>
                  <p className="font-bold text-sm text-orange-500">{results[0].rendNet.toFixed(2)}%</p>
                </div>
              </div>
            )}
            <form onSubmit={submit} className="space-y-3">
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Prénom (optionnel)"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 bg-slate-50" />
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Votre adresse email *"
                required className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 bg-slate-50" />
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={rgpd} onChange={e=>setRgpd(e.target.checked)}
                  className="mt-0.5 flex-shrink-0 accent-orange-500" />
                <span className="text-[10px] text-slate-500 leading-relaxed">
                  J'accepte de recevoir mon rapport et des communications d'ImmoVerdict.
                  Données traitées conformément à notre{" "}
                  <a href="/mentions-legales" target="_blank" className="underline">politique de confidentialité</a>.
                  Désinscription possible à tout moment.
                </span>
              </label>
              <button type="submit" disabled={loading || !email || !rgpd}
                className="w-full py-3 rounded-xl text-sm font-bold text-white transition-opacity"
                style={{ background:"linear-gradient(135deg, #F97316, #F97316)", opacity: loading||!email||!rgpd ? 0.5 : 1 }}>
                {loading ? "⏳ Génération en cours…" : "Recevoir mon rapport gratuit →"}
              </button>
            </form>
            <p className="text-[10px] text-slate-400 text-center mt-3">
              Aucun spam. Désabonnement en un clic.
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
              style={{ background:"linear-gradient(135deg, #F97316, #F97316)" }}>
              ⬇ Télécharger le rapport (.html)
            </button>

            {/* Timeline email séquence */}
            {emailOk && (
              <div className="text-left mb-3 rounded-xl p-3 mt-1" style={{ background:"rgba(124,58,237,0.10)", border:"1px solid rgba(124,58,237,0.2)" }}>
                <p className="text-[10px] font-bold mb-2" style={{ color:"rgba(167,139,250,0.9)" }}>📬 Ce que vous allez recevoir :</p>
                <div className="space-y-2">
                  {[
                    { j:"Maintenant", icon:"📊", txt:"Votre rapport fiscal complet (4 régimes comparés)" },
                    { j:"J+1",        icon:"💡", txt:"3 astuces pour améliorer votre TRI" },
                    { j:"J+3",        icon:"🏦", txt:"Offres de financement via nos courtiers partenaires" },
                    { j:"J+7",        icon:"📈", txt:"Alerte : opportunités LMNP dans votre zone" },
                  ].map(({ j, icon, txt }) => (
                    <div key={j} className="flex items-start gap-2">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0 mt-0.5" style={{ background:"rgba(124,58,237,0.25)", color:"#F97316" }}>{j}</span>
                      <p className="text-[10px]" style={{ color:"rgba(248,250,252,0.65)" }}>{icon} {txt}</p>
                    </div>
                  ))}
                </div>
                <p className="text-[9px] mt-2" style={{ color:"rgba(248,250,252,0.3)" }}>Désabonnement en 1 clic · Aucun spam</p>
              </div>
            )}

            <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm font-semibold" style={{ border:"1px solid rgba(255,255,255,0.15)", color:"rgba(248,250,252,0.7)", background:"rgba(255,255,255,0.06)" }}>
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
            className="w-full py-2.5 mb-2 rounded-xl text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 transition-colors">
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
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400 bg-slate-50 focus:bg-slate-900 transition-colors" />
          <input type="password" value={password} onChange={e=>{setPass(e.target.value);setError("");}}
            placeholder={mode==="register" ? "Mot de passe (6 car. min.)" : "Mot de passe"}
            required minLength={mode==="register" ? 6 : undefined} autoComplete={mode==="login" ? "current-password" : "new-password"}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400 bg-slate-50 focus:bg-slate-900 transition-colors" />

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
            className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 transition-colors disabled:opacity-60">
            {loading ? "⏳ …" : mode==="login" ? "Se connecter" : "Créer le compte"}
          </button>
        </form>

        <div className="mt-3 space-y-1.5 text-center">
          <button onClick={() => { setMode(m => m==="login"?"register":"login"); setError(""); setInfoMsg(""); }}
            className="text-xs text-orange-400 hover:underline block w-full">
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
  const router = useRouter();
  // phase: "landing" | "quiz" | "sim"
  const [phase,           setPhase]           = useState("landing");
  const [step,            setStep]            = useState(0);
  const [form,            setForm]            = useState(DEFAULTS);
  const [user,            setUser]            = useState(null);
  const [showAuth,        setShowAuth]        = useState(false);
  const [showLead,        setShowLead]        = useState(false);
  const [showArgumentaire,setShowArgumentaire]= useState(false);
  const topRef = useRef(null);

  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  /* ── localStorage autosave ── */
  useEffect(() => {
    try {
      const saved = localStorage.getItem("lmnp_form");
      if (saved) setForm(f => ({ ...f, ...JSON.parse(saved) }));
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("lmnp_form", JSON.stringify(form)); } catch {}
  }, [form]);

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

  const amort = useMemo(() => calcAmortComposants(form.prix, form.notaire, form.mobilier, form.travaux, form.terrain ?? 15), [form]);

  const goNext = () => {
    if (step < 4) { setStep(s => s+1); topRef.current?.scrollIntoView({ behavior:"smooth" }); }
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
    <div className="min-h-screen" style={{ background:"#0C0C10" }}>
      {/* ── HEADER ── */}
      <header style={{ background:"#131318" }}
        className="sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => router.push("/")} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <span className="text-xl">🏢</span>
              <div>
                <p className="text-white font-bold text-sm leading-tight">Simulateur LMNP</p>
                <p className="text-orange-200 text-[10px]">Analyse fiscale · 4 régimes</p>
              </div>
            </button>
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <button onClick={() => sb && sb.auth.signOut()}
                className="text-[11px] text-orange-200 hover:text-white bg-white/10 px-3 py-1.5 rounded-lg transition-colors">
                {user.email?.split("@")[0]} · Déco
              </button>
            ) : (
              <button onClick={() => setShowAuth(true)}
                className="text-[11px] font-semibold bg-white text-orange-400 px-3 py-1.5 rounded-lg hover:bg-orange-50 transition-colors">
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
                    i===step ? "bg-white text-orange-400" :
                    i<step   ? "bg-white/20 text-white cursor-pointer hover:bg-white/30" :
                               "bg-white/10 text-orange-300 cursor-default"
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
              style={{ width:`${(step/4)*100}%` }} />
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
            amort={amort} onLead={() => setShowLead(true)}
            onArgumentaire={() => setShowArgumentaire(true)} />
        )}

        {step===4 && results && (
          <StepDossier form={form} results={results} amort={amort} />
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
              style={{ background:"linear-gradient(135deg, #F97316, #F97316)" }}>
              {step===2 ? "📊 Voir mes résultats →" : "Continuer →"}
            </button>
          ) : step === 3 ? (
            <button onClick={goNext}
              className="flex-1 py-3 rounded-xl text-sm font-bold text-white"
              style={{ background:"linear-gradient(135deg, #F97316, #F97316)" }}>
              📋 Voir mon dossier bancaire →
            </button>
          ) : (
            <button onClick={() => downloadReport(form, results, amort, "")}
              className="flex-1 py-3 rounded-xl text-sm font-bold text-white"
              style={{ background:"linear-gradient(135deg, #10B981, #F97316)" }}>
              📄 Télécharger PDF →
            </button>
          )}
        </div>
      </div>

      {/* ── MODALS ── */}
      {showAuth && <AuthModal onAuth={u => { setUser(u); setShowAuth(false); }} onClose={() => setShowAuth(false)} />}
      {showLead && <LeadModal onClose={() => setShowLead(false)} form={form} results={results} />}
      {showArgumentaire && results && (
        <ArgumentaireModal form={form} results={results} onClose={() => setShowArgumentaire(false)} />
      )}
    </div>
  );
}
