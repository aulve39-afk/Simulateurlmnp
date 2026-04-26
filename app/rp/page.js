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
        width:15, height:15, borderRadius:"50%", background:"#DBEAFE",
        color:"#2563EB", fontSize:10, fontWeight:700, lineHeight:1, flexShrink:0 }}>ⓘ</span>
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

function SectionBadge({ icon, label, color = "#A78BFA", bg = "rgba(124,58,237,0.12)" }) {
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

function SliderInput({ label, value, onChange, min, max, step = 1, format = fmt, color = "#A78BFA", help }) {
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
          background: `linear-gradient(to right, ${color} ${pct}%, #E2E8F0 ${pct}%)`,
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

function KPIBox({ label, value, sub, color = "#A78BFA", bg = "rgba(124,58,237,0.12)", help }) {
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
      <SectionBadge icon="🏠" label="Louer vs Acheter" color="#A78BFA" bg="rgba(124,58,237,0.12)" />
      <h2 style={{ fontSize: 18, fontWeight: 800, color: "#F8FAFC", marginBottom: 6 }}>Comparer sur {horizon} ans</h2>
      <p style={{ fontSize: 13, color: "rgba(248,250,252,0.5)", marginBottom: 20, lineHeight: 1.6 }}>
        Simulez la différence de patrimoine net entre acheter votre résidence et rester locataire.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        <KPIBox
          label="Coût mensuel proprio"
          value={fmt(coutProprio)}
          sub="Mensualité + charges + TF"
          color="#A78BFA" bg="rgba(124,58,237,0.12)"
        />
        <KPIBox
          label={`Patrimoine net A${horizon}`}
          value={fmt(derniere["Propriétaire"] ?? 0)}
          sub="Après remboursement du crédit"
          color="#059669" bg="#ECFDF5"
        />
      </div>

      {/* Verdict */}
      <div style={{
        background: verdictAchat ? "#ECFDF5" : "#FEF2F2",
        border: `1px solid ${verdictAchat ? "#A7F3D0" : "#FECACA"}`,
        borderRadius: 14, padding: "14px 16px", marginBottom: 20,
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <span style={{ fontSize: 28 }}>{verdictAchat ? "🟢" : "🟡"}</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: verdictAchat ? "#065F46" : "#92400E" }}>
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
                <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gLoc" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#059669" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#059669" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="an" tick={{ fontSize: 10, fill: "#94A3B8" }} />
            <YAxis tickFormatter={v => `${Math.round(v / 1000)}k`} tick={{ fontSize: 10, fill: "#94A3B8" }} />
            <RTooltip formatter={(v, n) => [fmt(v), n]} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
            <Area type="monotone" dataKey="Propriétaire" stroke="#7C3AED" strokeWidth={2} fill="url(#gProprio)" />
            <Area type="monotone" dataKey="Locataire" stroke="#059669" strokeWidth={2} fill="url(#gLoc)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Paramètres */}
      <details style={{ marginTop: 8 }}>
        <summary style={{ fontSize: 13, fontWeight: 700, color: "#A78BFA", cursor: "pointer", listStyle: "none", padding: "8px 0" }}>
          ⚙️ Modifier les paramètres
        </summary>
        <div style={{ paddingTop: 16 }}>
          <SliderInput label="Prix du bien" value={prix} onChange={setPrix} min={80000} max={800000} step={5000} color="#A78BFA" />
          <SliderInput label="Apport" value={apport} onChange={setApport} min={0} max={200000} step={1000} color="#A78BFA" help="Somme apportée de votre poche. Recommandé : 10% minimum. Plus l'apport est élevé, meilleur est le taux et moins vous payez d'intérêts." />
          <SliderInput label="Loyer actuel (si locataire)" value={loyer_loc} onChange={setLoyerLoc} min={300} max={3500} step={50} color="#A78BFA" help="Votre loyer mensuel actuel. Sert à calculer ce que vous économisez (ou dépensez de plus) en achetant vs en restant locataire." />
          <SliderInput label="Taux du crédit" value={taux} onChange={setTaux} min={1} max={6} step={0.05} format={v => `${v.toFixed(2)} %`} color="#A78BFA" help="Taux nominal hors assurance. Comparez les offres de plusieurs banques ou passez par un courtier pour obtenir les meilleures conditions." />
          <SliderInput label="Durée du crédit (ans)" value={duree} onChange={setDuree} min={10} max={25} step={1} format={v => `${v} ans`} color="#A78BFA" help="Durée standard : 20–25 ans. Une durée plus longue réduit la mensualité mais augmente le coût total des intérêts." />
          <SliderInput label="Horizon de comparaison (ans)" value={horizon} onChange={setHorizon} min={5} max={25} step={1} format={v => `${v} ans`} color="#A78BFA" help="Nombre d'années pendant lesquelles vous comparez louer vs acheter. En dessous de 5 ans, louer est souvent plus rentable (frais de notaire non amortis)." />
          <SliderInput label="Revalorisation annuelle du bien" value={revalo} onChange={setRevalo} min={0} max={5} step={0.1} format={v => `${v.toFixed(1)} %/an`} color="#059669" help={LEXIQUE_RP["Revalo immobilière"]} />
          <SliderInput label="Rendement placement locataire" value={rendLocatif} onChange={setRendLocatif} min={0} max={8} step={0.1} format={v => `${v.toFixed(1)} %/an`} color="#059669" help="Rendement annuel du placement financier dans lequel le locataire investit la différence (apport + charges de propriété). Ex : 4% pour un PEA actions." />
        </div>
      </details>
    </div>
  );
}

/* ══════════════════════════════════════
   OUTIL 2 — DPE + BUDGET TRAVAUX
══════════════════════════════════════ */
const DPE_DATA = {
  A: { label: "Très performant", color: "#059669", bg: "#ECFDF5", reno: 0, conseil: "Félicitations ! Pas de travaux obligatoires. Le bien est déjà très économe." },
  B: { label: "Performant", color: "#10B981", bg: "#D1FAE5", reno: 0, conseil: "Très bon DPE. Aucun travaux obligatoire prévu par la loi Climat & Résilience." },
  C: { label: "Assez performant", color: "#F59E0B", bg: "#FEF3C7", reno: 5000, conseil: "Bon état général. Quelques optimisations possibles pour économiser sur la facture énergie." },
  D: { label: "Peu performant", color: "#F97316", bg: "#FFF7ED", reno: 15000, conseil: "Travaux d'isolation recommandés. Ce bien reste louable sans restriction jusqu'en 2034." },
  E: { label: "Énergivore", color: "#EF4444", bg: "#FEF2F2", reno: 30000, conseil: "⚠️ Interdit à la location depuis 2025 si l'étiquette chute en F/G. Prévoir isolation + VMC." },
  F: { label: "Très énergivore 🚫", color: "#DC2626", bg: "#FEF2F2", reno: 50000, conseil: "🚫 Interdit à la location (passoire thermique). Travaux obligatoires avant mise en location." },
  G: { label: "Passoire thermique 🚫", color: "#991B1B", bg: "#FEF2F2", reno: 70000, conseil: "🚫 Interdit à la location depuis 2025. Investissement travaux important mais indispensable." },
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
      <SectionBadge icon="🌿" label="Analyse DPE & Budget Travaux" color="#059669" bg="#ECFDF5" />
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
      <SliderInput label="Surface du bien (m²)" value={surface} onChange={setSurface} min={15} max={300} step={5} format={v => `${v} m²`} color="#059669" />
      <SliderInput label="Nombre de fenêtres" value={nbFenetres} onChange={setNbFenetres} min={1} max={20} step={1} format={v => `${v} fenêtres`} color="#059669" />

      {/* Checklist travaux */}
      <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(248,250,252,0.8)", marginBottom: 10 }}>Travaux envisagés</div>
      <div style={{ display: "grid", gap: 8, marginBottom: 20 }}>
        {travauxItems.map(t => (
          <label key={t.key} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 14px", borderRadius: 12, cursor: "pointer",
            background: travaux[t.key] ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.05)",
            border: `1.5px solid ${travaux[t.key] ? "rgba(16,185,129,0.4)" : "rgba(255,255,255,0.1)"}`,
            transition: "all 0.15s",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input type="checkbox" checked={travaux[t.key]}
                onChange={e => setTravaux(prev => ({ ...prev, [t.key]: e.target.checked }))}
                style={{ width: 16, height: 16, accentColor: "#059669" }}
              />
              <span style={{ fontSize: 13 }}>{t.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: "rgba(248,250,252,0.8)" }}>{t.label}</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#059669" }}>{fmt(t.cout)}</span>
          </label>
        ))}
      </div>

      {/* Total + DPE cible */}
      {coutTravaux > 0 && (
        <div style={{
          background: "linear-gradient(135deg, #064E3B, #059669)",
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
  const [zone, setZone]       = useState("B1");
  const [nbPersonnes, setNb]  = useState(2);
  const [revenus, setRevenus] = useState(45000); // revenu fiscal n-2
  const [prixAchat, setPrix]  = useState(250000);
  const [neuf, setNeuf]       = useState(true);

  const result = useMemo(() => {
    const plafond = PTZ_ZONES[zone]?.plafonds[Math.min(nbPersonnes - 1, 7)] ?? 0;
    const eligible = revenus <= plafond;
    const quotite = QUOTITE_PTZ[zone] ?? 0;
    const montantPTZ = eligible ? Math.round(prixAchat * quotite) : 0;
    const maxPTZ = {
      "A bis": 150000, "A": 150000, "B1": 110000, "B2": 88000, "C": 50000,
    }[zone] ?? 0;
    const ptzFinal = Math.min(montantPTZ, maxPTZ);
    const creditComplementaire = prixAchat - ptzFinal;
    return { eligible, plafond, quotite, montantPTZ: ptzFinal, creditComplementaire };
  }, [zone, nbPersonnes, revenus, prixAchat, neuf]);

  return (
    <div>
      <SectionBadge icon="🏦" label="Calculateur PTZ" color="#7C3AED" bg="#F5F3FF" />
      <h2 style={{ fontSize: 18, fontWeight: 800, color: "#F8FAFC", marginBottom: 6 }}>Prêt à Taux Zéro 2026</h2>
      <p style={{ fontSize: 13, color: "rgba(248,250,252,0.5)", marginBottom: 20, lineHeight: 1.6 }}>
        Le PTZ finance jusqu'à 50% de votre achat sans intérêts. Vérifiez votre éligibilité.
      </p>

      <SelectInput
        label="Zone géographique"
        value={zone}
        onChange={setZone}
        options={Object.entries(PTZ_ZONES).map(([v, d]) => ({ v, l: d.label }))}
      />

      <SliderInput label="Nombre de personnes dans le foyer" help="Détermine les plafonds de revenus PTZ. Plus le foyer est grand, plus les plafonds sont élevés — vous pouvez donc avoir des revenus plus importants tout en restant éligible." value={nbPersonnes} onChange={setNb}
        min={1} max={8} step={1} format={v => `${v} personne${v > 1 ? "s" : ""}`} color="#7C3AED" />

      <SliderInput label="Revenu fiscal de référence (N-2)" help="Revenu net imposable de l'année N-2 (ligne 1BJ de votre avis d'imposition). C'est sur cette base que l'éligibilité PTZ est vérifiée." value={revenus} onChange={setRevenus}
        min={10000} max={200000} step={1000} color="#7C3AED" />

      <SliderInput label="Prix d'achat du bien" help="Coût total de l'opération = prix FAI + frais de notaire + travaux. C'est sur cette base que le PTZ est calculé (selon les plafonds de coût d'opération par zone)." value={prixAchat} onChange={setPrix}
        min={50000} max={800000} step={5000} color="#7C3AED" />

      {/* Plafond de revenus */}
      <div style={{
        background: "rgba(124,58,237,0.12)", borderRadius: 12, padding: "12px 14px", marginBottom: 20,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div style={{ fontSize: 12, color: "#7C3AED", fontWeight: 600 }}>Plafond de revenus zone {zone}</div>
          <div style={{ fontSize: 11, color: "rgba(248,250,252,0.4)" }}>Pour {nbPersonnes} personne{nbPersonnes > 1 ? "s" : ""}</div>
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#7C3AED" }}>{fmt(result.plafond)}</div>
      </div>

      {/* Résultat */}
      {result.eligible ? (
        <div style={{
          background: "linear-gradient(135deg, #4C1D95, #7C3AED)",
          borderRadius: 16, padding: "20px", color: "white",
        }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>✅ Vous êtes éligible au PTZ !</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
            <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>Montant PTZ</div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{fmt(result.montantPTZ)}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>{(result.quotite * 100).toFixed(0)}% du prix</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>Crédit classique restant</div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{fmt(result.creditComplementaire)}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>À taux de marché</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 12, background: "rgba(255,255,255,0.08)", borderRadius: 10, padding: "8px 12px" }}>
            💡 Le PTZ est remboursé en différé (pas de remboursement pendant les premières années selon revenus).
          </div>
        </div>
      ) : (
        <div style={{
          background: "rgba(239,68,68,0.15)", border: "1px solid #FECACA",
          borderRadius: 14, padding: "16px", textAlign: "center",
        }}>
          <div style={{ fontSize: 20, marginBottom: 8 }}>❌</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#DC2626", marginBottom: 4 }}>Non éligible au PTZ</div>
          <div style={{ fontSize: 12, color: "rgba(248,250,252,0.4)" }}>
            Vos revenus ({fmt(revenus)}) dépassent le plafond de {fmt(result.plafond)} pour votre zone et composition de foyer.
          </div>
        </div>
      )}
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
  const dvfPrixM2 = dvfData ? dvfData.prixMoyen : null;
  const ecart = dvfPrixM2 ? Math.round(((prixM2 - dvfPrixM2) / dvfPrixM2) * 100) : null;
  const negocPossible = ecart !== null && ecart > 3;

  const fetchDVF = async () => {
    if (!codePostal || codePostal.length < 5) return;
    setLoading(true);
    setError(null);
    try {
      const url = `https://api.cquest.org/dvf?code_postal=${codePostal}&nature_mutation=Vente&type_local=Appartement&rows=20`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error("API DVF indisponible");
      const json = await resp.json();
      const mutations = json.features ?? [];
      const valid = mutations.filter(f => {
        const p = f.properties;
        return p.surface_reelle_bati > 20 && p.valeur_fonciere > 0;
      });
      if (valid.length === 0) throw new Error("Pas de données pour ce code postal");
      const prixM2List = valid.map(f => f.properties.valeur_fonciere / f.properties.surface_reelle_bati);
      const prixMoyen = Math.round(prixM2List.reduce((a, b) => a + b, 0) / prixM2List.length);
      const prixMin   = Math.round(Math.min(...prixM2List));
      const prixMax   = Math.round(Math.max(...prixM2List));
      const recent    = valid.slice(0, 5).map(f => ({
        date: f.properties.date_mutation?.slice(0, 7) ?? "—",
        surface: Math.round(f.properties.surface_reelle_bati),
        prix: Math.round(f.properties.valeur_fonciere),
        prixM2: Math.round(f.properties.valeur_fonciere / f.properties.surface_reelle_bati),
      }));
      setDvfData({ prixMoyen, prixMin, prixMax, nbTransactions: valid.length, recent });
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
      <SectionBadge icon="📍" label="DVF & Négociation" color="#DC2626" bg="#FEF2F2" />
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
            <KPIBox label="Prix moyen" value={`${dvfData.prixMoyen} €/m²`} sub={`${dvfData.nbTransactions} ventes`} color="#DC2626" bg="#FEF2F2" help={LEXIQUE_RP["DVF"]} />
            <KPIBox label="Prix min" value={`${dvfData.prixMin} €/m²`} sub="Marché" color="#64748B" bg="rgba(255,255,255,0.06)" help="Prix le plus bas constaté parmi les ventes DVF dans ce code postal. Peut correspondre à un logement atypique ou dégradé." />
            <KPIBox label="Prix max" value={`${dvfData.prixMax} €/m²`} sub="Marché" color="#64748B" bg="rgba(255,255,255,0.06)" help="Prix le plus élevé constaté. Peut correspondre à un bien d'exception, refait à neuf ou très bien situé." />
          </div>
          {/* Transactions récentes */}
          <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(248,250,252,0.8)", marginBottom: 8 }}>Dernières transactions</div>
            {dvfData.recent.map((t, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "6px 0", borderBottom: i < dvfData.recent.length - 1 ? "1px solid #E2E8F0" : "none",
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
        <KPIBox label="Prix affiché /m²" value={`${prixM2} €/m²`} sub="Bien analysé" color="#DC2626" bg="#FEF2F2" />
        {dvfPrixM2 ? (
          <KPIBox
            label={ecart !== null && ecart > 3 ? `Surcote +${ecart}%` : "Prix du marché"}
            value={`${dvfPrixM2} €/m²`}
            sub="Données DVF"
            color={ecart !== null && ecart > 3 ? "#DC2626" : "#059669"}
            bg={ecart !== null && ecart > 3 ? "#FEF2F2" : "#ECFDF5"}
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

const POIDS_COLOR = { Critique: "#DC2626", Important: "#F59E0B", Mineur: "#059669" };
const POIDS_BG    = { Critique: "#FEF2F2", Important: "#FFFBEB", Mineur: "#ECFDF5" };

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
      <SectionBadge icon="✅" label="Checklist de visite" color="#7C3AED" bg="#F5F3FF" />
      <h2 style={{ fontSize: 18, fontWeight: 800, color: "#F8FAFC", marginBottom: 6 }}>Ne rien oublier lors de la visite</h2>
      <p style={{ fontSize: 13, color: "rgba(248,250,252,0.5)", marginBottom: 16, lineHeight: 1.6 }}>
        Vérifiez chaque point pendant votre visite. Les points critiques sont à examiner en priorité.
      </p>

      {/* Progression */}
      <div style={{
        background: "rgba(124,58,237,0.12)", borderRadius: 14, padding: "14px 16px", marginBottom: 20,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#7C3AED" }}>{done}/{total} points vérifiés</div>
          <div style={{ fontSize: 11, color: "rgba(248,250,252,0.4)" }}>{critiquesOk}/{critiquesTotal} points critiques</div>
        </div>
        <div style={{ width: 60, height: 60, position: "relative" }}>
          <svg viewBox="0 0 36 36" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#7C3AED" strokeWidth="3"
              strokeDasharray={`${(done / total) * 100} 100`} strokeLinecap="round" />
          </svg>
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 800, color: "#7C3AED",
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
                  background: checked[item.id] ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.05)",
                  border: `1.5px solid ${checked[item.id] ? "rgba(196,181,253,0.6)" : "rgba(255,255,255,0.1)"}`,
                  transition: "all 0.15s",
                }}>
                  <input type="checkbox" checked={!!checked[item.id]} onChange={() => toggle(item.id)}
                    style={{ width: 18, height: 18, accentColor: "#7C3AED", flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 500, color: checked[item.id] ? "#94A3B8" : "#334155",
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
                        color: notes[item.id] ? "#7C3AED" : "#94A3B8",
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
                      border: "1.5px solid #C4B5FD", fontSize: 12, resize: "vertical",
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
  { id: "louer",   label: "Louer vs Acheter",  icon: "🏠", color: "#A78BFA", bg: "rgba(124,58,237,0.12)" },
  { id: "dpe",     label: "DPE & Travaux",      icon: "🌿", color: "#059669", bg: "#ECFDF5" },
  { id: "ptz",     label: "PTZ",                icon: "🏦", color: "#7C3AED", bg: "#F5F3FF" },
  { id: "dvf",     label: "Négociation DVF",    icon: "📍", color: "#DC2626", bg: "#FEF2F2" },
  { id: "visite",  label: "Checklist Visite",   icon: "✅", color: "#7C3AED", bg: "#F5F3FF" },
];

/* ════════════════════════════════════════
   LEAD CAPTURE MODAL — RP
════════════════════════════════════════ */
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
      try { localStorage.setItem("immopilote_email", email); } catch (_) {}
    } catch (_) { /* silencieux */ }
    setLoading(false);
    setSent(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: "rgba(7,7,26,0.85)", backdropFilter: "blur(6px)" }}>
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl"
        style={{ background: "#12122A", border: "1px solid rgba(124,58,237,0.3)" }}>
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
                  J'accepte de recevoir mon analyse et des communications d'ImmoPilote.
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
    <div className="min-h-screen" style={{ background: "#07071A" }}>
      {/* ── HEADER ── */}
      <header style={{
        background: "linear-gradient(135deg, #064E3B 0%, #059669 100%)",
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
                  background: activeTool === t.id ? "rgba(124,58,237,0.7)" : "rgba(255,255,255,0.1)",
                  color: activeTool === t.id ? "#059669" : "rgba(255,255,255,0.85)",
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
        <Card>
          {activeTool === "louer"  && <LoueurVsAcheteur />}
          {activeTool === "dpe"    && <AnalyseurDPE />}
          {activeTool === "ptz"    && <CalculateurPTZ />}
          {activeTool === "dvf"    && <AssistantNegociation />}
          {activeTool === "visite" && <ChecklistVisite />}
        </Card>

        {/* CTA Lead Capture RP */}
        <div style={{
          marginTop: 16, borderRadius: 20, overflow: "hidden",
          background: "linear-gradient(135deg, #064E3B 0%, #059669 60%, #0891b2 100%)",
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
                width: "100%", background: "white", color: "#059669",
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

        {/* Lien vers cycle LMNP */}
        <div
          onClick={() => router.push("/lmnp")}
          style={{
            marginTop: 12, padding: "16px", borderRadius: 16,
            background: "linear-gradient(135deg, #0F172A, #1e3a5f)",
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
          ⚠️ <strong style={{ color:"rgba(255,255,255,0.5)" }}>Avertissement :</strong> Les simulations ImmoPilote sont fournies à titre purement indicatif et ne constituent pas un conseil fiscal, juridique ou financier. Consultez un notaire ou un conseiller avant toute décision d'achat.{" "}
          <a href="/mentions-legales" style={{ color:"rgba(167,139,250,0.7)", textDecoration:"underline" }}>Mentions légales</a>
        </div>
      </div>

      </main>

      {/* Modal lead capture */}
      {showLead && <LeadModalRP onClose={() => setShowLead(false)} />}
    </div>
  );
}
