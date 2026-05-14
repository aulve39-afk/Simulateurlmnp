"use client";
/**
 * LmnpCharts.js — Composants recharts isolés dans un chunk séparé.
 * Chargé via next/dynamic({ ssr:false }) depuis LmnpClient.js pour éviter
 * le TDZ Turbopack sur les imports ESM de recharts.
 */
import {
  BarChart, Bar, AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";

const fmt  = (n) => new Intl.NumberFormat("fr-FR", { style:"currency", currency:"EUR", maximumFractionDigits:0 }).format(n ?? 0);
const fmtK = (n) => Math.abs(n??0) >= 1000 ? `${((n??0)/1000).toFixed(1)}k€` : fmt(n);

/* ── Graphique Micro-BIC vs Réel ── */
export function MicroVsReelChart({ data }) {
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

/* ── Cash-flow chart 10 ans ── */
export function CashflowChart({ rows }) {
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
export function BouclierFiscalChart({ rows }) {
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
export function PatrimoineChart({ rows, form }) {
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

/* ── Achat vs Épargne financière ── */
export function AchatVsEpargneChart({ rows, form }) {
  const revalo  = (form.revalorisation || 1.5) / 100;
  const apport  = form.apport || 0;
  let breakEven = null;

  const data = rows.map(r => {
    const valeurBien      = Math.round(form.prix * Math.pow(1 + revalo, r.an));
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
            L&apos;achat LMNP dépasse l&apos;épargne à partir de <strong>l&apos;an {breakEven}</strong>
          </p>
        </div>
      ) : (
        <div className="mb-3 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2">
          <p className="text-xs text-amber-700">L&apos;achat ne dépasse pas l&apos;épargne sur la période. Ajustez loyer ou apport.</p>
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
