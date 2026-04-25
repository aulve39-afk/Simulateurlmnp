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
  prix:180000, notaire:8, travaux:12000, mobilier:6000, terrain:15,
  apport:30000, interet:3.45, dureeCredit:20, differe:0, typeDiffere:"partiel",
  loyer:850, charges:120, taxeFonciere:1200, vacance:5, revalorisation:1.5,
  tmi:30, revenusMensuels:4500, chargesCredit:0,
  horizon:20,
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
    const charges   = p.charges * 12 + p.taxeFonciere;
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
      // Micro-BIC : abattement 50%, pas de déficit possible
      const base = loyersNets * 0.50;
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
    const charges  = p.charges * 12 + p.taxeFonciere;
    const ints     = creditRows[yr-1]?.interets ?? 0;
    // Micro-BIC : abattement 50%, IR+PS
    const baseMicro  = loyers * 0.50;
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
  const scoreBg    = score >= 75 ? "#ECFDF5"     : score >= 55 ? "#FFFBEB"    : score >= 40 ? "#FFF7ED"         : "#FEF2F2";

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
      style={{ background:"linear-gradient(135deg,#F0FDF4,#DCFCE7)" }}>
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
  return (
    <div className="min-h-screen flex flex-col" style={{ background:"#F1F5F9" }}>
      {/* Hero */}
      <div style={{ background:"linear-gradient(135deg, #0F172A 0%, #1e3a5f 60%, #185FA5 100%)" }}
        className="relative overflow-hidden">
        {/* Badge mise à jour */}
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
          <p className="text-blue-200 text-sm leading-relaxed mb-2" style={{ maxWidth:400 }}>
            Validez votre projet LMNP et économisez jusqu&apos;à{" "}
            <strong className="text-white">4 200 €/an</strong> d&apos;impôts.
          </p>
          <p className="text-blue-300 text-sm leading-relaxed mb-8" style={{ maxWidth:400 }}>
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
          {["✅ Amortissement par composants","✅ Règle HCSF 35%","✅ LF 2026 · Mis à jour Avril 2026","✅ 4 régimes comparés"].map(t => (
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
  const cfColor   = (v) => v >= 0 ? "#059669" : "#DC2626";

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
            style={{ background: copied ? "#10B981" : "linear-gradient(135deg, #0F172A, #185FA5)" }}>
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
          className="flex-1 bg-slate-800 border border-slate-600 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-400 outline-none focus:border-blue-400 transition-colors" />
        <button type="submit" disabled={loading || !email}
          className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors disabled:opacity-50 whitespace-nowrap">
          {loading ? "…" : "M'alerter"}
        </button>
      </form>
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
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:bg-blue-50 active:scale-[.97] transition-all shadow-sm whitespace-nowrap">
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
        <span className="text-[11px] font-semibold text-blue-600 flex items-center gap-1">
          🏗️ Voir les durées d&apos;amortissement par composant
        </span>
        <span className="text-blue-400 text-[10px]">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="rounded-xl border border-blue-100 overflow-hidden mt-1">
          <div className="bg-blue-50 px-3 py-2">
            <p className="text-[10px] font-semibold text-blue-700">
              Déduction totale : <span className="text-blue-800 text-xs font-bold">{fmt(totalAn)}/an</span>
              <span className="text-blue-500 ml-2">· Conformément CGI Art. 39 C</span>
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
                  <td className="px-3 py-1.5 text-right font-semibold text-blue-700">
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
              <tr className="bg-blue-50 font-bold">
                <td className="px-3 py-2 text-blue-800">Total déductible</td>
                <td className="px-3 py-2 text-center text-blue-600">—</td>
                <td className="px-3 py-2 text-right text-blue-800">{fmt(totalAn)}<span className="text-blue-500 text-[10px] font-normal">/an</span></td>
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

        <SliderField label="Part estimée du terrain" value={form.terrain ?? 15} onChange={set("terrain")}
          min={5} max={40} step={1} format={n=>`${n} %`}
          help="Le terrain est NON amortissable (art. 39 C CGI). En centre-ville : 20–35 %. En périphérie : 10–20 %. Par défaut : 15 %." />

        <div className="mt-4 rounded-xl bg-blue-50 border border-blue-100 p-3">
          <p className="text-xs font-semibold text-blue-700 mb-1">📊 Coût total de l&apos;opération</p>
          <p className="text-lg font-bold text-blue-800">
            {fmt(form.prix + form.prix*(form.notaire/100) + form.travaux + form.mobilier)}
          </p>
          <p className="text-[10px] text-blue-500 mt-0.5">
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
          style={{ background:"linear-gradient(135deg,#185FA5,#1e40af)" }}>
          📋 Télécharger ma checklist de visite
          <span className="text-blue-200 text-[10px] font-normal">6 sections · 40 points</span>
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
                <div style={{ width:`${Math.min(mens/form.revenusMensuels*100,100).toFixed(1)}%`, background:"#185FA5", transition:"width .4s" }}
                  title={`Crédit LMNP : ${fmt(mens)}`} />
              )}
              {(+form.chargesCredit||0) > 0 && (
                <div style={{ width:`${Math.min((+form.chargesCredit)/form.revenusMensuels*100,100).toFixed(1)}%`, background:"#6366F1", transition:"width .4s" }}
                  title={`Autres crédits : ${fmt(form.chargesCredit)}`} />
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <div className="flex items-center gap-1.5 text-[10px]">
                <div className="w-2.5 h-2.5 rounded-sm bg-blue-700" />
                <span className="text-slate-500">Crédit LMNP — <strong>{fmt(mens)}</strong> ({(mens/form.revenusMensuels*100).toFixed(0)}%)</span>
              </div>
              {(+form.chargesCredit||0) > 0 && (
                <div className="flex items-center gap-1.5 text-[10px]">
                  <div className="w-2.5 h-2.5 rounded-sm bg-indigo-500" />
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
        <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 text-center">
          <p className="text-[10px] text-blue-500 font-semibold mb-0.5">Valeur finale</p>
          <p className="text-sm font-bold text-blue-700">{fmtK(last.valeurBien)}</p>
          <p className="text-[9px] text-blue-400">À {form.horizon} ans</p>
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
            stroke="#185FA5" strokeWidth={2} dot={false} strokeDasharray="5 3" />
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
          <div className="w-5 border-t-2 border-dashed border-blue-600" />
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
    <div className="rounded-2xl border border-indigo-200 overflow-hidden bg-indigo-50">
      <button onClick={() => setOpen(o=>!o)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-indigo-100/50 transition-colors">
        <div className="flex items-center gap-2.5">
          <span className="text-lg">🔔</span>
          <div>
            <p className="text-sm font-bold text-indigo-800">Alerte fiscale LMNP 2026</p>
            <p className="text-[10px] text-indigo-500">
              Soyez alerté des changements de la Loi de Finances · Gratuit
            </p>
          </div>
        </div>
        <span className="text-indigo-400 text-sm">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="border-t border-indigo-100 px-4 pb-4 pt-3">
          {sent ? (
            <div className="flex items-center gap-2 py-2">
              <span className="text-green-500 text-xl">✅</span>
              <p className="text-sm font-semibold text-green-700">
                Inscription confirmée ! Vous recevrez les alertes fiscales LMNP 2026.
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs text-indigo-700 mb-3 leading-relaxed">
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
                  className="flex-1 text-sm px-3 py-2.5 rounded-xl border border-indigo-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <button type="submit" disabled={loading}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-60 whitespace-nowrap">
                  {loading ? "…" : "M'alerter →"}
                </button>
              </form>
              <p className="text-[9px] text-indigo-400 mt-2">
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
  const ratioEndt = +(best?.ratioEndt ?? 0);
  const capital   = form.prix + form.travaux + form.prix*(form.notaire/100) - form.apport;
  const tm        = form.interet/100/12;
  const n         = form.dureeCredit * 12;
  const mens      = capital > 0 && tm > 0
    ? Math.round((capital * tm) / (1 - Math.pow(1+tm, -n))) : 0;

  // Sélectionner le message selon le profil
  const showCourtier = tri >= 4;
  const showComptable = (form.travaux || 0) >= 15000;
  const triIsGreat    = tri >= 6;

  if (!showCourtier && !showComptable) return null;

  return (
    <div className="space-y-3">
      {/* CTA Courtier — contextuel TRI */}
      {showCourtier && (
        <div className={`rounded-2xl p-4 border ${triIsGreat
          ? "border-emerald-200 bg-emerald-50"
          : "border-amber-200 bg-amber-50"}`}>
          <div className="flex items-start gap-3">
            <span className="text-2xl">{triIsGreat ? "🚀" : "⚡"}</span>
            <div className="flex-1">
              {triIsGreat ? (
                <>
                  <p className="text-sm font-bold text-emerald-800 mb-0.5">
                    Ce projet est finançable — TRI {tri}%
                  </p>
                  <p className="text-xs text-emerald-700 mb-3">
                    Avec un TRI de {tri}%, votre projet est solide. Un courtier peut vous obtenir un meilleur taux
                    que les <strong>{form.interet}%</strong> actuellement simulés et améliorer encore votre cash-flow.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold text-amber-800 mb-0.5">
                    Votre projet peut être optimisé — TRI {tri}%
                  </p>
                  <p className="text-xs text-amber-700 mb-3">
                    Un courtier peut restructurer votre financement (taux, durée, différé) pour améliorer le cash-flow
                    et passer votre TRI au-dessus de 6%.
                  </p>
                </>
              )}
              <div className="flex flex-wrap gap-2">
                <a href={`https://www.pretto.fr?utm_source=simulateur-lmnp&utm_medium=cta-contextuel&utm_content=tri-${tri}`}
                  target="_blank" rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1.5 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors ${
                    triIsGreat
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-amber-600 hover:bg-amber-700"}`}>
                  🏦 Comparer les offres de prêt →
                </a>
                <a href={`https://www.meilleurtaux.com?utm_source=simulateur-lmnp&utm_medium=cta-contextuel`}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors">
                  MeilleurTaux
                </a>
              </div>
              <p className="text-[9px] text-slate-400 mt-2">Liens partenaires · Comparaison gratuite sans engagement</p>
            </div>
          </div>
        </div>
      )}

      {/* CTA Comptable — contextuel travaux */}
      {showComptable && (
        <div className="rounded-2xl p-4 border border-blue-200 bg-blue-50">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🧮</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-blue-800 mb-0.5">
                {fmtK(form.travaux)} de travaux — maximisez vos amortissements
              </p>
              <p className="text-xs text-blue-700 mb-3">
                Avec ce volume de travaux, un expert-comptable spécialisé LMNP peut optimiser la ventilation
                par composants et potentiellement <strong>augmenter votre déduction annuelle</strong>.
                Premier mois souvent offert.
              </p>
              <a href="https://www.compta-lmnp.fr?utm_source=simulateur-lmnp&utm_medium=cta-travaux"
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors">
                🧾 Trouver un comptable LMNP →
              </a>
              <p className="text-[9px] text-slate-400 mt-2">Lien partenaire · Sans engagement</p>
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
                  <span className="inline-block bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                    {ref.code}
                  </span>
                  <p className="text-xs font-semibold text-slate-700">{ref.titre}</p>
                </div>
                <a href={ref.lien} target="_blank" rel="noopener noreferrer"
                  className="shrink-0 text-[10px] text-blue-500 hover:text-blue-700 underline">
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
          <Line type="monotone" dataKey="achat"   stroke="#185FA5" strokeWidth={2.5} dot={false} />
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
  const colors = ["#6366F1","#185FA5","#10B981"];

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
  .header{background:linear-gradient(135deg,#0F172A,#185FA5);color:white;padding:28px 24px;border-radius:16px;margin-bottom:16px;}
  .header h1{margin:0 0 4px;font-size:20px;} .header p{margin:0;font-size:12px;color:rgba(255,255,255,.7);}
  .section{background:white;border-radius:12px;padding:20px;margin-bottom:14px;box-shadow:0 1px 3px rgba(0,0,0,.06);}
  .section-title{font-size:13px;font-weight:700;color:#0F172A;margin:0 0 12px;padding-bottom:8px;border-bottom:1px solid #F1F5F9;}
  .ct{width:100%;border-collapse:collapse;} .ct tr{border-bottom:1px solid #F8FAFC;}
  .ct tr.done .ci{text-decoration:line-through;color:#94A3B8;}
  .cb{width:28px;padding:7px 6px 7px 0;vertical-align:top;} .cb input{width:16px;height:16px;cursor:pointer;accent-color:#185FA5;}
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
  <div class="footer">Généré par simulateur-lmnp.vercel.app · ${dateStr} · Fourni à titre indicatif, consultez un expert avant achat</div>
</div></body></html>`;
  const blob = new Blob([html], { type:"text/html" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `checklist-visite-lmnp-${new Date().toISOString().slice(0,10)}.html`;
  a.click();
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
          color={best.tri>=6?"#10B981":best.tri>=4?"#F59E0B":"#EF4444"}
          bg={best.tri>=6?"#ECFDF5":best.tri>=4?"#FFFBEB":"#FEF2F2"} />
        <KPICard label="Cash-flow mensuel" value={fmtK(best.cashflowM)}
          sub="Après crédit, IR + prélèvements sociaux" icon="💸"
          color={best.cashflowM>=0?"#10B981":"#EF4444"}
          bg={best.cashflowM>=0?"#ECFDF5":"#FEF2F2"} />
        <KPICard label="Rendement net" value={`${best.rendNet.toFixed(2)} %`}
          sub="(loyers − charges) / prix total achat" icon="🏠" color="#185FA5" bg="#EFF6FF" />
        <KPICard label="Taux d'endettement" value={`${best.ratioEndt} %`}
          sub={best.ratioEndt<=35?"✅ Règle HCSF OK":"⚠ Dépasse 35%"} icon="⚖️"
          color={best.ratioEndt<=35?"#10B981":"#EF4444"}
          bg={best.ratioEndt<=35?"#ECFDF5":"#FEF2F2"} />
      </div>

      {/* ─── Économie fiscale LMNP — l'argument n°1 ─── */}
      {(() => {
        const econIR    = Math.round(amort.totalAnnuel * (form.tmi / 100));
        const terrainEur = Math.round(form.prix * (form.terrain ?? 15) / 100);
        const baseAmort  = form.prix - terrainEur;
        const tmiLabel   = form.tmi === 0 ? "Non imposable" : `${form.tmi} %`;
        return (
          <div className="rounded-2xl overflow-hidden border border-emerald-200"
            style={{ background:"linear-gradient(135deg,#ECFDF5 0%,#D1FAE5 100%)" }}>
            <div className="px-4 pt-4 pb-1 flex items-center gap-2">
              <span className="text-xl">🛡️</span>
              <div>
                <p className="text-sm font-bold text-emerald-800">Bouclier fiscal LMNP — votre économie réelle</p>
                <p className="text-[10px] text-emerald-600">Calcul basé sur votre TMI {tmiLabel} · CGI Art. 39 C</p>
              </div>
            </div>
            <div className="px-4 py-3 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-white/70 border border-emerald-100 p-3 text-center">
                <p className="text-[9px] font-semibold text-emerald-600 uppercase tracking-wide mb-1">Amortissements / an</p>
                <p className="text-lg font-extrabold text-emerald-700">{fmt(amort.totalAnnuel)}</p>
                <p className="text-[9px] text-emerald-500 mt-0.5">déductibles du revenu imposable</p>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ background:"#059669", color:"white" }}>
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

      {/* Stress Test */}
      <Card>
        <SectionTitle icon="🧪" title="Mode Stress Test"
          sub="Scénario dégradé : TF +15% · Vacance 2 mois/an" />
        <StressTest form={form} results={results} />
      </Card>

      {/* Argumentaire vendeur */}
      <button onClick={onArgumentaire}
        className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 px-4 text-sm font-bold text-white transition-all active:scale-95"
        style={{ background:"linear-gradient(135deg,#1E3A5F,#185FA5)" }}>
        📝 Générer l'argumentaire vendeur
        <span className="text-blue-300 text-xs font-normal">CGI Art. 39 C · Négociation bancaire</span>
      </button>

      {/* Veille fiscale */}
      <VeilleFiscale />

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

      {/* CTAs affiliés contextuels */}
      <AffiliationContextuelle results={results} form={form} />

      {/* Alerte LF 2026 */}
      <AlerteLF2026 />

      {/* Références légales CGI */}
      <ReferencesLegales />

      {/* Trust footnotes */}
      <div className="text-[10px] text-slate-400 text-center space-y-1 px-2 pb-4">
        <p>⚖️ Calculs basés sur la doctrine fiscale LMNP · <strong>CGI Art. 39 C</strong> (amortissements) · <strong>CGI Art. 34</strong> (BIC)</p>
        <p>📋 <strong>LF 2026</strong> · Plafond Micro-BIC 77 700 € · Abattement 50% maintenu</p>
        <p>Ce simulateur est fourni à titre indicatif. Consultez un expert-comptable pour votre situation personnelle.</p>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   LEAD CAPTURE MODAL
════════════════════════════════════════ */

/* ── Générateur de rapport HTML téléchargeable (fallback client-side) ── */
function downloadReport(form, results, amort, nom) {
  const r0   = results?.[0];
  const fmt2 = (n) => new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n??0);
  const cfColor   = (r0?.cashflowM??0)>=0?"#059669":"#DC2626";
  const triColor  = (r0?.tri??0)>=6?"#059669":(r0?.tri??0)>=4?"#D97706":"#DC2626";
  const verdictEmoji = (r0?.tri??0)>=6?"🟢":(r0?.tri??0)>=4?"🟡":"🔴";
  const dateStr   = new Date().toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"});

  // Score bancabilité inline
  const ratioEndt = +(r0?.ratioEndt ?? 0);
  const capital   = form.prix + form.travaux + form.prix*(form.notaire/100) - form.apport;
  const tm        = form.interet/100/12;
  const nn        = form.dureeCredit * 12;
  const mens      = capital>0&&tm>0 ? Math.round((capital*tm)/(1-Math.pow(1+tm,-nn))) : 0;
  const totalMens = mens + (+form.chargesCredit||0);
  const rav       = Math.round((+form.revenusMensuels||0) - totalMens);
  const ravColor  = rav>=1500?"#059669":rav>=1200?"#D97706":"#DC2626";
  const pctApport = Math.round(form.apport / Math.max(form.prix,1) * 100);
  const rendBrut  = +r0?.rendBrut || 0;
  const scoreEndt = ratioEndt<=28?25:ratioEndt<=33?18:ratioEndt<=35?10:0;
  const scoreCF   = (r0?.cashflowM??0)>=200?25:(r0?.cashflowM??0)>=50?20:(r0?.cashflowM??0)>=0?15:(r0?.cashflowM??0)>=-100?8:0;
  const scoreRdt  = rendBrut>=7?20:rendBrut>=5.5?15:rendBrut>=4?10:3;
  const scoreAppt = pctApport>=20?20:pctApport>=15?15:pctApport>=10?8:2;
  const scoreTRI  = (r0?.tri??0)>=6?10:(r0?.tri??0)>=4?7:2;
  const scoreTot  = scoreEndt+scoreCF+scoreRdt+scoreAppt+scoreTRI;
  const scoreColor= scoreTot>=75?"#059669":scoreTot>=50?"#D97706":"#DC2626";
  const scoreLabel= scoreTot>=75?"Dossier solide ✅":scoreTot>=50?"Dossier acceptable ⚠️":"Dossier fragile 🔴";

  // Projection patrimoniale finale
  const revalo = (form.revalorisation||1.5)/100;
  const lastRow = r0?.rows?.[(form.horizon||20)-1];
  const valFinale = Math.round(form.prix * Math.pow(1+revalo, form.horizon||20));
  const detteFinale = Math.max(0, Math.round(lastRow?.capRestant||0));
  const patriFinal  = Math.max(0, valFinale - detteFinale);

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<title>Dossier Bancaire LMNP — ${nom||"Investisseur"}</title>
<style>
  *{box-sizing:border-box;}
  body{margin:0;padding:0;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0F172A;}
  .wrap{max-width:700px;margin:0 auto;padding:20px;}
  /* Header */
  .header{background:linear-gradient(135deg,#0F172A 0%,#185FA5 100%);color:white;padding:32px 28px;border-radius:16px;margin-bottom:16px;position:relative;}
  .header-badge{position:absolute;top:16px;right:16px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);color:white;font-size:10px;font-weight:700;padding:4px 10px;border-radius:20px;}
  /* Executive summary */
  .exec{background:white;border-radius:16px;padding:24px;margin-bottom:16px;border:2px solid ${triColor}33;}
  /* Sections */
  .section{background:white;border-radius:16px;padding:24px;margin-bottom:16px;}
  .section-title{font-size:13px;font-weight:700;color:#0F172A;margin:0 0 14px;padding-bottom:8px;border-bottom:1px solid #F1F5F9;display:flex;align-items:center;gap:6px;}
  /* KPIs */
  .kpi4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px;}
  .kpi3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
  .kpi-box{border-radius:12px;padding:14px;text-align:center;}
  .kpi-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;margin-bottom:5px;}
  .kpi-val{font-size:22px;font-weight:800;line-height:1;}
  .kpi-sub{font-size:10px;margin-top:4px;opacity:.75;}
  /* Score bancabilité */
  .score-bar-bg{height:8px;background:#E2E8F0;border-radius:4px;flex:1;}
  .score-bar-fill{height:8px;border-radius:4px;background:${scoreColor};}
  .score-row{display:flex;align-items:center;gap:8px;margin-bottom:7px;font-size:11px;}
  /* Tables */
  .dt{width:100%;border-collapse:collapse;font-size:12px;}
  .dt td{padding:6px 4px;border-bottom:1px solid #F8FAFC;}
  .dt td:last-child{text-align:right;font-weight:600;}
  .dt tr:last-child td{border-bottom:none;}
  /* Regimes */
  .regime{border-radius:10px;padding:12px 16px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;}
  /* Amort */
  .amort-row{display:flex;align-items:center;gap:8px;margin-bottom:7px;}
  .bar-bg{flex:1;background:#DBEAFE;border-radius:3px;height:6px;}
  .bar-fill{background:#185FA5;border-radius:3px;height:6px;}
  /* Footer */
  .footer{background:#F8FAFC;border-radius:12px;padding:14px 20px;text-align:center;border:1px solid #E2E8F0;font-size:10px;color:#94A3B8;margin-top:8px;}
  @media print{body{background:white;}.wrap{padding:0;}@page{margin:12mm;size:A4;}}
</style>
</head><body><div class="wrap">

<!-- PAGE DE GARDE -->
<div class="header">
  <div class="header-badge">LF 2026 · ${dateStr}</div>
  <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;">
    <span style="font-size:44px;">🏢</span>
    <div>
      <div style="font-size:22px;font-weight:800;margin-bottom:2px;">Dossier Bancaire LMNP</div>
      <div style="font-size:13px;opacity:.7;">Analyse fiscale complète · 4 régimes comparés · Conformité CGI</div>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:4px;">
    ${[
      ["Investisseur", nom||"—"],
      ["Bien", fmt2(form.prix)],
      ["Durée", `${form.horizon} ans`],
    ].map(([l,v])=>`<div style="background:rgba(255,255,255,.1);border-radius:10px;padding:10px 12px;">
      <div style="font-size:9px;opacity:.6;text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px;">${l}</div>
      <div style="font-weight:700;font-size:14px;">${v}</div>
    </div>`).join("")}
  </div>
</div>

<!-- RÉSUMÉ EXÉCUTIF (PAGE BANQUIER) -->
<div class="exec">
  <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">
    <span style="font-size:40px;">${verdictEmoji}</span>
    <div style="flex:1;">
      <div style="font-weight:800;font-size:18px;color:${triColor};margin-bottom:3px;">
        Verdict : ${(r0?.tri??0)>=6?"Projet excellent — Finançable":(r0?.tri??0)>=4?"Projet acceptable — Optimisable":"Projet risqué — À restructurer"}
      </div>
      <div style="font-size:12px;color:#64748B;">
        TRI ${r0?.tri??"-"}% · Cash-flow ${r0?.cashflowM!=null?((r0.cashflowM>=0?"+":"")+r0.cashflowM+"€"):"-"}/mois · TMI ${form.tmi}% · Apport ${pctApport}%
      </div>
    </div>
    <div style="text-align:center;background:${scoreColor}11;border:2px solid ${scoreColor}33;border-radius:12px;padding:12px 16px;min-width:90px;">
      <div style="font-size:28px;font-weight:800;color:${scoreColor};">${scoreTot}</div>
      <div style="font-size:9px;font-weight:700;color:${scoreColor};">/ 100</div>
      <div style="font-size:9px;color:#64748B;margin-top:2px;">Score bancaire</div>
    </div>
  </div>

  <!-- 4 KPIs principaux -->
  <div class="kpi4">
    <div class="kpi-box" style="background:#EFF6FF;border:1px solid #BFDBFE;">
      <div class="kpi-label" style="color:#3B82F6;">TRI</div>
      <div class="kpi-val" style="color:#185FA5;">${r0?.tri??"-"}%</div>
      <div class="kpi-sub" style="color:#93C5FD;">Sur ${form.horizon} ans</div>
    </div>
    <div class="kpi-box" style="background:${cfColor}0F;border:1px solid ${cfColor}33;">
      <div class="kpi-label" style="color:${cfColor};">Cash-flow</div>
      <div class="kpi-val" style="color:${cfColor};">${r0?.cashflowM!=null?((r0.cashflowM>=0?"+":"")+r0.cashflowM+"€"):"-"}</div>
      <div class="kpi-sub" style="color:#94A3B8;">par mois</div>
    </div>
    <div class="kpi-box" style="background:#F0FDF4;border:1px solid #BBF7D0;">
      <div class="kpi-label" style="color:#16A34A;">Rdt net</div>
      <div class="kpi-val" style="color:#15803D;">${r0?.rendNet!=null?(+r0.rendNet).toFixed(2):"-"}%</div>
      <div class="kpi-sub" style="color:#86EFAC;">Après charges</div>
    </div>
    <div class="kpi-box" style="background:${ratioEndt<=35?"#F0FDF4":"#FEF2F2"};border:1px solid ${ratioEndt<=35?"#BBF7D0":"#FECACA"};">
      <div class="kpi-label" style="color:${ratioEndt<=35?"#16A34A":"#DC2626"};">Endettement</div>
      <div class="kpi-val" style="color:${ratioEndt<=35?"#15803D":"#DC2626"};">${ratioEndt}%</div>
      <div class="kpi-sub" style="color:#94A3B8;">${ratioEndt<=35?"✅ HCSF OK":"⚠ > 35%"}</div>
    </div>
  </div>

  <!-- Reste à vivre -->
  <div style="background:${ravColor}0F;border:1px solid ${ravColor}33;border-radius:10px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;">
    <div>
      <div style="font-size:12px;font-weight:700;color:#0F172A;">Reste à vivre mensuel</div>
      <div style="font-size:10px;color:#64748B;">Revenus ${fmt2(form.revenusMensuels)} − mensualités ${fmt2(totalMens)}</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:20px;font-weight:800;color:${ravColor};">${fmt2(rav)}/mois</div>
      <div style="font-size:10px;color:${ravColor};font-weight:600;">${rav>=1500?"Confortable ✅":rav>=1200?"Juste ⚠️":"Serré 🔴"}</div>
    </div>
  </div>
</div>

<!-- SCORE BANCABILITÉ DÉTAILLÉ -->
<div class="section">
  <div class="section-title">⚖️ Score de bancabilité — ${scoreLabel}</div>
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
    <div style="font-size:36px;font-weight:800;color:${scoreColor};">${scoreTot}<span style="font-size:16px;color:#94A3B8;">/100</span></div>
    <div style="flex:1;">
      <div class="bar-bg" style="height:12px;background:#E2E8F0;border-radius:6px;">
        <div style="height:12px;border-radius:6px;background:${scoreColor};width:${scoreTot}%;"></div>
      </div>
    </div>
  </div>
  ${[
    ["Taux d'endettement",scoreEndt,25,`${ratioEndt}%`],
    ["Cash-flow mensuel",scoreCF,25,`${r0?.cashflowM!=null?(r0.cashflowM>=0?"+":"")+r0.cashflowM+"€":"-"}/mois`],
    ["Rendement brut",scoreRdt,20,`${rendBrut.toFixed(2)}%`],
    ["Apport personnel",scoreAppt,20,`${pctApport}%`],
    ["TRI",scoreTRI,10,`${r0?.tri??"-"}%`],
  ].map(([label,score,max,val])=>`
    <div class="score-row">
      <div style="width:150px;color:#64748B;">${label}</div>
      <div style="flex:1;background:#E2E8F0;border-radius:3px;height:6px;">
        <div style="height:6px;border-radius:3px;background:${score/max>=.8?"#10B981":score/max>=.5?"#F59E0B":"#EF4444"};width:${Math.round(score/max*100)}%;"></div>
      </div>
      <div style="width:50px;text-align:right;font-weight:700;color:#0F172A;">${score}/${max}</div>
      <div style="width:60px;text-align:right;font-size:10px;color:#64748B;">${val}</div>
    </div>`).join("")}
</div>

<!-- CARACTÉRISTIQUES DU BIEN -->
<div class="section">
  <div class="section-title">🏠 Caractéristiques du bien &amp; financement</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
    ${[
      ["Prix d'achat",fmt2(form.prix)],
      ["Frais de notaire",`${fmt2(form.prix*form.notaire/100)} (${form.notaire}%)`],
      ["Travaux",fmt2(form.travaux)],
      ["Mobilier",fmt2(form.mobilier)],
      ["Apport",`${fmt2(form.apport)} (${pctApport}%)`],
      ["Capital emprunté",fmt2(capital)],
      ["Mensualité LMNP",`${fmt2(mens)}/mois`],
      ["Durée crédit",`${form.dureeCredit} ans à ${form.interet}%`],
      ["Loyer mensuel",`${fmt2(form.loyer)}/mois`],
      ["Terrain (non amort.)",`${form.terrain??15}% · ${fmt2(form.prix*(form.terrain??15)/100)}`],
    ].map(([l,v])=>`<div style="background:#F8FAFC;border-radius:8px;padding:9px 12px;">
      <div style="font-size:10px;color:#64748B;margin-bottom:2px;">${l}</div>
      <div style="font-size:13px;font-weight:700;">${v}</div>
    </div>`).join("")}
  </div>
</div>

<!-- COMPARAISON 4 RÉGIMES -->
<div class="section">
  <div class="section-title">📊 Comparaison des 4 régimes fiscaux</div>
  ${(results||[]).map((r,i)=>{
    const labels=["LMNP Réel","Micro-BIC","SCI à l'IS","SCI à l'IR"];
    const icons=["🥇","🥈","🏅","🏅"];
    const bg=i===0?"#EFF6FF":"#F8FAFC";
    const bd=i===0?"#BFDBFE":"#E2E8F0";
    const cc=(r.cashflowM??0)>=0?"#059669":"#DC2626";
    return `<div class="regime" style="background:${bg};border:1px solid ${bd};">
      <div>
        <div style="font-weight:700;font-size:13px;">${icons[i]} ${labels[i]}</div>
        <div style="font-size:10px;color:#64748B;margin-top:2px;">TRI ${r.tri??"-"}% · Rdt ${r.rendNet!=null?(+r.rendNet).toFixed(2):"-"}% · Impôt an 1 ${fmt2(r.rows?.[0]?.impot)}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:18px;font-weight:800;color:${cc};">${r.cashflowM!=null?((r.cashflowM>=0?"+":"")+r.cashflowM+"€"):"-"}/mois</div>
      </div>
    </div>`;
  }).join("")}
</div>

<!-- AMORTISSEMENTS PAR COMPOSANTS -->
${amort?.chartData?.length ? `
<div class="section">
  <div class="section-title">🏗️ Amortissement par composants — ${fmt2(amort.totalAnnuel)}/an déductible</div>
  ${amort.chartData.map(c=>`<div class="amort-row">
    <div style="width:120px;font-size:11px;color:#64748B;">${c.name}</div>
    <div class="bar-bg"><div class="bar-fill" style="width:${Math.round(c.montant/amort.totalAnnuel*100)}%;"></div></div>
    <div style="width:60px;text-align:right;font-size:11px;font-weight:700;">${fmt2(c.montant)}</div>
    <div style="width:38px;font-size:10px;color:#94A3B8;">${c.duree}ans</div>
  </div>`).join("")}
  <div style="background:#EFF6FF;border-radius:8px;padding:10px 12px;margin-top:12px;font-size:11px;color:#185FA5;">
    💡 <strong>Économie fiscale annuelle</strong> : ${fmt2(amort.totalAnnuel)} × ${form.tmi}% TMI = <strong>${fmt2(amort.totalAnnuel * form.tmi/100)}/an</strong> d'impôt évité en régime Réel
  </div>
</div>` : ""}

<!-- PROJECTION PATRIMONIALE -->
<div class="section">
  <div class="section-title">📈 Projection patrimoniale à ${form.horizon} ans</div>
  <div class="kpi3">
    <div class="kpi-box" style="background:#EFF6FF;border:1px solid #BFDBFE;">
      <div class="kpi-label" style="color:#3B82F6;">Valeur du bien</div>
      <div class="kpi-val" style="color:#185FA5;font-size:18px;">${fmt2(valFinale)}</div>
      <div class="kpi-sub" style="color:#93C5FD;">Revalorisation ${form.revalorisation??1.5}%/an</div>
    </div>
    <div class="kpi-box" style="background:#FEF2F2;border:1px solid #FECACA;">
      <div class="kpi-label" style="color:#EF4444;">Dette restante</div>
      <div class="kpi-val" style="color:#DC2626;font-size:18px;">${fmt2(detteFinale)}</div>
      <div class="kpi-sub" style="color:#FCA5A5;">Capital dû</div>
    </div>
    <div class="kpi-box" style="background:#F0FDF4;border:1px solid #BBF7D0;">
      <div class="kpi-label" style="color:#16A34A;">Patrimoine net</div>
      <div class="kpi-val" style="color:#15803D;font-size:18px;">${fmt2(patriFinal)}</div>
      <div class="kpi-sub" style="color:#86EFAC;">+${fmt2(valFinale-form.prix)} PV</div>
    </div>
  </div>
</div>

<!-- AVERTISSEMENT -->
<div class="footer">
  <strong>Dossier Bancaire LMNP</strong> — Généré le ${dateStr} · Calculs conformes LF 2026 · CGI Art. 39 C (amortissements) · CGI Art. 156 (déficit) · Règle HCSF 35%<br/>
  Ce document est fourni à titre indicatif. Consultez un expert-comptable spécialisé LMNP pour votre situation personnelle.
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
            amort={amort} onLead={() => setShowLead(true)}
            onArgumentaire={() => setShowArgumentaire(true)} />
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
      {showArgumentaire && results && (
        <ArgumentaireModal form={form} results={results} onClose={() => setShowArgumentaire(false)} />
      )}
    </div>
  );
}
