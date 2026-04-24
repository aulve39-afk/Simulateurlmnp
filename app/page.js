"use client";

import { useState, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from "recharts";

// ═══════════════════════════════════════════════════════
//  UTILS
// ═══════════════════════════════════════════════════════
const fmt    = (n) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n ?? 0);
const fmtPct = (n) => `${(+n || 0).toFixed(2)} %`;
const fmtK   = (n) => Math.abs(n ?? 0) >= 1000 ? `${((n ?? 0) / 1000).toFixed(1)}k€` : fmt(n);

// ═══════════════════════════════════════════════════════
//  MOTEURS FINANCIERS
// ═══════════════════════════════════════════════════════

function amortCredit(capital, tauxAnnuel, dureeAns) {
  const tm = tauxAnnuel / 100 / 12;
  const n  = dureeAns * 12;
  const mensualite = capital > 0 && tm > 0 ? (capital * tm) / (1 - Math.pow(1 + tm, -n)) : 0;
  let cap = capital;
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
  return { mensualite, rows };
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

// ─── LMNP Réel ───────────────────────────────────────────────
function calcLMNP(p) {
  const fn  = p.prix * p.notaire / 100;
  const inv = p.prix + fn + p.travaux;
  const cap = Math.max(0, inv - p.apport);
  const { mensualite, rows } = amortCredit(cap, p.interet, p.dureeCredit);
  const loyers   = p.loyer * 12 * (1 - p.vacance / 100);
  const charges  = p.charges * 12 + p.taxeFonciere;
  const amBati   = (p.prix * 0.85) / 30;
  const amTrav   = p.travaux > 0 ? p.travaux / 10 : 0;
  const amMob    = (p.mobilier || 5000) / 7;
  const amTot    = amBati + amTrav + amMob;
  const tg       = (p.tmi + 17.2) / 100;
  let defRep = 0, cumCF = 0;
  const cfs = [-p.apport];
  const proj = [];
  for (let yr = 1; yr <= 20; yr++) {
    const r   = rows[yr - 1];
    const res = loyers - charges - r.interets - amTot;
    let imp = 0, nd = defRep;
    if (res < 0) { nd = defRep + Math.abs(res); }
    else { const u = Math.min(defRep, res); imp = (res - u) * tg; nd = defRep - u; }
    defRep = nd;
    const cf = loyers - charges - r.mensualite * 12 - imp;
    cumCF += cf;
    const val   = p.prix * Math.pow(1 + p.revalorisation / 100, yr);
    const pv    = Math.max(0, val - p.prix);
    const ab    = pvAbatt(yr);
    const pvImp = pv * (0.19 * (1 - ab.ir) + 0.172 * (1 - ab.ps));
    const net   = val - r.capRestant - pvImp;
    cfs.push(yr === p.horizon ? cf + net : cf);
    proj.push({ an: yr, cf: Math.round(cf), cfM: Math.round(cf / 12), cum: Math.round(cumCF), imp: Math.round(imp), val: Math.round(val), pvImp: Math.round(pvImp), patNet: Math.round(net + cumCF - p.apport), loyers: Math.round(loyers), charges: Math.round(charges), mensAn: Math.round(r.mensualite * 12) });
  }
  const rE = p.revenusMensuels > 0 ? (mensualite / (p.revenusMensuels + p.loyer * 0.7)) * 100 : 0;
  return {
    type: "LMNP Réel", color: "#185FA5",
    mensualite, investTotal: inv, fraisNotaire: fn, capital: cap,
    amortSchedule: rows, projections: proj,
    tri: calcTRI(cfs, p.horizon),
    rendBrut: (p.loyer * 12 / p.prix) * 100,
    rendNet:  ((loyers - charges) / inv) * 100,
    ratioEndt: rE, cashflowM: proj[0].cfM,
    horizonData: proj[p.horizon - 1],
    amDetails: { amBati: Math.round(amBati), amTrav: Math.round(amTrav), amMob: Math.round(amMob), amTot: Math.round(amTot) },
    fiscalInfo: [
      ["Régime", "Loueur Meublé Non Professionnel — Réel simplifié (BIC)"],
      ["Amort. bien", `${fmt(amBati)}/an (85% du prix sur 30 ans)`],
      ["Amort. travaux", `${fmt(amTrav)}/an (sur 10 ans)`],
      ["Amort. mobilier", `${fmt(amMob)}/an (sur 7 ans)`],
      ["Déficit reportable", "Illimité sur BIC meublés futurs"],
      ["Plus-value cession", "Régime particuliers — abattement progressif (exo IR à 22 ans, PS à 30 ans)"],
      ["Atout majeur", "Amortissements → impôt quasi nul pendant 10-15 ans en général"],
    ],
  };
}

// ─── Location Nue ────────────────────────────────────────────
function calcLocationNue(p) {
  const fn  = p.prix * p.notaire / 100;
  const inv = p.prix + fn + p.travaux;
  const cap = Math.max(0, inv - p.apport);
  const { mensualite, rows } = amortCredit(cap, p.interet, p.dureeCredit);
  const loyers  = p.loyer * 12 * (1 - p.vacance / 100);
  const charges = p.charges * 12 + p.taxeFonciere;
  const tg      = (p.tmi + 17.2) / 100;
  let defRep = 0, cumCF = 0;
  const cfs = [-p.apport];
  const proj = [];
  for (let yr = 1; yr <= 20; yr++) {
    const r   = rows[yr - 1];
    const rev = loyers - charges - r.interets;
    let imp = 0, eco = 0, nd = defRep;
    if (rev < 0) {
      const imputable = Math.min(Math.abs(rev), 10700);
      eco = imputable * (p.tmi / 100);
      nd  = defRep + Math.abs(rev) - imputable;
    } else {
      const u = Math.min(defRep, rev); imp = (rev - u) * tg; nd = Math.max(0, defRep - rev);
    }
    defRep = nd;
    const cf = loyers - charges - r.mensualite * 12 - imp + eco;
    cumCF += cf;
    const val   = p.prix * Math.pow(1 + p.revalorisation / 100, yr);
    const pv    = Math.max(0, val - p.prix);
    const ab    = pvAbatt(yr);
    const pvImp = pv * (0.19 * (1 - ab.ir) + 0.172 * (1 - ab.ps));
    const net   = val - r.capRestant - pvImp;
    cfs.push(yr === p.horizon ? cf + net : cf);
    proj.push({ an: yr, cf: Math.round(cf), cfM: Math.round(cf / 12), cum: Math.round(cumCF), imp: Math.round(imp), val: Math.round(val), pvImp: Math.round(pvImp), patNet: Math.round(net + cumCF - p.apport), loyers: Math.round(loyers), charges: Math.round(charges), mensAn: Math.round(r.mensualite * 12) });
  }
  const rE = p.revenusMensuels > 0 ? (mensualite / (p.revenusMensuels + p.loyer * 0.7)) * 100 : 0;
  return {
    type: "Location Nue", color: "#B45309",
    mensualite, investTotal: inv, fraisNotaire: fn, capital: cap,
    amortSchedule: rows, projections: proj,
    tri: calcTRI(cfs, p.horizon),
    rendBrut: (p.loyer * 12 / p.prix) * 100,
    rendNet:  ((loyers - charges) / inv) * 100,
    ratioEndt: rE, cashflowM: proj[0].cfM,
    horizonData: proj[p.horizon - 1], amDetails: null,
    fiscalInfo: [
      ["Régime", "Revenus fonciers — Régime réel"],
      ["Déductibles", "Charges, intérêts, travaux d'entretien, taxe foncière"],
      ["Amortissement", "NON — pas d'amortissement du bien immobilier"],
      ["Déficit foncier", "Max 10 700€/an imputable sur revenu global, excédent reportable 10 ans"],
      ["Plus-value cession", "Régime particuliers — abattement progressif (exo IR à 22 ans)"],
      ["Atout majeur", "Simplicité, déficit foncier si travaux importants, pas de comptabilité complexe"],
    ],
  };
}

// ─── SCI IS ──────────────────────────────────────────────────
function calcSCIIS(p) {
  const fn  = p.prix * p.notaire / 100;
  const inv = p.prix + fn + p.travaux;
  const cap = Math.max(0, inv - p.apport);
  const { mensualite, rows } = amortCredit(cap, p.interet, p.dureeCredit);
  const loyers  = p.loyer * 12 * (1 - p.vacance / 100);
  const charges = p.charges * 12 + p.taxeFonciere;
  const amBati  = (p.prix * 0.85) / 30;
  const amTrav  = p.travaux > 0 ? p.travaux / 10 : 0;
  const amTot   = amBati + amTrav;
  let defRep = 0, cumCF = 0, amCum = 0;
  const cfs = [-p.apport];
  const proj = [];
  for (let yr = 1; yr <= 20; yr++) {
    const r   = rows[yr - 1];
    amCum += amTot;
    const res = loyers - charges - r.interets - amTot;
    let is = 0, nd = defRep;
    if (res < 0) { nd = defRep + Math.abs(res); }
    else {
      const u = Math.min(defRep, res); nd = defRep - u;
      const ri = res - u;
      is = ri <= 42500 ? ri * 0.15 : 42500 * 0.15 + (ri - 42500) * 0.25;
    }
    defRep = nd;
    const cf = loyers - charges - r.mensualite * 12 - is;
    cumCF += cf;
    const val    = p.prix * Math.pow(1 + p.revalorisation / 100, yr);
    const vcn    = Math.max(0, inv - amCum);
    const pv     = Math.max(0, val - vcn);
    const isPlv  = pv <= 42500 ? pv * 0.15 : 42500 * 0.15 + (pv - 42500) * 0.25;
    const netSCI = val - r.capRestant - isPlv;
    const distrib = Math.max(0, netSCI - p.apport);
    const net    = netSCI - distrib * 0.30;
    cfs.push(yr === p.horizon ? cf + net : cf);
    proj.push({ an: yr, cf: Math.round(cf), cfM: Math.round(cf / 12), cum: Math.round(cumCF), imp: Math.round(is), val: Math.round(val), pvImp: Math.round(isPlv + distrib * 0.30), patNet: Math.round(net + cumCF - p.apport), loyers: Math.round(loyers), charges: Math.round(charges), mensAn: Math.round(r.mensualite * 12) });
  }
  const rE = p.revenusMensuels > 0 ? (mensualite / (p.revenusMensuels + p.loyer * 0.7)) * 100 : 0;
  return {
    type: "SCI IS", color: "#7C3AED",
    mensualite, investTotal: inv, fraisNotaire: fn, capital: cap,
    amortSchedule: rows, projections: proj,
    tri: calcTRI(cfs, p.horizon),
    rendBrut: (p.loyer * 12 / p.prix) * 100,
    rendNet:  ((loyers - charges) / inv) * 100,
    ratioEndt: rE, cashflowM: proj[0].cfM,
    horizonData: proj[p.horizon - 1],
    amDetails: { amBati: Math.round(amBati), amTrav: Math.round(amTrav), amMob: 0, amTot: Math.round(amTot) },
    fiscalInfo: [
      ["Régime", "Société Civile Immobilière à l'Impôt sur les Sociétés"],
      ["IS", "15% jusqu'à 42 500€ de bénéfice, puis 25% au-delà"],
      ["Amort. bien", `${fmt(amBati)}/an (85% du prix sur 30 ans)`],
      ["Distribution", "Flat tax 30% (PFU) sur dividendes distribués aux associés"],
      ["Plus-value cession", "PV professionnelle (IS) + flat tax distribution — aucun abattement pour durée"],
      ["Atout majeur", "IS à 15% avantageux si TMI ≥ 30%. Transmission de parts sociales facilitée"],
    ],
  };
}

// ─── SCI IR ──────────────────────────────────────────────────
function calcSCIIR(p) {
  const base = calcLocationNue(p);
  return {
    ...base, type: "SCI IR", color: "#059669",
    fiscalInfo: [
      ["Régime", "Société Civile Immobilière translucide — transparence fiscale IR"],
      ["Imposition", "Chaque associé déclare sa quote-part en revenus fonciers"],
      ["Amortissement", "NON — comme la location nue classique"],
      ["Déficit foncier", "Max 10 700€/associé/an imputable sur revenu global"],
      ["Plus-value cession", "Régime particuliers — mêmes abattements que la location nue"],
      ["Atout majeur", "Structure juridique (transmission, démembrement, association) sans IS"],
    ],
  };
}

// ═══════════════════════════════════════════════════════
//  GÉNÉRATEUR PDF (jsPDF + autoTable — chargement dynamique)
// ═══════════════════════════════════════════════════════

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
    const W = 210, H = 297, ml = 15, mr = 15;
    const cw = W - ml - mr;

    const C = {
      pri: [24, 95, 165], sec: [100, 116, 139], ok: [5, 150, 105],
      err: [220, 38, 38], bg: [248, 250, 252], bdr: [226, 232, 240],
      txt: [30, 41, 59],  whi: [255, 255, 255], yel: [254, 243, 199],
      lbg: [240, 245, 255],
    };

    let pageNum = 0;
    const newPage = () => { if (pageNum > 0) doc.addPage(); pageNum++; };
    const setF = (sz, st = "normal", col = C.txt) => {
      doc.setFontSize(sz); doc.setFont("helvetica", st); doc.setTextColor(...col);
    };
    const fillR = (x, y, w, h, col, r = 0) => {
      doc.setFillColor(...col);
      r > 0 ? doc.roundedRect(x, y, w, h, r, r, "F") : doc.rect(x, y, w, h, "F");
    };
    const pageHeader = (title, sub = "") => {
      fillR(0, 0, W, 18, C.pri);
      setF(9, "bold", C.whi); doc.text("DOSSIER D'INVESTISSEMENT IMMOBILIER", ml, 7);
      setF(7.5, "normal", [180, 210, 240]);
      doc.text(`${form.prenom} ${form.nom}  ·  ${form.adresseBien || "Bien immobilier"}`, ml, 13);
      doc.text(`Page ${pageNum}`, W - mr, 13, { align: "right" });
      setF(13, "bold", C.txt); doc.text(title, ml, 28);
      if (sub) { setF(8.5, "normal", C.sec); doc.text(sub, ml, 35); }
      return sub ? 42 : 36;
    };
    const pageFooter = () => {
      fillR(0, H - 11, W, 11, C.bg);
      doc.setDrawColor(...C.bdr); doc.setLineWidth(0.3);
      doc.line(ml, H - 11, W - mr, H - 11);
      setF(7, "normal", C.sec);
      doc.text("Document confidentiel — Simulateur LMNP Expert — " + new Date().toLocaleDateString("fr-FR"), W / 2, H - 4, { align: "center" });
    };
    const tbl = (startY, body, head = null, colStyles = {}) => {
      doc.autoTable({
        startY, margin: { left: ml, right: mr },
        styles: { fontSize: 8.5, cellPadding: 2.8, halign: "right" },
        headStyles: { fillColor: C.pri, textColor: 255, halign: "center", fontStyle: "bold" },
        alternateRowStyles: { fillColor: C.bg },
        body, head, columnStyles: colStyles,
      });
      return doc.lastAutoTable.finalY;
    };
    const bar = (y, label) => {
      fillR(ml, y, cw, 7.5, C.pri, 2);
      setF(8.5, "bold", C.whi); doc.text(label.toUpperCase(), ml + 4, y + 5.5);
      return y + 11;
    };
    const leftRight = { halign: "left" };
    const bold240 = { halign: "left", fontStyle: "bold", fillColor: C.lbg };

    /* ── PAGE 1 : COUVERTURE ── */
    newPage();
    fillR(0, 0, W, H, C.pri);
    fillR(18, 45, W - 36, H - 90, C.whi, 6);
    setF(20, "bold", C.whi); doc.text("DOSSIER", W / 2, 22, { align: "center" });
    setF(12, "normal", [180, 210, 240]); doc.text("D'INVESTISSEMENT IMMOBILIER", W / 2, 30, { align: "center" });
    fillR(W / 2 - 42, 53, 84, 12, [240, 245, 255], 6);
    setF(13, "bold", C.pri); doc.text(result.type, W / 2, 61, { align: "center" });
    setF(17, "bold", C.txt); doc.text(`${form.prenom} ${form.nom}`, W / 2, 80, { align: "center" });
    setF(9.5, "normal", C.sec); doc.text(form.adresseBien || "Bien immobilier", W / 2, 88, { align: "center" });
    const kw = (cw - 10) / 2 + 3;
    const kpis = [
      { l: "Cash-flow mensuel net", v: fmt(result.cashflowM), c: result.cashflowM >= 0 ? C.ok : C.err },
      { l: "Taux d'endettement", v: fmtPct(result.ratioEndt), c: result.ratioEndt > 35 ? C.err : C.ok },
      { l: `TRI sur ${form.horizon} ans`, v: fmtPct(result.tri), c: C.pri },
      { l: "Rendement net investisseur", v: fmtPct(result.rendNet), c: C.pri },
    ];
    kpis.forEach((k, i) => {
      const kx = 22 + (i % 2) * (kw + 6);
      const ky = 100 + Math.floor(i / 2) * 36;
      fillR(kx, ky, kw, 28, C.bg, 4);
      setF(7, "normal", C.sec); doc.text(k.l.toUpperCase(), kx + 6, ky + 8);
      setF(16, "bold", k.c); doc.text(k.v, kx + 6, ky + 20);
    });
    setF(7, "italic", [200, 215, 235]);
    doc.text("Document confidentiel — simulations financières — ne constitue pas un conseil en investissement.", W / 2, H - 28, { align: "center" });
    setF(8, "normal", [200, 215, 235]); doc.text("Généré le " + new Date().toLocaleDateString("fr-FR"), W / 2, H - 22, { align: "center" });

    /* ── PAGE 2 : PROFIL EMPRUNTEUR ── */
    newPage(); let y = pageHeader("Profil Emprunteur", "Analyse de la situation financière et capacité bancaire"); pageFooter();
    y = bar(y, "Informations personnelles");
    y = tbl(y, [
      ["Nom complet", `${form.prenom} ${form.nom}`, "Email", form.email || "—"],
      ["Situation professionnelle", form.situationPro || "—", "Ancienneté", form.anciennete ? form.anciennete + " ans" : "—"],
      ["Situation familiale", form.situationFam || "—", "CDI / Fonctionnaire", form.cdi ? "Oui ✓" : "Non"],
    ], null, { 0: { ...bold240, cellWidth: 48 }, 1: leftRight, 2: { ...bold240, cellWidth: 48 }, 3: leftRight });

    y = bar(y + 7, "Revenus & charges actuels");
    const revTotal = (form.revenusMensuels || 0) + (form.autresRevenus || 0);
    y = tbl(y, [
      ["Revenus nets mensuels", fmt(form.revenusMensuels), "Autres revenus", fmt(form.autresRevenus)],
      ["Total revenus retenus", fmt(revTotal), "Capacité emprunt max (35%)", fmt(revTotal * 0.35)],
      ["Charges crédit existantes", fmt(form.chargesCredit), "Reste à vivre actuel", fmt(revTotal - (form.chargesCredit || 0))],
      ["Tranche marginale (TMI)", fmtPct(form.tmi), "Prélèvements sociaux", fmtPct(17.2)],
    ], null, { 0: { ...bold240, cellWidth: 55 }, 1: {}, 2: { ...bold240, cellWidth: 55 }, 3: {} });

    y = bar(y + 7, "Impact projet sur le taux d'endettement");
    const loyerPond  = (form.loyer || 0) * 0.7;
    const newCharges = (form.chargesCredit || 0) + result.mensualite;
    const newRevs    = revTotal + loyerPond;
    const newRatio   = newRevs > 0 ? (newCharges / newRevs) * 100 : 0;
    y = tbl(y, [
      ["Mensualité du prêt (ce projet)", fmt(result.mensualite), "Loyer pondéré retenu (70%)", fmt(loyerPond)],
      ["Charges crédit totales", fmt(newCharges), "Revenus retenus par la banque", fmt(newRevs)],
      ["TAUX D'ENDETTEMENT APRÈS PROJET", { content: fmtPct(newRatio), styles: { textColor: newRatio > 35 ? C.err : C.ok, fontStyle: "bold", fontSize: 10 } }, "Seuil bancaire courant", "35 %"],
    ], null, { 0: { ...bold240, cellWidth: 55 }, 2: { ...bold240, cellWidth: 55 } });

    /* ── PAGE 3 : BIEN & FINANCEMENT ── */
    newPage(); y = pageHeader("Présentation du Bien & Plan de Financement"); pageFooter();
    y = bar(y, "Caractéristiques du bien");
    y = tbl(y, [
      ["Adresse", form.adresseBien || "—", "Type de bien", form.typeBien || "—"],
      ["Surface", form.surface ? form.surface + " m²" : "—", "Classe DPE", form.dpe || "—"],
      ["Régime fiscal retenu", result.type, "Horizon de revente", `${form.horizon} ans`],
    ], null, { 0: { ...bold240, cellWidth: 40 }, 1: leftRight, 2: { ...bold240, cellWidth: 40 }, 3: leftRight });

    y = bar(y + 7, "Plan de financement");
    y = tbl(y, [
      ["Prix d'acquisition (FAI)", fmt(form.prix), "Apport personnel", fmt(form.apport)],
      ["Frais de notaire", fmt(result.fraisNotaire), "Capital emprunté", fmt(result.capital)],
      ["Budget travaux", fmt(form.travaux), "", ""],
      ["TOTAL INVESTISSEMENT", { content: fmt(result.investTotal), styles: { fontStyle: "bold" } }, "TOTAL FINANCEMENT", { content: fmt(result.investTotal), styles: { fontStyle: "bold" } }],
    ], [["EMPLOIS", "Montant", "RESSOURCES", "Montant"]], { 0: { halign: "left", cellWidth: 55 }, 1: {}, 2: { halign: "left", cellWidth: 55 }, 3: {} });

    y = bar(y + 7, "Conditions du crédit");
    y = tbl(y, [
      ["Capital emprunté", fmt(result.capital), "Taux d'intérêt annuel", fmtPct(form.interet)],
      ["Durée du crédit", `${form.dureeCredit} ans`, "Mensualité crédit", fmt(result.mensualite)],
      ["Coût total du crédit", fmt(result.mensualite * form.dureeCredit * 12 - result.capital), "Taux d'endettement projet", fmtPct(result.ratioEndt)],
    ], null, { 0: { ...bold240, cellWidth: 55 }, 2: { ...bold240, cellWidth: 55 } });

    y = bar(y + 7, "Analyse locative");
    const loyers   = form.loyer * 12 * (1 - form.vacance / 100);
    const chargesA = form.charges * 12 + form.taxeFonciere;
    y = tbl(y, [
      ["Loyer mensuel (HC)", fmt(form.loyer), "Rendement brut", fmtPct(result.rendBrut)],
      ["Taux de vacance", fmtPct(form.vacance), "Loyers annuels nets de vacance", fmt(loyers)],
      ["Charges annuelles (copro + TF)", fmt(chargesA), "Rendement net investisseur", fmtPct(result.rendNet)],
      ["Cash-flow net mensuel (An 1)", { content: fmt(result.cashflowM), styles: { textColor: result.cashflowM >= 0 ? C.ok : C.err, fontStyle: "bold" } }, "Investissement total", fmt(result.investTotal)],
    ], null, { 0: { ...bold240, cellWidth: 55 }, 2: { ...bold240, cellWidth: 55 } });

    /* ── PAGE 4 : TABLEAU D'AMORTISSEMENT ── */
    newPage(); y = pageHeader("Tableau d'Amortissement du Crédit", `${form.dureeCredit} ans — Taux ${fmtPct(form.interet)} — Capital ${fmt(result.capital)}`); pageFooter();
    y = tbl(y, result.amortSchedule.slice(0, 20).map((r) => [
      `Année ${r.an}`, fmt(r.mensualite), fmt(r.interets), fmt(r.capital), fmt(r.capRestant),
    ]), [["Année", "Mensualité", "Intérêts annuels", "Capital remboursé", "Capital restant dû"]],
    { 0: { halign: "left", fontStyle: "bold", cellWidth: 28 } });
    const totInt = result.amortSchedule.reduce((a, r) => a + r.interets, 0);
    y = doc.lastAutoTable.finalY;
    fillR(ml, y, cw, 8, C.lbg, 2);
    setF(8.5, "bold", C.pri);
    doc.text("TOTAUX", ml + 4, y + 5.5);
    doc.text(`Intérêts payés : ${fmt(totInt)}   —   Coût total du crédit : ${fmt(totInt)}`, W - mr, y + 5.5, { align: "right" });

    /* ── PAGE 5 : PROJECTION 20 ANS ── */
    newPage(); y = pageHeader("Projection Cash-Flow sur 20 ans", "Après remboursement crédit, charges et fiscalité"); pageFooter();
    y = tbl(y, result.projections.map((r) => {
      const isH = r.an === form.horizon;
      const cell = (content, extra = {}) => ({ content, styles: { fillColor: isH ? [219, 234, 254] : null, ...extra } });
      return [
        { content: `A${r.an}`, styles: { fontStyle: isH ? "bold" : "normal", halign: "center", fillColor: isH ? [219, 234, 254] : null } },
        cell(fmt(r.loyers)),
        cell(fmt(r.mensAn)),
        cell(fmt(r.imp)),
        cell(fmt(r.cf), { textColor: r.cf < 0 ? C.err : C.ok, fontStyle: "bold" }),
        cell(fmt(r.cfM), { textColor: r.cfM < 0 ? C.err : C.ok }),
        cell(fmt(r.cum)),
        cell(fmt(r.val)),
        cell(fmt(r.patNet), { textColor: r.patNet < 0 ? C.err : C.pri, fontStyle: "bold" }),
      ];
    }), [["An", "Loyers nets", "Mensualité", "Impôt", "CF net/an", "CF/mois", "CF cumulé", "Val. bien", "Patrim. net"]],
    { 0: { halign: "center", cellWidth: 10 } });
    y = doc.lastAutoTable.finalY + 4;
    fillR(ml, y, cw, 6, [219, 234, 254], 2);
    setF(7.5, "italic", C.pri);
    doc.text(`★ Ligne bleue = horizon de revente retenu (Année ${form.horizon})`, ml + 4, y + 4.2);

    /* ── PAGE 6 : ANALYSE FISCALE ── */
    newPage(); y = pageHeader("Analyse Fiscale & Optimisation", `Régime ${result.type}`); pageFooter();
    y = bar(y, `Règles fiscales — ${result.type}`);
    y = tbl(y, result.fiscalInfo, null, { 0: { halign: "left", fontStyle: "bold", fillColor: C.lbg, cellWidth: 50 }, 1: leftRight });
    if (result.amDetails) {
      y = bar(y + 7, "Détail des amortissements annuels");
      const amRows = [
        ["Amortissement du bâti", fmt(result.amDetails.amBati), "Base : 85% du prix / 30 ans"],
        ["Amortissement travaux", fmt(result.amDetails.amTrav), "Base : travaux / 10 ans"],
        result.amDetails.amMob ? ["Amortissement mobilier", fmt(result.amDetails.amMob), "Base : mobilier / 7 ans"] : null,
        ["TOTAL AMORTISSEMENTS / AN", { content: fmt(result.amDetails.amTot), styles: { fontStyle: "bold" } }, "Déductible du résultat imposable"],
      ].filter(Boolean);
      y = tbl(y, amRows, null, { 0: { halign: "left", fontStyle: "bold", fillColor: C.lbg, cellWidth: 55 }, 1: { cellWidth: 30 }, 2: leftRight });
    }
    y = bar(y + 7, `Synthèse à l'horizon ${form.horizon} ans`);
    const hd = result.horizonData;
    y = tbl(y, [
      ["Horizon de revente", `Année ${hd.an}`, "TRI sur la période", { content: fmtPct(result.tri), styles: { fontStyle: "bold", textColor: result.tri >= 5 ? C.ok : C.err } }],
      ["Cash-flows cumulés", fmt(hd.cum), "Valeur estimée du bien", fmt(hd.val)],
      ["Impôt sur la plus-value revente", fmt(hd.pvImp), "Patrimoine net total", { content: fmt(hd.patNet), styles: { fontStyle: "bold", textColor: C.pri } }],
      ["Cash-flow mensuel moyen (An 1)", fmt(result.cashflowM), "Rendement net", fmtPct(result.rendNet)],
    ], null, { 0: { ...bold240, cellWidth: 55 }, 2: { ...bold240, cellWidth: 55 } });

    /* ── PAGE 7 : CONCLUSION ── */
    newPage(); y = pageHeader("Synthèse & Arguments Bancaires"); pageFooter();
    const isOK = result.cashflowM >= 0 && result.ratioEndt <= 35;
    fillR(ml, y, cw, 38, isOK ? [240, 253, 244] : [255, 241, 242], 4);
    doc.setDrawColor(...(isOK ? C.ok : C.err)); doc.setLineWidth(0.5);
    doc.roundedRect(ml, y, cw, 38, 4, 4, "S");
    setF(12, "bold", isOK ? C.ok : C.err);
    doc.text(isOK ? "✓  Projet bancairement viable" : "⚠  Points d'attention à traiter", ml + 8, y + 12);
    setF(8.5, "normal", C.txt);
    doc.text([
      result.cashflowM >= 0 ? `• Cash-flow positif : +${fmt(result.cashflowM)}/mois dès la 1ère année` : `• Cash-flow négatif : ${fmt(result.cashflowM)}/mois — effort de ${fmt(-result.cashflowM)}/mois`,
      result.ratioEndt <= 35 ? `• Taux d'endettement : ${fmtPct(result.ratioEndt)} ✓ dans les normes bancaires (< 35%)` : `• Taux d'endettement : ${fmtPct(result.ratioEndt)} > 35% — augmenter l'apport ou réduire la durée`,
      `• TRI sur ${form.horizon} ans : ${fmtPct(result.tri)} — ${result.tri >= 8 ? "excellent" : result.tri >= 5 ? "satisfaisant" : "à améliorer (revoir prix/loyer)"}`,
    ], ml + 8, y + 22, { lineHeightFactor: 1.65 });
    y += 46;

    y = bar(y, "Arguments clés à présenter à la banque");
    y = tbl(y, [
      ["Projet solide",         result.rendBrut >= 5 ? `Rendement brut ${fmtPct(result.rendBrut)} — au-dessus de la moyenne marché` : `Rendement brut ${fmtPct(result.rendBrut)} — confirmé par expertise locative`],
      ["Fiscalité optimisée",   result.type === "LMNP Réel" ? `Amortissements ${fmt(result.amDetails?.amTot)}/an → impôt quasi nul les 1ères années` : result.type === "SCI IS" ? `IS à 15% plus favorable que TMI ${form.tmi}% — structure transmissible` : `Déficit foncier imputable sur revenu global dès la 1ère année`],
      ["Autofinancement",       result.cashflowM >= 0 ? `Autofinancement confirmé : +${fmt(result.cashflowM)}/mois net d'impôt` : `Effort maîtrisé : ${fmt(-result.cashflowM)}/mois pour un patrimoine estimé à ${fmt(result.horizonData.patNet)} à ${form.horizon} ans`],
      ["Patrimoine constitué",  `À l'horizon ${form.horizon} ans : patrimoine net estimé à ${fmt(hd.patNet)} — TRI ${fmtPct(result.tri)}`],
      ["Garanties proposées",   "Hypothèque conventionnelle sur le bien — nantissement possible selon profil"],
      ["Sécurité locative",     `Vacance provisionnée à ${fmtPct(form.vacance)} — zone locative vérifiée — loyer de marché confirmé`],
    ], null, { 0: { halign: "left", fontStyle: "bold", fillColor: C.lbg, cellWidth: 45 }, 1: leftRight });

    y = doc.lastAutoTable.finalY + 8;
    fillR(ml, y, cw, 28, C.yel, 3);
    setF(7.5, "italic", [146, 64, 14]);
    doc.text(
      "Avertissement : Ce document est établi sur la base des informations fournies et de simulations financières. Les projections ne constituent pas\n" +
      "une garantie de rendement. Les résultats fiscaux dépendent de votre situation personnelle et de la législation en vigueur.\n" +
      "Consultez un conseiller en gestion de patrimoine (CGP) agréé et/ou un expert-comptable avant toute décision d'investissement.",
      ml + 5, y + 8, { maxWidth: cw - 10, lineHeightFactor: 1.6 }
    );

    const slug = result.type.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, "").toLowerCase();
    doc.save(`dossier-bancaire-${slug}-${(form.nom || "investisseur").toLowerCase()}.pdf`);
  });
}

// ═══════════════════════════════════════════════════════
//  DONNÉES PAR DÉFAUT
// ═══════════════════════════════════════════════════════
const DEFAULTS = {
  prenom: "", nom: "", email: "", situationPro: "Salarié CDI", anciennete: 5,
  situationFam: "Marié(e)", cdi: true,
  revenusMensuels: 4500, autresRevenus: 0, chargesCredit: 0, tmi: 30,
  adresseBien: "", typeBien: "Appartement", surface: 45, dpe: "C",
  prix: 180000, notaire: 8, travaux: 10000, mobilier: 5000,
  apport: 30000, interet: 3.5, dureeCredit: 20, horizon: 15,
  loyer: 850, charges: 120, taxeFonciere: 1200, vacance: 5, revalorisation: 1.5,
};

const STEPS = [
  { id: "emprunteur",  label: "Emprunteur", icon: "👤" },
  { id: "bien",        label: "Le Bien",    icon: "🏠" },
  { id: "financement", label: "Crédit",     icon: "🏦" },
  { id: "exploitation",label: "Loyers",    icon: "📊" },
  { id: "resultats",   label: "Résultats",  icon: "📈" },
];

// ═══════════════════════════════════════════════════════
//  COMPOSANTS UI
// ═══════════════════════════════════════════════════════
function Input({ label, type = "text", value, onChange, suffix, options, help, min, max, step }) {
  const base = { width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 13, boxSizing: "border-box", background: "white" };
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "#475569", marginBottom: 4 }}>{label}</label>
      {options ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} style={base}>
          {options.map((o) => <option key={o}>{o}</option>)}
        </select>
      ) : (
        <div style={{ position: "relative" }}>
          <input type={type} value={value} min={min} max={max} step={step}
            onChange={(e) => onChange(type === "number" ? Number(e.target.value) : e.target.value)}
            style={{ ...base, paddingRight: suffix ? 34 : 10 }} />
          {suffix && <span style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: 11 }}>{suffix}</span>}
        </div>
      )}
      {help && <p style={{ fontSize: 10.5, color: "#94a3b8", margin: "3px 0 0" }}>{help}</p>}
    </div>
  );
}

function Slider({ label, value, onChange, min, max, step = 1, suffix = "", help }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
        <span style={{ fontWeight: 600, color: "#475569" }}>{label}</span>
        <strong style={{ color: "#185FA5" }}>{(value || 0).toLocaleString("fr-FR")}{suffix}</strong>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))} style={{ width: "100%", accentColor: "#185FA5" }} />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
        <span>{(+min).toLocaleString("fr-FR")}{suffix}</span>
        <span>{(+max).toLocaleString("fr-FR")}{suffix}</span>
      </div>
      {help && <p style={{ fontSize: 10.5, color: "#94a3b8", margin: "2px 0 0" }}>{help}</p>}
    </div>
  );
}

function Card({ title, sub, children, accent }) {
  return (
    <div style={{ background: "white", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,.08)", padding: 22, marginBottom: 16, borderTop: accent ? `4px solid ${accent}` : undefined }}>
      {title && <h2 style={{ margin: "0 0 3px", fontSize: 17, color: "#1e293b" }}>{title}</h2>}
      {sub   && <p  style={{ margin: "0 0 18px", color: "#64748b", fontSize: 12.5 }}>{sub}</p>}
      {children}
    </div>
  );
}

function G2({ children }) { return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>{children}</div>; }

function Pill({ label, value, color }) {
  return (
    <div style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
      <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: color || "#1e293b" }}>{value}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  VUE COMPARATIF
// ═══════════════════════════════════════════════════════
function ComparisonView({ results, onSelect, form }) {
  const best = results.reduce((b, r) => r.cashflowM > b.cashflowM ? r : b, results[0]);
  const cfData  = results[0].projections.map((_, i) => ({ an: `A${i + 1}`, ...Object.fromEntries(results.map((r) => [r.type, r.projections[i].cfM])) }));
  const patData = results[0].projections.map((_, i) => ({ an: `A${i + 1}`, ...Object.fromEntries(results.map((r) => [r.type, r.projections[i].patNet])) }));
  return (
    <div>
      <Card title="📊 Comparatif des 4 régimes d'investissement" sub="Cliquez sur un régime pour voir le détail complet et télécharger le dossier bancaire PDF">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
          {results.map((r) => (
            <div key={r.type} onClick={() => onSelect(r)}
              style={{ border: `2px solid ${r === best ? r.color : "#e2e8f0"}`, borderRadius: 10, padding: 16, cursor: "pointer", background: r === best ? `${r.color}0d` : "white", transition: "all 0.15s" }}>
              {r === best && <div style={{ fontSize: 10, fontWeight: 700, color: r.color, marginBottom: 6 }}>⭐ MEILLEUR CASH-FLOW</div>}
              <div style={{ fontWeight: 700, fontSize: 15, color: r.color, marginBottom: 10 }}>{r.type}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <Pill label="CF mensuel" value={fmt(r.cashflowM)} color={r.cashflowM >= 0 ? "#059669" : "#dc2626"} />
                <Pill label="Rendement net" value={fmtPct(r.rendNet)} color={r.color} />
                <Pill label={`TRI ${form.horizon}a`} value={fmtPct(r.tri)} color={r.color} />
                <Pill label="Endettement" value={fmtPct(r.ratioEndt)} color={r.ratioEndt > 35 ? "#dc2626" : "#059669"} />
              </div>
              <div style={{ marginTop: 10, fontSize: 11, color: r.color, fontWeight: 600 }}>→ Dossier bancaire complet</div>
            </div>
          ))}
        </div>

        <h3 style={{ fontSize: 13, color: "#475569", margin: "0 0 10px" }}>Cash-flow mensuel net comparé (20 ans)</h3>
        <div style={{ height: 240, marginBottom: 28 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cfData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="an" fontSize={10} tick={{ fill: "#94a3b8" }} />
              <YAxis fontSize={10} tick={{ fill: "#94a3b8" }} tickFormatter={(v) => `${Math.round(v / 100) * 100}€`} />
              <Tooltip formatter={(v) => fmt(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 2" />
              {results.map((r) => <Line key={r.type} type="monotone" dataKey={r.type} stroke={r.color} dot={false} strokeWidth={2} />)}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <h3 style={{ fontSize: 13, color: "#475569", margin: "0 0 10px" }}>Patrimoine net comparé (20 ans)</h3>
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={patData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="an" fontSize={10} tick={{ fill: "#94a3b8" }} />
              <YAxis fontSize={10} tick={{ fill: "#94a3b8" }} tickFormatter={(v) => fmtK(v)} />
              <Tooltip formatter={(v) => fmt(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 2" />
              {results.map((r) => <Line key={r.type} type="monotone" dataKey={r.type} stroke={r.color} dot={false} strokeWidth={2} />)}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  VUE DÉTAIL
// ═══════════════════════════════════════════════════════
function DetailView({ result, form, onBack }) {
  const patData = result.projections.map((r) => ({ an: `A${r.an}`, patrimoine: r.patNet, cumCF: r.cum }));
  const cfData  = result.projections.map((r) => ({ an: `A${r.an}`, CF: r.cfM }));
  return (
    <div>
      <Card accent={result.color}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "#185FA5", fontWeight: 600, fontSize: 13 }}>← Retour comparatif</button>
          <button onClick={() => generatePDF(form, result)} style={{ padding: "10px 22px", background: result.color, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
            📄 Télécharger le dossier bancaire PDF
          </button>
        </div>
        <h2 style={{ margin: "0 0 4px", fontSize: 20, color: result.color }}>{result.type}</h2>
        <p style={{ margin: "0 0 18px", color: "#64748b", fontSize: 13 }}>{form.adresseBien || "Bien immobilier"} — Horizon {form.horizon} ans</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
          <Pill label="CF mensuel net" value={fmt(result.cashflowM)} color={result.cashflowM >= 0 ? "#059669" : "#dc2626"} />
          <Pill label="Rendement brut" value={fmtPct(result.rendBrut)} color={result.color} />
          <Pill label="Rendement net" value={fmtPct(result.rendNet)} color={result.color} />
          <Pill label={`TRI ${form.horizon} ans`} value={fmtPct(result.tri)} color={result.color} />
          <Pill label="Taux endettement" value={fmtPct(result.ratioEndt)} color={result.ratioEndt > 35 ? "#dc2626" : "#059669"} />
          <Pill label="Mensualité" value={fmt(result.mensualite)} />
          <Pill label="Investissement total" value={fmt(result.investTotal)} />
          <Pill label={`Patrimoine net ${form.horizon}a`} value={fmt(result.horizonData?.patNet)} color={result.color} />
        </div>

        <h3 style={{ fontSize: 12.5, color: "#475569", margin: "0 0 8px" }}>Cash-flow mensuel net (20 ans)</h3>
        <div style={{ height: 200, marginBottom: 22 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cfData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="an" fontSize={9} tick={{ fill: "#94a3b8" }} />
              <YAxis fontSize={9} tickFormatter={(v) => `${Math.round(v)}€`} />
              <Tooltip formatter={(v) => fmt(v)} />
              <ReferenceLine y={0} stroke="#94a3b8" />
              <Bar dataKey="CF" name="CF mensuel" fill={result.color} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <h3 style={{ fontSize: 12.5, color: "#475569", margin: "0 0 8px" }}>Évolution du patrimoine net (20 ans)</h3>
        <div style={{ height: 200, marginBottom: 22 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={patData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="an" fontSize={9} tick={{ fill: "#94a3b8" }} />
              <YAxis fontSize={9} tickFormatter={(v) => fmtK(v)} />
              <Tooltip formatter={(v) => fmt(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 2" />
              <Line type="monotone" dataKey="patrimoine" name="Patrimoine net" stroke={result.color} dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="cumCF" name="CF cumulé" stroke="#94a3b8" dot={false} strokeWidth={1.5} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <h3 style={{ fontSize: 12.5, color: "#475569", margin: "0 0 8px" }}>Tableau d'amortissement (10 premières années)</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: result.color, color: "white" }}>
                {["Année", "Mensualité", "Intérêts", "Capital", "Restant dû"].map((h) => (
                  <th key={h} style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.amortSchedule.slice(0, 10).map((r, i) => (
                <tr key={r.an} style={{ background: i % 2 === 0 ? "#f8fafc" : "white" }}>
                  <td style={{ padding: "6px 10px", fontWeight: 600 }}>Année {r.an}</td>
                  {[r.mensualite, r.interets, r.capital, r.capRestant].map((v, j) => (
                    <td key={j} style={{ padding: "6px 10px", textAlign: "right" }}>{fmt(v)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 style={{ fontSize: 12.5, color: "#475569", margin: "18px 0 8px" }}>Règles fiscales — {result.type}</h3>
        <div style={{ borderRadius: 8, overflow: "hidden", fontSize: 12 }}>
          {result.fiscalInfo.map(([k, v], i) => (
            <div key={k} style={{ display: "flex", padding: "8px 12px", background: i % 2 === 0 ? "#f8fafc" : "white", gap: 12 }}>
              <span style={{ fontWeight: 600, color: "#475569", minWidth: 145, flexShrink: 0 }}>{k}</span>
              <span style={{ color: "#334155" }}>{v}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 20, textAlign: "center" }}>
          <button onClick={() => generatePDF(form, result)}
            style={{ padding: "12px 32px", background: result.color, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
            📄 Générer le dossier bancaire complet (PDF 7 pages)
          </button>
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  APP PRINCIPALE
// ═══════════════════════════════════════════════════════
export default function App() {
  const [step,     setStep]    = useState(0);
  const [form,     setForm]    = useState(DEFAULTS);
  const [selected, setSelected] = useState(null);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const results = useMemo(() => {
    if (step < 4) return null;
    return [calcLMNP(form), calcLocationNue(form), calcSCIIS(form), calcSCIIR(form)];
  }, [form, step]);

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ background: "#185FA5", color: "white", padding: "12px 24px", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 22 }}>🏢</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Simulateur LMNP Expert</div>
          <div style={{ fontSize: 11, opacity: 0.75 }}>Dossier bancaire professionnel — 4 régimes comparés</div>
        </div>
      </div>

      {/* Stepper */}
      <div style={{ background: "white", borderBottom: "1px solid #e2e8f0", padding: "10px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", maxWidth: 700, margin: "0 auto 6px" }}>
          {STEPS.map((s, i) => (
            <div key={s.id} onClick={() => i <= step && setStep(i)}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: i <= step ? "pointer" : "default", gap: 2 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                background: i < step ? "#185FA5" : i === step ? "#DBEAFE" : "#f1f5f9",
                border: i === step ? "2px solid #185FA5" : "2px solid transparent" }}>{s.icon}</div>
              <span style={{ fontSize: 10, color: i === step ? "#185FA5" : i < step ? "#059669" : "#94a3b8", fontWeight: i === step ? 700 : 400 }}>{s.label}</span>
            </div>
          ))}
        </div>
        <div style={{ background: "#e2e8f0", height: 3, borderRadius: 2, maxWidth: 700, margin: "0 auto" }}>
          <div style={{ background: "#185FA5", height: "100%", borderRadius: 2, width: `${(step / (STEPS.length - 1)) * 100}%`, transition: "width 0.3s" }} />
        </div>
      </div>

      <div style={{ maxWidth: 780, margin: "0 auto", padding: "20px 16px" }}>

        {/* ── ÉTAPE 0 : EMPRUNTEUR ── */}
        {step === 0 && (
          <Card title="👤 Profil Emprunteur" sub="Ces informations permettent de calculer votre ratio d'endettement bancaire">
            <G2>
              <Input label="Prénom" value={form.prenom} onChange={set("prenom")} />
              <Input label="Nom" value={form.nom} onChange={set("nom")} />
              <Input label="Email" type="email" value={form.email} onChange={set("email")} />
              <Input label="Situation professionnelle" value={form.situationPro} onChange={set("situationPro")}
                options={["Salarié CDI", "Fonctionnaire", "TNS / Indépendant", "Chef d'entreprise", "Retraité", "Autre"]} />
              <Input label="Ancienneté dans l'emploi (ans)" type="number" value={form.anciennete} onChange={set("anciennete")} min={0} max={45} />
              <Input label="Situation familiale" value={form.situationFam} onChange={set("situationFam")}
                options={["Célibataire", "Marié(e)", "Pacsé(e)", "En concubinage", "Divorcé(e)"]} />
            </G2>
            <Slider label="Revenus nets mensuels (salaire net imposable)" value={form.revenusMensuels} onChange={set("revenusMensuels")} min={1000} max={20000} step={100} suffix=" €" />
            <Slider label="Autres revenus mensuels (locations existantes, etc.)" value={form.autresRevenus} onChange={set("autresRevenus")} min={0} max={10000} step={100} suffix=" €" />
            <Slider label="Charges de crédit actuelles (hors ce projet)" value={form.chargesCredit} onChange={set("chargesCredit")} min={0} max={5000} step={50} suffix=" €" />
            <Slider label="Tranche marginale d'imposition (TMI)" value={form.tmi} onChange={set("tmi")} min={0} max={45} step={1} suffix=" %"
              help="0%, 11%, 30%, 41% ou 45% selon votre revenu imposable net" />
          </Card>
        )}

        {/* ── ÉTAPE 1 : BIEN ── */}
        {step === 1 && (
          <Card title="🏠 Le Bien Immobilier" sub="Caractéristiques du bien ciblé">
            <Input label="Adresse du bien" value={form.adresseBien} onChange={set("adresseBien")} />
            <G2>
              <Input label="Type de bien" value={form.typeBien} onChange={set("typeBien")}
                options={["Appartement", "Maison", "Studio", "Immeuble de rapport", "Local commercial", "Parking"]} />
              <Input label="Surface (m²)" type="number" value={form.surface} onChange={set("surface")} min={5} max={500} />
              <Input label="Classe DPE" value={form.dpe} onChange={set("dpe")} options={["A", "B", "C", "D", "E", "F", "G"]} />
              <Input label="Frais de notaire (%)" type="number" value={form.notaire} onChange={set("notaire")} min={2} max={10} step={0.1} />
            </G2>
            <Slider label="Prix d'acquisition FAI" value={form.prix} onChange={set("prix")} min={30000} max={1000000} step={5000} suffix=" €" />
            <Slider label="Budget travaux" value={form.travaux} onChange={set("travaux")} min={0} max={300000} step={1000} suffix=" €" />
            <Slider label="Budget mobilier (LMNP uniquement)" value={form.mobilier} onChange={set("mobilier")} min={0} max={30000} step={500} suffix=" €"
              help="Amortissable sur 7 ans en LMNP réel" />
          </Card>
        )}

        {/* ── ÉTAPE 2 : FINANCEMENT ── */}
        {step === 2 && (
          <Card title="🏦 Plan de Financement" sub="Conditions du crédit immobilier">
            <Slider label="Apport personnel" value={form.apport} onChange={set("apport")} min={0} max={400000} step={5000} suffix=" €" />
            <Slider label="Taux d'intérêt annuel" value={form.interet} onChange={set("interet")} min={0.5} max={8} step={0.05} suffix=" %" />
            <Slider label="Durée du crédit" value={form.dureeCredit} onChange={set("dureeCredit")} min={5} max={30} step={1} suffix=" ans" />
            <Slider label="Horizon de revente (pour le calcul du TRI)" value={form.horizon} onChange={set("horizon")} min={3} max={20} step={1} suffix=" ans"
              help="Durée de détention avant revente — utilisée pour calculer le TRI" />
            {(() => {
              const fn  = form.prix * form.notaire / 100;
              const inv = form.prix + fn + form.travaux;
              const cap = Math.max(0, inv - form.apport);
              const tm  = form.interet / 100 / 12;
              const n   = form.dureeCredit * 12;
              const m   = cap > 0 && tm > 0 ? (cap * tm) / (1 - Math.pow(1 + tm, -n)) : 0;
              return (
                <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: 16, marginTop: 4 }}>
                  <div style={{ fontWeight: 700, color: "#185FA5", marginBottom: 10, fontSize: 13 }}>📐 Estimation instantanée</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
                    <div>Investissement total : <strong>{fmt(inv)}</strong></div>
                    <div>Capital emprunté : <strong>{fmt(cap)}</strong></div>
                    <div>Mensualité estimée : <strong style={{ color: "#185FA5", fontSize: 14 }}>{fmt(m)}</strong></div>
                    <div>Coût total crédit : <strong>{fmt(m * form.dureeCredit * 12 - cap)}</strong></div>
                  </div>
                </div>
              );
            })()}
          </Card>
        )}

        {/* ── ÉTAPE 3 : EXPLOITATION ── */}
        {step === 3 && (
          <Card title="📊 Paramètres d'Exploitation" sub="Revenus et charges locatifs prévisionnels">
            <Slider label="Loyer mensuel hors charges" value={form.loyer} onChange={set("loyer")} min={200} max={5000} step={25} suffix=" €" />
            <Slider label="Charges mensuelles (copropriété, assurance PNO…)" value={form.charges} onChange={set("charges")} min={0} max={1000} step={10} suffix=" €" />
            <Slider label="Taxe foncière annuelle" value={form.taxeFonciere} onChange={set("taxeFonciere")} min={0} max={6000} step={50} suffix=" €" />
            <Slider label="Taux de vacance locative" value={form.vacance} onChange={set("vacance")} min={0} max={20} step={0.5} suffix=" %"
              help="~5% en zone tendue, 8-10% ailleurs" />
            <Slider label="Revalorisation annuelle du bien" value={form.revalorisation} onChange={set("revalorisation")} min={-2} max={6} step={0.1} suffix=" %"
              help="Hypothèse conservatrice recommandée : 1,5 à 2%" />
            <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: 14, marginTop: 4 }}>
              <div style={{ fontWeight: 700, color: "#059669", marginBottom: 8, fontSize: 13 }}>📐 Rendements prévisionnels</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
                <div>Rendement brut : <strong style={{ color: "#059669" }}>{fmtPct(form.loyer * 12 / form.prix * 100)}</strong></div>
                <div>Loyers annuels nets : <strong>{fmt(form.loyer * 12 * (1 - form.vacance / 100))}</strong></div>
                <div>Charges annuelles : <strong>{fmt(form.charges * 12 + form.taxeFonciere)}</strong></div>
                <div>CF brut mensuel (avant crédit) : <strong>{fmt((form.loyer * 12 * (1 - form.vacance / 100) - form.charges * 12 - form.taxeFonciere) / 12)}</strong></div>
              </div>
            </div>
          </Card>
        )}

        {/* ── ÉTAPE 4 : RÉSULTATS ── */}
        {step === 4 && results && (
          selected
            ? <DetailView result={selected} form={form} onBack={() => setSelected(null)} />
            : <ComparisonView results={results} onSelect={setSelected} form={form} />
        )}

        {/* Navigation */}
        {step < 4 && (
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
            {step > 0
              ? <button onClick={() => setStep((s) => s - 1)} style={{ padding: "10px 22px", background: "white", border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>← Précédent</button>
              : <div />}
            <button onClick={() => setStep((s) => s + 1)}
              style={{ padding: "10px 28px", background: "#185FA5", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
              {step === 3 ? "🚀 Comparer les 4 scénarios" : "Suivant →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
