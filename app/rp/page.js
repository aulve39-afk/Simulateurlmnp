"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

/* ── Supabase guard ── */
const _SU = process.env.NEXT_PUBLIC_SUPABASE_URL;
const _SK = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const sb = _SU && _SK ? createClient(_SU, _SK) : null;
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";

/* ══════════════════════════════════════
   FORMATTERS
══════════════════════════════════════ */
const fmt    = (n) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n ?? 0);
const fmtPct = (n) => `${(+n || 0).toFixed(1)} %`;

/* ══════════════════════════════════════
   LEXIQUE RP
══════════════════════════════════════ */
const LEXIQUE_RP = {
  "PTZ": "Prêt à Taux Zéro : prêt aidé par l'État réservé aux primo-accédants sous conditions de revenus. Ne finance qu'une partie du bien (20–50 % selon la zone), sans intérêts. Remboursé après le crédit principal.",
  "Zone PTZ": "Le barème PTZ dépend de la localisation du bien. Zone A bis (Paris + petite couronne) → quotité 50 %. Zone A (grandes agglomérations) → 50 %. Zone B1 (agglo > 250 000 hab.) → 40 %. Zone B2/C → 20 %. Les zones A et B1 ont les meilleures conditions.",
  "Quotité PTZ": "Part du coût total de l'opération que le PTZ peut financer. Varie de 20 % (zone C) à 50 % (zones A et A bis). Plus la quotité est élevée, plus le PTZ allège votre crédit principal.",
  "Primo-accédant": "Personne n'ayant pas été propriétaire de sa résidence principale au cours des 2 dernières années. Condition nécessaire pour bénéficier du PTZ et de certains autres dispositifs aidés.",
  "DPE": "Diagnostic de Performance Énergétique. Classes A (très économe) à G (très énergivore). Les logements G sont interdits à la location depuis 2025, F en 2028. Un DPE F ou G peut dévaluer le bien de 10–20 %.",
  "Loyer vs Acheter": "Comparaison du patrimoine constitué selon que vous restez locataire (et investissez la différence) ou achetez votre résidence principale. L'achat est avantageux à long terme si vous restez plus de 5–7 ans dans le bien.",
  "DVF": "Demandes de Valeurs Foncières : base de données officielle du gouvernement recensant toutes les transactions immobilières en France depuis 2014. Source de référence pour estimer la valeur d'un bien et négocier le prix.",
  "Taux d'effort": "Part de vos revenus consacrée à votre mensualité de crédit. Limite HCSF : 35 % (assurance incluse). Au-delà, les banques refusent généralement le financement.",
  "Coût total du crédit": "Somme de toutes les mensualités payées sur la durée du prêt, moins le capital emprunté. Représente le coût réel du financement (intérêts + assurance).",
  "Revalo immobilière": "Revalorisation annuelle estimée du prix du bien immobilier. Historiquement ~1–2 % / an en France en termes réels. Variable selon la localisation et le marché.",
};

/* ══════════════════════════════════════
   COMPOSANT TOOLTIP
══════════════════════════════════════ */
function Tip({ text }) {
  return (
    <span className="tip-trigger" style={{ position:"relative", display:"inline-flex", alignItems:"center", marginLeft:4, cursor:"help" }} tabIndex={0}>
      <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center",
        width:15, height:15, borderRadius:"50%", background:"rgba(249,115,22,0.12)",
        color:"#F97316", fontSize:10, fontWeight:700, lineHeight:1, flexShrink:0 }}>ⓘ</span>
      <span className="tip-bubble">{text}</span>
    </span>
  );
}

/* ══════════════════════════════════════
   COMPOSANTS UI PARTAGÉS
══════════════════════════════════════ */
function Card({ children, style = {} }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.06)", borderRadius: 20, border: "1px solid rgba(255,255,255,0.1)",
      boxShadow: "0 2px 8px rgba(0,0,0,0.04)", padding: 20, ...style,
    }}>
      {children}
    </div>
  );
}

function SectionBadge({ icon, label, color = "#F97316", bg = "rgba(249,115,22,0.12)" }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: bg, color, borderRadius: 20, padding: "4px 12px",
      fontSize: 11, fontWeight: 700, marginBottom: 8,
    }}>
      <span>{icon}</span><span>{label}</span>
    </div>
  );
}

function SliderInput({ label, value, onChange, min, max, step = 1, format = fmt, color = "#F97316", help }) {
  const pct = Math.round(((value - min) / (max - min)) * 100);
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(248,250,252,0.8)", display:"flex", alignItems:"center" }}>
          {label}{help && <Tip text={help} />}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>{format(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(+e.target.value)}
        style={{
          width: "100%", WebkitAppearance: "none", appearance: "none",
          height: 6, borderRadius: 4, outline: "none", cursor: "pointer",
          background: `linear-gradient(to right, ${color} ${pct}%, rgba(240,235,224,0.12) ${pct}%)`,
        }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
        <span style={{ fontSize: 10, color: "rgba(248,250,252,0.4)" }}>{format(min)}</span>
        <span style={{ fontSize: 10, color: "rgba(248,250,252,0.4)" }}>{format(max)}</span>
      </div>
    </div>
  );
}

function SelectInput({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "rgba(248,250,252,0.8)", marginBottom: 6 }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{
          width: "100%", border: "1.5px solid rgba(255,255,255,0.1)", borderRadius: 12,
          background: "rgba(255,255,255,0.05)", padding: "10px 14px", fontSize: 13, color: "#F8FAFC",
          outline: "none",
        }}>
        {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
}

function NumInput({ label, value, onChange, suffix = "" }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "rgba(248,250,252,0.8)", marginBottom: 6 }}>{label}</label>
      <div style={{
        display: "flex", alignItems: "center",
        border: "1.5px solid rgba(255,255,255,0.1)", borderRadius: 12, background: "rgba(255,255,255,0.05)",
      }}>
        <input type="number" value={value} onChange={e => onChange(+e.target.value)}
          style={{ flex: 1, background: "transparent", padding: "10px 14px", fontSize: 13, color: "#F8FAFC", outline: "none", border: "none" }}
        />
        {suffix && <span style={{ paddingRight: 12, fontSize: 12, color: "rgba(248,250,252,0.4)", fontWeight: 600 }}>{suffix}</span>}
      </div>
    </div>
  );
}

function KPIBox({ label, value, sub, color = "#F97316", bg = "rgba(249,115,22,0.12)", help }) {
  return (
    <div style={{ background: bg, borderRadius: 14, padding: "16px 14px", textAlign: "center" }}>
      <div style={{ fontSize: 9, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, display:"flex", alignItems:"center", justifyContent:"center", gap:2 }}>
        {label}{help && <Tip text={help} />}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: "rgba(248,250,252,0.4)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

/* ══════════════════════════════════════
   OUTIL 1 — LOUER VS ACHETER
══════════════════════════════════════ */
function LoueurVsAcheteur() {
  const [prix, setPrix]         = useState(250000);
  const [apport, setApport]     = useState(25000);
  const [loyer_loc, setLoyerLoc] = useState(1100);
  const [taux, setTaux]         = useState(3.5);
  const [duree, setDuree]       = useState(20);
  const [horizon, setHorizon]   = useState(15);
  const [revalo, setRevalo]     = useState(2.0);
  const [rendLocatif, setRendLocatif] = useState(4.0); // rendement placement loyer économisé

  const data = useMemo(() => {
    const fraisNotaire = prix * 0.08;
    const capital = prix + fraisNotaire - apport;
    const r = taux / 100 / 12;
    const n = duree * 12;
    const mensualite = r > 0 ? (capital * r) / (1 - Math.pow(1 + r, -n)) : capital / n;
    const taxeFonciere = prix * 0.009 / 12; // ~0.9% an
    const chargesCopro = 180; // charges moyennes

    const rows = [];
    let capRestant = capital;
    let patrimoineProprio = apport + fraisNotaire; // investissement initial
    let patrimoineLocataire = apport; // placement du capital initial

    for (let m = 1; m <= horizon * 12; m++) {
      // Remboursement
      const intM = capRestant * r;
      const capM = mensualite - intM;
      capRestant = Math.max(0, capRestant - capM);

      // Valeur du bien revalorisée
      const prixActuel = prix * Math.pow(1 + revalo / 100, m / 12);

      // Patrimoine propriétaire = valeur bien - dette restante
      patrimoineProprio = prixActuel - capRestant;

      // Coût mensuel propriétaire vs locataire
      const coutProprio = mensualite + taxeFonciere + chargesCopro;
      const surplus = Math.max(0, coutProprio - loyer_loc); // ce que le locataire économise
      const deficit = Math.max(0, loyer_loc - coutProprio); // ce que le proprio économise vs loyer

      // Locataire place l'apport + économies/dépenses mensuelles
      const txMensuel = rendLocatif / 100 / 12;
      patrimoineLocataire = patrimoineLocataire * (1 + txMensuel)
        + (loyer_loc < coutProprio ? (coutProprio - loyer_loc) : -(loyer_loc - coutProprio));
      patrimoineLocataire = Math.max(0, patrimoineLocataire);

      if (m % 12 === 0) {
        const an = m / 12;
        rows.push({
          an: `A${an}`,
          "Propriétaire": Math.round(patrimoineProprio),
          "Locataire": Math.round(patrimoineLocataire),
          "Avantage": Math.round(patrimoineProprio - patrimoineLocataire),
        });
      }
    }
    return { rows, mensualite: Math.round(mensualite) };
  }, [prix, apport, loyer_loc, taux, duree, horizon, revalo, rendLocatif]);

  const derniere = data.rows[data.rows.length - 1] ?? {};
  const avantage = derniere["Avantage"] ?? 0;
  const verdictAchat = avantage > 0;

  const coutProprio = data.mensualite + Math.round(prix * 0.009 / 12) + 180;

  return (
    <div>
      <SectionBadge icon="🏠" label="Louer vs Acheter" color="#F97316" bg="rgba(249,115,22,0.12)" />
      <h2 style={{ fontSize: 18, fontWeight: 800, color: "#F8FAFC", marginBottom: 6 }}>Comparer sur {horizon} ans</h2>
      <p style={{ fontSize: 13, color: "rgba(248,250,252,0.5)", marginBottom: 20, lineHeight: 1.6 }}>
        Simulez la différence de patrimoine net entre acheter votre résidence et rester locataire.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        <KPIBox
          label="Coût mensuel proprio"
          value={fmt(coutProprio)}
          sub="Mensualité + charges + TF"
          color="#F97316" bg="rgba(249,115,22,0.12)"
        />
        <KPIBox
          label={`Patrimoine net A${horizon}`}
          value={fmt(derniere["Propriétaire"] ?? 0)}
          sub="Après remboursement du crédit"
          color="#F97316" bg="rgba(249,115,22,0.08)"
        />
      </div>

      {/* Verdict */}
      <div style={{
        background: verdictAchat ? "rgba(249,115,22,0.08)" : "rgba(239,68,68,0.08)",
        border: `1px solid ${verdictAchat ? "rgba(74,222,128,0.35)" : "rgba(239,68,68,0.25)"}`,
        borderRadius: 14, padding: "14px 16px", marginBottom: 20,
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <span style={{ fontSize: 28 }}>{verdictAchat ? "🟢" : "🟡"}</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: verdictAchat ? "#F0EBE0" : "#F87171" }}>
            {verdictAchat
              ? `Acheter est plus rentable de ${fmt(avantage)} sur ${horizon} ans`
              : `Louer conserve ${fmt(Math.abs(avantage))} de plus sur ${horizon} ans`}
          </div>
          <div style={{ fontSize: 11, color: "rgba(248,250,252,0.5)", marginTop: 2 }}>
            Propriétaire : {fmt(derniere["Propriétaire"])} · Locataire : {fmt(derniere["Locataire"])}
          </div>
        </div>
      </div>

      {/* Graphique */}
      <div style={{ height: 200, marginBottom: 20 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.rows} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="gProprio" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F97316" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gLoc" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F97316" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(240,235,224,0.08)" />
            <XAxis dataKey="an" tick={{ fontSize: 10, fill: "#94A3B8" }} />
            <YAxis tickFormatter={v => `${Math.round(v / 1000)}k`} tick={{ fontSize: 10, fill: "#94A3B8" }} />
            <RTooltip formatter={(v, n) => [fmt(v), n]} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
            <Area type="monotone" dataKey="Propriétaire" stroke="#F97316" strokeWidth={2} fill="url(#gProprio)" />
            <Area type="monotone" dataKey="Locataire" stroke="#F97316" strokeWidth={2} fill="url(#gLoc)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Paramètres */}
      <details style={{ marginTop: 8 }}>
        <summary style={{ fontSize: 13, fontWeight: 700, color: "#F97316", cursor: "pointer", listStyle: "none", padding: "8px 0" }}>
          ⚙️ Modifier les paramètres
        </summary>
        <div style={{ paddingTop: 16 }}>
          <SliderInput label="Prix du bien" value={prix} onChange={setPrix} min={80000} max={800000} step={5000} color="#F97316" />
          <SliderInput label="Apport" value={apport} onChange={setApport} min={0} max={200000} step={1000} color="#F97316" help="Somme apportée de votre poche. Recommandé : 10% minimum. Plus l'apport est élevé, meilleur est le taux et moins vous payez d'intérêts." />
          <SliderInput label="Loyer actuel (si locataire)" value={loyer_loc} onChange={setLoyerLoc} min={300} max={3500} step={50} color="#F97316" help="Votre loyer mensuel actuel. Sert à calculer ce que vous économisez (ou dépensez de plus) en achetant vs en restant locataire." />
          <SliderInput label="Taux du crédit" value={taux} onChange={setTaux} min={1} max={6} step={0.05} format={v => `${v.toFixed(2)} %`} color="#F97316" help="Taux nominal hors assurance. Comparez les offres de plusieurs banques ou passez par un courtier pour obtenir les meilleures conditions." />
          <SliderInput label="Durée du crédit (ans)" value={duree} onChange={setDuree} min={10} max={25} step={1} format={v => `${v} ans`} color="#F97316" help="Durée standard : 20–25 ans. Une durée plus longue réduit la mensualité mais augmente le coût total des intérêts." />
          <SliderInput label="Horizon de comparaison (ans)" value={horizon} onChange={setHorizon} min={5} max={25} step={1} format={v => `${v} ans`} color="#F97316" help="Nombre d'années pendant lesquelles vous comparez louer vs acheter. En dessous de 5 ans, louer est souvent plus rentable (frais de notaire non amortis)." />
          <SliderInput label="Revalorisation annuelle du bien" value={revalo} onChange={setRevalo} min={0} max={5} step={0.1} format={v => `${v.toFixed(1)} %/an`} color="#F97316" help={LEXIQUE_RP["Revalo immobilière"]} />
          <SliderInput label="Rendement placement locataire" value={rendLocatif} onChange={setRendLocatif} min={0} max={8} step={0.1} format={v => `${v.toFixed(1)} %/an`} color="#F97316" help="Rendement annuel du placement financier dans lequel le locataire investit la différence (apport + charges de propriété). Ex : 4% pour un PEA actions." />
        </div>
      </details>
    </div>
  );
}

/* ══════════════════════════════════════
   OUTIL 2 — DPE + BUDGET TRAVAUX
══════════════════════════════════════ */
const DPE_DATA = {
  A: { label: "Très performant", color: "#F97316", bg: "rgba(74,222,128,0.10)", reno: 0, conseil: "Félicitations ! Pas de travaux obligatoires. Le bien est déjà très économe." },
  B: { label: "Performant", color: "#10B981", bg: "#D1FAE5", reno: 0, conseil: "Très bon DPE. Aucun travaux obligatoire prévu par la loi Climat & Résilience." },
  C: { label: "Assez performant", color: "#F59E0B", bg: "rgba(249,115,22,0.10)", reno: 5000, conseil: "Bon état général. Quelques optimisations possibles pour économiser sur la facture énergie." },
  D: { label: "Peu performant", color: "#F97316", bg: "rgba(249,115,22,0.08)", reno: 15000, conseil: "Travaux d'isolation recommandés. Ce bien reste louable sans restriction jusqu'en 2034." },
  E: { label: "Énergivore", color: "#EF4444", bg: "rgba(239,68,68,0.08)", reno: 30000, conseil: "⚠️ Interdit à la location depuis 2025 si l'étiquette chute en F/G. Prévoir isolation + VMC." },
  F: { label: "Très énergivore 🚫", color: "#DC2626", bg: "rgba(239,68,68,0.08)", reno: 50000, conseil: "🚫 Interdit à la location (passoire thermique). Travaux obligatoires avant mise en location." },
  G: { label: "Passoire thermique 🚫", color: "#991B1B", bg: "rgba(239,68,68,0.08)", reno: 70000, conseil: "🚫 Interdit à la location depuis 2025. Investissement travaux important mais indispensable." },
};

const TRAVAUX_POSTES = [
  { label: "Isolation combles/toiture", prixM2: 35, icon: "🏗️" },
  { label: "Isolation murs extérieurs", prixM2: 120, icon: "🧱" },
  { label: "Isolation sol", prixM2: 25, icon: "⬛" },
  { label: "Remplacement fenêtres", prixM2: 800, perUnit: true, icon: "🪟" },
  { label: "Chaudière à condensation", fixe: 4500, icon: "🔥" },
  { label: "Pompe à chaleur", fixe: 12000, icon: "♻️" },
  { label: "VMC double-flux", fixe: 3500, icon: "💨" },
];

function AnalyseurDPE() {
  const [dpe, setDpe]         = useState("D");
  const [surface, setSurface] = useState(65);
  const [nbFenetres, setNbFenetres] = useState(6);
  const [travaux, setTravaux] = useState({ combles: false, murs: false, sol: false, fenetres: false, chaudiere: false, pac: false, vmc: false });

  const info = DPE_DATA[dpe];

  const coutTravaux = useMemo(() => {
    let total = 0;
    if (travaux.combles)   total += surface * 35;
    if (travaux.murs)      total += surface * 120;
    if (travaux.sol)       total += surface * 25;
    if (travaux.fenetres)  total += nbFenetres * 800;
    if (travaux.chaudiere) total += 4500;
    if (travaux.pac)       total += 12000;
    if (travaux.vmc)       total += 3500;
    return total;
  }, [travaux, surface, nbFenetres]);

  const dpeCible = useMemo(() => {
    const order = ["A","B","C","D","E","F","G"];
    const idx = order.indexOf(dpe);
    if (coutTravaux > 40000 && idx >= 4) return "C";
    if (coutTravaux > 20000 && idx >= 4) return "D";
    if (coutTravaux > 10000 && idx >= 5) return "E";
    return dpe;
  }, [coutTravaux, dpe]);

  const travauxItems = [
    { key: "combles", ...TRAVAUX_POSTES[0], cout: surface * 35 },
    { key: "murs", ...TRAVAUX_POSTES[1], cout: surface * 120 },
    { key: "sol", ...TRAVAUX_POSTES[2], cout: surface * 25 },
    { key: "fenetres", ...TRAVAUX_POSTES[3], cout: nbFenetres * 800 },
    { key: "chaudiere", ...TRAVAUX_POSTES[4], cout: 4500 },
    { key: "pac", ...TRAVAUX_POSTES[5], cout: 12000 },
    { key: "vmc", ...TRAVAUX_POSTES[6], cout: 3500 },
  ];

  return (
    <div>
      <SectionBadge icon="🌿" label="Analyse DPE & Budget Travaux" color="#F97316" bg="rgba(249,115,22,0.08)" />
      <h2 style={{ fontSize: 18, fontWeight: 800, color: "#F8FAFC", marginBottom: 6 }}>Évaluer le coût énergétique</h2>
      <p style={{ fontSize: 13, color: "rgba(248,250,252,0.5)", marginBottom: 20, lineHeight: 1.6 }}>
        Saisissez la classe DPE du bien et sélectionnez les travaux envisagés pour estimer le budget rénovation.
      </p>

      {/* Sélecteur DPE */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(248,250,252,0.8)", marginBottom: 10 }}>Classe DPE actuelle</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {Object.entries(DPE_DATA).map(([cls, d]) => (
            <button key={cls} onClick={() => setDpe(cls)}
              style={{
                width: 44, height: 44, borderRadius: 10, fontWeight: 800, fontSize: 15,
                background: dpe === cls ? d.color : "rgba(255,255,255,0.06)",
                color: dpe === cls ? "white" : d.color,
                border: `2px solid ${dpe === cls ? d.color : "rgba(255,255,255,0.1)"}`,
                cursor: "pointer", transition: "all 0.15s",
              }}>
              {cls}
            </button>
          ))}
        </div>
      </div>

      {/* Verdict DPE */}
      <div style={{
        background: info.bg, border: `1px solid ${info.color}40`,
        borderRadius: 14, padding: "14px 16px", marginBottom: 20,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: info.color,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", fontSize: 18, fontWeight: 800,
          }}>{dpe}</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: info.color }}>{info.label}</div>
            <div style={{ fontSize: 11, color: "rgba(248,250,252,0.5)", marginTop: 2 }}>{info.conseil}</div>
          </div>
        </div>
      </div>

      {/* Surface */}
      <SliderInput label="Surface du bien (m²)" value={surface} onChange={setSurface} min={15} max={300} step={5} format={v => `${v} m²`} color="#F97316" />
      <SliderInput label="Nombre de fenêtres" value={nbFenetres} onChange={setNbFenetres} min={1} max={20} step={1} format={v => `${v} fenêtres`} color="#F97316" />

      {/* Checklist travaux */}
      <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(248,250,252,0.8)", marginBottom: 10 }}>Travaux envisagés</div>
      <div style={{ display: "grid", gap: 8, marginBottom: 20 }}>
        {travauxItems.map(t => (
          <label key={t.key} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 14px", borderRadius: 12, cursor: "pointer",
            background: travaux[t.key] ? "rgba(249,115,22,0.12)" : "rgba(255,255,255,0.05)",
            border: `1.5px solid ${travaux[t.key] ? "rgba(249,115,22,0.5)" : "rgba(255,255,255,0.1)"}`,
            transition: "all 0.15s",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input type="checkbox" checked={travaux[t.key]}
                onChange={e => setTravaux(prev => ({ ...prev, [t.key]: e.target.checked }))}
                style={{ width: 16, height: 16, accentColor: "#F97316" }}
              />
              <span style={{ fontSize: 13 }}>{t.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: "rgba(248,250,252,0.8)" }}>{t.label}</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#F97316" }}>{fmt(t.cout)}</span>
          </label>
        ))}
      </div>

      {/* Total + DPE cible */}
      {coutTravaux > 0 && (
        <div style={{
          background: "linear-gradient(135deg, #131318, #059669)",
          borderRadius: 16, padding: "20px", color: "white",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>Budget travaux total estimé</div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>{fmt(coutTravaux)}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>DPE cible estimé</div>
              <div style={{
                width: 44, height: 44, borderRadius: 10, background: "rgba(255,255,255,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20, fontWeight: 800,
              }}>{dpeCible}</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", background: "rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 12px" }}>
            💡 Les aides MaPrimeRénov' peuvent couvrir jusqu'à 50-70% selon vos revenus et les travaux réalisés.
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════
   OUTIL 3 — CALCULATEUR PTZ
══════════════════════════════════════ */
// Barèmes PTZ 2024-2026
const PTZ_ZONES = {
  "A bis": { label: "A bis (Paris, petite couronne)", plafonds: [85000, 110000, 135000, 160000, 180000, 210000, 245000, 270000] },
  "A":     { label: "A (grande couronne, Lyon, Marseille…)", plafonds: [85000, 110000, 135000, 160000, 180000, 210000, 245000, 270000] },
  "B1":    { label: "B1 (agglomérations > 250k hab)", plafonds: [51000, 68000, 82600, 99000, 110400, 130200, 149400, 164400] },
  "B2":    { label: "B2 (agglomérations 50-250k)", plafonds: [42000, 56000, 68600, 82000, 91800, 108200, 124200, 135000] },
  "C":     { label: "C (autres communes)", plafonds: [37000, 49000, 59400, 71400, 79800, 94200, 108000, 117600] },
};

const QUOTITE_PTZ = { "A bis": 0.50, "A": 0.50, "B1": 0.40, "B2": 0.40, "C": 0.20 };

function CalculateurPTZ() {
  const [zone, setZone]         = useState("B1");
  const [nbPersonnes, setNb]    = useState(2);
  const [revenus, setRevenus]   = useState(45000); // revenu fiscal n-2
  const [prixAchat, setPrix]    = useState(250000);
  const [neuf, setNeuf]         = useState(true);  // neuf ou ancien avec travaux
  const [travaux, setTravaux]   = useState(60000); // travaux si ancien (condition 25%)

  const result = useMemo(() => {
    const plafond = PTZ_ZONES[zone]?.plafonds[Math.min(nbPersonnes - 1, 7)] ?? 0;

    // Eligibilité neuf/ancien : ancien PTZ disponible seulement en B2/C si travaux ≥ 25% coût total
    const pctTravaux = prixAchat > 0 ? travaux / (prixAchat + travaux) : 0;
    const eligibleType = neuf
      ? true
      : (zone === "B2" || zone === "C") && pctTravaux >= 0.25;

    const eligibleRevenus = revenus <= plafond;
    const eligible = eligibleRevenus && eligibleType;

    const quotite = QUOTITE_PTZ[zone] ?? 0;

    // Plafonds de coût d'opération par zone et nb de personnes (art. D. 31-10-9 CCH)
    const plafondsCout = {
      "A bis": [150000, 210000, 255000, 300000, 345000, 345000, 345000, 345000],
      "A":     [150000, 210000, 255000, 300000, 345000, 345000, 345000, 345000],
      "B1":    [135000, 189000, 230000, 270000, 311000, 311000, 311000, 311000],
      "B2":    [110000, 154000, 187000, 220000, 253000, 253000, 253000, 253000],
      "C":     [100000, 140000, 170000, 200000, 230000, 230000, 230000, 230000],
    };
    const plafondCout = plafondsCout[zone]?.[Math.min(nbPersonnes - 1, 7)] ?? 0;
    const baseCalc    = Math.min(prixAchat, plafondCout);
    const montantBrut = eligible ? Math.round(baseCalc * quotite) : 0;
    const ptzFinal    = montantBrut;
    const creditComplementaire = prixAchat - ptzFinal;

    // Durée de différé selon tranche de revenus (art. R. 31-10-11)
    const pctRevenu = plafond > 0 ? revenus / plafond : 1;
    const differe   = pctRevenu <= 0.50 ? 15 : pctRevenu <= 0.75 ? 10 : 5;  // ans
    const dureeRemb = 25 - differe; // durée de remboursement effective

    // Raison d'inéligibilité
    let raisonIneligible = "";
    if (!eligibleRevenus) raisonIneligible = `Vos revenus (${fmt(revenus)}) dépassent le plafond de ${fmt(plafond)} pour ${nbPersonnes} pers. en zone ${zone}.`;
    else if (!eligibleType && !neuf) raisonIneligible = `En ancien, le PTZ n'est disponible qu'en zones B2 et C avec des travaux représentant au moins 25 % du coût total. Ici : ${Math.round(pctTravaux * 100)} %.`;

    return {
      eligible, eligibleRevenus, eligibleType,
      plafond, plafondCout, quotite,
      montantPTZ: ptzFinal, creditComplementaire,
      differe, dureeRemb, pctTravaux,
      raisonIneligible,
    };
  }, [zone, nbPersonnes, revenus, prixAchat, neuf, travaux]);

  return (
    <div>
      <SectionBadge icon="🏦" label="Calculateur PTZ" color="#F97316" bg="rgba(249,115,22,0.06)" />
      <h2 style={{ fontSize: 18, fontWeight: 800, color: "#F8FAFC", marginBottom: 6 }}>Prêt à Taux Zéro 2026</h2>
      <p style={{ fontSize: 13, color: "rgba(248,250,252,0.5)", marginBottom: 20, lineHeight: 1.6 }}>
        Le PTZ finance jusqu&apos;à 50&nbsp;% de votre achat sans intérêts. Réservé aux primo-accédants sous conditions de revenus.
      </p>

      {/* Toggle Neuf / Ancien */}
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        {[["neuf","🏗️ Neuf","Toutes zones éligibles"],["ancien","🏚️ Ancien + travaux","Zones B2 & C · travaux ≥ 25%"]].map(([v,label,sub])=>(
          <button key={v} onClick={() => setNeuf(v === "neuf")}
            style={{
              flex:1, borderRadius:12, padding:"10px 8px", border:"1.5px solid",
              borderColor: neuf===(v==="neuf") ? "#F97316" : "rgba(255,255,255,0.1)",
              background:  neuf===(v==="neuf") ? "rgba(249,115,22,0.18)" : "rgba(255,255,255,0.04)",
              cursor:"pointer", textAlign:"center",
            }}>
            <div style={{ fontSize:13, fontWeight:700, color: neuf===(v==="neuf") ? "#F97316" : "rgba(248,250,252,0.5)" }}>{label}</div>
            <div style={{ fontSize:10, color:"rgba(248,250,252,0.3)", marginTop:2 }}>{sub}</div>
          </button>
        ))}
      </div>

      <SelectInput
        label="Zone géographique"
        value={zone}
        onChange={setZone}
        options={Object.entries(PTZ_ZONES).map(([v, d]) => ({ v, l: d.label }))}
      />

      <SliderInput label="Nombre de personnes dans le foyer" help="Détermine les plafonds de revenus PTZ. Plus le foyer est grand, plus les plafonds sont élevés." value={nbPersonnes} onChange={setNb}
        min={1} max={8} step={1} format={v => `${v} personne${v > 1 ? "s" : ""}`} color="#F97316" />

      <SliderInput label="Revenu fiscal de référence (N-2)" help="Ligne 1BJ de votre avis d'imposition de l'année N-2. C'est sur cette base que l'éligibilité PTZ est vérifiée." value={revenus} onChange={setRevenus}
        min={10000} max={200000} step={1000} color="#F97316" />

      <SliderInput label="Prix total de l'opération" help="Prix FAI + frais de notaire + travaux. Le PTZ est plafonné selon votre zone et composition de foyer." value={prixAchat} onChange={setPrix}
        min={50000} max={800000} step={5000} color="#F97316" />

      {/* Travaux si ancien */}
      {!neuf && (
        <>
          <SliderInput label="Montant des travaux" help="Les travaux doivent représenter ≥ 25 % du coût total (prix + travaux) pour ouvrir droit au PTZ en ancien." value={travaux} onChange={setTravaux}
            min={0} max={200000} step={2500} color="#DC2626" />
          <div style={{ fontSize:11, color: result.pctTravaux >= 0.25 ? "#4ADE80" : "#F87171",
            background: result.pctTravaux >= 0.25 ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)",
            borderRadius:8, padding:"6px 10px", marginBottom:16 }}>
            {result.pctTravaux >= 0.25
              ? `✅ Travaux = ${Math.round(result.pctTravaux * 100)} % du coût total — condition PTZ remplie`
              : `⚠️ Travaux = ${Math.round(result.pctTravaux * 100)} % du coût total — minimum 25 % requis pour le PTZ`}
          </div>
        </>
      )}

      {/* Plafonds info */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:20 }}>
        <div style={{ background:"rgba(249,115,22,0.12)", borderRadius:10, padding:"10px 12px" }}>
          <div style={{ fontSize:10, color:"#F97316", fontWeight:600 }}>Plafond revenus zone {zone}</div>
          <div style={{ fontSize:16, fontWeight:800, color:"#F97316" }}>{fmt(result.plafond)}</div>
          <div style={{ fontSize:9, color:"rgba(248,250,252,0.4)" }}>pour {nbPersonnes} personne{nbPersonnes>1?"s":""}</div>
        </div>
        <div style={{ background:"rgba(249,115,22,0.08)", borderRadius:10, padding:"10px 12px" }}>
          <div style={{ fontSize:10, color:"#F97316", fontWeight:600 }}>Plafond coût zone {zone}</div>
          <div style={{ fontSize:16, fontWeight:800, color:"#F97316" }}>{fmt(result.plafondCout)}</div>
          <div style={{ fontSize:9, color:"rgba(248,250,252,0.4)" }}>base calcul PTZ</div>
        </div>
      </div>

      {/* Résultat */}
      {result.eligible ? (
        <div style={{ background:"linear-gradient(135deg, #131318, #F97316)", borderRadius:16, padding:"20px", color:"white" }}>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.7)", marginBottom:8 }}>✅ Vous êtes éligible au PTZ !</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
            <div style={{ background:"rgba(255,255,255,0.12)", borderRadius:12, padding:14 }}>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.6)", marginBottom:4 }}>Montant PTZ</div>
              <div style={{ fontSize:22, fontWeight:800 }}>{fmt(result.montantPTZ)}</div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.5)" }}>Quotité {(result.quotite*100).toFixed(0)} % — sans intérêts</div>
            </div>
            <div style={{ background:"rgba(255,255,255,0.12)", borderRadius:12, padding:14 }}>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.6)", marginBottom:4 }}>Crédit classique restant</div>
              <div style={{ fontSize:22, fontWeight:800 }}>{fmt(result.creditComplementaire)}</div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.5)" }}>À taux de marché (~3.5 %)</div>
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div style={{ background:"rgba(255,255,255,0.08)", borderRadius:10, padding:"8px 12px" }}>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.5)" }}>Différé remboursement PTZ</div>
              <div style={{ fontSize:15, fontWeight:700 }}>{result.differe} ans</div>
            </div>
            <div style={{ background:"rgba(255,255,255,0.08)", borderRadius:10, padding:"8px 12px" }}>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.5)" }}>Durée remboursement</div>
              <div style={{ fontSize:15, fontWeight:700 }}>{result.dureeRemb} ans</div>
            </div>
          </div>
          <p style={{ fontSize:10, color:"rgba(255,255,255,0.45)", marginTop:10 }}>
            ℹ️ Durée de différé basée sur vos revenus (tranche {Math.round(revenus/result.plafond*100)} % du plafond). Vérifiez les conditions exactes avec votre banque.
          </p>
        </div>
      ) : (
        <div style={{ background:"rgba(239,68,68,0.12)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:14, padding:"16px" }}>
          <div style={{ fontSize:20, marginBottom:8, textAlign:"center" }}>❌</div>
          <div style={{ fontSize:14, fontWeight:700, color:"#F87171", marginBottom:6, textAlign:"center" }}>Non éligible au PTZ</div>
          <div style={{ fontSize:11, color:"rgba(248,250,252,0.5)", lineHeight:1.6 }}>{result.raisonIneligible}</div>
        </div>
      )}
      <p style={{ fontSize:9, color:"rgba(248,250,252,0.25)", marginTop:10, lineHeight:1.5 }}>
        ⚠️ Simulation indicative — LF 2025, art. D.31-10-2 à D.31-10-11 CCH. Confirmez l&apos;éligibilité avec votre établissement bancaire.
      </p>
    </div>
  );
}

/* ══════════════════════════════════════
   OUTIL 4 — ASSISTANT DVF & NÉGOCIATION
══════════════════════════════════════ */
function AssistantNegociation() {
  const [ville, setVille]     = useState("");
  const [codePostal, setCodePostal] = useState("");
  const [prixAffiche, setPrix] = useState(280000);
  const [surface, setSurface] = useState(65);
  const [dpe, setDpe]         = useState("D");
  const [travaux, setTravaux] = useState(15000);
  const [dureeMarket, setDuree] = useState(45); // jours sur le marché
  const [dvfData, setDvfData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const prixM2 = surface > 0 ? Math.round(prixAffiche / surface) : 0;
  const dvfPrixM2 = dvfData ? (dvfData.medianPrixM2 ?? dvfData.prixMoyen) : null;
  const ecart = dvfPrixM2 ? Math.round(((prixM2 - dvfPrixM2) / dvfPrixM2) * 100) : null;
  const negocPossible = ecart !== null && ecart > 3;

  const fetchDVF = async () => {
    const q = [codePostal, ville].filter(Boolean).join(" ").trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    try {
      // API route Next.js → BAN géocodage + Etalab DVF officiel
      const resp = await fetch(`/api/dvf?q=${encodeURIComponent(q)}`);
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error ?? "API DVF indisponible");
      setDvfData({
        prixMoyen:     json.prixMoyen,
        medianPrixM2:  json.medianPrixM2,
        prixMin:       json.q1,
        prixMax:       json.q3,
        nbTransactions: json.nbTransactions,
        recent:        json.recent ?? [],
        commune:       json.commune,
        source:        json.source,
        dateMin:       json.dateMin,
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const argumentaire = useMemo(() => {
    const args = [];
    if (ecart !== null && ecart > 5) args.push(`Le prix affiché (${prixM2} €/m²) est ${ecart}% au-dessus de la moyenne du marché dans ce code postal (${dvfPrixM2} €/m² selon les données DVF).`);
    if (dpe === "E" || dpe === "F" || dpe === "G") args.push(`La classe DPE ${dpe} implique des travaux de rénovation estimés à ${fmt(travaux)}, que nous intégrons dans notre offre.`);
    if (dureeMarket > 60) args.push(`Le bien est en vente depuis ${dureeMarket} jours, indiquant une faible liquidité et un intérêt limité du marché.`);
    if (travaux > 10000) args.push(`Des travaux de remise en état sont nécessaires (estimation : ${fmt(travaux)}). Ces coûts justifient une décote sur le prix de vente.`);
    return args;
  }, [ecart, dpe, travaux, dureeMarket, prixM2, dvfPrixM2]);

  const offreSuggérée = useMemo(() => {
    let decote = 0;
    if (ecart !== null && ecart > 5) decote += Math.min(ecart * 0.5, 10);
    if (dpe === "F" || dpe === "G") decote += 8;
    else if (dpe === "E") decote += 4;
    if (dureeMarket > 90) decote += 5;
    else if (dureeMarket > 60) decote += 3;
    decote = Math.min(decote, 20);
    return Math.round(prixAffiche * (1 - decote / 100));
  }, [prixAffiche, ecart, dpe, dureeMarket]);

  return (
    <div>
      <SectionBadge icon="📍" label="DVF & Négociation" color="#F87171" bg="rgba(239,68,68,0.10)" />
      <h2 style={{ fontSize: 18, fontWeight: 800, color: "#F8FAFC", marginBottom: 6 }}>Négocier avec les données réelles</h2>
      <p style={{ fontSize: 13, color: "rgba(248,250,252,0.5)", marginBottom: 20, lineHeight: 1.6 }}>
        Comparez le prix affiché aux transactions réelles (DVF) et générez un argumentaire de négociation.
      </p>

      {/* Recherche DVF */}
      <div style={{
        background: "rgba(255,255,255,0.05)", borderRadius: 14, padding: "16px",
        marginBottom: 20, border: "1px solid rgba(255,255,255,0.1)",
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(248,250,252,0.8)", marginBottom: 12 }}>
          📊 Rechercher les prix du marché
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            placeholder="Code postal (ex: 69001)"
            value={codePostal}
            onChange={e => setCodePostal(e.target.value)}
            style={{
              flex: 1, border: "1.5px solid rgba(255,255,255,0.1)", borderRadius: 10,
              padding: "10px 12px", fontSize: 13, outline: "none",
            }}
          />
          <button onClick={fetchDVF} disabled={loading || codePostal.length < 5}
            style={{
              background: "#DC2626", color: "white", border: "none",
              borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
            }}>
            {loading ? "…" : "Rechercher"}
          </button>
        </div>
        {error && <div style={{ fontSize: 12, color: "#DC2626", marginTop: 8 }}>⚠️ {error}</div>}
      </div>

      {/* Résultats DVF */}
      {dvfData && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 12 }}>
            <KPIBox label="Prix moyen" value={`${dvfData.prixMoyen} €/m²`} sub={`${dvfData.nbTransactions} ventes`} color="#F87171" bg="rgba(239,68,68,0.10)" help={LEXIQUE_RP["DVF"]} />
            <KPIBox label="Prix min" value={`${dvfData.prixMin} €/m²`} sub="Marché" color="#64748B" bg="rgba(255,255,255,0.06)" help="Prix le plus bas constaté parmi les ventes DVF dans ce code postal. Peut correspondre à un logement atypique ou dégradé." />
            <KPIBox label="Prix max" value={`${dvfData.prixMax} €/m²`} sub="Marché" color="#64748B" bg="rgba(255,255,255,0.06)" help="Prix le plus élevé constaté. Peut correspondre à un bien d'exception, refait à neuf ou très bien situé." />
          </div>
          {/* Transactions récentes */}
          <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(248,250,252,0.8)", marginBottom: 8 }}>Dernières transactions</div>
            {dvfData.recent.map((t, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "6px 0", borderBottom: i < dvfData.recent.length - 1 ? "1px solid rgba(240,235,224,0.08)" : "none",
              }}>
                <span style={{ fontSize: 11, color: "rgba(248,250,252,0.5)" }}>{t.date} · {t.surface}m²</span>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#F8FAFC" }}>{fmt(t.prix)}</div>
                  <div style={{ fontSize: 10, color: "rgba(248,250,252,0.4)" }}>{t.prixM2} €/m²</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Paramètres du bien */}
      <SliderInput label="Prix affiché" value={prixAffiche} onChange={setPrix} min={50000} max={1000000} step={5000} color="#DC2626" />
      <SliderInput label="Surface (m²)" value={surface} onChange={setSurface} min={15} max={300} step={5} format={v => `${v} m²`} color="#DC2626" />
      <SliderInput label="Travaux estimés" value={travaux} onChange={setTravaux} min={0} max={100000} step={1000} color="#DC2626" />
      <SliderInput label="Jours sur le marché" value={dureeMarket} onChange={setDuree} min={0} max={365} step={5} format={v => `${v} jours`} color="#DC2626" />

      {/* Comparaison prix */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20,
      }}>
        <KPIBox label="Prix affiché /m²" value={`${prixM2} €/m²`} sub="Bien analysé" color="#F87171" bg="rgba(239,68,68,0.10)" />
        {dvfPrixM2 ? (
          <KPIBox
            label={ecart !== null && ecart > 3 ? `Surcote +${ecart}%` : "Prix du marché"}
            value={`${dvfPrixM2} €/m²`}
            sub="Données DVF"
            color={ecart !== null && ecart > 3 ? "#DC2626" : "#F97316"}
            bg={ecart !== null && ecart > 3 ? "rgba(239,68,68,0.10)" : "rgba(249,115,22,0.08)"}
          />
        ) : (
          <KPIBox label="Prix marché" value="—" sub="Recherchez un code postal" color="#94A3B8" bg="rgba(255,255,255,0.06)" />
        )}
      </div>

      {/* Offre suggérée + argumentaire */}
      <div style={{
        background: "linear-gradient(135deg, #7F1D1D, #DC2626)",
        borderRadius: 16, padding: "20px", color: "white",
      }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>Offre suggérée</div>
          <div style={{ fontSize: 30, fontWeight: 800 }}>{fmt(offreSuggérée)}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
            Soit {Math.round((1 - offreSuggérée / prixAffiche) * 100)}% de décote sur le prix affiché
          </div>
        </div>
        {argumentaire.length > 0 && (
          <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 12, padding: "14px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>📝 Argumentaire de négociation</div>
            {argumentaire.map((arg, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", flexShrink: 0 }}>•</span>
                <span style={{ fontSize: 11, lineHeight: 1.6, color: "rgba(255,255,255,0.85)" }}>{arg}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   OUTIL 5 — CHECKLIST VISITE
══════════════════════════════════════ */
const CHECKLIST_ITEMS = [
  { id: "hum", cat: "Structure", label: "Humidité / traces d'infiltration", poids: "Critique" },
  { id: "lezard", cat: "Structure", label: "Lézardes ou fissures dans les murs", poids: "Critique" },
  { id: "toiture", cat: "Structure", label: "État de la toiture visible / combles", poids: "Critique" },
  { id: "sol", cat: "Structure", label: "Plancher : craquements, affaissements", poids: "Important" },
  { id: "eau", cat: "Équipements", label: "Pression de l'eau (ouvrir tous les robinets)", poids: "Important" },
  { id: "elec", cat: "Équipements", label: "Tableau électrique : disjoncteurs, mise à la terre", poids: "Critique" },
  { id: "chauf", cat: "Équipements", label: "Système de chauffage : marque, âge, entretien", poids: "Important" },
  { id: "vmc", cat: "Équipements", label: "Ventilation (VMC) fonctionnelle", poids: "Important" },
  { id: "volets", cat: "Équipements", label: "Volets, fenêtres : fermeture étanche", poids: "Mineur" },
  { id: "bruit", cat: "Environnement", label: "Bruit extérieur (rue, voisins, train)", poids: "Important" },
  { id: "enso", cat: "Environnement", label: "Ensoleillement et orientation", poids: "Mineur" },
  { id: "parking", cat: "Environnement", label: "Parking / stationnement disponible", poids: "Mineur" },
  { id: "charges", cat: "Copropriété", label: "Montant des charges de copropriété", poids: "Important" },
  { id: "travaux_vote", cat: "Copropriété", label: "Travaux votés à venir (demander PV AG)", poids: "Critique" },
  { id: "ravalement", cat: "Copropriété", label: "État de la façade / ravalement prévu", poids: "Important" },
];

const POIDS_COLOR = { Critique: "#DC2626", Important: "#F59E0B", Mineur: "#F97316" };
const POIDS_BG    = { Critique: "rgba(239,68,68,0.10)", Important: "rgba(249,115,22,0.08)", Mineur: "rgba(249,115,22,0.05)" };

function ChecklistVisite() {
  const [checked, setChecked] = useState({});
  const [notes, setNotes] = useState({});
  const [showNotes, setShowNotes] = useState(null);

  const toggle = (id) => setChecked(prev => ({ ...prev, [id]: !prev[id] }));

  // Sauvegarde localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("rp_checklist");
      if (saved) {
        const parsed = JSON.parse(saved);
        setChecked(parsed.checked ?? {});
        setNotes(parsed.notes ?? {});
      }
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem("rp_checklist", JSON.stringify({ checked, notes })); } catch {}
  }, [checked, notes]);

  const done = Object.values(checked).filter(Boolean).length;
  const total = CHECKLIST_ITEMS.length;
  const critiquesOk = CHECKLIST_ITEMS.filter(i => i.poids === "Critique" && checked[i.id]).length;
  const critiquesTotal = CHECKLIST_ITEMS.filter(i => i.poids === "Critique").length;

  const cats = [...new Set(CHECKLIST_ITEMS.map(i => i.cat))];

  const reset = () => { setChecked({}); setNotes({}); };

  return (
    <div>
      <SectionBadge icon="✅" label="Checklist de visite" color="#F97316" bg="rgba(249,115,22,0.06)" />
      <h2 style={{ fontSize: 18, fontWeight: 800, color: "#F8FAFC", marginBottom: 6 }}>Ne rien oublier lors de la visite</h2>
      <p style={{ fontSize: 13, color: "rgba(248,250,252,0.5)", marginBottom: 16, lineHeight: 1.6 }}>
        Vérifiez chaque point pendant votre visite. Les points critiques sont à examiner en priorité.
      </p>

      {/* Progression */}
      <div style={{
        background: "rgba(249,115,22,0.12)", borderRadius: 14, padding: "14px 16px", marginBottom: 20,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#F97316" }}>{done}/{total} points vérifiés</div>
          <div style={{ fontSize: 11, color: "rgba(248,250,252,0.4)" }}>{critiquesOk}/{critiquesTotal} points critiques</div>
        </div>
        <div style={{ width: 60, height: 60, position: "relative" }}>
          <svg viewBox="0 0 36 36" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#F97316" strokeWidth="3"
              strokeDasharray={`${(done / total) * 100} 100`} strokeLinecap="round" />
          </svg>
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 800, color: "#F97316",
          }}>{Math.round((done / total) * 100)}%</div>
        </div>
      </div>

      {/* Items par catégorie */}
      {cats.map(cat => (
        <div key={cat} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(248,250,252,0.4)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
            {cat}
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {CHECKLIST_ITEMS.filter(i => i.cat === cat).map(item => (
              <div key={item.id}>
                <label style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 14px", borderRadius: 12, cursor: "pointer",
                  background: checked[item.id] ? "rgba(249,115,22,0.15)" : "rgba(255,255,255,0.05)",
                  border: `1.5px solid ${checked[item.id] ? "rgba(196,181,253,0.6)" : "rgba(255,255,255,0.1)"}`,
                  transition: "all 0.15s",
                }}>
                  <input type="checkbox" checked={!!checked[item.id]} onChange={() => toggle(item.id)}
                    style={{ width: 18, height: 18, accentColor: "#F97316", flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 500, color: checked[item.id] ? "rgba(240,235,224,0.3)" : "#F0EBE0",
                      textDecoration: checked[item.id] ? "line-through" : "none",
                    }}>{item.label}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
                      background: POIDS_BG[item.poids], color: POIDS_COLOR[item.poids],
                    }}>{item.poids}</span>
                    <button onClick={e => { e.preventDefault(); setShowNotes(showNotes === item.id ? null : item.id); }}
                      style={{
                        fontSize: 14, background: "none", border: "none", cursor: "pointer",
                        color: notes[item.id] ? "#F97316" : "#94A3B8",
                      }}>
                      {notes[item.id] ? "📝" : "✏️"}
                    </button>
                  </div>
                </label>
                {showNotes === item.id && (
                  <textarea
                    placeholder="Vos observations..."
                    value={notes[item.id] ?? ""}
                    onChange={e => setNotes(prev => ({ ...prev, [item.id]: e.target.value }))}
                    style={{
                      width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 10,
                      border: "1.5px solid #F97316", fontSize: 12, resize: "vertical",
                      minHeight: 60, outline: "none", background: "rgba(255,255,255,0.06)", boxSizing: "border-box",
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <button onClick={reset} style={{
        width: "100%", padding: "12px", borderRadius: 12,
        border: "1.5px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)",
        fontSize: 13, fontWeight: 600, color: "rgba(248,250,252,0.4)", cursor: "pointer",
      }}>
        🗑️ Réinitialiser la checklist
      </button>
    </div>
  );
}

/* ══════════════════════════════════════
   PAGE PRINCIPALE
══════════════════════════════════════ */
const TOOLS = [
  { id: "louer",   label: "Louer vs Acheter",  icon: "🏠", color: "#F97316", bg: "rgba(249,115,22,0.12)" },
  { id: "dpe",     label: "DPE & Travaux",      icon: "🌿", color: "#F97316", bg: "rgba(249,115,22,0.08)" },
  { id: "ptz",     label: "PTZ",                icon: "🏦", color: "#F97316", bg: "rgba(249,115,22,0.06)" },
  { id: "dvf",     label: "Négociation DVF",    icon: "📍", color: "#DC2626", bg: "rgba(239,68,68,0.08)" },
  { id: "visite",  label: "Checklist Visite",   icon: "✅", color: "#F97316", bg: "rgba(249,115,22,0.06)" },
  { id: "dossier", label: "Dossier Bancaire",   icon: "🏦", color: "#F97316", bg: "rgba(249,115,22,0.06)" },
];

/* ════════════════════════════════════════
   LEAD CAPTURE MODAL — RP
════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════════
   DOSSIER BANCAIRE — RÉSIDENCE PRINCIPALE (Primo-accédant)
   PDF A4 professionnel, format banquier
══════════════════════════════════════════════════════════════════ */
function downloadReportRP(p) {
  const fmt     = (n) => new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n??0);
  const dateStr = new Date().toLocaleDateString("fr-FR",{day:"2-digit",month:"long",year:"numeric"});
  const refNum  = `RP-${new Date().getFullYear()}-${String(Math.floor(Math.random()*9000)+1000)}`;

  // ── Calculs financiers
  const fraisNotaire = Math.round(p.prix * (p.ancien ? 0.08 : 0.03));
  const coutTotal    = p.prix + fraisNotaire + (p.travaux||0);
  const capitalPTZ   = p.ptz ? Math.round(coutTotal * (p.quotitePTZ/100)) : 0;
  const capital      = Math.max(0, coutTotal - p.apport - capitalPTZ);
  const tm           = (p.taux/100)/12;
  const nn           = p.duree * 12;
  const mens         = capital>0&&tm>0 ? Math.round((capital*tm)/(1-Math.pow(1+tm,-nn))) : 0;
  const assurEmprunt = Math.round(capital * 0.003 / 12);
  const totalMens    = mens + assurEmprunt;
  const pctApport    = Math.round(p.apport / Math.max(p.prix,1) * 100);
  const ratioEndt    = +(totalMens / Math.max(p.revenus,1) * 100).toFixed(1);
  const rav          = Math.round(p.revenus - totalMens);
  const epargne      = p.epargne || 0;

  // Projection
  const revalo    = (p.revalo||2)/100;
  const valFinale = Math.round(p.prix * Math.pow(1+revalo, p.horizon||20));
  // Capital restant après horizon
  const capFin    = (() => {
    if (capital<=0||tm<=0) return 0;
    const k = Math.min(p.horizon*12, nn);
    return Math.max(0, Math.round(capital*(Math.pow(1+tm,nn)-Math.pow(1+tm,k))/(Math.pow(1+tm,nn)-1)));
  })();
  const patriFinal = Math.max(0, valFinale - capFin);

  // Score bancabilité RP
  const scoreEndt  = ratioEndt<=28?25:ratioEndt<=33?18:ratioEndt<=35?10:2;
  const scoreAppt  = pctApport>=20?25:pctApport>=15?18:pctApport>=10?12:4;
  const scoreRav   = rav>=2000?20:rav>=1500?15:rav>=1200?10:3;
  const scoreEpg   = epargne>=mens*6?20:epargne>=mens*3?14:epargne>=mens?8:2;
  const scoreDPE   = ["A","B","C","D"].includes(p.dpe||"C")?10:3;
  const scoreTot   = scoreEndt+scoreAppt+scoreRav+scoreEpg+scoreDPE;
  const scoreClass = scoreTot>=75?"#F97316":scoreTot>=50?"#FB923C":"#F87171";
  const scoreVerdict = scoreTot>=75?"FAVORABLE":scoreTot>=50?"RÉSERVÉ":"DÉFAVORABLE";

  // Tableau amort jalons
  const amortRows = (() => {
    if (capital<=0||tm<=0) return [];
    const jalons=[1,2,3,5,10,15,p.duree].filter((v,i,a)=>a.indexOf(v)===i&&v<=p.duree).sort((a,b)=>a-b);
    return jalons.map(annee=>{
      const k=annee*12;
      const capRest=Math.max(0,Math.round(capital*(Math.pow(1+tm,nn)-Math.pow(1+tm,k))/(Math.pow(1+tm,nn)-1)));
      const capAvant=annee===1?capital:Math.max(0,Math.round(capital*(Math.pow(1+tm,nn)-Math.pow(1+tm,(annee-1)*12))/(Math.pow(1+tm,nn)-1)));
      return {annee,mens,capRest,interetsAn:Math.round(mens*12-(capAvant-capRest)),amortAn:Math.round(capAvant-capRest)};
    });
  })();

  const TR=(label,val,hl=false)=>`<tr${hl?" style='background:rgba(249,115,22,0.06);font-weight:700;'":" "}>
    <td style="padding:7px 12px;border:1px solid #CBD5E1;color:#475569;font-size:10pt;">${label}</td>
    <td style="padding:7px 12px;border:1px solid #CBD5E1;text-align:right;font-weight:${hl?"700":"500"};font-size:10pt;">${val}</td>
  </tr>`;

  const html=`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<title>Dossier Primo-Accédant — ${refNum}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;font-size:11pt;color:#1a1a2e;background:white;line-height:1.55;}
.page{max-width:794px;margin:0 auto;padding:14mm 18mm;background:white;}
.sec{background:linear-gradient(135deg,#F97316,#F97316);color:white;padding:8px 14px;font-size:9.5pt;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin:20px 0 12px;border-radius:2px;}
.subsec{font-size:11pt;font-weight:700;color:#F97316;border-bottom:1.5px solid #F97316;padding-bottom:3px;margin:16px 0 10px;}
table{width:100%;border-collapse:collapse;margin:8px 0;}
th{background:rgba(249,115,22,0.06);color:#F97316;font-weight:700;padding:7px 12px;text-align:left;border:1px solid rgba(249,115,22,0.2);font-size:10pt;}
th.r{text-align:right;}
td{padding:7px 12px;border:1px solid #CBD5E1;font-size:10pt;vertical-align:middle;}
td.r{text-align:right;}td.b{font-weight:700;}
tr.alt td{background:#F8FAFC;}tr.total td{background:rgba(249,115,22,0.06);font-weight:700;}
.ig{display:grid;grid-template-columns:1fr 1fr;border:1px solid rgba(249,115,22,0.2);margin:10px 0;}
.ic{padding:8px 12px;border-bottom:1px solid rgba(249,115,22,0.2);border-right:1px solid rgba(249,115,22,0.2);}
.ic:nth-child(even){border-right:none;}
.ic-l{font-size:9pt;color:#6D28D9;margin-bottom:2px;}
.ic-v{font-size:11pt;font-weight:600;color:#1a1a2e;}
.score-box{border:2px solid #F97316;padding:14px 18px;margin:12px 0;display:flex;align-items:center;gap:20px;background:#FAFAFF;}
.score-num{font-size:36pt;font-weight:700;line-height:1;}
.score-item{display:flex;align-items:center;gap:8px;margin-bottom:7px;font-size:10pt;}
.score-bar-bg{height:10px;background:#E2E8F0;border-radius:2px;flex:1;}
.reco{border-left:4px solid #F97316;padding:16px 20px;margin:14px 0;background:rgba(249,115,22,0.06);}
.reco-title{font-size:11pt;font-weight:700;color:#F97316;margin-bottom:8px;text-transform:uppercase;letter-spacing:.04em;}
.hl{background:rgba(249,115,22,0.06);border-left:3px solid #F97316;padding:10px 14px;font-size:10.5pt;margin:10px 0;}
.confidential{display:inline-block;border:1px solid rgba(249,115,22,0.2);color:#F97316;font-size:8pt;font-weight:700;padding:2px 8px;letter-spacing:.1em;text-transform:uppercase;background:rgba(249,115,22,0.06);}
.doc-footer{border-top:1.5px solid rgba(249,115,22,0.2);padding-top:8px;margin-top:28px;font-size:8pt;color:#94A3B8;display:flex;justify-content:space-between;}
.pb{page-break-before:always;}
p{margin-bottom:8px;font-size:10.5pt;}
@media print{body{background:white;}.page{padding:8mm 10mm;max-width:100%;}@page{size:A4;margin:8mm 10mm;}.no-print{display:none!important;}}
</style></head><body><div class="page">

<!-- EN-TÊTE -->
<div style="background:#131318;border-radius:4px;padding:18px 22px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:flex-start;">
  <div>
    <div style="font-size:7pt;letter-spacing:.18em;color:#F97316;text-transform:uppercase;margin-bottom:6px;">Généré par</div>
    <div style="font-size:20pt;font-weight:800;background:linear-gradient(90deg,#F97316,#FB923C);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;letter-spacing:-.02em;line-height:1;margin-bottom:6px;">ImmoVerdict</div>
    <div style="font-size:11pt;font-weight:700;color:white;margin-bottom:3px;">DOSSIER DE DEMANDE DE FINANCEMENT BANCAIRE</div>
    <div style="font-size:9pt;color:rgba(255,255,255,.55);">Résidence Principale · Primo-Accédant · Réglementation HCSF · PTZ ${new Date().getFullYear()}</div>
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
    ["Emprunteur",p.nom||"—"],
    ["À l'attention de","Établissement bancaire / Courtier en financement"],
    ["Statut","Primo-accédant (1ère acquisition de résidence principale)"],
    ["Âge",p.age?`${p.age} ans`:"—"],
    ["Revenus professionnels nets mensuels",fmt(p.revenus)],
    ["Épargne disponible après opération",fmt(epargne)],
    ["Situation familiale",p.situation||"—"],
    ["Localisation du bien",p.localisation||"—"],
  ].map(([l,v])=>`<div class="ic"><div class="ic-l">${l}</div><div class="ic-v">${v}</div></div>`).join("")}
</div>

<!-- II. PROJET IMMOBILIER -->
<div class="sec">II. Présentation du projet immobilier</div>
<div class="subsec">A. Caractéristiques du bien</div>
<div class="ig">
  ${[
    ["Type de bien",`${p.typeBien||"Appartement"} — ${p.surface||"—"} m² — ${p.nbPieces||2} pièce(s)`],
    ["Localisation",p.localisation||"—"],
    ["Diagnostic de performance énergétique (DPE)",`Classe ${p.dpe||"C"}`],
    ["État du bien",p.ancien?"Ancien (frais notaire ~8%)":"Neuf / VEFA (frais notaire réduits ~3%)"],
    ["Nature des travaux prévus",p.travaux>0?fmt(p.travaux)+" de travaux prévus":"Aucun"],
    ["Destination du bien","Résidence principale — occupation personnelle"],
  ].map(([l,v])=>`<div class="ic"><div class="ic-l">${l}</div><div class="ic-v">${v}</div></div>`).join("")}
</div>

<div class="subsec">B. Plan de financement de l'opération</div>
<table>
  <tr><th>Poste</th><th class="r">Montant</th></tr>
  ${TR("Prix d'acquisition",fmt(p.prix))}
  ${TR(`Frais d'acquisition (notaire ${p.ancien?"~8%":"~3%"})`,fmt(fraisNotaire))}
  ${TR("Travaux de rénovation",fmt(p.travaux||0))}
  ${TR("<strong>Coût total de l'opération</strong>",`<strong>${fmt(coutTotal)}</strong>`,true)}
  ${TR("Apport personnel",`${fmt(p.apport)} (${pctApport}% du prix)`)}
  ${p.ptz?TR(`Prêt à Taux Zéro (PTZ — quotité ${p.quotitePTZ}%)`,`${fmt(capitalPTZ)} (taux 0% — ${p.dureePTZ||20} ans)`):""}
  ${TR("<strong>Capital à emprunter (prêt principal)</strong>",`<strong>${fmt(capital)}</strong>`,true)}
</table>
<div class="hl">
  <strong>Apport personnel :</strong> ${fmt(p.apport)} (${pctApport}% du prix).
  ${pctApport>=20?" Excellent niveau d'apport — couvre les frais annexes et sécurise la demande."
  :pctApport>=10?" Apport couvrant les frais de notaire — niveau acceptable pour un primo-accédant."
  :" Apport en deçà des standards (10–20%). Un effort complémentaire est recommandé pour obtenir les meilleures conditions."}
  ${p.ptz?` <strong>Le PTZ de ${fmt(capitalPTZ)} permet de réduire le capital emprunté et d'alléger la mensualité.</strong>`:""}
</div>

<!-- III. CONDITIONS DE CRÉDIT ET CAPACITÉ DE REMBOURSEMENT -->
<div class="sec">III. Conditions de crédit et capacité de remboursement</div>
<div class="subsec">A. Conditions du prêt sollicité</div>
<table>
  <tr><th>Paramètre</th><th class="r">Valeur</th></tr>
  ${TR("Capital emprunté (hors PTZ)",fmt(capital))}
  ${p.ptz?TR("Prêt à Taux Zéro (PTZ)",`${fmt(capitalPTZ)} — taux 0% sur ${p.dureePTZ||20} ans`):""}
  ${TR("Taux d'intérêt nominal annuel",`${p.taux}% (taux fixe)`)}
  ${TR("Durée d'amortissement",`${p.duree} ans (${p.duree*12} mensualités)`)}
  ${TR("Mensualité hors assurance emprunteur",fmt(mens))}
  ${TR("Assurance emprunteur estimée",fmt(assurEmprunt))}
  ${TR("<strong>Charge mensuelle crédit (tout compris)</strong>",`<strong>${fmt(totalMens)}</strong>`,true)}
  ${TR("<strong>Coût total du crédit (intérêts sur durée)</strong>",`<strong>${fmt(Math.round(mens*p.duree*12-capital))}</strong>`,true)}
</table>

<div class="subsec">B. Analyse de la capacité de remboursement</div>
<table>
  <tr><th>Indicateur réglementaire</th><th class="r">Valeur calculée</th><th class="r">Norme HCSF</th><th class="r">Statut</th></tr>
  <tr>
    <td>Taux d'endettement (mensualité / revenus)</td>
    <td class="r b">${ratioEndt}%</td>
    <td class="r">≤ 35%</td>
    <td class="r" style="color:${ratioEndt<=35?"#F97316":"#DC2626"};font-weight:700;">${ratioEndt<=35?"CONFORME":"DÉPASSÉ"}</td>
  </tr>
  <tr class="alt">
    <td>Reste à vivre mensuel (après charge crédit)</td>
    <td class="r b">${fmt(rav)}</td>
    <td class="r">≥ 1 500 €</td>
    <td class="r" style="color:${rav>=1500?"#F97316":rav>=1200?"#D97706":"#DC2626"};font-weight:700;">${rav>=2000?"CONFORTABLE":rav>=1500?"ACCEPTABLE":rav>=1200?"LIMITE":"INSUFFISANT"}</td>
  </tr>
  <tr>
    <td>Épargne résiduelle post-opération</td>
    <td class="r b">${fmt(epargne)}</td>
    <td class="r">≥ ${fmt(mens*3)} (3 mens.)</td>
    <td class="r" style="color:${epargne>=mens*3?"#F97316":"#D97706"};font-weight:700;">${epargne>=mens*6?"TRÈS BONNE":epargne>=mens*3?"SUFFISANTE":"À RENFORCER"}</td>
  </tr>
</table>

${amortRows.length?`
<div class="subsec">C. Tableau d'amortissement prévisionnel (jalons)</div>
<table>
  <tr>
    <th>Année</th><th class="r">Mensualité</th><th class="r">Intérêts payés (an)</th>
    <th class="r">Capital remboursé (an)</th><th class="r">Capital restant dû</th><th class="r">% remboursé</th>
  </tr>
  ${amortRows.map((r,i)=>`<tr${i%2===1?' class="alt"':""}>
    <td class="b" style="color:#F97316;">Année ${r.annee}</td>
    <td class="r">${fmt(r.mens)}</td>
    <td class="r" style="color:#92400E;">${fmt(r.interetsAn)}</td>
    <td class="r" style="color:#0C0C10;">${fmt(r.amortAn)}</td>
    <td class="r b">${fmt(r.capRest)}</td>
    <td class="r" style="color:#F97316;">${Math.round((1-r.capRest/capital)*100)}%</td>
  </tr>`).join("")}
  <tr class="total"><td colspan="5"><strong>Total intérêts sur ${p.duree} ans</strong></td><td class="r b">${fmt(Math.round(mens*p.duree*12-capital))}</td></tr>
</table>`:""}

<!-- IV. PROJECTION PATRIMONIALE -->
<div class="sec pb">IV. Projection patrimoniale à ${p.horizon||20} ans</div>
<table>
  <tr><th>Indicateur</th><th class="r">Situation initiale</th><th class="r">Projection à ${p.horizon||20} ans</th><th class="r">Variation</th></tr>
  <tr>
    <td class="b">Valeur vénale du bien</td>
    <td class="r">${fmt(p.prix)}</td>
    <td class="r b" style="color:#F97316;">${fmt(valFinale)}</td>
    <td class="r" style="color:#059669;font-weight:700;">+${fmt(valFinale-p.prix)} (+${((valFinale/p.prix-1)*100).toFixed(1)}%)</td>
  </tr>
  <tr class="alt">
    <td class="b">Capital restant dû</td>
    <td class="r">${fmt(capital)}</td>
    <td class="r b" style="color:#DC2626;">${fmt(capFin)}</td>
    <td class="r" style="color:#059669;font-weight:700;">${fmt(capital-capFin)} remboursé</td>
  </tr>
  <tr class="total">
    <td class="b">Patrimoine net constitué</td>
    <td class="r b">${fmt(p.apport)}</td>
    <td class="r b" style="color:#F97316;font-size:13pt;">${fmt(patriFinal)}</td>
    <td class="r" style="color:#059669;font-weight:700;">× ${(patriFinal/Math.max(p.apport,1)).toFixed(1)} l'apport initial</td>
  </tr>
</table>
<div class="hl"><strong>Effet de levier :</strong> Pour un apport de ${fmt(p.apport)}, le patrimoine net estimé atteint <strong>${fmt(patriFinal)}</strong> dans ${p.horizon||20} ans, coefficient multiplicateur de <strong>${(patriFinal/Math.max(p.apport,1)).toFixed(1)}x</strong>. (Hypothèse revalorisation ${p.revalo||2}%/an — indicatif)</div>

<!-- V. SCORE DE BANCABILITÉ -->
<div class="sec">V. Score de bancabilité et avis motivé</div>
<div class="score-box">
  <div style="min-width:140px;">
    <div style="font-size:9pt;color:#64748B;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px;">Score global</div>
    <div class="score-num" style="color:${scoreClass};">${scoreTot}<span style="font-size:14pt;color:#94A3B8;">/100</span></div>
    <div style="font-size:10pt;font-weight:700;color:${scoreClass};margin-top:4px;letter-spacing:.03em;">Avis : ${scoreVerdict}</div>
  </div>
  <div style="flex:1;">
    ${[
      ["Taux d'endettement HCSF (25 pts)",scoreEndt,25],
      ["Apport personnel (25 pts)",scoreAppt,25],
      ["Reste à vivre (20 pts)",scoreRav,20],
      ["Épargne résiduelle (20 pts)",scoreEpg,20],
      ["DPE & conformité (10 pts)",scoreDPE,10],
    ].map(([label,score,max])=>`<div class="score-item">
      <div style="width:220px;font-size:9.5pt;color:#475569;">${label}</div>
      <div class="score-bar-bg"><div style="height:10px;border-radius:2px;width:${Math.round(score/max*100)}%;background:${score/max>=.8?"#F97316":score/max>=.5?"#D97706":"#DC2626"};"></div></div>
      <div style="width:36px;text-align:right;font-weight:700;font-size:10pt;">${score}/${max}</div>
    </div>`).join("")}
  </div>
</div>
<div class="reco">
  <div class="reco-title">Avis motivé — ${scoreVerdict} (Score ${scoreTot}/100)</div>
  <p style="font-size:10.5pt;line-height:1.75;color:#1a1a2e;">
    ${scoreTot>=75
      ? `Le présent dossier réunit les conditions nécessaires à l'obtention d'un financement bancaire dans des conditions standards. Le taux d'endettement de <strong>${ratioEndt}%</strong> s'inscrit dans le respect strict de la réglementation HCSF (plafond 35%). L'apport personnel de <strong>${pctApport}%</strong> (${fmt(p.apport)}) assure une bonne maîtrise du risque. Le reste à vivre de <strong>${fmt(rav)}/mois</strong> démontre une solvabilité confortable. <strong>Recommandation : soumettre ce dossier auprès de 2 à 3 établissements bancaires ou d'un courtier spécialisé primo-accédant.</strong>`
      : scoreTot>=50
      ? `Le présent dossier présente des fondamentaux acceptables mais mérite quelques ajustements pour optimiser les conditions d'obtention. Points d'amélioration prioritaires : ${ratioEndt>35?`le taux d'endettement (<strong>${ratioEndt}%</strong>) dépasse le plafond HCSF — un apport complémentaire ou une durée allongée permettrait de le ramener sous 35% ; `:""}${pctApport<15?`l'apport personnel (<strong>${pctApport}%</strong>) est en dessous des standards — viser 15 à 20% pour les meilleures conditions ; `:""}${epargne<mens*3?`l'épargne résiduelle (${fmt(epargne)}) est insuffisante — constituer au minimum ${fmt(mens*3)} de réserve. `:""}Un courtier spécialisé primo-accédant pourra identifier les établissements les plus adaptés au profil. <strong>Recommandation : optimiser 1 ou 2 paramètres avant dépôt du dossier.</strong>`
      : `Le présent dossier présente des faiblesses nécessitant une restructuration avant soumission. Points bloquants : ${ratioEndt>35?`taux d'endettement à <strong>${ratioEndt}%</strong> (seuil HCSF dépassé) ; `:""}${pctApport<10?`apport insuffisant à <strong>${pctApport}%</strong> (minimum recommandé : 10%) ; `:""}${rav<1200?`reste à vivre insuffisant (${fmt(rav)}/mois) ; `:""}Il est fortement conseillé de consulter un conseiller en financement immobilier avant tout dépôt. <strong>Recommandation : restructurer le plan de financement et consulter un courtier spécialisé.</strong>`
    }
  </p>
</div>

<!-- VI. PIÈCES JUSTIFICATIVES -->
<div class="sec">VI. Pièces justificatives à joindre au dossier</div>
<table>
  <tr><th style="width:35%;">Catégorie</th><th>Documents requis</th></tr>
  <tr><td class="b">Identité et situation personnelle</td><td>Pièce d'identité en cours de validité, justificatif de domicile (moins de 3 mois), livret de famille le cas échéant</td></tr>
  <tr class="alt"><td class="b">Revenus professionnels</td><td>3 derniers bulletins de salaire, contrat de travail (ou attestation employeur), 2 derniers avis d'imposition</td></tr>
  <tr><td class="b">Patrimoine et épargne</td><td>3 derniers relevés de tous comptes bancaires, justificatifs d'épargne (livrets, assurance-vie, PEL), tableau d'amortissement des prêts en cours</td></tr>
  <tr class="alt"><td class="b">Projet immobilier</td><td>Compromis ou promesse de vente signé, diagnostics techniques (DPE, plomb, amiante), devis de travaux le cas échéant</td></tr>
  ${p.ptz?`<tr><td class="b">PTZ — Pièces spécifiques</td><td>Avis d'imposition N-2 (calcul plafonds revenus), attestation de primo-accession (non propriétaire sur 2 ans), attestation de zone géographique</td></tr>`:""}
  <tr class="alt"><td class="b">Assurances et garanties</td><td>Devis assurance emprunteur (délégation possible — loi Lagarde/Lemoine), garantie hypothécaire ou caution (Crédit Logement, SACCEF)</td></tr>
</table>

<!-- VII. ATTESTATION -->
<div class="sec">VII. Attestation sur l'honneur</div>
<div class="reco" style="background:white;">
  <p style="font-size:10.5pt;color:#1a1a2e;line-height:1.7;">
    Je soussigné(e) <strong>${p.nom||"—"}</strong>, atteste sur l'honneur que les informations contenues dans le présent dossier sont exactes, sincères et complètes à la date de signature. Je m'engage à informer l'établissement prêteur de toute modification de ma situation survenant en cours d'instruction, et à fournir tout document complémentaire nécessaire à l'examen de ma demande de financement.
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

<div class="doc-footer">
  <div style="color:#F97316;font-weight:700;">ImmoVerdict · immoverdict.com</div>
  <div>Dossier Primo-Accédant · Réf. ${refNum} · ${dateStr}</div>
  <div>HCSF 35% · PTZ ${new Date().getFullYear()} · Document confidentiel</div>
</div>

</div></body></html>`;

  const htmlWithPrint=html.replace("</body>",`<script>window.addEventListener('load',function(){setTimeout(function(){window.print();window.addEventListener('afterprint',function(){window.close();});},800);});</scr`+`ipt></body>`);
  const blob=new Blob([htmlWithPrint],{type:"text/html"});
  const url=URL.createObjectURL(blob);
  const w=window.open(url,"_blank");
  if(!w){const a=document.createElement("a");a.href=url;a.download=`dossier-primo-accedant-${new Date().toISOString().slice(0,10)}.html`;document.body.appendChild(a);a.click();document.body.removeChild(a);}
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}

/* ════════════════════════════════════════
   DOSSIER BANCAIRE RP — helpers (hors composant pour éviter remount)
════════════════════════════════════════ */
const DOSSIER_NAVY="#F97316";
function DRP_InputRow({label,children}){
  return(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #E2E8F0"}}>
      <span style={{fontSize:12,color:"#475569"}}>{label}</span>
      {children}
    </div>
  );
}
function DRP_Card({children,style={}}){
  return(
    <div style={{background:"white",border:"1px solid #CBD5E1",borderRadius:4,marginBottom:12,overflow:"hidden",...style}}>{children}</div>
  );
}
function DRP_SecH({children}){
  return(
    <div style={{background:DOSSIER_NAVY,color:"white",padding:"8px 14px",fontSize:11,fontWeight:700,letterSpacing:".06em",textTransform:"uppercase"}}>{children}</div>
  );
}

/* ════════════════════════════════════════
   DOSSIER BANCAIRE RP — Composant inline
════════════════════════════════════════ */
function DossierBancaireRP() {
  const navy=DOSSIER_NAVY;
  const [form,setForm]=useState({
    nom:"",age:"",situation:"Célibataire",revenus:3500,epargne:15000,
    prix:250000,apport:30000,taux:3.5,duree:20,
    typeBien:"Appartement",surface:55,nbPieces:3,localisation:"",
    ancien:true,travaux:0,dpe:"C",revalo:2,horizon:20,
    ptz:false,quotitePTZ:40,dureePTZ:20,
  });
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));

  const fraisNotaire=Math.round(form.prix*(form.ancien?0.08:0.03));
  const coutTotal=form.prix+fraisNotaire+(form.travaux||0);
  const capitalPTZ=form.ptz?Math.round(coutTotal*(form.quotitePTZ/100)):0;
  const capital=Math.max(0,coutTotal-form.apport-capitalPTZ);
  const tm=(form.taux/100)/12;
  const nn=form.duree*12;
  const mens=capital>0&&tm>0?Math.round((capital*tm)/(1-Math.pow(1+tm,-nn))):0;
  const assurEmprunt=Math.round(capital*0.003/12);
  const totalMens=mens+assurEmprunt;
  const pctApport=Math.round(form.apport/Math.max(form.prix,1)*100);
  const ratioEndt=+(totalMens/Math.max(form.revenus,1)*100).toFixed(1);
  const rav=Math.round(form.revenus-totalMens);

  const scoreEndt=ratioEndt<=28?25:ratioEndt<=33?18:ratioEndt<=35?10:2;
  const scoreAppt=pctApport>=20?25:pctApport>=15?18:pctApport>=10?12:4;
  const scoreRav=rav>=2000?20:rav>=1500?15:rav>=1200?10:3;
  const scoreEpg=(form.epargne||0)>=mens*6?20:(form.epargne||0)>=mens*3?14:(form.epargne||0)>=mens?8:2;
  const scoreDPE=["A","B","C","D"].includes(form.dpe||"C")?10:3;
  const scoreTot=scoreEndt+scoreAppt+scoreRav+scoreEpg+scoreDPE;
  const scoreColor=scoreTot>=75?"#F97316":scoreTot>=50?"#FB923C":"#F87171";
  const scoreVerdict=scoreTot>=75?"FAVORABLE":scoreTot>=50?"RÉSERVÉ":"DÉFAVORABLE";

  // Helpers définis en dehors du composant (DRP_InputRow, DRP_Card, DRP_SecH)
  // numInput reste une factory locale car ce n'est pas un composant React (pas de majuscule)
  const numInput=(k,opts={})=>(
    <input type="number" value={form[k]}
      onChange={e=>set(k,+e.target.value)}
      style={{width:110,padding:"4px 8px",border:"1px solid #CBD5E1",borderRadius:4,fontSize:12,textAlign:"right",color:"#1a1a2e",background:"white",...(opts.style||{})}}
      {...opts}/>
  );

  return(
    <div style={{fontFamily:"Arial,'Helvetica Neue',sans-serif",color:"#1a1a2e"}}>
      {/* En-tête */}
      <div style={{background:navy,color:"white",borderRadius:4,padding:"16px 14px",marginBottom:12}}>
        <div style={{fontSize:15,fontWeight:700,marginBottom:3}}>DOSSIER DE FINANCEMENT — RÉSIDENCE PRINCIPALE</div>
        <div style={{fontSize:11,opacity:.7}}>Primo-accédant · HCSF 35% · PTZ {new Date().getFullYear()}</div>
      </div>

      {/* Score synthèse */}
      <DRP_Card>
        <DRP_SecH>Synthèse bancabilité</DRP_SecH>
        <div style={{padding:"14px",display:"flex",alignItems:"center",gap:16}}>
          <div style={{border:`2px solid ${scoreColor}`,padding:"12px 16px",textAlign:"center",minWidth:100}}>
            <div style={{fontSize:28,fontWeight:700,color:scoreColor,lineHeight:1}}>{scoreTot}</div>
            <div style={{fontSize:9,color:"#64748B"}}>/100 pts</div>
            <div style={{fontSize:10,fontWeight:700,color:scoreColor,marginTop:3}}>{scoreVerdict}</div>
          </div>
          <div style={{flex:1}}>
            <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:10}}>
              {[
                ["Mensualité",`${(mens/1).toLocaleString("fr-FR")} €/mois`,"#F97316"],
                ["Endettement",`${ratioEndt}%`,ratioEndt<=35?"#F97316":"#DC2626"],
                ["Reste à vivre",`${fmt(rav)}/mois`,rav>=1500?"#F97316":"#DC2626"],
                ["Apport",`${pctApport}%`,pctApport>=15?"#F97316":"#D97706"],
              ].map(([l,v,c])=>(
                <div key={l} style={{background:"#F8FAFC",border:"1px solid #E2E8F0",borderRadius:3,padding:"5px 10px"}}>
                  <div style={{fontSize:9,color:"#64748B",textTransform:"uppercase"}}>{l}</div>
                  <div style={{fontSize:12,fontWeight:700,color:c}}>{v}</div>
                </div>
              ))}
            </div>
            {[["Endettement",scoreEndt,25],["Apport",scoreAppt,25],["Reste à vivre",scoreRav,20],["Épargne",scoreEpg,20],["DPE",scoreDPE,10]].map(([l,s,m])=>(
              <div key={l} style={{display:"flex",alignItems:"center",gap:6,marginBottom:4,fontSize:10}}>
                <div style={{width:90,color:"#64748B"}}>{l}</div>
                <div style={{flex:1,background:"#E2E8F0",borderRadius:2,height:5}}>
                  <div style={{height:5,borderRadius:2,background:s/m>=.8?"#F97316":s/m>=.5?"#D97706":"#DC2626",width:`${Math.round(s/m*100)}%`}}/>
                </div>
                <div style={{width:32,textAlign:"right",fontWeight:700,fontSize:10}}>{s}/{m}</div>
              </div>
            ))}
          </div>
        </div>
      </DRP_Card>

      {/* Formulaire — Emprunteur */}
      <DRP_Card>
        <DRP_SecH>I. Profil emprunteur</DRP_SecH>
        <div style={{padding:"0 14px 10px"}}>
          <DRP_InputRow label="Nom / Prénom">
            <input value={form.nom} onChange={e=>set("nom",e.target.value)}
              placeholder="Nom Prénom"
              style={{width:180,padding:"4px 8px",border:"1px solid #CBD5E1",borderRadius:4,fontSize:12,color:"#1a1a2e",background:"white"}}/>
          </DRP_InputRow>
          <DRP_InputRow label="Âge">
            {numInput("age",{min:18,max:70,style:{width:80}})}
          </DRP_InputRow>
          <DRP_InputRow label="Situation familiale">
            <select value={form.situation} onChange={e=>set("situation",e.target.value)}
              style={{padding:"4px 8px",border:"1px solid #CBD5E1",borderRadius:4,fontSize:12,color:"#1a1a2e",background:"white"}}>
              {["Célibataire","Marié(e)","Pacsé(e)","Concubinage","Divorcé(e)"].map(s=><option key={s}>{s}</option>)}
            </select>
          </DRP_InputRow>
          <DRP_InputRow label="Revenus nets mensuels (€)">
            {numInput("revenus",{min:0,step:100})}
          </DRP_InputRow>
          <DRP_InputRow label="Épargne résiduelle post-opération (€)">
            {numInput("epargne",{min:0,step:1000})}
          </DRP_InputRow>
        </div>
      </DRP_Card>

      {/* Formulaire — Bien */}
      <DRP_Card>
        <DRP_SecH>II. Bien immobilier</DRP_SecH>
        <div style={{padding:"0 14px 10px"}}>
          <DRP_InputRow label="Prix d'acquisition (€)">
            {numInput("prix",{min:50000,step:5000})}
          </DRP_InputRow>
          <DRP_InputRow label="Type de bien">
            <div style={{display:"flex",gap:6}}>
              {["Appartement","Maison","Studio"].map(t=>(
                <button key={t} onClick={()=>set("typeBien",t)}
                  style={{padding:"3px 10px",border:`1px solid ${form.typeBien===t?navy:"#CBD5E1"}`,borderRadius:4,
                    background:form.typeBien===t?navy:"white",color:form.typeBien===t?"white":"#475569",fontSize:11,cursor:"pointer"}}>
                  {t}
                </button>
              ))}
            </div>
          </DRP_InputRow>
          <DRP_InputRow label="Surface (m²)">
            {numInput("surface",{min:9,max:400,step:5,style:{width:80}})}
          </DRP_InputRow>
          <DRP_InputRow label="Localisation (ville / quartier)">
            <input value={form.localisation} onChange={e=>set("localisation",e.target.value)}
              placeholder="Paris 11e, Lyon 6e..."
              style={{width:180,padding:"4px 8px",border:"1px solid #CBD5E1",borderRadius:4,fontSize:12,color:"#1a1a2e",background:"white"}}/>
          </DRP_InputRow>
          <DRP_InputRow label="DPE">
            <div style={{display:"flex",gap:4}}>
              {["A","B","C","D","E","F","G"].map(c=>(
                <button key={c} onClick={()=>set("dpe",c)}
                  style={{width:28,height:28,border:`1px solid ${form.dpe===c?navy:"#CBD5E1"}`,borderRadius:3,
                    background:form.dpe===c?navy:"white",color:form.dpe===c?"white":"#475569",fontSize:11,fontWeight:700,cursor:"pointer"}}>
                  {c}
                </button>
              ))}
            </div>
          </DRP_InputRow>
          <DRP_InputRow label="État du bien">
            <div style={{display:"flex",gap:6}}>
              {[["ancient","Ancien"],["neuf","Neuf / VEFA"]].map(([v,l])=>(
                <button key={v} onClick={()=>set("ancien",v==="ancient")}
                  style={{padding:"3px 10px",border:`1px solid ${(v==="ancient"&&form.ancien)||(v==="neuf"&&!form.ancien)?navy:"#CBD5E1"}`,borderRadius:4,
                    background:(v==="ancient"&&form.ancien)||(v==="neuf"&&!form.ancien)?navy:"white",
                    color:(v==="ancient"&&form.ancien)||(v==="neuf"&&!form.ancien)?"white":"#475569",fontSize:11,cursor:"pointer"}}>
                  {l}
                </button>
              ))}
            </div>
          </DRP_InputRow>
          <DRP_InputRow label="Travaux prévus (€)">
            {numInput("travaux",{min:0,step:1000})}
          </DRP_InputRow>
        </div>
      </DRP_Card>

      {/* Formulaire — Crédit */}
      <DRP_Card>
        <DRP_SecH>III. Conditions de crédit</DRP_SecH>
        <div style={{padding:"0 14px 10px"}}>
          <DRP_InputRow label="Apport personnel (€)">
            {numInput("apport",{min:0,step:2000})}
          </DRP_InputRow>
          <DRP_InputRow label="Taux d'intérêt (%)">
            <input type="number" value={form.taux} onChange={e=>set("taux",+e.target.value)}
              step={0.05} min={0.5} max={8}
              style={{width:80,padding:"4px 8px",border:"1px solid #CBD5E1",borderRadius:4,fontSize:12,textAlign:"right",color:"#1a1a2e",background:"white"}}/>
          </DRP_InputRow>
          <DRP_InputRow label="Durée du crédit (ans)">
            {numInput("duree",{min:5,max:25,step:1,style:{width:80}})}
          </DRP_InputRow>
          <DRP_InputRow label="Horizon de projection (ans)">
            {numInput("horizon",{min:5,max:30,step:1,style:{width:80}})}
          </DRP_InputRow>
          <DRP_InputRow label="Revalorisation annuelle (%)">
            <input type="number" value={form.revalo} onChange={e=>set("revalo",+e.target.value)}
              step={0.1} min={0} max={6}
              style={{width:80,padding:"4px 8px",border:"1px solid #CBD5E1",borderRadius:4,fontSize:12,textAlign:"right",color:"#1a1a2e",background:"white"}}/>
          </DRP_InputRow>
          <div style={{padding:"10px 0",borderBottom:"1px solid #E2E8F0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <span style={{fontSize:12,color:"#475569",fontWeight:600}}>Prêt à Taux Zéro (PTZ)</span>
              <div style={{fontSize:10,color:"#64748B"}}>Primo-accédant sous conditions de revenus</div>
            </div>
            <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}>
              <input type="checkbox" checked={form.ptz} onChange={e=>set("ptz",e.target.checked)}
                style={{width:16,height:16,accentColor:navy}}/>
              <span style={{fontSize:12,fontWeight:600,color:form.ptz?navy:"#94A3B8"}}>{form.ptz?"Activé":"Désactivé"}</span>
            </label>
          </div>
          {form.ptz&&(
            <>
              <DRP_InputRow label="Quotité PTZ (%)">
                <select value={form.quotitePTZ} onChange={e=>set("quotitePTZ",+e.target.value)}
                  style={{padding:"4px 8px",border:"1px solid #CBD5E1",borderRadius:4,fontSize:12,color:"#1a1a2e",background:"white"}}>
                  {[20,30,40,50].map(q=><option key={q} value={q}>{q}% ({q==="50"?"Zone A/A bis":q>=40?"Zone B1":"Zone B2/C"})</option>)}
                </select>
              </DRP_InputRow>
              <DRP_InputRow label="Durée du PTZ (ans)">
                {numInput("dureePTZ",{min:10,max:25,step:1,style:{width:80}})}
              </DRP_InputRow>
              <div style={{background:"rgba(249,115,22,0.06)",padding:"8px 12px",borderRadius:4,fontSize:11,color:navy,margin:"4px 0"}}>
                PTZ calculé : <strong>{fmt(capitalPTZ)}</strong> — Capital principal réduit à <strong>{fmt(capital)}</strong>
              </div>
            </>
          )}
        </div>
      </DRP_Card>

      {/* Récapitulatif financement */}
      <DRP_Card>
        <DRP_SecH>Récapitulatif du financement</DRP_SecH>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <tbody>
            {[
              ["Prix d'acquisition",fmt(form.prix),false],
              [`Frais de notaire (${form.ancien?"~8%":"~3%"})`,fmt(fraisNotaire),false],
              ["Travaux",fmt(form.travaux||0),false],
              ["Coût total opération",fmt(coutTotal),true],
              [`Apport (${pctApport}%)`,fmt(form.apport),false],
              ...(form.ptz?[[`PTZ (${form.quotitePTZ}%)`,`${fmt(capitalPTZ)} — taux 0%`,false]]:[]),
              ["Capital à emprunter",fmt(capital),true],
              [`Mensualité à ${form.taux}% / ${form.duree} ans`,`${(mens).toLocaleString("fr-FR")} €/mois`,false],
              ["+ Assurance emprunteur",`${fmt(assurEmprunt)}/mois`,false],
              ["Charge totale crédit",`${fmt(totalMens)}/mois`,true],
              ["Taux d'endettement",`${ratioEndt}%`,false],
              ["Reste à vivre",`${fmt(rav)}/mois`,true],
            ].map(([l,v,hl],i)=>(
              <tr key={i} style={{background:hl?"rgba(249,115,22,0.08)":"transparent"}}>
                <td style={{padding:"6px 14px",borderBottom:"1px solid #E2E8F0",fontSize:11,color:"#475569"}}>{l}</td>
                <td style={{padding:"6px 14px",borderBottom:"1px solid #E2E8F0",fontSize:11,fontWeight:hl?700:500,textAlign:"right",
                  color:l==="Taux d'endettement"?(ratioEndt<=35?"#F97316":"#DC2626"):l==="Reste à vivre"?(rav>=1500?"#F97316":"#DC2626"):"#1a1a2e"}}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DRP_Card>

      {/* Bouton PDF */}
      <div style={{paddingBottom:8}}>
        <button
          onClick={()=>downloadReportRP(form)}
          style={{width:"100%",padding:"14px",background:navy,color:"white",border:"none",borderRadius:4,
            fontSize:13,fontWeight:700,cursor:"pointer",letterSpacing:".03em",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
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

function LeadModalRP({ onClose }) {
  const [email, setEmail]   = useState("");
  const [name,  setName]    = useState("");
  const [sent,  setSent]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [rgpd,  setRgpd]    = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      if (sb) {
        await sb.from("leads").upsert({
          email,
          nom: name || null,
          source: "rp",
          created_at: new Date().toISOString(),
        }, { onConflict: "email" });
      }
      // Pré-remplir l'email dans le simulateur LMNP si ouvert plus tard
      try { localStorage.setItem("immoverdict_email", email); } catch (_) {}
    } catch (_) { /* silencieux */ }
    setLoading(false);
    setSent(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: "rgba(7,7,26,0.85)", backdropFilter: "blur(6px)" }}>
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl"
        style={{ background: "#12122A", border: "1px solid rgba(249,115,22,0.3)" }}>
        {!sent ? (
          <>
            <div className="text-center mb-5">
              <div className="text-3xl mb-2">🏠</div>
              <h2 className="text-base font-bold mb-1" style={{ color: "rgba(248,250,252,0.95)" }}>
                Recevez votre analyse personnalisée
              </h2>
              <p className="text-xs" style={{ color: "rgba(248,250,252,0.45)" }}>
                Récapitulatif de votre simulation + conseils primo-accédant par email.
              </p>
            </div>
            <form onSubmit={submit} className="space-y-3">
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="Prénom (optionnel)"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "#F8FAFC" }} />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Votre adresse email *" required
                className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "#F8FAFC" }} />
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={rgpd} onChange={e=>setRgpd(e.target.checked)}
                  className="mt-0.5 flex-shrink-0 accent-emerald-500" />
                <span className="text-[10px] leading-relaxed" style={{ color:"rgba(248,250,252,0.45)" }}>
                  J'accepte de recevoir mon analyse et des communications d'ImmoVerdict.
                  Voir notre{" "}
                  <a href="/mentions-legales" target="_blank" className="underline">politique de confidentialité</a>.
                </span>
              </label>
              <button type="submit" disabled={loading || !email || !rgpd}
                className="w-full py-3 rounded-xl text-sm font-bold text-white transition-opacity"
                style={{ background: "linear-gradient(135deg, #059669, #0891b2)", opacity: loading || !email || !rgpd ? 0.5 : 1 }}>
                {loading ? "⏳ Envoi…" : "Recevoir mon analyse →"}
              </button>
            </form>
            <p className="text-[10px] text-center mt-3" style={{ color: "rgba(248,250,252,0.25)" }}>
              Aucun spam · Désinscription en 1 clic
            </p>
            <button onClick={onClose} className="mt-3 w-full text-sm py-1"
              style={{ color: "rgba(248,250,252,0.35)" }}>
              Continuer sans email
            </button>
          </>
        ) : (
          <div className="text-center py-6">
            <div className="text-4xl mb-3">✅</div>
            <h2 className="text-base font-bold mb-2" style={{ color: "rgba(248,250,252,0.95)" }}>
              Analyse enregistrée !
            </h2>
            <p className="text-sm mb-5" style={{ color: "rgba(248,250,252,0.5)" }}>
              Vous recevrez vos résultats et conseils primo-accédant sous peu.
            </p>
            <div className="rounded-xl p-3 mb-4 text-left" style={{ background: "rgba(5,150,105,0.1)", border: "1px solid rgba(5,150,105,0.25)" }}>
              <p className="text-[10px] font-bold mb-2" style={{ color: "rgba(52,211,153,0.9)" }}>📬 Ce que vous allez recevoir :</p>
              {[
                { j: "J+0",  txt: "Récap de votre simulation RP" },
                { j: "J+1",  txt: "Guide : PTZ, DPE et pièges à éviter" },
                { j: "J+3",  txt: "Comparatif meilleurs taux immobiliers" },
              ].map(({ j, txt }) => (
                <div key={j} className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(5,150,105,0.3)", color: "#34D399" }}>{j}</span>
                  <p className="text-[10px]" style={{ color: "rgba(248,250,252,0.55)" }}>{txt}</p>
                </div>
              ))}
            </div>
            <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm font-semibold"
              style={{ border: "1px solid rgba(255,255,255,0.15)", color: "rgba(248,250,252,0.7)", background: "rgba(255,255,255,0.06)" }}>
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResidencePrincipalePage() {
  const router = useRouter();
  const [activeTool, setActiveTool] = useState("louer");
  const [showLead, setShowLead] = useState(false);

  const tool = TOOLS.find(t => t.id === activeTool);

  return (
    <div className="min-h-screen" style={{ background: "#0C0C10" }}>
      {/* ── HEADER ── */}
      <header style={{
        background: "#131318",
        position: "sticky", top: 0, zIndex: 40,
      }}>
        <div className="max-w-2xl mx-auto" style={{ padding: "12px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button onClick={() => router.push("/")}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                background: "none", border: "none", cursor: "pointer",
              }}>
              <span style={{ fontSize: 22 }}>🏠</span>
              <div>
                <div style={{ color: "white", fontWeight: 800, fontSize: 14, lineHeight: 1 }}>Résidence Principale</div>
                <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 10 }}>5 outils primo-accédant</div>
              </div>
            </button>
            <button onClick={() => router.push("/lmnp")}
              style={{
                fontSize: 11, fontWeight: 700, background: "rgba(255,255,255,0.15)",
                color: "white", border: "1px solid rgba(255,255,255,0.2)",
                padding: "6px 12px", borderRadius: 10, cursor: "pointer",
              }}>
              🏢 Simulateur LMNP
            </button>
          </div>

          {/* Tabs outils */}
          <div style={{
            display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2,
            marginTop: 12, scrollbarWidth: "none",
          }}>
            {TOOLS.map(t => (
              <button key={t.id} onClick={() => setActiveTool(t.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "6px 12px", borderRadius: 10, whiteSpace: "nowrap",
                  fontSize: 12, fontWeight: 700, cursor: "pointer", border: "none",
                  background: activeTool === t.id ? "rgba(249,115,22,0.85)" : "rgba(255,255,255,0.1)",
                  color: activeTool === t.id ? "#ffffff" : "rgba(255,255,255,0.85)",
                  transition: "all 0.15s",
                  flexShrink: 0,
                }}>
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── CONTENU ── */}
      <main className="max-w-2xl mx-auto" style={{ padding: "20px 16px 80px" }}>
        <DRP_Card>
          {activeTool === "louer"  && <LoueurVsAcheteur />}
          {activeTool === "dpe"    && <AnalyseurDPE />}
          {activeTool === "ptz"    && <CalculateurPTZ />}
          {activeTool === "dvf"    && <AssistantNegociation />}
          {activeTool === "visite" && <ChecklistVisite />}
          {activeTool === "dossier" && <DossierBancaireRP />}
        </DRP_Card>

        {/* CTA Lead Capture RP */}
        <div style={{
          marginTop: 16, borderRadius: 20, overflow: "hidden",
          background: "linear-gradient(135deg, #131318 0%, #059669 60%, #0891b2 100%)",
        }}>
          <div style={{ padding: "20px", textAlign: "center" }}>
            <p style={{ fontSize: 24, marginBottom: 8 }}>📋</p>
            <h3 style={{ color: "white", fontWeight: 800, fontSize: 14, marginBottom: 4 }}>
              Recevez votre analyse primo-accédant
            </h3>
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, marginBottom: 16 }}>
              Récap PTZ, DPE, simulation louer vs acheter · Conseils personnalisés · Gratuit
            </p>
            <button onClick={() => setShowLead(true)}
              style={{
                width: "100%", background: "white", color: "#F97316",
                fontWeight: 800, fontSize: 13, padding: "12px 20px",
                borderRadius: 12, border: "none", cursor: "pointer",
              }}>
              Recevoir mon analyse gratuitement →
            </button>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, marginTop: 8 }}>
              Aucun spam · 0 engagement
            </p>
          </div>
        </div>

        {/* ── Affiliés courtiers — primo-accédants ── */}
        <div style={{
          marginTop: 12, borderRadius: 16, overflow: "hidden",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(249,115,22,0.25)",
        }}>
          <div style={{ padding: "16px 16px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 18 }}>⚡</span>
              <p style={{ fontSize: 13, fontWeight: 700, color: "rgba(248,250,252,0.95)", margin: 0 }}>
                Obtenez le meilleur taux pour votre projet
              </p>
            </div>
            <p style={{ fontSize: 11, color: "rgba(248,250,252,0.5)", marginBottom: 12, lineHeight: 1.6 }}>
              Comparez gratuitement les offres de 200+ banques — sans engagement, réponse en 48h.
            </p>
          </div>
          <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { name:"Pretto",       emoji:"🟣", tag:"100% digital",              desc:"Offre en 48h",           badge:"Recommandé", color:"#F97316", url:"https://www.pretto.fr?utm_source=immoverdict&utm_medium=affiliation&utm_campaign=rp-courtier" },
              { name:"MeilleurTaux", emoji:"🔵", tag:"200+ banques comparées",     desc:"Leader du marché",       badge:null,         color:"#F97316", url:"https://www.meilleurtaux.com?utm_source=immoverdict&utm_medium=affiliation&utm_campaign=rp-courtier" },
              { name:"CAFPI",        emoji:"🟢", tag:"Spécialiste primo-accédants",desc:"Expert PTZ & primo",     badge:"Expert PTZ", color:"#F97316", url:"https://www.cafpi.fr?utm_source=immoverdict&utm_medium=affiliation&utm_campaign=rp-courtier" },
            ].map(c => (
              <a key={c.name} href={c.url} target="_blank" rel="noopener noreferrer"
                onClick={() => { try { window.gtag?.("event","clic_courtier",{ courtier:c.name, page:"rp" }); } catch(_){} }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  borderRadius: 12, padding: "10px 12px",
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                  textDecoration: "none",
                }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 16 }}>{c.emoji}</span>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(248,250,252,0.9)" }}>{c.name}</span>
                      {c.badge && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 20, background: c.color+"22", color: c.color }}>
                          {c.badge}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 10, color: "rgba(248,250,252,0.4)", margin: 0 }}>{c.tag} · {c.desc}</p>
                  </div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: c.color }}>Comparer →</span>
              </a>
            ))}
            <p style={{ fontSize: 9, textAlign: "center", color: "rgba(248,250,252,0.2)", margin: "4px 0 0" }}>
              Liens partenaires · Comparaison 100% gratuite · Sans engagement
            </p>
          </div>
        </div>

        {/* Lien vers cycle LMNP */}
        <div
          onClick={() => router.push("/lmnp")}
          style={{
            marginTop: 12, padding: "16px", borderRadius: 16,
            background: "#131318",
            cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
          }}>
          <span style={{ fontSize: 24 }}>🏢</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "white" }}>Et dans 5 ans ?</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
              Simulez la mise en location meublée LMNP de ce bien pour en maximiser la rentabilité
            </div>
          </div>
          <span style={{ color: "#93C5FD", fontSize: 18 }}>→</span>
        </div>
      {/* Disclaimer légal */}
      <div style={{ padding:"12px 16px 32px", textAlign:"center" }}>
        <div style={{ borderRadius:12, border:"1px solid rgba(255,255,255,0.07)",
          background:"rgba(255,255,255,0.03)", padding:"10px 14px",
          fontSize:10, color:"rgba(255,255,255,0.35)", textAlign:"left", lineHeight:1.7 }}>
          ⚠️ <strong style={{ color:"rgba(255,255,255,0.5)" }}>Avertissement :</strong> Les simulations ImmoVerdict sont fournies à titre purement indicatif et ne constituent pas un conseil fiscal, juridique ou financier. Consultez un notaire ou un conseiller avant toute décision d'achat.{" "}
          <a href="/mentions-legales" style={{ color:"rgba(249,115,22,0.7)", textDecoration:"underline" }}>Mentions légales</a>
        </div>
      </div>

      </main>

      {/* Modal lead capture */}
      {showLead && <LeadModalRP onClose={() => setShowLead(false)} />}
    </div>
  );
}
