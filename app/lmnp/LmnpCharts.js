"use client";
/**
 * LmnpCharts.js — Graphiques en SVG pur (zéro dépendance externe).
 * Remplace recharts pour éviter le TDZ Turbopack sur les modules ESM circulaires.
 */

const fmt  = (n) => new Intl.NumberFormat("fr-FR", { style:"currency", currency:"EUR", maximumFractionDigits:0 }).format(n ?? 0);
const fmtK = (n) => Math.abs(n ?? 0) >= 1000 ? `${((n ?? 0) / 1000).toFixed(1)}k€` : fmt(n);

/* ── helpers SVG ─────────────────────────────────────────────────────────── */
const W = 340, PAD_L = 48, PAD_R = 8, PAD_T = 8, PAD_B = 28;

function scaleY(val, minV, maxV, height) {
  if (maxV === minV) return height / 2;
  return PAD_T + ((maxV - val) / (maxV - minV)) * (height - PAD_T - PAD_B);
}

function YAxis({ minV, maxV, height, ticks = 4 }) {
  const step = (maxV - minV) / ticks;
  return Array.from({ length: ticks + 1 }, (_, i) => {
    const val = minV + i * step;
    const y   = scaleY(val, minV, maxV, height);
    return (
      <g key={i}>
        <line x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} stroke="#F1F5F9" strokeWidth={1} />
        <text x={PAD_L - 4} y={y + 3.5} textAnchor="end" fontSize={9} fill="#94A3B8">{fmtK(val)}</text>
      </g>
    );
  });
}

function XLabels({ labels, height }) {
  const n    = labels.length;
  const step = (W - PAD_L - PAD_R) / n;
  return labels.map((lbl, i) => (
    <text key={i} x={PAD_L + (i + 0.5) * step} y={height - 4}
      textAnchor="middle" fontSize={9} fill="#94A3B8">{lbl}</text>
  ));
}

/* ── 1. MicroVsReelChart ─────────────────────────────────────────────────── */
export function MicroVsReelChart({ data }) {
  const H       = 200;
  const n       = data.length;
  const allVals = data.flatMap(d => [d["Micro-BIC"], d["Régime Réel"]]);
  const maxV    = Math.max(...allVals, 1);
  const areaW   = W - PAD_L - PAD_R;
  const grpW    = areaW / n;
  const barW    = grpW * 0.35;
  const totalEco = data.reduce((s, d) => s + (d["Économie"] || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-slate-600">Impôt annuel comparé</p>
        <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">
          Économie 10 ans : {fmt(totalEco)}
        </span>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow:"visible" }}>
        <YAxis minV={0} maxV={maxV} height={H} />
        <XLabels labels={data.map(d => d.an)} height={H} />
        {data.map((d, i) => {
          const x   = PAD_L + i * grpW;
          const yM  = scaleY(d["Micro-BIC"],   0, maxV, H);
          const yR  = scaleY(d["Régime Réel"],  0, maxV, H);
          const bot = scaleY(0, 0, maxV, H);
          return (
            <g key={i}>
              <rect x={x + grpW * 0.08} y={yM} width={barW} height={Math.max(1, bot - yM)} fill="#FBBF24" rx={2} />
              <rect x={x + grpW * 0.08 + barW + 2} y={yR} width={barW} height={Math.max(1, bot - yR)} fill="#F97316" rx={2} />
            </g>
          );
        })}
      </svg>
      <div className="flex items-center justify-center gap-4 mt-1">
        <span className="flex items-center gap-1 text-[10px] text-slate-500"><span className="inline-block w-3 h-2 rounded-sm bg-yellow-400" /> Micro-BIC</span>
        <span className="flex items-center gap-1 text-[10px] text-slate-500"><span className="inline-block w-3 h-2 rounded-sm bg-orange-500" /> Régime Réel</span>
      </div>
    </div>
  );
}

/* ── 2. CashflowChart ────────────────────────────────────────────────────── */
export function CashflowChart({ rows }) {
  const H    = 180;
  const data = rows.slice(0, 10).map(r => ({ an: `A${r.an}`, v: r.cashflow }));
  const vals = data.map(d => d.v);
  const minV = Math.min(...vals, 0);
  const maxV = Math.max(...vals, 1);
  const n    = data.length;
  const step = (W - PAD_L - PAD_R) / (n - 1 || 1);

  const pts = data.map((d, i) => [PAD_L + i * step, scaleY(d.v, minV, maxV, H)]);
  const y0  = scaleY(0, minV, maxV, H);
  const area = `M ${pts[0][0]},${y0} ` + pts.map(([x, y]) => `L ${x},${y}`).join(" ") + ` L ${pts[pts.length-1][0]},${y0} Z`;
  const line = `M ` + pts.map(([x, y]) => `${x},${y}`).join(" L ");

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow:"visible" }}>
      <defs>
        <linearGradient id="cfG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%"  stopColor="#F97316" stopOpacity={0.15} />
          <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
        </linearGradient>
      </defs>
      <YAxis minV={minV} maxV={maxV} height={H} />
      <XLabels labels={data.map(d => d.an)} height={H} />
      <path d={area} fill="url(#cfG)" />
      <path d={line} fill="none" stroke="#F97316" strokeWidth={2} />
      <line x1={PAD_L} x2={W - PAD_R} y1={y0} y2={y0} stroke="#E2E8F0" strokeWidth={1.5} />
      {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={3} fill="#F97316" />)}
    </svg>
  );
}

/* ── 3. BouclierFiscalChart ──────────────────────────────────────────────── */
export function BouclierFiscalChart({ rows }) {
  const H              = 190;
  const finBouclierIdx = rows.findIndex(r => r.impot > 200);
  const finBouclier    = finBouclierIdx >= 0 ? rows[finBouclierIdx].an : null;
  const impotApres     = finBouclier ? rows.slice(finBouclierIdx).reduce((s, r) => s + r.impot, 0) : 0;
  const data = rows.map(r => ({
    an:      `A${r.an}`,
    shield:  r.impot <= 200 ? Math.max(0, r.loyers - r.charges) : 0,
    impot:   r.impot > 200  ? r.impot : 0,
  }));
  const maxV  = Math.max(...data.map(d => d.shield + d.impot), 1);
  const n     = data.length;
  const areaW = W - PAD_L - PAD_R;
  const barW  = Math.max(4, areaW / n * 0.7);
  const bot   = scaleY(0, 0, maxV, H);

  return (
    <div>
      {finBouclier ? (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 mb-3">
          <p className="text-xs font-bold text-amber-800">⏰ Fin du bouclier fiscal : Année {finBouclier}</p>
          <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
            À partir de l&apos;année {finBouclier}, les amortissements s&apos;épuisent et l&apos;impôt redevient exigible.
            Montant total sur la période restante : <strong>{fmt(impotApres)}</strong>.
          </p>
        </div>
      ) : (
        <div className="rounded-xl bg-green-50 border border-green-100 p-3 mb-3">
          <p className="text-xs font-bold text-green-700">🛡️ Bouclier fiscal actif sur toute la période</p>
          <p className="text-[11px] text-green-600 mt-0.5">Impôt = 0 € chaque année sur votre horizon de détention.</p>
        </div>
      )}
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow:"visible" }}>
        <YAxis minV={0} maxV={maxV} height={H} />
        <XLabels labels={data.map(d => d.an)} height={H} />
        {data.map((d, i) => {
          const x       = PAD_L + (i + 0.5) * (areaW / n) - barW / 2;
          const yShield = scaleY(d.shield + d.impot, 0, maxV, H);
          const yImpot  = scaleY(d.impot, 0, maxV, H);
          return (
            <g key={i}>
              {d.shield > 0 && <rect x={x} y={yShield} width={barW} height={Math.max(1, bot - yShield)} fill="#10B981" rx={2} />}
              {d.impot  > 0 && <rect x={x} y={yImpot}  width={barW} height={Math.max(1, bot - yImpot)}  fill="#EF4444" rx={2} />}
            </g>
          );
        })}
        {finBouclier && (() => {
          const xLine = PAD_L + (finBouclierIdx + 0.5) * (areaW / n);
          return <line x1={xLine} x2={xLine} y1={PAD_T} y2={bot} stroke="#F59E0B" strokeWidth={2} strokeDasharray="5 3" />;
        })()}
      </svg>
      <div className="flex items-center justify-center gap-4 mt-1.5">
        <span className="flex items-center gap-1 text-[10px] text-slate-500"><span className="inline-block w-3 h-2 rounded-sm bg-green-500" /> Bouclier actif</span>
        <span className="flex items-center gap-1 text-[10px] text-slate-500"><span className="inline-block w-3 h-2 rounded-sm bg-red-400" /> Impôt dû</span>
      </div>
    </div>
  );
}

/* ── 4. PatrimoineChart ──────────────────────────────────────────────────── */
export function PatrimoineChart({ rows, form }) {
  const H      = 200;
  const revalo = (form.revalorisation || 1.5) / 100;
  const data   = rows.map(r => {
    const valeurBien    = Math.round(form.prix * Math.pow(1 + revalo, r.an));
    const detteRestante = Math.max(0, Math.round(r.capRestant || 0));
    const patrimoineNet = Math.max(0, valeurBien - detteRestante);
    return { an: `A${r.an}`, valeurBien, detteRestante, patrimoineNet };
  });

  const last      = data[data.length - 1] || {};
  const plusvalue = (last.valeurBien || 0) - form.prix;
  const pvColor   = plusvalue >= 0 ? "#10B981" : "#EF4444";
  const allVals   = data.flatMap(d => [d.valeurBien, d.detteRestante, d.patrimoineNet]);
  const maxV      = Math.max(...allVals, 1);
  const n         = data.length;
  const step      = (W - PAD_L - PAD_R) / (n - 1 || 1);

  const pts  = (key) => data.map((d, i) => [PAD_L + i * step, scaleY(d[key], 0, maxV, H)]);
  const pNet = pts("patrimoineNet");
  const pVal = pts("valeurBien");
  const pDet = pts("detteRestante");

  const areaPath = `M ${pNet[0][0]},${scaleY(0, 0, maxV, H)} ` + pNet.map(([x, y]) => `L ${x},${y}`).join(" ") + ` L ${pNet[pNet.length-1][0]},${scaleY(0, 0, maxV, H)} Z`;
  const linePath = (pts) => `M ` + pts.map(([x, y]) => `${x},${y}`).join(" L ");

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
          <p className="text-[9px]" style={{ color: pvColor }}>
            {plusvalue >= 0 ? "+" : ""}{fmtK(plusvalue)} plus-value
          </p>
        </div>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow:"visible" }}>
        <defs>
          <linearGradient id="gpat" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#10B981" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#10B981" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <YAxis minV={0} maxV={maxV} height={H} />
        <XLabels labels={data.map(d => d.an)} height={H} />
        <path d={areaPath} fill="url(#gpat)" />
        <path d={linePath(pNet)} fill="none" stroke="#10B981" strokeWidth={2} />
        <path d={linePath(pVal)} fill="none" stroke="#F97316" strokeWidth={2} strokeDasharray="5 3" />
        <path d={linePath(pDet)} fill="none" stroke="#EF4444" strokeWidth={2} strokeDasharray="3 2" />
      </svg>
      <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
        <span className="flex items-center gap-1 text-[10px] text-slate-500"><span className="inline-block w-3 h-2 rounded-sm bg-emerald-500" /> Patrimoine net</span>
        <span className="flex items-center gap-1.5 text-[10px] text-slate-500"><span className="inline-block w-5 border-t-2 border-dashed border-orange-500" /> Valeur du bien</span>
        <span className="flex items-center gap-1.5 text-[10px] text-slate-500"><span className="inline-block w-5 border-t-2 border-dashed border-red-400" /> Dette restante</span>
      </div>
    </div>
  );
}

/* ── 5. AchatVsEpargneChart ──────────────────────────────────────────────── */
export function AchatVsEpargneChart({ rows, form }) {
  const H      = 210;
  const revalo = (form.revalorisation || 1.5) / 100;
  const apport = form.apport || 0;
  let breakEven = null;

  const data = rows.map(r => {
    const valeurBien       = Math.round(form.prix * Math.pow(1 + revalo, r.an));
    const patrimoineAchat  = Math.max(0, valeurBien - Math.max(0, r.capRestant || 0)) + (r.cumCashflow || 0);
    const patrimoineEpargne = Math.round(apport * Math.pow(1.04, r.an));
    if (breakEven === null && patrimoineAchat > patrimoineEpargne) breakEven = r.an;
    return { an: `A${r.an}`, achat: patrimoineAchat, epargne: patrimoineEpargne };
  });

  const allVals = data.flatMap(d => [d.achat, d.epargne]);
  const maxV    = Math.max(...allVals, 1);
  const n       = data.length;
  const step    = (W - PAD_L - PAD_R) / (n - 1 || 1);
  const pts     = (key) => data.map((d, i) => [PAD_L + i * step, scaleY(d[key], 0, maxV, H)]);
  const linePath = (pts) => `M ` + pts.map(([x, y]) => `${x},${y}`).join(" L ");

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
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow:"visible" }}>
        <YAxis minV={0} maxV={maxV} height={H} />
        <XLabels labels={data.map(d => d.an)} height={H} />
        <path d={linePath(pts("achat"))}   fill="none" stroke="#F97316" strokeWidth={2.5} />
        <path d={linePath(pts("epargne"))} fill="none" stroke="#F59E0B" strokeWidth={2} strokeDasharray="5 5" />
        {breakEven && (() => {
          const idx  = data.findIndex(d => d.an === `A${breakEven}`);
          const xLine = PAD_L + idx * step;
          return <line x1={xLine} x2={xLine} y1={PAD_T} y2={scaleY(0, 0, maxV, H)} stroke="#10B981" strokeWidth={1.5} strokeDasharray="4 4" />;
        })()}
      </svg>
      <div className="flex items-center justify-center gap-4 mt-1">
        <span className="flex items-center gap-1 text-[10px] text-slate-500"><span className="inline-block w-4 border-t-2 border-solid border-orange-500" /> Patrimoine LMNP</span>
        <span className="flex items-center gap-1 text-[10px] text-slate-500"><span className="inline-block w-4 border-t-2 border-dashed border-yellow-500" /> Apport placé 4%/an</span>
      </div>
      <p className="text-[9px] text-slate-400 text-center mt-1">
        Hypothèses : revalorisation bien {form.revalorisation || 1.5}%/an · Épargne 4%/an net · Apport {fmt(apport)}
      </p>
    </div>
  );
}
