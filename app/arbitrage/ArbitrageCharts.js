"use client";

/**
 * @file ArbitrageCharts.js
 * Graphiques SVG pour le simulateur d'arbitrage fiscal LMNP.
 * Suit exactement les conventions de LmnpCharts.js (pur SVG, pas de lib externe).
 */

// ─── Constantes layout ────────────────────────────────────────────────────────

const W      = 340;
const PAD_L  = 52;
const PAD_R  = 12;
const PAD_T  = 12;
const PAD_B  = 30;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Formate un nombre en k€ ou € selon l'amplitude */
function fmtK(v) {
  if (Math.abs(v) >= 1000) return `${Math.round(v / 1000)}k€`;
  return `${Math.round(v)}€`;
}

/** Formate un entier avec espace comme séparateur milliers */
function fmtFR(v) {
  return Math.round(v).toLocaleString("fr-FR");
}

/**
 * Convertit une valeur en coordonnée Y dans la zone de dessin.
 */
function scaleY(val, minV, maxV, height) {
  if (maxV === minV) return (height - PAD_T - PAD_B) / 2 + PAD_T;
  return PAD_T + ((maxV - val) / (maxV - minV)) * (height - PAD_T - PAD_B);
}

/**
 * Axe Y avec graduations automatiques.
 */
function YAxis({ minV, maxV, height, ticks = 4, color = "#94a3b8" }) {
  const step  = (maxV - minV) / ticks;
  const items = Array.from({ length: ticks + 1 }, (_, i) => minV + i * step);
  return (
    <g>
      {items.map((v, i) => {
        const y = scaleY(v, minV, maxV, height);
        return (
          <g key={i}>
            <line x1={PAD_L} x2={W - PAD_R} y1={y} y2={y}
              stroke={color} strokeWidth="0.5" strokeDasharray="3,3" opacity="0.4" />
            <text x={PAD_L - 4} y={y + 4} textAnchor="end"
              fontSize="9" fill={color}>
              {fmtK(v)}
            </text>
          </g>
        );
      })}
      {/* ligne zéro si plage mixte */}
      {minV < 0 && maxV > 0 && (
        <line
          x1={PAD_L} x2={W - PAD_R}
          y1={scaleY(0, minV, maxV, height)}
          y2={scaleY(0, minV, maxV, height)}
          stroke="#64748b" strokeWidth="1" opacity="0.6"
        />
      )}
    </g>
  );
}

/**
 * Labels X sous le graphique.
 */
function XLabels({ labels, height, color = "#94a3b8" }) {
  const n    = labels.length;
  const xW   = W - PAD_L - PAD_R;
  // Affiche un label sur ~6 points max
  const every = Math.max(1, Math.ceil(n / 6));
  return (
    <g>
      {labels.map((lbl, i) => {
        if (i % every !== 0 && i !== n - 1) return null;
        const x = PAD_L + (n > 1 ? (i / (n - 1)) * xW : xW / 2);
        return (
          <text key={i} x={x} y={height - 4} textAnchor="middle"
            fontSize="9" fill={color}>
            {lbl}
          </text>
        );
      })}
    </g>
  );
}

// ─── Chart 1 : Timeline — Bouclier & Impôt ───────────────────────────────────

/**
 * Graphique principal : évolution de l'impôt, des amortissements et du cash-flow.
 * Barres groupées : amortTotal (bleu) | impôt (rouge) + ligne cashflow (vert).
 *
 * @param {{ rows: import("../lib/calcul-arbitrage").ArbitrageYearData[], finBouclier: number|null }} props
 */
export function ArbitrageTimelineChart({ rows, finBouclier }) {
  if (!rows || rows.length === 0) return null;

  const H = 220;

  // On affiche amortTotal et impôt en barres, cashflowNet en ligne
  const amorts    = rows.map(r => r.amortTotal);
  const impots    = rows.map(r => r.impot);
  const cashflows = rows.map(r => r.cashflowNet);

  const maxBar = Math.max(...amorts, ...impots, 1);
  const minCF  = Math.min(...cashflows, 0);
  const maxCF  = Math.max(...cashflows, 1);

  // Plage Y commune : barres entre 0 et maxBar, cashflow peut être négatif
  const minV = Math.min(0, minCF, -maxBar * 0.05);
  const maxV = Math.max(maxBar, maxCF) * 1.1;

  const n  = rows.length;
  const xW = W - PAD_L - PAD_R;

  // Largeur d'une paire de barres
  const barSlot  = xW / n;
  const barW     = Math.min((barSlot * 0.35), 10);
  const barGap   = 2;

  // Polyline cashflow
  const cfPoints = rows.map((r, i) => {
    const x = PAD_L + (i + 0.5) * barSlot;
    const y = scaleY(r.cashflowNet, minV, maxV, H);
    return `${x},${y}`;
  }).join(" ");

  const labels = rows.map(r => `A${r.yr}`);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
      aria-label="Évolution impôt et amortissements par année">
      <YAxis minV={minV} maxV={maxV} height={H} ticks={5} />
      <XLabels labels={labels} height={H} />

      {/* Zone bouclier actif */}
      {rows.map((r, i) => {
        if (!r.bouclierActif) return null;
        const x = PAD_L + i * barSlot;
        return (
          <rect key={i} x={x} y={PAD_T}
            width={barSlot} height={H - PAD_T - PAD_B}
            fill="#3b82f6" opacity="0.06" />
        );
      })}

      {/* Ligne de fin de bouclier */}
      {finBouclier && finBouclier <= n && (() => {
        const idx = finBouclier - 1;
        const x   = PAD_L + idx * barSlot;
        return (
          <g>
            <line x1={x} x2={x} y1={PAD_T} y2={H - PAD_B}
              stroke="#f97316" strokeWidth="1.5" strokeDasharray="4,3" opacity="0.8" />
            <text x={x + 3} y={PAD_T + 10} fontSize="8" fill="#f97316">
              Fin bouclier
            </text>
          </g>
        );
      })()}

      {/* Barres amortissements (bleu) */}
      {rows.map((r, i) => {
        const x = PAD_L + i * barSlot + barSlot * 0.15;
        const y0 = scaleY(0, minV, maxV, H);
        const y1 = scaleY(r.amortTotal, minV, maxV, H);
        return (
          <rect key={i} x={x} y={Math.min(y0, y1)} width={barW}
            height={Math.abs(y0 - y1)}
            fill="#3b82f6" opacity="0.75" rx="1" />
        );
      })}

      {/* Barres impôt (orange/rouge) */}
      {rows.map((r, i) => {
        if (r.impot < 1) return null;
        const x = PAD_L + i * barSlot + barSlot * 0.15 + barW + barGap;
        const y0 = scaleY(0, minV, maxV, H);
        const y1 = scaleY(r.impot, minV, maxV, H);
        return (
          <rect key={i} x={x} y={Math.min(y0, y1)} width={barW}
            height={Math.abs(y0 - y1)}
            fill="#ef4444" opacity="0.8" rx="1" />
        );
      })}

      {/* Ligne cash-flow net */}
      <polyline points={cfPoints}
        fill="none" stroke="#22c55e" strokeWidth="1.8" strokeLinejoin="round" />
      {rows.map((r, i) => {
        const x = PAD_L + (i + 0.5) * barSlot;
        const y = scaleY(r.cashflowNet, minV, maxV, H);
        return <circle key={i} cx={x} cy={y} r="2.5" fill="#22c55e" />;
      })}

      {/* Légende */}
      <g transform={`translate(${PAD_L}, ${H - 2})`}>
        <rect width="8" height="8" y="-8" fill="#3b82f6" opacity="0.75" rx="1" />
        <text x="10" y="-1" fontSize="8" fill="#94a3b8">Amortissements</text>
        <rect x="80" width="8" height="8" y="-8" fill="#ef4444" opacity="0.8" rx="1" />
        <text x="90" y="-1" fontSize="8" fill="#94a3b8">Impôt</text>
        <line x1="140" x2="156" y1="-4" y2="-4" stroke="#22c55e" strokeWidth="1.8" />
        <circle cx="148" cy="-4" r="2" fill="#22c55e" />
        <text x="158" y="-1" fontSize="8" fill="#94a3b8">Cash-flow</text>
      </g>
    </svg>
  );
}

// ─── Chart 2 : Décomposition du bouclier ─────────────────────────────────────

/**
 * Barres empilées : amortBien / amortMobilier / amortTravaux vs base imposable brute.
 * Montre visuellement l'effondrement des couches quand chaque composant expire.
 *
 * @param {{ rows: import("../lib/calcul-arbitrage").ArbitrageYearData[] }} props
 */
export function BouclierDecomposChart({ rows }) {
  if (!rows || rows.length === 0) return null;

  const H = 180;

  const maxV = Math.max(
    ...rows.map(r => Math.max(r.amortTotal, r.loyersNets - r.chargesAnnuelles - r.interets, 0)),
    1,
  ) * 1.15;

  const n      = rows.length;
  const xW     = W - PAD_L - PAD_R;
  const barSlot = xW / n;
  const barW    = Math.min(barSlot * 0.55, 16);

  const labels = rows.map(r => `A${r.yr}`);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
      aria-label="Décomposition des amortissements par couche">
      <YAxis minV={0} maxV={maxV} height={H} ticks={4} />
      <XLabels labels={labels} height={H} />

      {rows.map((r, i) => {
        const x  = PAD_L + i * barSlot + (barSlot - barW) / 2;

        // Barres empilées du bas vers le haut
        const layers = [
          { val: r.amortBien,     color: "#6366f1", label: "Bien" },
          { val: r.amortTravaux,  color: "#8b5cf6", label: "Travaux" },
          { val: r.amortMobilier, color: "#a78bfa", label: "Mobilier" },
        ];

        let cumul = 0;
        const rects = layers.map((l, li) => {
          if (l.val < 1) return null;
          const yBot = scaleY(cumul, 0, maxV, H);
          cumul += l.val;
          const yTop = scaleY(cumul, 0, maxV, H);
          return (
            <rect key={li} x={x} y={yTop} width={barW}
              height={Math.max(yBot - yTop, 0)}
              fill={l.color} opacity="0.85" rx="1" />
          );
        });

        // Ligne base imposable brute (loyers nets - charges - intérêts)
        const base = r.loyersNets - r.chargesAnnuelles - r.interets;
        const yBase = scaleY(Math.max(base, 0), 0, maxV, H);

        return (
          <g key={i}>
            {rects}
            {base > 0 && (
              <line
                x1={x} x2={x + barW}
                y1={yBase} y2={yBase}
                stroke="#f97316" strokeWidth="1.5" opacity="0.9"
              />
            )}
          </g>
        );
      })}

      {/* Légende */}
      <g transform={`translate(${PAD_L}, ${H - 2})`}>
        <rect width="8" height="8" y="-8" fill="#6366f1" rx="1" />
        <text x="10" y="-1" fontSize="8" fill="#94a3b8">Bien</text>
        <rect x="36" width="8" height="8" y="-8" fill="#8b5cf6" rx="1" />
        <text x="46" y="-1" fontSize="8" fill="#94a3b8">Travaux</text>
        <rect x="90" width="8" height="8" y="-8" fill="#a78bfa" rx="1" />
        <text x="100" y="-1" fontSize="8" fill="#94a3b8">Mobilier</text>
        <line x1="148" x2="164" y1="-4" y2="-4" stroke="#f97316" strokeWidth="1.5" />
        <text x="166" y="-1" fontSize="8" fill="#94a3b8">Base imposable</text>
      </g>
    </svg>
  );
}

// ─── Chart 3 : Revente optimale ───────────────────────────────────────────────

/**
 * Courbe du produit net de revente année par année.
 * Met en évidence l'année optimale.
 *
 * @param {{ rows: import("../lib/calcul-arbitrage").ArbitrageYearData[], anneeOptimale: number|null }} props
 */
export function ReventeOptimaleChart({ rows, anneeOptimale }) {
  if (!rows || rows.length === 0) return null;

  const H = 180;

  const produits = rows.map(r => r.produitNetRevente);
  const minV     = Math.min(...produits) * 0.95;
  const maxV     = Math.max(...produits) * 1.05;

  const n   = rows.length;
  const xW  = W - PAD_L - PAD_R;

  const points = rows.map((r, i) => {
    const x = PAD_L + (n > 1 ? (i / (n - 1)) * xW : xW / 2);
    const y = scaleY(r.produitNetRevente, minV, maxV, H);
    return { x, y, r };
  });

  const polylineStr = points.map(p => `${p.x},${p.y}`).join(" ");
  const labels = rows.map(r => `A${r.yr}`);

  // Aire sous la courbe (dégradé)
  const areaPath =
    `M${points[0].x},${scaleY(Math.max(minV, 0), minV, maxV, H)} ` +
    points.map(p => `L${p.x},${p.y}`).join(" ") +
    ` L${points[points.length - 1].x},${scaleY(Math.max(minV, 0), minV, maxV, H)} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
      aria-label="Produit net de revente par année">
      <defs>
        <linearGradient id="gradRevente" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      <YAxis minV={minV} maxV={maxV} height={H} ticks={4} />
      <XLabels labels={labels} height={H} />

      {/* Aire */}
      <path d={areaPath} fill="url(#gradRevente)" />

      {/* Courbe */}
      <polyline points={polylineStr}
        fill="none" stroke="#22c55e" strokeWidth="2" strokeLinejoin="round" />

      {/* Points */}
      {points.map((p, i) => {
        const isOptimal = rows[i].yr === anneeOptimale;
        return (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={isOptimal ? 5 : 2.5}
              fill={isOptimal ? "#22c55e" : "#16a34a"}
              stroke={isOptimal ? "#fff" : "none"}
              strokeWidth={isOptimal ? 1.5 : 0} />
            {isOptimal && (
              <>
                <text x={p.x} y={p.y - 10} textAnchor="middle"
                  fontSize="9" fill="#22c55e" fontWeight="600">
                  Optimal A{rows[i].yr}
                </text>
                <text x={p.x} y={p.y - 20} textAnchor="middle"
                  fontSize="8" fill="#4ade80">
                  {fmtFR(p.r.produitNetRevente)} €
                </text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}
