"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
);

const fmt    = (n) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n ?? 0);
const fmtPct = (n) => `${(+n || 0).toFixed(2)} %`;
const fmtK   = (n) => Math.abs(n ?? 0) >= 1000 ? `${((n ?? 0) / 1000).toFixed(1)}k€` : fmt(n);

const LEXIQUE = {
  "TRI": "Taux de Rendement Interne. Mesure la rentabilité globale en tenant compte de tous les flux sur la durée de détention.",
  "Cash-flow": "Différence mensuelle entre les loyers et toutes les charges : mensualité, taxes, assurance, impôt.",
  "Amortissement": "En LMNP, déduction fiscale correspondant à la dépréciation comptable du bien et du mobilier.",
  "Déficit foncier": "En Location Nue, si les charges dépassent les loyers, l'excédent (max 10 700€/an) est déductible du revenu global.",
  "TMI": "Taux Marginal d'Imposition. Taux applicable à la dernière tranche de vos revenus (11%, 30%, 41%, 45%).",
  "Différé": "Période après le déblocage du prêt pendant laquelle vous ne remboursez pas (ou partiellement) le capital.",
  "Micro-BIC": "Régime simplifié LMNP : abattement forfaitaire de 50% sur les loyers, sans déduction des charges réelles.",
  "Rendement brut": "Loyers annuels bruts / prix d'acquisition total. Indicateur avant charges et impôts.",
  "Rendement net": "Rendement après déduction de toutes les charges et impôts.",
  "Plus-value": "Gain à la revente. En IR, bénéficie d'abattements progressifs jusqu'à exonération totale à 30 ans.",
  "DPE": "Diagnostic de Performance Énergétique. Classes A (économe) à G (énergivore). Impact sur valeur et attractivité.",
  "Ratio d'endettement": "Part des revenus consacrée aux crédits. Les banques imposent généralement un max de 35% (règle HCSF).",
  "SCI IS": "SCI à l'IS : amortissements possibles, IS 15%/25%, mais flat tax 30% sur les dividendes distribués.",
  "SCI IR": "SCI transparente : chaque associé déclare sa quote-part en revenus fonciers à sa TMI.",
};

const DEFAULTS = {
  prenom: "", nom: "", email: "", situationPro: "Salarié CDI", anciennete: 5,
  situationFam: "Marié(e)", cdi: true,
  revenusMensuels: 4500, autresRevenus: 0, chargesCredit: 0, tmi: 30,
  adresseBien: "", typeBien: "Appartement", surface: 45, dpe: "C",
  prix: 180000, notaire: 8, travaux: 10000, mobilier: 5000,
  apport: 30000, interet: 3.45, dureeCredit: 20, horizon: 15,
  differe: 0, typeDiffere: "partiel",
  loyer: 850, charges: 120, taxeFonciere: 1200, vacance: 5, revalorisation: 1.5,
};

const STEPS = [
  { id: "emprunteur",   label: "Emprunteur", icon: "👤" },
  { id: "bien",         label: "Le Bien",    icon: "🏠" },
  { id: "financement",  label: "Crédit",     icon: "🏦" },
  { id: "exploitation", label: "Loyers",     icon: "📊" },
  { id: "resultats",    label: "Résultats",  icon: "📈" },
];



function amortCredit(capital, tauxAnnuel, dureeAns, differe = 0, typeDiffere = "partiel") {
  const tm = tauxAnnuel / 100 / 12;
  const n  = dureeAns * 12;
  let capitalApres = capital;
  let mensualiteDiffere = 0;
  if (differe > 0) {
    if (typeDiffere === "total") {
      capitalApres = capital * Math.pow(1 + tm, differe);
    } else {
      mensualiteDiffere = Math.round(capital * tm);
    }
  }
  const mensualite = capitalApres > 0 && tm > 0 ? (capitalApres * tm) / (1 - Math.pow(1 + tm, -n)) : 0;
  let cap = capitalApres;
  const rows = [];
  for (let yr = 1; yr <= 20; yr++) {
    if (yr > dureeAns) { rows.push({ an: yr, interets: 0, capital: 0, capRestant: 0, mensualite: 0 }); continue; }
    let iAn = 0, cAn = 0;
    for (let m = 0; m < 12; m++) {
      const im = cap * tm;
      const cm = Math.min(mensualite - im, cap);
      iAn += im; cAn += cm; cap = Math.max(0, cap - cm);
    }
    rows.push({ an: yr, interets: Math.round(iAn), capital: Math.round(cAn), capRestant: Math.round(cap), mensualite: Math.round(mensualite) });
  }
  return { mensualite, mensualiteDiffere, rows };
}

function calcTRI(cfs, horizon) {
  const slice = cfs.slice(0, horizon + 1);
  let lo = -0.5, hi = 5;
  const npv = (r) => slice.reduce((a, cf, i) => a + cf / Math.pow(1 + r, i), 0);
  for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; npv(m) > 0 ? (lo = m) : (hi = m); }
  return ((lo + hi) / 2) * 100;
}

function pvAbatt(an) {
  return {
    ir: an <= 5 ? 0 : Math.min(1, 0.06 * (an - 5)),
    ps: an <= 5 ? 0 : Math.min(1, 0.015 * (an - 5)),
  };
}

function feuxTricolores(tri, cashflowM, ratioEndt) {
  if (tri >= 6 && cashflowM >= 0 && ratioEndt <= 35)
    return { color: "#059669", bg: "#F0FDF4", border: "#86EFAC", label: "Projet solide", emoji: "🟢" };
  if (tri < 2 || cashflowM < -400 || ratioEndt > 45)
    return { color: "#DC2626", bg: "#FFF1F2", border: "#FECDD3", label: "Points critiques", emoji: "🔴" };
  return { color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", label: "À optimiser", emoji: "🟠" };
}

function runCalc(p, type) {
  const fn  = p.prix * p.notaire / 100;
  const inv = p.prix + fn + p.travaux;
  const cap = Math.max(0, inv - p.apport);
  const { mensualite, rows } = amortCredit(cap, p.interet, p.dureeCredit, p.differe || 0, p.typeDiffere || "partiel");
  const loyers  = p.loyer * 12 * (1 - p.vacance / 100);
  const charges = p.charges * 12 + p.taxeFonciere;
  const tg      = (p.tmi + 17.2) / 100;
  const withAmort = type === "lmnp" || type === "sciis";
  const amBati  = withAmort ? (p.prix * 0.85) / 30 : 0;
  const amTrav  = withAmort && p.travaux > 0 ? p.travaux / 10 : 0;
  const amMob   = type === "lmnp" ? (p.mobilier || 5000) / 7 : 0;
  const amTot   = amBati + amTrav + amMob;
  let defRep = 0, cumCF = 0, amCum = 0;
  const cfs = [-p.apport];
  const proj = [];
  for (let yr = 1; yr <= 20; yr++) {
    const r = rows[yr - 1];
    amCum += amTot;
    const res = loyers - charges - r.interets - amTot;
    let imp = 0, eco = 0, nd = defRep;
    if (type === "sciis") {
      if (res < 0) { nd = defRep + Math.abs(res); }
      else { const u = Math.min(defRep, res); nd = defRep - u; const ri = res - u; imp = ri <= 42500 ? ri * 0.15 : 42500 * 0.15 + (ri - 42500) * 0.25; }
    } else if (type === "nue" || type === "sciir") {
      const rev = loyers - charges - r.interets;
      if (rev < 0) { const imp2 = Math.min(Math.abs(rev), 10700); eco = imp2 * (p.tmi / 100); nd = defRep + Math.abs(rev) - imp2; }
      else { const u = Math.min(defRep, rev); imp = (rev - u) * tg; nd = Math.max(0, defRep - rev); }
    } else {
      if (res < 0) { nd = defRep + Math.abs(res); }
      else { const u = Math.min(defRep, res); imp = (res - u) * tg; nd = defRep - u; }
    }
    defRep = nd;
    const cf = loyers - charges - r.mensualite * 12 - imp + eco;
    cumCF += cf;
    const val = p.prix * Math.pow(1 + p.revalorisation / 100, yr);
    const pv  = Math.max(0, val - p.prix);
    const ab  = pvAbatt(yr);
    let pvImp = 0, net = 0;
    if (type === "sciis") {
      const vcn = Math.max(0, inv - amCum);
      const pvS = Math.max(0, val - vcn);
      const isP = pvS <= 42500 ? pvS * 0.15 : 42500 * 0.15 + (pvS - 42500) * 0.25;
      const netS = val - r.capRestant - isP;
      const dist = Math.max(0, netS - p.apport);
      pvImp = isP + dist * 0.30;
      net   = netS - dist * 0.30;
    } else {
      pvImp = pv * (0.19 * (1 - ab.ir) + 0.172 * (1 - ab.ps));
      net   = val - r.capRestant - pvImp;
    }
    cfs.push(yr === p.horizon ? cf + net : cf);
    proj.push({ an: yr, cf: Math.round(cf), cfM: Math.round(cf / 12), cum: Math.round(cumCF), imp: Math.round(imp), val: Math.round(val), pvImp: Math.round(pvImp), patNet: Math.round(net + cumCF - p.apport), loyers: Math.round(loyers), charges: Math.round(charges), mensAn: Math.round(r.mensualite * 12) });
  }
  const rE = p.revenusMensuels > 0 ? (mensualite / (p.revenusMensuels + p.loyer * 0.7)) * 100 : 0;
  const microImpAn = type === "lmnp" ? (p.loyer * 12 * 0.5 * tg) : null;
  const configs = {
    lmnp:  { type: "LMNP Réel",    color: "#185FA5" },
    nue:   { type: "Location Nue", color: "#B45309" },
    sciis: { type: "SCI IS",       color: "#7C3AED" },
    sciir: { type: "SCI IR",       color: "#059669" },
  };
  const fiscalInfos = {
    lmnp:  [["Régime","LMNP Réel simplifié (BIC)"],["Amort. bien",`${fmt(amBati)}/an`],["Amort. mobilier",`${fmt(amMob)}/an`],["Déficit","Illimité sur BIC futurs"],["PV","Abattement particuliers (exo IR 22 ans)"],["Atout","Impôt quasi nul 10-15 ans grâce aux amortissements"]],
    nue:   [["Régime","Revenus fonciers réel"],["Amortissement","NON"],["Déficit foncier","Max 10 700€/an sur revenu global"],["PV","Abattement particuliers"],["Atout","Simplicité, pas de comptabilité complexe"]],
    sciis: [["Régime","SCI à l'IS"],["IS","15% ≤42 500€ puis 25%"],["Amort. bien",`${fmt(amBati)}/an`],["Distribution","Flat tax 30% sur dividendes"],["PV","IS + flat tax, aucun abattement durée"],["Atout","IS 15% avantageux si TMI ≥ 30%"]],
    sciir: [["Régime","SCI translucide IR"],["Imposition","Quote-part revenus fonciers à la TMI"],["Amortissement","NON"],["Déficit foncier","Max 10 700€/associé/an"],["PV","Abattement particuliers"],["Atout","Structure juridique sans IS"]],
  };
  return {
    ...configs[type],
    mensualite, investTotal: inv, fraisNotaire: fn, capital: cap,
    amortSchedule: rows, projections: proj,
    tri: calcTRI(cfs, p.horizon),
    rendBrut: (p.loyer * 12 / p.prix) * 100,
    rendNet:  ((loyers - charges) / inv) * 100,
    ratioEndt: rE, cashflowM: proj[0].cfM,
    horizonData: proj[Math.min(p.horizon, 20) - 1],
    amDetails: withAmort ? { amBati: Math.round(amBati), amTrav: Math.round(amTrav), amMob: Math.round(amMob), amTot: Math.round(amTot) } : null,
    microBIC: type === "lmnp" ? { impotAnnuel: Math.round(microImpAn), reelImpot: proj[0].imp, betterMicro: microImpAn < proj[0].imp } : null,
    fiscalInfo: fiscalInfos[type],
  };
}




function loadScripts(cb) {
  if (window._pdfReady) { cb(); return; }
  const s1 = document.createElement("script");
  s1.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
  s1.onload = () => {
    const s2 = document.createElement("script");
    s2.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js";
    s2.onload = () => { window._pdfReady = true; cb(); };
    document.head.appendChild(s2);
  };
  document.head.appendChild(s1);
}

function generatePDF(form, result) {
  loadScripts(() => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = 210, H = 297, ml = 15, mr = 15, cw = W - ml - mr;
    const C = { pri:[24,95,165], sec:[100,116,139], ok:[5,150,105], err:[220,38,38], bg:[248,250,252], bdr:[226,232,240], txt:[30,41,59], whi:[255,255,255], yel:[254,243,199], lbg:[240,245,255] };
    let pageNum = 0;
    const newPage = () => { if (pageNum > 0) doc.addPage(); pageNum++; };
    const setF = (sz, st = "normal", col = C.txt) => { doc.setFontSize(sz); doc.setFont("helvetica", st); doc.setTextColor(...col); };
    const fillR = (x, y, w, h, col, r = 0) => { doc.setFillColor(...col); r > 0 ? doc.roundedRect(x,y,w,h,r,r,"F") : doc.rect(x,y,w,h,"F"); };
    const pageHeader = (title, sub = "") => {
      fillR(0,0,W,18,C.pri); setF(9,"bold",C.whi); doc.text("DOSSIER D'INVESTISSEMENT IMMOBILIER", ml, 7);
      setF(7.5,"normal",[180,210,240]); doc.text(`${form.prenom} ${form.nom}  ·  ${form.adresseBien||"Bien immobilier"}`, ml, 13);
      doc.text(`Page ${pageNum}`, W-mr, 13, { align:"right" });
      setF(13,"bold",C.txt); doc.text(title, ml, 28);
      if (sub) { setF(8.5,"normal",C.sec); doc.text(sub, ml, 35); }
      return sub ? 42 : 36;
    };
    const pageFooter = () => {
      fillR(0,H-11,W,11,C.bg); doc.setDrawColor(...C.bdr); doc.setLineWidth(0.3);
      doc.line(ml,H-11,W-mr,H-11); setF(7,"normal",C.sec);
      doc.text("Document confidentiel — Simulateur LMNP Expert — "+new Date().toLocaleDateString("fr-FR"), W/2, H-4, { align:"center" });
    };
    const tbl = (startY, body, head=null, colStyles={}) => {
      doc.autoTable({ startY, margin:{left:ml,right:mr}, styles:{fontSize:8.5,cellPadding:2.8,halign:"right"},
        headStyles:{fillColor:C.pri,textColor:255,halign:"center",fontStyle:"bold"},
        alternateRowStyles:{fillColor:C.bg}, body, head, columnStyles:colStyles });
      return doc.lastAutoTable.finalY;
    };
    const bar = (y, label) => { fillR(ml,y,cw,7.5,C.pri,2); setF(8.5,"bold",C.whi); doc.text(label.toUpperCase(), ml+4, y+5.5); return y+11; };
    const lft = { halign:"left" };
    const bld = { halign:"left", fontStyle:"bold", fillColor:C.lbg };
    const feux = feuxTricolores(result.tri, result.cashflowM, result.ratioEndt);

 
    newPage();
    fillR(0,0,W,H,C.pri); fillR(18,45,W-36,H-90,C.whi,6);
    setF(20,"bold",C.whi); doc.text("DOSSIER", W/2, 22, { align:"center" });
    setF(12,"normal",[180,210,240]); doc.text("D'INVESTISSEMENT IMMOBILIER", W/2, 30, { align:"center" });
    fillR(W/2-42,53,84,12,[240,245,255],6); setF(13,"bold",C.pri); doc.text(result.type, W/2, 61, { align:"center" });
    setF(17,"bold",C.txt); doc.text(`${form.prenom} ${form.nom}`, W/2, 80, { align:"center" });
    setF(9.5,"normal",C.sec); doc.text(form.adresseBien||"Bien immobilier", W/2, 88, { align:"center" });
    const kw = (cw-10)/2+3;
    [{ l:"Cash-flow mensuel net", v:fmt(result.cashflowM), c:result.cashflowM>=0?C.ok:C.err },
     { l:"Taux d'endettement", v:fmtPct(result.ratioEndt), c:result.ratioEndt>35?C.err:C.ok },
     { l:`TRI sur ${form.horizon} ans`, v:fmtPct(result.tri), c:C.pri },
     { l:"Rendement net", v:fmtPct(result.rendNet), c:C.pri }].forEach((k,i) => {
      const kx=22+(i%2)*(kw+6), ky=100+Math.floor(i/2)*36;
      fillR(kx,ky,kw,28,C.bg,4); setF(7,"normal",C.sec); doc.text(k.l.toUpperCase(), kx+6, ky+8);
      setF(16,"bold",k.c); doc.text(k.v, kx+6, ky+20);
    });
    setF(8.5,"bold",feux.label.includes("solide")?C.ok:feux.label.includes("critique")?C.err:[217,119,6]);
    doc.text(`${feux.emoji} ${feux.label}`, W/2, 175, { align:"center" });
    setF(7,"italic",[200,215,235]); doc.text("Ne constitue pas un conseil en investissement.", W/2, H-28, { align:"center" });
    setF(8,"normal",[200,215,235]); doc.text("Généré le "+new Date().toLocaleDateString("fr-FR"), W/2, H-22, { align:"center" });

  
    newPage(); let y = pageHeader("Profil Emprunteur","Analyse de la situation financière et capacité bancaire"); pageFooter();
    y = bar(y,"Informations personnelles");
    y = tbl(y,[["Nom complet",`${form.prenom} ${form.nom}`,"Email",form.email||"—"],
               ["Situation pro.",form.situationPro||"—","Ancienneté",form.anciennete?form.anciennete+" ans":"—"],
               ["Situation fam.",form.situationFam||"—","TMI",fmtPct(form.tmi)]],
      null,{0:{...bld,cellWidth:48},1:lft,2:{...bld,cellWidth:48},3:lft});
    y = bar(y+7,"Revenus & capacité");
    const revT = (form.revenusMensuels||0)+(form.autresRevenus||0);
    y = tbl(y,[["Revenus nets mensuels",fmt(form.revenusMensuels),"Autres revenus",fmt(form.autresRevenus)],
               ["Total revenus",fmt(revT),"Capacité emprunt (35%)",fmt(revT*0.35)],
               ["Charges crédit existantes",fmt(form.chargesCredit),"Reste à vivre",fmt(revT-(form.chargesCredit||0))]],
      null,{0:{...bld,cellWidth:55},1:{},2:{...bld,cellWidth:55},3:{}});
    y = bar(y+7,"Impact sur le taux d'endettement");
    const loyPond=(form.loyer||0)*0.7, newCh=(form.chargesCredit||0)+result.mensualite, newRv=revT+loyPond, newR=newRv>0?(newCh/newRv)*100:0;
    y = tbl(y,[["Mensualité (ce projet)",fmt(result.mensualite),"Loyer pondéré 70%",fmt(loyPond)],
               ["Charges totales après projet",fmt(newCh),"Revenus retenus banque",fmt(newRv)],
               ["TAUX D'ENDETTEMENT",{content:fmtPct(newR),styles:{textColor:newR>35?C.err:C.ok,fontStyle:"bold",fontSize:10}},"Seuil bancaire","35 %"]],
      null,{0:{...bld,cellWidth:55},2:{...bld,cellWidth:55}});


    newPage(); y = pageHeader("Présentation du Bien & Plan de Financement"); pageFooter();
    y = bar(y,"Caractéristiques du bien");
    y = tbl(y,[["Adresse",form.adresseBien||"—","Type",form.typeBien||"—"],
               ["Surface",form.surface?form.surface+" m²":"—","Classe DPE",form.dpe||"—"],
               ["Régime fiscal",result.type,"Horizon revente",`${form.horizon} ans`]],
      null,{0:{...bld,cellWidth:40},1:lft,2:{...bld,cellWidth:40},3:lft});
    y = bar(y+7,"Plan de financement");
    y = tbl(y,[["Prix FAI",fmt(form.prix),"Apport personnel",fmt(form.apport)],
               ["Frais notaire",fmt(result.fraisNotaire),"Capital emprunté",fmt(result.capital)],
               ["Travaux",fmt(form.travaux),"Différé",form.differe>0?`${form.differe} mois (${form.typeDiffere})`:"Aucun"],
               ["TOTAL",{content:fmt(result.investTotal),styles:{fontStyle:"bold"}},"TOTAL",{content:fmt(result.investTotal),styles:{fontStyle:"bold"}}]],
      [["EMPLOIS","Montant","RESSOURCES","Montant"]],{0:{halign:"left",cellWidth:55},2:{halign:"left",cellWidth:55}});
    y = bar(y+7,"Conditions crédit");
    y = tbl(y,[["Capital emprunté",fmt(result.capital),"Taux annuel",fmtPct(form.interet)],
               ["Durée",`${form.dureeCredit} ans`,"Mensualité",fmt(result.mensualite)],
               ["Coût total crédit",fmt(result.mensualite*form.dureeCredit*12-result.capital),"Taux d'endettement",fmtPct(result.ratioEndt)]],
      null,{0:{...bld,cellWidth:55},2:{...bld,cellWidth:55}});
    y = bar(y+7,"Analyse locative");
    const loyers2=form.loyer*12*(1-form.vacance/100), chargesA=form.charges*12+form.taxeFonciere;
    y = tbl(y,[["Loyer mensuel HC",fmt(form.loyer),"Rendement brut",fmtPct(result.rendBrut)],
               ["Vacance",fmtPct(form.vacance),"Loyers nets/an",fmt(loyers2)],
               ["Charges/an",fmt(chargesA),"Rendement net",fmtPct(result.rendNet)],
               ["Cash-flow net/mois An1",{content:fmt(result.cashflowM),styles:{textColor:result.cashflowM>=0?C.ok:C.err,fontStyle:"bold"}},"Investissement total",fmt(result.investTotal)]],
      null,{0:{...bld,cellWidth:55},2:{...bld,cellWidth:55}});

    newPage(); y = pageHeader("Tableau d'Amortissement",`${form.dureeCredit} ans — ${fmtPct(form.interet)} — ${fmt(result.capital)}`); pageFooter();
    y = tbl(y, result.amortSchedule.slice(0,20).map((r)=>[`Année ${r.an}`,fmt(r.mensualite),fmt(r.interets),fmt(r.capital),fmt(r.capRestant)]),
      [["Année","Mensualité","Intérêts","Capital","Capital restant"]],{0:{halign:"left",fontStyle:"bold",cellWidth:28}});
    const totInt = result.amortSchedule.reduce((a,r)=>a+r.interets,0);
    y = doc.lastAutoTable.finalY; fillR(ml,y,cw,8,C.lbg,2); setF(8.5,"bold",C.pri);
    doc.text("Intérêts totaux payés : "+fmt(totInt), ml+4, y+5.5);

   
    newPage(); y = pageHeader("Projection Cash-Flow 20 ans","Après remboursement, charges et fiscalité"); pageFooter();
    y = tbl(y, result.projections.map((r)=>{
      const isH=r.an===form.horizon;
      const c=(v,e={})=>({content:v,styles:{fillColor:isH?[219,234,254]:null,...e}});
      return [{content:`A${r.an}`,styles:{fontStyle:isH?"bold":"normal",halign:"center",fillColor:isH?[219,234,254]:null}},
        c(fmt(r.loyers)),c(fmt(r.mensAn)),c(fmt(r.imp)),c(fmt(r.cf),{textColor:r.cf<0?C.err:C.ok,fontStyle:"bold"}),
        c(fmt(r.cfM),{textColor:r.cfM<0?C.err:C.ok}),c(fmt(r.cum)),c(fmt(r.val)),c(fmt(r.patNet),{textColor:r.patNet<0?C.err:C.pri,fontStyle:"bold"})];
    }),[["An","Loyers nets","Mensualité","Impôt","CF net/an","CF/mois","CF cumulé","Val. bien","Patrim. net"]],{0:{halign:"center",cellWidth:10}});

  
    newPage(); y = pageHeader("Analyse Fiscale & Optimisation",`Régime ${result.type}`); pageFooter();
    y = bar(y,`Règles fiscales — ${result.type}`);
    y = tbl(y, result.fiscalInfo, null, {0:{...bld,cellWidth:50},1:lft});
    if (result.amDetails) {
      y = bar(y+7,"Amortissements annuels");
      y = tbl(y,[["Amort. bâti",fmt(result.amDetails.amBati),"85% prix / 30 ans"],
                 ["Amort. travaux",fmt(result.amDetails.amTrav),"Travaux / 10 ans"],
                 result.amDetails.amMob?["Amort. mobilier",fmt(result.amDetails.amMob),"Mobilier / 7 ans"]:null,
                 ["TOTAL",{content:fmt(result.amDetails.amTot),styles:{fontStyle:"bold"}},"Déductible du résultat imposable"]].filter(Boolean),
        null,{0:{...bld,cellWidth:55},1:{cellWidth:30},2:lft});
    }
    if (result.microBIC) {
      y = bar(y+7,"Comparaison Micro-BIC vs Réel");
      y = tbl(y,[["Micro-BIC — impôt estimé An1",fmt(result.microBIC.impotAnnuel),"(abattement 50%)"],
                 ["Réel — impôt calculé An1",fmt(result.microBIC.reelImpot),"(amortissements déduits)"],
                 ["Régime recommandé",{content:result.microBIC.betterMicro?"MICRO-BIC":"RÉEL SIMPLIFIÉ",styles:{fontStyle:"bold",textColor:C.pri}},"pour ce projet"]],
        null,{0:{...bld,cellWidth:55},1:{cellWidth:35},2:lft});
    }
    y = bar(y+7,`Synthèse à l'horizon ${form.horizon} ans`);
    const hd=result.horizonData||result.projections[result.projections.length-1];
    y = tbl(y,[["Horizon de revente",`Année ${hd.an}`,"TRI",{content:fmtPct(result.tri),styles:{fontStyle:"bold",textColor:result.tri>=5?C.ok:C.err}}],
               ["CF cumulés",fmt(hd.cum),"Valeur estimée",fmt(hd.val)],
               ["Impôt plus-value",fmt(hd.pvImp),"Patrimoine net",{content:fmt(hd.patNet),styles:{fontStyle:"bold",textColor:C.pri}}]],
      null,{0:{...bld,cellWidth:55},2:{...bld,cellWidth:55}});

    
    newPage(); y = pageHeader("Synthèse & Arguments Bancaires"); pageFooter();
    const isOK = result.cashflowM>=0 && result.ratioEndt<=35;
    fillR(ml,y,cw,40,isOK?[240,253,244]:[255,241,242],4);
    doc.setDrawColor(...(isOK?C.ok:C.err)); doc.setLineWidth(0.5);
    doc.roundedRect(ml,y,cw,40,4,4,"S");
    setF(12,"bold",isOK?C.ok:C.err); doc.text(isOK?"✓  Projet bancairement viable":"⚠  Points d'attention", ml+8, y+12);
    setF(8.5,"normal",C.txt);
    doc.text([result.cashflowM>=0?`• Cash-flow positif : +${fmt(result.cashflowM)}/mois`:`• Effort mensuel : ${fmt(-result.cashflowM)}/mois`,
              result.ratioEndt<=35?`• Endettement : ${fmtPct(result.ratioEndt)} ✓ < 35%`:`• Endettement : ${fmtPct(result.ratioEndt)} > 35% — augmenter l'apport`,
              `• TRI ${form.horizon} ans : ${fmtPct(result.tri)} — ${result.tri>=8?"excellent":result.tri>=5?"satisfaisant":"à améliorer"}`],
      ml+8, y+22, { lineHeightFactor:1.65 });
    y += 48;
    y = bar(y,"Arguments clés bancaires");
    y = tbl(y,[["Projet",result.rendBrut>=5?`Rendement brut ${fmtPct(result.rendBrut)} — au-dessus du marché`:`Rendement ${fmtPct(result.rendBrut)} — confirmé par expertise`],
               ["Fiscalité",result.amDetails?`Amortissements ${fmt(result.amDetails.amTot)}/an → impôt quasi nul`:`Charges déductibles — régime optimisé`],
               ["Autofinancement",result.cashflowM>=0?`Autofinancement confirmé +${fmt(result.cashflowM)}/mois`:`Effort maîtrisé ${fmt(-result.cashflowM)}/mois`],
               ["Patrimoine",`À ${form.horizon} ans : patrimoine net estimé ${fmt(hd.patNet)} — TRI ${fmtPct(result.tri)}`],
               ["Garanties","Hypothèque conventionnelle — nantissement possible"],
               ["Sécurité","Vacance provisionnée ${fmtPct(form.vacance)} — loyer de marché confirmé"]],
      null,{0:{...bld,cellWidth:45},1:lft});
    y = doc.lastAutoTable.finalY+8;
    fillR(ml,y,cw,24,C.yel,3); setF(7.5,"italic",[146,64,14]);
    doc.text("Avertissement : simulations financières basées sur les données fournies. Consultez un CGP agréé avant toute décision.", ml+5, y+8, { maxWidth:cw-10, lineHeightFactor:1.6 });
    const slug = result.type.replace(/\s+/g,"-").replace(/[^a-zA-Z0-9-]/g,"").toLowerCase();
    doc.save(`dossier-${slug}-${(form.nom||"investisseur").toLowerCase()}.pdf`);
  });
}




function Term({ word, children }) {
  const [show, setShow] = useState(false);
  const def = LEXIQUE[word];
  if (!def) return <>{children || word}</>;
  return (
    <span style={{ position:"relative", display:"inline-block" }}>
      <span onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)}
        style={{ borderBottom:"1px dashed #3B82F6", color:"#185FA5", cursor:"help" }}>
        {children || word}
      </span>
      {show && (
        <span style={{ position:"absolute", bottom:"100%", left:0, zIndex:100, background:"#1e293b", color:"white", fontSize:11, padding:"8px 12px", borderRadius:8, width:260, lineHeight:1.5, boxShadow:"0 4px 16px rgba(0,0,0,.25)" }}>
          <strong style={{ color:"#93C5FD" }}>{word}</strong><br/>
          {def}
        </span>
      )}
    </span>
  );
}

function Input({ label, type="text", value, onChange, suffix, options, help, min, max, step }) {
  const base = { width:"100%", padding:"8px 10px", border:"1px solid #e2e8f0", borderRadius:6, fontSize:13, boxSizing:"border-box", background:"white" };
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:"block", fontSize:11.5, fontWeight:600, color:"#475569", marginBottom:4 }}>{label}</label>
      {options ? (
        <select value={value} onChange={(e)=>onChange(e.target.value)} style={base}>
          {options.map((o)=><option key={o}>{o}</option>)}
        </select>
      ) : (
        <div style={{ position:"relative" }}>
          <input type={type} value={value} min={min} max={max} step={step}
            onChange={(e)=>onChange(type==="number"?Number(e.target.value):e.target.value)}
            style={{ ...base, paddingRight:suffix?34:10 }} />
          {suffix && <span style={{ position:"absolute", right:9, top:"50%", transform:"translateY(-50%)", color:"#94a3b8", fontSize:11 }}>{suffix}</span>}
        </div>
      )}
      {help && <p style={{ fontSize:10.5, color:"#94a3b8", margin:"3px 0 0" }}>{help}</p>}
    </div>
  );
}

function Slider({ label, value, onChange, min, max, step=1, suffix="", help }) {
  return (
    <div style={{ marginBottom:18 }}>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:5 }}>
        <span style={{ fontWeight:600, color:"#475569" }}>{label}</span>
        <strong style={{ color:"#185FA5" }}>{(value||0).toLocaleString("fr-FR")}{suffix}</strong>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e)=>onChange(Number(e.target.value))} style={{ width:"100%", accentColor:"#185FA5" }} />
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"#94a3b8", marginTop:2 }}>
        <span>{(+min).toLocaleString("fr-FR")}{suffix}</span>
        <span>{(+max).toLocaleString("fr-FR")}{suffix}</span>
      </div>
      {help && <p style={{ fontSize:10.5, color:"#94a3b8", margin:"2px 0 0" }}>{help}</p>}
    </div>
  );
}

function Card({ title, sub, children, accent }) {
  return (
    <div style={{ background:"white", borderRadius:12, boxShadow:"0 1px 4px rgba(0,0,0,.08)", padding:22, marginBottom:16, borderTop:accent?`4px solid ${accent}`:undefined }}>
      {title && <h2 style={{ margin:"0 0 3px", fontSize:17, color:"#1e293b" }}>{title}</h2>}
      {sub   && <p  style={{ margin:"0 0 18px", color:"#64748b", fontSize:12.5 }}>{sub}</p>}
      {children}
    </div>
  );
}

function G2({ children }) { return <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>{children}</div>; }

function Pill({ label, value, color }) {
  return (
    <div style={{ background:"#f8fafc", borderRadius:8, padding:"10px 12px", textAlign:"center" }}>
      <div style={{ fontSize:10, color:"#94a3b8", marginBottom:3 }}>{label}</div>
      <div style={{ fontSize:14, fontWeight:700, color:color||"#1e293b" }}>{value}</div>
    </div>
  );
}

function FeuxBadge({ tri, cashflowM, ratioEndt }) {
  const f = feuxTricolores(tri, cashflowM, ratioEndt);
  return (
    <div style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:20, background:f.bg, border:`1px solid ${f.border}`, fontSize:11, fontWeight:600, color:f.color }}>
      {f.emoji} {f.label}
    </div>
  );
}



function AuthModal({ onClose, onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      if (mode === "login") {
        const { data, error: err } = await sb.auth.signInWithPassword({ email, password });
        if (err) throw err;
        onAuth(data.user);
      } else {
        const { data, error: err } = await sb.auth.signUp({ email, password });
        if (err) throw err;
        if (data.user) onAuth(data.user);
        else setError("Vérifiez votre email pour confirmer l'inscription.");
      }
    } catch(err) {
      setError(err.message || "Erreur de connexion");
    } finally { setLoading(false); }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:"white", borderRadius:16, padding:32, width:360, boxShadow:"0 20px 60px rgba(0,0,0,.25)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
          <h2 style={{ margin:0, fontSize:18, color:"#1e293b" }}>{mode==="login"?"Connexion":"Créer un compte"}</h2>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", fontSize:20, color:"#94a3b8" }}>×</button>
        </div>
        <form onSubmit={submit}>
          <Input label="Email" type="email" value={email} onChange={setEmail} />
          <Input label="Mot de passe" type="password" value={password} onChange={setPassword} />
          {error && <p style={{ color:"#DC2626", fontSize:12, marginBottom:12 }}>{error}</p>}
          <button type="submit" disabled={loading}
            style={{ width:"100%", padding:"11px", background:"#185FA5", color:"white", border:"none", borderRadius:8, cursor:loading?"wait":"pointer", fontWeight:700, fontSize:14 }}>
            {loading?"...":(mode==="login"?"Se connecter":"Créer le compte")}
          </button>
        </form>
        <p style={{ textAlign:"center", fontSize:12, color:"#64748b", marginTop:16 }}>
          {mode==="login"?"Pas de compte ?":"Déjà un compte ?"}{" "}
          <button onClick={()=>setMode(m=>m==="login"?"register":"login")}
            style={{ background:"none", border:"none", color:"#185FA5", cursor:"pointer", fontWeight:600, fontSize:12 }}>
            {mode==="login"?"S'inscrire":"Se connecter"}
          </button>
        </p>
      </div>
    </div>
  );
}



function ProjectsPanel({ user, onLoad, onClose }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sb.from("projets").select("*").eq("user_id", user.id).order("updated_at", { ascending:false })
      .then(({ data }) => { setProjects(data||[]); setLoading(false); });
  }, [user.id]);

  const del = async (id) => {
    await sb.from("projets").delete().eq("id", id);
    setProjects(p => p.filter(x => x.id !== id));
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.4)", zIndex:900, display:"flex", justifyContent:"flex-end" }}>
      <div style={{ background:"white", width:380, height:"100%", overflowY:"auto", boxShadow:"-8px 0 32px rgba(0,0,0,.15)", padding:24 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <h2 style={{ margin:0, fontSize:17, color:"#1e293b" }}>💾 Mes projets</h2>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", fontSize:20, color:"#94a3b8" }}>×</button>
        </div>
        {loading && <p style={{ color:"#94a3b8", fontSize:13 }}>Chargement…</p>}
        {!loading && projects.length === 0 && <p style={{ color:"#94a3b8", fontSize:13 }}>Aucun projet sauvegardé.</p>}
        {projects.map(p => (
          <div key={p.id} style={{ border:"1px solid #e2e8f0", borderRadius:10, padding:14, marginBottom:12 }}>
            <div style={{ fontWeight:700, fontSize:14, color:"#1e293b", marginBottom:4 }}>{p.nom}</div>
            <div style={{ fontSize:11, color:"#64748b", marginBottom:8 }}>
              {p.regime} · {p.prix?fmt(p.prix):""} · {new Date(p.updated_at).toLocaleDateString("fr-FR")}
            </div>
            {p.feux && <FeuxBadge tri={p.tri||0} cashflowM={p.cashflow_m||0} ratioEndt={35} />}
            <div style={{ display:"flex", gap:8, marginTop:10 }}>
              <button onClick={()=>{ onLoad(p.params); onClose(); }}
                style={{ flex:1, padding:"7px", background:"#185FA5", color:"white", border:"none", borderRadius:6, cursor:"pointer", fontWeight:600, fontSize:12 }}>
                Ouvrir
              </button>
              <button onClick={()=>del(p.id)}
                style={{ padding:"7px 12px", background:"#FFF1F2", color:"#DC2626", border:"none", borderRadius:6, cursor:"pointer", fontWeight:600, fontSize:12 }}>
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}




function ModuleRP({ form, onBack }) {
  const [rp, setRp] = useState({ revenus: form.revenusMensuels||4500, autresRevenus: form.autresRevenus||0, charges: form.chargesCredit||0, taux: 3.45, duree: 25, fraisVie: 1800 });
  const set = k => v => setRp(s => ({ ...s, [k]:v }));
  const revTotal = rp.revenus + rp.autresRevenus;
  const capMensuel = Math.max(0, revTotal * 0.35 - rp.charges);
  const tm = rp.taux / 100 / 12;
  const n  = rp.duree * 12;
  const capEmpMax = capMensuel > 0 && tm > 0 ? capMensuel * (1 - Math.pow(1 + tm, -n)) / tm : 0;
  const resteVivre = revTotal - rp.charges - capMensuel;
  const prixMax = capEmpMax * 1.08; // inclut frais notaire approximatifs

  return (
    <div>
      <Card title="🏡 Module Résidence Principale" sub="Calculez votre capacité d'emprunt pour votre résidence principale">
        <button onClick={onBack} style={{ background:"none", border:"none", cursor:"pointer", color:"#185FA5", fontWeight:600, fontSize:13, marginBottom:16 }}>← Retour</button>
        <G2>
          <Slider label="Revenus nets mensuels" value={rp.revenus} onChange={set("revenus")} min={1000} max={20000} step={100} suffix=" €" />
          <Slider label="Autres revenus (locations, etc.)" value={rp.autresRevenus} onChange={set("autresRevenus")} min={0} max={10000} step={100} suffix=" €" />
          <Slider label="Charges crédit existantes" value={rp.charges} onChange={set("charges")} min={0} max={5000} step={50} suffix=" €" />
          <Slider label="Taux du crédit RP" value={rp.taux} onChange={set("taux")} min={1} max={7} step={0.05} suffix=" %" />
          <Slider label="Durée du crédit" value={rp.duree} onChange={set("duree")} min={5} max={30} step={1} suffix=" ans" />
          <Slider label="Frais de vie estimés (loyer actuel ou budget)" value={rp.fraisVie} onChange={set("fraisVie")} min={500} max={5000} step={50} suffix=" €" />
        </G2>
        <div style={{ background:"#EFF6FF", border:"1px solid #BFDBFE", borderRadius:10, padding:20, marginTop:8 }}>
          <div style={{ fontWeight:700, color:"#185FA5", fontSize:14, marginBottom:14 }}>📐 Résultats capacité d'emprunt</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <Pill label="Revenus totaux retenus" value={fmt(revTotal)} />
            <Pill label="Mensualité max (35%)" value={fmt(capMensuel)} color="#185FA5" />
            <Pill label="Capacité d'emprunt max" value={fmt(capEmpMax)} color="#185FA5" />
            <Pill label="Prix max estimé (FAI+notaire)" value={fmt(prixMax)} color="#059669" />
            <Pill label="Reste à vivre / mois" value={fmt(resteVivre)} color={resteVivre>1500?"#059669":resteVivre>800?"#D97706":"#DC2626"} />
            <Pill label="Taux d'effort actuel" value={fmtPct(rp.charges/Math.max(1,revTotal)*100)} color={rp.charges/Math.max(1,revTotal)*100>35?"#DC2626":"#059669"} />
          </div>
        </div>
        <div style={{ background:"#F0FDF4", border:"1px solid #BBF7D0", borderRadius:8, padding:14, marginTop:12, fontSize:12, color:"#166534" }}>
          <strong>💡 Conseil :</strong> Les banques utilisent 70% des loyers locatifs dans les revenus retenus. 
          Si vous possédez déjà un bien locatif, ajoutez 70% du loyer dans "Autres revenus".
        </div>
      </Card>
    </div>
  );
}



function ModuleAVL({ form, onBack }) {
  const [avl, setAvl] = useState({
    loyerActuel: 900, prixAchat: form.prix||200000, apport: form.apport||30000,
    taux: form.interet||3.45, duree: form.dureeCredit||20, charges: 200,
    taxeFonciere: form.taxeFonciere||1200, revalorisation: form.revalorisation||1.5,
  });
  const set = k => v => setAvl(s => ({ ...s, [k]:v }));

  const data = useMemo(() => {
    const tm = avl.taux / 100 / 12;
    const n  = avl.duree * 12;
    const cap = avl.prixAchat * 1.08 - avl.apport; // 8% notaire
    const mens = cap > 0 && tm > 0 ? (cap * tm) / (1 - Math.pow(1 + tm, -n)) : 0;
    const rows = [];
    let cumAchat = -avl.apport;
    let cumLocation = 0;
    let capRestant = cap;
    for (let yr = 1; yr <= 15; yr++) {
      const val = avl.prixAchat * Math.pow(1 + avl.revalorisation / 100, yr);
      const loyerAn = avl.loyerActuel * 12 * Math.pow(1.01, yr);
      const chargesAchat = (avl.charges * 12 + avl.taxeFonciere) * Math.pow(1.02, yr);
      const mensAn = mens * 12;
      // Simulate capital restant
      let iAn = 0, cAn = 0, cap2 = capRestant;
      for (let m = 0; m < 12; m++) { const im = cap2 * tm; const cm = Math.min(mens - im, cap2); iAn += im; cAn += cm; cap2 = Math.max(0, cap2 - cm); }
      capRestant = cap2;
      const patrimoineAchat = val - capRestant;
      cumAchat += -(chargesAchat + mensAn - iAn * 0 + 0); // simplified net cost
      cumLocation -= loyerAn;
      rows.push({ an: yr, patrimoineAchat: Math.round(patrimoineAchat), coutAchat: Math.round(chargesAchat + mensAn), coutLocation: Math.round(loyerAn), avantage: Math.round(patrimoineAchat - (loyerAn * yr)) });
    }
    return { mens, cap, rows };
  }, [avl]);

  return (
    <div>
      <Card title="⚖️ Acheter vs Louer" sub="Comparaison sur 15 ans : coût total et patrimoine constitué">
        <button onClick={onBack} style={{ background:"none", border:"none", cursor:"pointer", color:"#185FA5", fontWeight:600, fontSize:13, marginBottom:16 }}>← Retour</button>
        <G2>
          <Slider label="Loyer actuel (si vous louez)" value={avl.loyerActuel} onChange={set("loyerActuel")} min={300} max={4000} step={50} suffix=" €/mois" />
          <Slider label="Prix du bien à acheter" value={avl.prixAchat} onChange={set("prixAchat")} min={50000} max={1000000} step={5000} suffix=" €" />
          <Slider label="Apport personnel" value={avl.apport} onChange={set("apport")} min={0} max={300000} step={5000} suffix=" €" />
          <Slider label="Taux crédit" value={avl.taux} onChange={set("taux")} min={1} max={7} step={0.05} suffix=" %" />
        </G2>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20 }}>
          <Pill label="Mensualité achat" value={fmt(data.mens)} color="#185FA5" />
          <Pill label="Loyer mensuel actuel" value={fmt(avl.loyerActuel)} color="#B45309" />
          <Pill label="Différentiel mensuel" value={fmt(data.mens - avl.loyerActuel)} color={data.mens > avl.loyerActuel ? "#DC2626" : "#059669"} />
          <Pill label="Patrimoine An 10" value={fmt((data.rows[9]||{}).patrimoineAchat||0)} color="#185FA5" />
        </div>
        <h3 style={{ fontSize:13, color:"#475569", margin:"0 0 8px" }}>Patrimoine constitué par l'achat vs loyers cumulés</h3>
        <div style={{ height:220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.rows}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="an" fontSize={10} tick={{ fill:"#94a3b8" }} tickFormatter={v=>`A${v}`} />
              <YAxis fontSize={10} tick={{ fill:"#94a3b8" }} tickFormatter={fmtK} />
              <Tooltip formatter={fmt} />
              <Legend wrapperStyle={{ fontSize:11 }} />
              <Line type="monotone" dataKey="patrimoineAchat" name="Patrimoine (achat)" stroke="#185FA5" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background:"#FFFBEB", border:"1px solid #FDE68A", borderRadius:8, padding:12, marginTop:12, fontSize:12, color:"#92400E" }}>
          <strong>💡 Note :</strong> L'achat constitue un patrimoine croissant grâce à la revalorisation du bien et au remboursement du capital. 
          La location préserve votre flexibilité mais ne constitue pas de patrimoine immobilier.
        </div>
      </Card>
    </div>
  );
}


const DPE_DATA = {
  A: { label:"A — Très performant",   color:"#059669", conso:"<50", travaux:0,       valorisation:5  },
  B: { label:"B — Très bon",          color:"#10B981", conso:"50-90",  travaux:8000,  valorisation:3  },
  C: { label:"C — Bon",               color:"#84CC16", conso:"91-150", travaux:18000, valorisation:1  },
  D: { label:"D — Assez bon",         color:"#EAB308", conso:"151-230",travaux:30000, valorisation:0  },
  E: { label:"E — Médiocre",          color:"#F97316", conso:"231-330",travaux:50000, valorisation:-3 },
  F: { label:"F — Mauvais (passoire)",color:"#EF4444", conso:"331-420",travaux:75000, valorisation:-8 },
  G: { label:"G — Très mauvais",      color:"#991B1B", conso:">420",   travaux:100000,valorisation:-12},
};

function ModuleDPE({ form, onBack }) {
  const [dpe, setDpe] = useState(form.dpe||"D");
  const [surface, setSurface] = useState(form.surface||45);
  const [cible, setCible] = useState("C");
  const current = DPE_DATA[dpe]||DPE_DATA.D;
  const target  = DPE_DATA[cible]||DPE_DATA.C;
  const travauxEstimes = Math.max(0, (current.travaux - target.travaux) * surface / 50);
  const gainValeur = form.prix ? form.prix * Math.abs(target.valorisation - current.valorisation) / 100 : 0;

  return (
    <div>
      <Card title="🌿 Module DPE & Travaux" sub="Estimation des travaux de rénovation énergétique et impact sur la valeur">
        <button onClick={onBack} style={{ background:"none", border:"none", cursor:"pointer", color:"#185FA5", fontWeight:600, fontSize:13, marginBottom:16 }}>← Retour</button>
        <G2>
          <Input label="Classe DPE actuelle" value={dpe} onChange={setDpe} options={Object.keys(DPE_DATA)} />
          <Input label="Classe DPE cible (après travaux)" value={cible} onChange={setCible} options={Object.keys(DPE_DATA)} />
          <Slider label="Surface du logement" value={surface} onChange={setSurface} min={10} max={300} step={5} suffix=" m²" />
          <div />
        </G2>
        <div style={{ display:"flex", gap:12, marginBottom:20 }}>
          {[dpe, cible].map((cl, i) => {
            const d = DPE_DATA[cl]||DPE_DATA.D;
            return (
              <div key={i} style={{ flex:1, background:d.color+"22", border:`2px solid ${d.color}`, borderRadius:10, padding:16, textAlign:"center" }}>
                <div style={{ fontSize:32, fontWeight:900, color:d.color }}>{cl}</div>
                <div style={{ fontSize:11, color:"#475569", marginTop:4 }}>{d.label.split("—")[1]?.trim()}</div>
                <div style={{ fontSize:10, color:"#94a3b8", marginTop:2 }}>{d.conso} kWhEP/m²/an</div>
                <div style={{ fontSize:11, fontWeight:600, color:d.valorisation>=0?"#059669":"#DC2626", marginTop:6 }}>
                  Impact valeur: {d.valorisation>=0?"+":""}{d.valorisation}%
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ background:"#EFF6FF", border:"1px solid #BFDBFE", borderRadius:10, padding:16 }}>
          <div style={{ fontWeight:700, color:"#185FA5", marginBottom:12 }}>📐 Estimation travaux {dpe} → {cible}</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <Pill label="Budget travaux estimé" value={fmt(travauxEstimes)} color="#185FA5" />
            <Pill label="Gain de valeur estimé" value={fmt(gainValeur)} color="#059669" />
          </div>
          <div style={{ marginTop:12, fontSize:11.5, color:"#475569" }}>
            <strong>Postes principaux :</strong> Isolation toiture/murs · Changement fenêtres · Pompe à chaleur · VMC double flux · Isolation plancher bas
          </div>
          <div style={{ marginTop:8, fontSize:11, color:"#3B82F6" }}>
            💰 Aides disponibles : MaPrimeRénov' · CEE · TVA 5,5% · Éco-prêt à taux zéro
          </div>
          {(dpe==="F"||dpe==="G") && (
            <div style={{ marginTop:10, background:"#FFF1F2", border:"1px solid #FECDD3", borderRadius:6, padding:10, fontSize:11, color:"#991B1B" }}>
              ⚠️ <strong>Passoire thermique (classe {dpe})</strong> : location interdite dès 2025 (F) et 2028 (G). Travaux obligatoires avant mise en location.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}



function DVFWidget({ adresse }) {
  const [ville, setVille] = useState(adresse||"");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const search = async () => {
    if (!ville.trim()) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const geoRes = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(ville)}&limit=1&type=municipality`);
      const geoData = await geoRes.json();
      const feat = geoData.features?.[0];
      if (!feat) throw new Error("Ville non trouvée");
      const [lon, lat] = feat.geometry.coordinates;
      const city = feat.properties.city || feat.properties.label;
      const dvfRes = await fetch(`https://api-dvf.data.gouv.fr/api/2/geomutations?lat=${lat}&lon=${lon}&dist=1000&nature_mutation=Vente&limite=100`);
      const dvfData = await dvfRes.json();
      const mutations = dvfData.features||[];
      const appts = mutations.filter(f => f.properties?.type_local === "Appartement" && f.properties?.surface_reelle_bati > 0);
      if (appts.length === 0) throw new Error("Pas de données DVF pour cette zone");
      const prices = appts.map(f => f.properties.valeur_fonciere / f.properties.surface_reelle_bati).filter(p => p > 500 && p < 20000);
      const avg = prices.reduce((a,b)=>a+b,0)/prices.length;
      const sorted = [...prices].sort((a,b)=>a-b);
      setResult({ city, avg, median: sorted[Math.floor(sorted.length/2)], count: prices.length, min: sorted[0], max: sorted[sorted.length-1] });
    } catch(err) {
      setError(err.message||"Erreur lors de la recherche");
    } finally { setLoading(false); }
  };

  return (
    <div style={{ background:"#F8FAFC", border:"1px solid #E2E8F0", borderRadius:8, padding:14, marginTop:12 }}>
      <div style={{ fontWeight:600, fontSize:12.5, color:"#185FA5", marginBottom:8 }}>🗺️ Prix au m² DVF (données réelles)</div>
      <div style={{ display:"flex", gap:8 }}>
        <input value={ville} onChange={e=>setVille(e.target.value)} onKeyDown={e=>e.key==="Enter"&&search()}
          placeholder="Ville ou code postal…"
          style={{ flex:1, padding:"7px 10px", border:"1px solid #e2e8f0", borderRadius:6, fontSize:12 }} />
        <button onClick={search} disabled={loading}
          style={{ padding:"7px 14px", background:"#185FA5", color:"white", border:"none", borderRadius:6, cursor:loading?"wait":"pointer", fontSize:12, fontWeight:600 }}>
          {loading?"…":"Chercher"}
        </button>
      </div>
      {error && <p style={{ fontSize:11, color:"#DC2626", marginTop:6 }}>{error}</p>}
      {result && (
        <div style={{ marginTop:10, display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
          {[
            { l:"Ville", v:result.city },
            { l:"Prix moyen/m²", v:fmt(result.avg)+"/m²" },
            { l:"Médiane/m²", v:fmt(result.median)+"/m²" },
            { l:"Transactions", v:result.count+" ventes" },
          ].map(({l,v}) => (
            <div key={l} style={{ background:"white", borderRadius:6, padding:"8px 10px", textAlign:"center" }}>
              <div style={{ fontSize:10, color:"#94a3b8" }}>{l}</div>
              <div style={{ fontSize:12, fontWeight:700, color:"#1e293b", marginTop:2 }}>{v}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}




function ComparisonView({ results, onSelect, form, user, onSave }) {
  const best = results.reduce((b, r) => r.cashflowM > b.cashflowM ? r : b, results[0]);
  const cfData  = results[0].projections.map((_,i) => ({ an:`A${i+1}`, ...Object.fromEntries(results.map(r=>[r.type, r.projections[i].cfM])) }));
  const patData = results[0].projections.map((_,i) => ({ an:`A${i+1}`, ...Object.fromEntries(results.map(r=>[r.type, r.projections[i].patNet])) }));
  return (
    <div>
      <Card title="📊 Comparatif des 4 régimes" sub="Cliquez sur un régime pour le détail complet et le dossier bancaire PDF">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:24 }}>
          {results.map((r) => {
            const feux = feuxTricolores(r.tri, r.cashflowM, r.ratioEndt);
            return (
              <div key={r.type} onClick={()=>onSelect(r)}
                style={{ border:`2px solid ${r===best?r.color:"#e2e8f0"}`, borderRadius:10, padding:16, cursor:"pointer", background:r===best?`${r.color}0d`:"white", transition:"all 0.15s" }}>
                {r===best && <div style={{ fontSize:10, fontWeight:700, color:r.color, marginBottom:6 }}>⭐ MEILLEUR CASH-FLOW</div>}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                  <div style={{ fontWeight:700, fontSize:15, color:r.color }}>{r.type}</div>
                  <FeuxBadge tri={r.tri} cashflowM={r.cashflowM} ratioEndt={r.ratioEndt} />
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                  <Pill label="CF mensuel" value={fmt(r.cashflowM)} color={r.cashflowM>=0?"#059669":"#dc2626"} />
                  <Pill label="Rendement net" value={fmtPct(r.rendNet)} color={r.color} />
                  <Pill label={`TRI ${form.horizon}a`} value={fmtPct(r.tri)} color={r.color} />
                  <Pill label="Endettement" value={fmtPct(r.ratioEndt)} color={r.ratioEndt>35?"#dc2626":"#059669"} />
                </div>
                <div style={{ marginTop:10, fontSize:11, color:r.color, fontWeight:600 }}>→ Détail + dossier bancaire PDF</div>
              </div>
            );
          })}
        </div>
        {user && (
          <div style={{ textAlign:"right", marginBottom:16 }}>
            <button onClick={onSave}
              style={{ padding:"9px 20px", background:"#059669", color:"white", border:"none", borderRadius:8, cursor:"pointer", fontWeight:700, fontSize:13 }}>
              💾 Sauvegarder ce projet
            </button>
          </div>
        )}
        <h3 style={{ fontSize:13, color:"#475569", margin:"0 0 10px" }}>Cash-flow mensuel net comparé (20 ans)</h3>
        <div style={{ height:240, marginBottom:28 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cfData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="an" fontSize={10} tick={{ fill:"#94a3b8" }} />
              <YAxis fontSize={10} tick={{ fill:"#94a3b8" }} tickFormatter={(v)=>`${Math.round(v/100)*100}€`} />
              <Tooltip formatter={(v)=>fmt(v)} />
              <Legend wrapperStyle={{ fontSize:11 }} />
              <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 2" />
              {results.map(r=><Line key={r.type} type="monotone" dataKey={r.type} stroke={r.color} dot={false} strokeWidth={2} />)}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <h3 style={{ fontSize:13, color:"#475569", margin:"0 0 10px" }}>Patrimoine net comparé (20 ans)</h3>
        <div style={{ height:220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={patData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="an" fontSize={10} tick={{ fill:"#94a3b8" }} />
              <YAxis fontSize={10} tick={{ fill:"#94a3b8" }} tickFormatter={fmtK} />
              <Tooltip formatter={(v)=>fmt(v)} />
              <Legend wrapperStyle={{ fontSize:11 }} />
              <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 2" />
              {results.map(r=><Line key={r.type} type="monotone" dataKey={r.type} stroke={r.color} dot={false} strokeWidth={2} />)}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}



function DetailView({ result, form, onBack }) {
  const patData = result.projections.map(r=>({ an:`A${r.an}`, patrimoine:r.patNet, cumCF:r.cum }));
  const cfData  = result.projections.map(r=>({ an:`A${r.an}`, CF:r.cfM }));
  return (
    <div>
      <Card accent={result.color}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <button onClick={onBack} style={{ background:"none", border:"none", cursor:"pointer", color:"#185FA5", fontWeight:600, fontSize:13 }}>← Retour comparatif</button>
          <button onClick={()=>generatePDF(form, result)}
            style={{ padding:"10px 22px", background:result.color, color:"white", border:"none", borderRadius:8, cursor:"pointer", fontWeight:700, fontSize:13 }}>
            📄 Dossier bancaire PDF
          </button>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
          <h2 style={{ margin:0, fontSize:20, color:result.color }}>{result.type}</h2>
          <FeuxBadge tri={result.tri} cashflowM={result.cashflowM} ratioEndt={result.ratioEndt} />
        </div>
        <p style={{ margin:"0 0 18px", color:"#64748b", fontSize:13 }}>{form.adresseBien||"Bien immobilier"} — Horizon {form.horizon} ans</p>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:20 }}>
          <Pill label="CF mensuel net" value={fmt(result.cashflowM)} color={result.cashflowM>=0?"#059669":"#dc2626"} />
          <Pill label="Rendement brut" value={fmtPct(result.rendBrut)} color={result.color} />
          <Pill label="Rendement net" value={fmtPct(result.rendNet)} color={result.color} />
          <Pill label={`TRI ${form.horizon} ans`} value={fmtPct(result.tri)} color={result.color} />
          <Pill label="Taux endettement" value={fmtPct(result.ratioEndt)} color={result.ratioEndt>35?"#dc2626":"#059669"} />
          <Pill label="Mensualité" value={fmt(result.mensualite)} />
          <Pill label="Investissement total" value={fmt(result.investTotal)} />
          <Pill label={`Patrimoine net ${form.horizon}a`} value={fmt(result.horizonData?.patNet)} color={result.color} />
        </div>

        {result.microBIC && (
          <div style={{ background:result.microBIC.betterMicro?"#FFF7ED":"#F0FDF4", border:`1px solid ${result.microBIC.betterMicro?"#FED7AA":"#BBF7D0"}`, borderRadius:8, padding:14, marginBottom:16 }}>
            <div style={{ fontWeight:700, fontSize:13, color:result.microBIC.betterMicro?"#C2410C":"#059669", marginBottom:8 }}>
              💡 <Term word="Micro-BIC">Micro-BIC</Term> vs Réel — Recommandation fiscale An 1
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, fontSize:12 }}>
              <div style={{ background:"white", borderRadius:6, padding:10, textAlign:"center" }}>
                <div style={{ fontSize:10, color:"#94a3b8" }}>Impôt Micro-BIC</div>
                <div style={{ fontWeight:700, color:"#C2410C" }}>{fmt(result.microBIC.impotAnnuel)}/an</div>
              </div>
              <div style={{ background:"white", borderRadius:6, padding:10, textAlign:"center" }}>
                <div style={{ fontSize:10, color:"#94a3b8" }}>Impôt Réel</div>
                <div style={{ fontWeight:700, color:"#185FA5" }}>{fmt(result.microBIC.reelImpot)}/an</div>
              </div>
              <div style={{ background:result.microBIC.betterMicro?"#FFF7ED":"#F0FDF4", borderRadius:6, padding:10, textAlign:"center" }}>
                <div style={{ fontSize:10, color:"#94a3b8" }}>Recommandé</div>
                <div style={{ fontWeight:700, color:result.microBIC.betterMicro?"#C2410C":"#059669" }}>
                  {result.microBIC.betterMicro?"Micro-BIC":"Réel ✓"}
                </div>
              </div>
            </div>
          </div>
        )}

        <h3 style={{ fontSize:12.5, color:"#475569", margin:"0 0 8px" }}>Cash-flow mensuel net (20 ans)</h3>
        <div style={{ height:200, marginBottom:22 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cfData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="an" fontSize={9} tick={{ fill:"#94a3b8" }} />
              <YAxis fontSize={9} tickFormatter={v=>`${Math.round(v)}€`} />
              <Tooltip formatter={fmt} />
              <ReferenceLine y={0} stroke="#94a3b8" />
              <Bar dataKey="CF" name="CF mensuel" fill={result.color} radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <h3 style={{ fontSize:12.5, color:"#475569", margin:"0 0 8px" }}>Évolution du patrimoine net (20 ans)</h3>
        <div style={{ height:200, marginBottom:22 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={patData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="an" fontSize={9} tick={{ fill:"#94a3b8" }} />
              <YAxis fontSize={9} tickFormatter={fmtK} />
              <Tooltip formatter={fmt} />
              <Legend wrapperStyle={{ fontSize:11 }} />
              <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 2" />
              <Line type="monotone" dataKey="patrimoine" name="Patrimoine net" stroke={result.color} dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="cumCF" name="CF cumulé" stroke="#94a3b8" dot={false} strokeWidth={1.5} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <h3 style={{ fontSize:12.5, color:"#475569", margin:"0 0 8px" }}>Tableau d'amortissement (10 ans)</h3>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead>
              <tr style={{ background:result.color, color:"white" }}>
                {["Année","Mensualité","Intérêts","Capital","Restant dû"].map(h=><th key={h} style={{ padding:"8px 10px", textAlign:"right", fontWeight:600 }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {result.amortSchedule.slice(0,10).map((r,i)=>(
                <tr key={r.an} style={{ background:i%2===0?"#f8fafc":"white" }}>
                  <td style={{ padding:"6px 10px", fontWeight:600 }}>Année {r.an}</td>
                  {[r.mensualite, r.interets, r.capital, r.capRestant].map((v,j)=><td key={j} style={{ padding:"6px 10px", textAlign:"right" }}>{fmt(v)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 style={{ fontSize:12.5, color:"#475569", margin:"18px 0 8px" }}>Règles fiscales — <Term word={result.type.includes("SCI IS")?"SCI IS":result.type.includes("SCI IR")?"SCI IR":result.type.includes("LMNP")?"Amortissement":"Déficit foncier"}>{result.type}</Term></h3>
        <div style={{ borderRadius:8, overflow:"hidden", fontSize:12 }}>
          {result.fiscalInfo.map(([k,v],i)=>(
            <div key={k} style={{ display:"flex", padding:"8px 12px", background:i%2===0?"#f8fafc":"white", gap:12 }}>
              <span style={{ fontWeight:600, color:"#475569", minWidth:145, flexShrink:0 }}>{k}</span>
              <span style={{ color:"#334155" }}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop:20, textAlign:"center" }}>
          <button onClick={()=>generatePDF(form, result)}
            style={{ padding:"12px 32px", background:result.color, color:"white", border:"none", borderRadius:8, cursor:"pointer", fontWeight:700, fontSize:14 }}>
            📄 Générer le dossier bancaire complet (PDF 7 pages)
          </button>
        </div>
      </Card>
    </div>
  );
}




export default function App() {
  const [step,      setStep]     = useState(0);
  const [form,      setForm]     = useState(DEFAULTS);
  const [selected,  setSelected] = useState(null);
  const [view,      setView]     = useState("simulator"); // simulator | rp | avl | dpe
  const [user,      setUser]     = useState(null);
  const [showAuth,  setShowAuth] = useState(false);
  const [showProj,  setShowProj] = useState(false);
  const [saveMsg,   setSaveMsg]  = useState("");

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    sb.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUser(session.user);
    });
    const { data: { subscription } } = sb.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const results = useMemo(() => {
    if (step < 4) return null;
    return [runCalc(form,"lmnp"), runCalc(form,"nue"), runCalc(form,"sciis"), runCalc(form,"sciir")];
  }, [form, step]);

  const saveProject = async () => {
    if (!user || !results) return;
    const best = results[0];
    const feux = feuxTricolores(best.tri, best.cashflowM, best.ratioEndt);
    const nom = form.adresseBien || form.typeBien || "Mon projet";
    const { error } = await sb.from("projets").insert({
      user_id: user.id,
      nom: `${nom} — ${new Date().toLocaleDateString("fr-FR")}`,
      params: form,
      regime: best.type,
      prix: form.prix,
      loyer: form.loyer,
      tri: best.tri,
      cashflow_m: best.cashflowM,
      rend_net: best.rendNet,
      feux: feux.emoji,
    });
    setSaveMsg(error ? "Erreur lors de la sauvegarde" : "✓ Projet sauvegardé !");
    setTimeout(() => setSaveMsg(""), 3000);
  };

  const modules = [
    { id:"rp",  icon:"🏡", label:"Résidence Principale", sub:"Capacité d'emprunt RP" },
    { id:"avl", icon:"⚖️", label:"Acheter vs Louer",     sub:"Comparaison 15 ans"    },
    { id:"dpe", icon:"🌿", label:"DPE & Rénovation",     sub:"Travaux & impact valeur" },
  ];

  return (
    <div style={{ minHeight:"100vh", background:"#f1f5f9", fontFamily:"'Inter', system-ui, sans-serif" }}>

      {/* ── HEADER ── */}
      <div style={{ background:"#185FA5", color:"white", padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:22 }}>🏢</span>
          <div>
            <div style={{ fontWeight:700, fontSize:15 }}>Simulateur LMNP Expert</div>
            <div style={{ fontSize:10, opacity:0.75 }}>Dossier bancaire professionnel · 4 régimes comparés</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {user ? (
            <>
              <button onClick={()=>setShowProj(true)}
                style={{ padding:"6px 14px", background:"rgba(255,255,255,.15)", color:"white", border:"1px solid rgba(255,255,255,.3)", borderRadius:7, cursor:"pointer", fontSize:12, fontWeight:600 }}>
                💾 Mes projets
              </button>
              <button onClick={()=>sb.auth.signOut()}
                style={{ padding:"6px 12px", background:"rgba(255,255,255,.1)", color:"white", border:"1px solid rgba(255,255,255,.2)", borderRadius:7, cursor:"pointer", fontSize:11 }}>
                {user.email?.split("@")[0]}  ·  Déconnexion
              </button>
            </>
          ) : (
            <button onClick={()=>setShowAuth(true)}
              style={{ padding:"7px 16px", background:"white", color:"#185FA5", border:"none", borderRadius:7, cursor:"pointer", fontWeight:700, fontSize:12 }}>
              🔒 Se connecter
            </button>
          )}
        </div>
      </div>

      
      <div style={{ background:"#FFF7ED", borderBottom:"1px solid #FED7AA", padding:"7px 16px", fontSize:11.5, color:"#92400E", display:"flex", alignItems:"center", gap:8 }}>
        <span>📋</span>
        <span><strong>Mis à jour · Loi de Finances 2026</strong> · Taux réels avril 2026 (moy. 20 ans : 3,45%) · Plafond Micro-BIC : 77 700€ · IS PME : 15% ≤ 42 500€ · Passoires thermiques G : location interdite</span>
      </div>

      {/* ── NAVIGATION MODULES ── */}
      <div style={{ background:"white", borderBottom:"1px solid #e2e8f0", padding:"8px 16px", display:"flex", gap:8, overflowX:"auto" }}>
        <button onClick={()=>{ setView("simulator"); }}
          style={{ padding:"6px 14px", background:view==="simulator"?"#185FA5":"#f1f5f9", color:view==="simulator"?"white":"#475569", border:"none", borderRadius:20, cursor:"pointer", fontWeight:600, fontSize:12, whiteSpace:"nowrap" }}>
          📊 Simulateur principal
        </button>
        {modules.map(m=>(
          <button key={m.id} onClick={()=>setView(m.id)}
            style={{ padding:"6px 14px", background:view===m.id?"#185FA5":"#f1f5f9", color:view===m.id?"white":"#475569", border:"none", borderRadius:20, cursor:"pointer", fontWeight:600, fontSize:12, whiteSpace:"nowrap" }}>
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth:800, margin:"0 auto", padding:"20px 16px" }}>

        
        {view === "rp"  && <ModuleRP  form={form} onBack={()=>setView("simulator")} />}
        {view === "avl" && <ModuleAVL form={form} onBack={()=>setView("simulator")} />}
        {view === "dpe" && <ModuleDPE form={form} onBack={()=>setView("simulator")} />}

        
        {view === "simulator" && (
          <>
            
            <div style={{ background:"white", borderRadius:10, padding:"14px 16px", marginBottom:16, boxShadow:"0 1px 4px rgba(0,0,0,.06)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", maxWidth:650, margin:"0 auto 8px" }}>
                {STEPS.map((s,i)=>(
                  <div key={s.id} onClick={()=>i<=step&&setStep(i)}
                    style={{ display:"flex", flexDirection:"column", alignItems:"center", cursor:i<=step?"pointer":"default", gap:3 }}>
                    <div style={{ width:34, height:34, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15,
                      background:i<step?"#185FA5":i===step?"#DBEAFE":"#f1f5f9",
                      border:i===step?"2px solid #185FA5":"2px solid transparent" }}>{s.icon}</div>
                    <span style={{ fontSize:9.5, color:i===step?"#185FA5":i<step?"#059669":"#94a3b8", fontWeight:i===step?700:400 }}>{s.label}</span>
                  </div>
                ))}
              </div>
              <div style={{ background:"#e2e8f0", height:3, borderRadius:2, maxWidth:650, margin:"0 auto" }}>
                <div style={{ background:"#185FA5", height:"100%", borderRadius:2, width:`${(step/(STEPS.length-1))*100}%`, transition:"width 0.3s" }} />
              </div>
            </div>

            
            {step === 0 && (
              <Card title="👤 Profil Emprunteur" sub="Calcul du ratio d'endettement bancaire">
                <G2>
                  <Input label="Prénom" value={form.prenom} onChange={set("prenom")} />
                  <Input label="Nom" value={form.nom} onChange={set("nom")} />
                  <Input label="Email" type="email" value={form.email} onChange={set("email")} />
                  <Input label="Situation professionnelle" value={form.situationPro} onChange={set("situationPro")}
                    options={["Salarié CDI","Fonctionnaire","TNS / Indépendant","Chef d'entreprise","Retraité","Autre"]} />
                  <Input label="Ancienneté (ans)" type="number" value={form.anciennete} onChange={set("anciennete")} min={0} max={45} />
                  <Input label="Situation familiale" value={form.situationFam} onChange={set("situationFam")}
                    options={["Célibataire","Marié(e)","Pacsé(e)","En concubinage","Divorcé(e)"]} />
                </G2>
                <Slider label="Revenus nets mensuels" value={form.revenusMensuels} onChange={set("revenusMensuels")} min={1000} max={20000} step={100} suffix=" €" />
                <Slider label="Autres revenus (locations existantes…)" value={form.autresRevenus} onChange={set("autresRevenus")} min={0} max={10000} step={100} suffix=" €" />
                <Slider label="Charges crédit actuelles (hors ce projet)" value={form.chargesCredit} onChange={set("chargesCredit")} min={0} max={5000} step={50} suffix=" €" />
                <Slider label={<Term word="TMI">TMI — Tranche marginale d'imposition</Term>} value={form.tmi} onChange={set("tmi")} min={0} max={45} step={1} suffix=" %"
                  help="0%, 11%, 30%, 41% ou 45% selon votre revenu imposable net" />
              </Card>
            )}

            
            {step === 1 && (
              <Card title="🏠 Le Bien Immobilier" sub="Caractéristiques du bien ciblé">
                <Input label="Adresse du bien" value={form.adresseBien} onChange={set("adresseBien")} />
                <G2>
                  <Input label="Type de bien" value={form.typeBien} onChange={set("typeBien")}
                    options={["Appartement","Maison","Studio","Immeuble de rapport","Local commercial","Parking"]} />
                  <Input label="Surface (m²)" type="number" value={form.surface} onChange={set("surface")} min={5} max={500} />
                  <Input label={<Term word="DPE">Classe DPE</Term>} value={form.dpe} onChange={set("dpe")} options={["A","B","C","D","E","F","G"]} />
                  <Input label="Frais de notaire (%)" type="number" value={form.notaire} onChange={set("notaire")} min={2} max={10} step={0.1} />
                </G2>
                {(form.dpe==="F"||form.dpe==="G") && (
                  <div style={{ background:"#FFF1F2", border:"1px solid #FECDD3", borderRadius:8, padding:10, marginBottom:12, fontSize:11.5, color:"#991B1B" }}>
                    ⚠️ <strong>Passoire thermique (DPE {form.dpe})</strong> — Location interdite dès {form.dpe==="G"?"2025":"2028"}. Des travaux seront nécessaires.
                  </div>
                )}
                <Slider label="Prix d'acquisition FAI" value={form.prix} onChange={set("prix")} min={30000} max={1000000} step={5000} suffix=" €" />
                <Slider label="Budget travaux" value={form.travaux} onChange={set("travaux")} min={0} max={300000} step={1000} suffix=" €" />
                <Slider label={<Term word="Amortissement">Budget mobilier (LMNP uniquement)</Term>} value={form.mobilier} onChange={set("mobilier")} min={0} max={30000} step={500} suffix=" €"
                  help="Amortissable sur 7 ans en LMNP réel" />
                <DVFWidget adresse={form.adresseBien} />
              </Card>
            )}

            
            {step === 2 && (
              <Card title="🏦 Plan de Financement" sub="Conditions du crédit immobilier">
                <Slider label="Apport personnel" value={form.apport} onChange={set("apport")} min={0} max={400000} step={5000} suffix=" €" />
                <Slider label="Taux d'intérêt annuel" value={form.interet} onChange={set("interet")} min={0.5} max={8} step={0.05} suffix=" %"
                  help="Taux moyen marché avril 2026 : 20 ans = 3,45% | 25 ans = 3,60%" />
                <Slider label="Durée du crédit" value={form.dureeCredit} onChange={set("dureeCredit")} min={5} max={30} step={1} suffix=" ans" />
                <Slider label="Horizon de revente (TRI)" value={form.horizon} onChange={set("horizon")} min={3} max={20} step={1} suffix=" ans" />
                <div style={{ background:"#F8FAFC", border:"1px solid #E2E8F0", borderRadius:8, padding:14, marginBottom:16 }}>
                  <div style={{ fontWeight:600, fontSize:12.5, color:"#185FA5", marginBottom:10 }}>
                    ⏱️ <Term word="Différé">Différé de remboursement</Term>
                  </div>
                  <G2>
                    <Slider label="Durée du différé" value={form.differe} onChange={set("differe")} min={0} max={24} step={1} suffix=" mois"
                      help="0 = aucun différé. Utile pour un bien en VEFA ou avec travaux." />
                    <Input label="Type de différé" value={form.typeDiffere} onChange={set("typeDiffere")}
                      options={["partiel","total"]}
                      help="Partiel : intérêts seuls. Total : rien à payer (intérêts capitalisés)." />
                  </G2>
                </div>
                {(() => {
                  const fn  = form.prix * form.notaire / 100;
                  const inv = form.prix + fn + form.travaux;
                  const cap = Math.max(0, inv - form.apport);
                  const tm  = form.interet / 100 / 12;
                  const n   = form.dureeCredit * 12;
                  let capApres = cap;
                  if (form.differe > 0 && form.typeDiffere === "total") capApres = cap * Math.pow(1+tm, form.differe);
                  const m = capApres > 0 && tm > 0 ? (capApres * tm) / (1 - Math.pow(1+tm,-n)) : 0;
                  return (
                    <div style={{ background:"#EFF6FF", border:"1px solid #BFDBFE", borderRadius:8, padding:16 }}>
                      <div style={{ fontWeight:700, color:"#185FA5", marginBottom:10, fontSize:13 }}>📐 Estimation instantanée</div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, fontSize:12 }}>
                        <div>Investissement total : <strong>{fmt(inv)}</strong></div>
                        <div>Capital emprunté : <strong>{fmt(cap)}</strong></div>
                        <div>Mensualité estimée : <strong style={{ color:"#185FA5", fontSize:14 }}>{fmt(m)}</strong></div>
                        <div>Coût total crédit : <strong>{fmt(m*form.dureeCredit*12-cap)}</strong></div>
                        {form.differe > 0 && <div style={{ color:"#D97706" }}>Différé {form.typeDiffere} : <strong>{form.differe} mois</strong></div>}
                      </div>
                    </div>
                  );
                })()}
              </Card>
            )}

          
            {step === 3 && (
              <Card title="📊 Paramètres d'Exploitation" sub="Revenus et charges locatifs prévisionnels">
                <Slider label="Loyer mensuel hors charges" value={form.loyer} onChange={set("loyer")} min={200} max={5000} step={25} suffix=" €" />
                <Slider label="Charges mensuelles (copropriété, assurance PNO…)" value={form.charges} onChange={set("charges")} min={0} max={1000} step={10} suffix=" €" />
                <Slider label={<Term word="Ratio d'endettement">Taxe foncière annuelle</Term>} value={form.taxeFonciere} onChange={set("taxeFonciere")} min={0} max={6000} step={50} suffix=" €" />
                <Slider label={<Term word="Cash-flow">Taux de vacance locative</Term>} value={form.vacance} onChange={set("vacance")} min={0} max={20} step={0.5} suffix=" %"
                  help="~5% en zone tendue, 8-10% ailleurs" />
                <Slider label="Revalorisation annuelle du bien" value={form.revalorisation} onChange={set("revalorisation")} min={-2} max={6} step={0.1} suffix=" %"
                  help="Hypothèse conservatrice recommandée : 1,5 à 2%" />
                <div style={{ background:"#F0FDF4", border:"1px solid #BBF7D0", borderRadius:8, padding:14, marginTop:4 }}>
                  <div style={{ fontWeight:700, color:"#059669", marginBottom:8, fontSize:13 }}>📐 Rendements prévisionnels</div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, fontSize:12 }}>
                    <div><Term word="Rendement brut">Rendement brut</Term> : <strong style={{ color:"#059669" }}>{fmtPct(form.loyer*12/form.prix*100)}</strong></div>
                    <div>Loyers annuels nets : <strong>{fmt(form.loyer*12*(1-form.vacance/100))}</strong></div>
                    <div>Charges annuelles : <strong>{fmt(form.charges*12+form.taxeFonciere)}</strong></div>
                    <div><Term word="Cash-flow">CF brut mensuel</Term> (avant crédit) : <strong>{fmt((form.loyer*12*(1-form.vacance/100)-form.charges*12-form.taxeFonciere)/12)}</strong></div>
                  </div>
                </div>
              </Card>
            )}

            
            {step === 4 && results && (
              selected
                ? <DetailView result={selected} form={form} onBack={()=>setSelected(null)} />
                : <ComparisonView results={results} onSelect={setSelected} form={form} user={user} onSave={saveProject} />
            )}

            {/* NAVIGATION */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:20 }}>
              {step > 0
                ? <button onClick={()=>setStep(s=>s-1)} style={{ padding:"10px 22px", background:"white", border:"1px solid #e2e8f0", borderRadius:8, cursor:"pointer", fontWeight:600, fontSize:13 }}>← Précédent</button>
                : <div />}
              {saveMsg && <span style={{ color:"#059669", fontWeight:600, fontSize:13 }}>{saveMsg}</span>}
              {step < 4 && (
                <button onClick={()=>setStep(s=>s+1)}
                  style={{ padding:"10px 28px", background:"#185FA5", color:"white", border:"none", borderRadius:8, cursor:"pointer", fontWeight:700, fontSize:14 }}>
                  {step===3?"🚀 Comparer les 4 scénarios":"Suivant →"}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      
      {showAuth && <AuthModal onClose={()=>setShowAuth(false)} onAuth={(u)=>{ setUser(u); setShowAuth(false); }} />}
      {showProj && user && <ProjectsPanel user={user} onLoad={(params)=>{ setForm(params); setStep(4); }} onClose={()=>setShowProj(false)} />}
    </div>
  );
}
