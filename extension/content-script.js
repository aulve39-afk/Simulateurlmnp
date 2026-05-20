/**
 * @file content-script.js
 * ImmoVerdict — Extension Chrome MV3 · v1.0.0
 *
 * Détecte le prix, la surface et la localisation sur les annonces immobilières
 * de Leboncoin, SeLoger et Bien'ici, puis injecte un bouton orange pour
 * pré-remplir le simulateur LMNP ImmoVerdict.
 *
 * Architecture :
 *  1. Détection du site via hostname
 *  2. Détection de la page annonce via pathname
 *  3. Extraction des données par sélecteurs CSS cascade + regex fallback
 *  4. Injection du bouton (une seule fois, via marker)
 *  5. MutationObserver pour SPA navigation (React/Vue hydration)
 */

(function () {
  "use strict";

  // ─── Constantes ─────────────────────────────────────────────────────────────

  const BASE_URL     = "https://www.immoverdict.com/lmnp";
  const MARKER_ATTR  = "data-immoverdict-injected";
  const BUTTON_ID    = "immoverdict-btn";

  // ─── Détection du site ───────────────────────────────────────────────────────

  const host = location.hostname.replace(/^www\./, "");

  /** @type {"leboncoin"|"seloger"|"bienici"|null} */
  const SITE = host.includes("leboncoin.fr")  ? "leboncoin"
             : host.includes("seloger.com")   ? "seloger"
             : host.includes("bienici.com")   ? "bienici"
             : null;

  if (!SITE) return;

  // ─── Configs par site ────────────────────────────────────────────────────────

  /**
   * @typedef {Object} SiteConfig
   * @property {() => boolean}     isAdPage       True si on est sur une page annonce
   * @property {string[]}          prixSelectors  Sélecteurs CSS cascade pour le prix
   * @property {string[]}          surfaceSelectors
   * @property {string[]}          villeSelectors
   * @property {() => Element|null} anchorEl      Élément DOM où ancrer le bouton
   */

  /** @type {Record<string, SiteConfig>} */
  const CONFIGS = {

    // ── Leboncoin ──────────────────────────────────────────────────────────────
    leboncoin: {
      isAdPage: () => /\/ad\//.test(location.pathname),

      prixSelectors: [
        // Sélecteurs stables (data-qa-id)
        '[data-qa-id="adview_price"] [aria-label]',
        '[data-qa-id="adview_price"] span',
        // Fallback classe dynamique
        'span[class*="priceLabel"]',
        'span[class*="Price"]',
        'p[class*="price"]',
      ],

      surfaceSelectors: [
        // Critères structurés
        '[data-qa-id="criteria_item_square"] strong',
        '[data-qa-id="criteria_item_square"] p',
        // Labels aria
        '[aria-label*="Surface"] strong',
        '[aria-label*="surface"] strong',
        // Fallback générique
        'p[aria-label*="m²"] strong',
        'li[class*="square"] strong',
      ],

      villeSelectors: [
        '[data-qa-id="adview_location_informations"] [title]',
        '[data-qa-id="adview_location_informations"] p',
        '[data-qa-id="adview_location_informations"] span',
        'span[class*="location"]',
        'p[class*="location"]',
      ],

      anchorEl: () => {
        return (
          document.querySelector('[data-qa-id="adview_price"]') ||
          document.querySelector('p[class*="priceLabel"]')?.closest("div") ||
          document.querySelector('span[class*="Price"]')?.closest("div")
        );
      },
    },

    // ── SeLoger ───────────────────────────────────────────────────────────────
    seloger: {
      isAdPage: () => /\/annonce\/|\/bien-|\/vente-/.test(location.pathname),

      prixSelectors: [
        // data-test stables
        '[data-test="price"]',
        // Composants TagPrice
        '[class*="TagPrice"] [class*="value"]',
        '[class*="TagPrice"]',
        // Fallback
        'span[class*="Price"]',
        'p[class*="price"]',
        'h2[class*="price"]',
      ],

      surfaceSelectors: [
        '[data-test="surface"]',
        '[class*="TagDetail"][class*="surface"]',
        '[class*="surface"] span',
        '[class*="Surface"] span',
        // Dans la liste des caractéristiques
        'li[class*="criteria"]:has([class*="surface"]) strong',
        'li[class*="criteria"]:has([class*="surface"]) span',
      ],

      villeSelectors: [
        '[data-test="localisation"]',
        '[data-test="city"]',
        '[class*="localisation"] h1',
        '[class*="Localisation"] h1',
        'h1[class*="title"]',
        'h2[class*="title"]',
        // Breadcrumb
        '[class*="breadcrumb"] [class*="city"]',
      ],

      anchorEl: () => {
        return (
          document.querySelector('[data-test="price"]')?.closest('[class*="TagPrice"]') ||
          document.querySelector('[data-test="price"]')?.parentElement ||
          document.querySelector('[class*="TagPrice"]')
        );
      },
    },

    // ── Bien'ici ──────────────────────────────────────────────────────────────
    bienici: {
      isAdPage: () => /\/annonce-/.test(location.pathname),

      prixSelectors: [
        // Classes CSS stables
        '.price-label',
        '[class*="mainPrice"]',
        '[class*="price"] p',
        '[class*="Price"] p',
        'p[class*="price"]',
        'span[class*="price"]',
      ],

      surfaceSelectors: [
        // Liste de features
        'li[class*="surface"]',
        'li[aria-label*="Surface"]',
        '[class*="featureItem"]:has(abbr[title="mètre carré"])',
        '[class*="featureItem"]:has(abbr[title*="m²"])',
        // Fallback : span contenant "m²"
        'ul[class*="feature"] li:nth-child(2) span',
        '.detailFeatures li:nth-child(2)',
      ],

      villeSelectors: [
        // Breadcrumb / titre localisation
        'h1[class*="title"]',
        '[class*="listingTitle"] h1',
        '[class*="listingLocation"]',
        '.listing-location',
        '[class*="location"] h1',
        'h2[class*="localisation"]',
      ],

      anchorEl: () => {
        return (
          document.querySelector('.price-label')?.parentElement ||
          document.querySelector('[class*="mainPrice"]')?.parentElement ||
          document.querySelector('[class*="price"]')
        );
      },
    },
  };

  const CFG = CONFIGS[SITE];

  // ─── Utilitaires d'extraction ────────────────────────────────────────────────

  /**
   * Essaie chaque sélecteur CSS dans l'ordre et retourne le texte du premier match.
   * @param {string[]} selectors
   * @returns {string|null}
   */
  function trySelectors(selectors) {
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el) {
          const text = (el.getAttribute("aria-label") || el.textContent || "").trim();
          if (text) return text;
        }
      } catch {
        // Sélecteur :has() non supporté — on continue
      }
    }
    return null;
  }

  /**
   * Cherche un pattern regex dans l'ensemble du texte visible de la page.
   * Utilisé en ultime fallback si les sélecteurs CSS échouent.
   * @param {RegExp} pattern
   * @param {Element} [root=document.body]
   * @returns {string|null}
   */
  function regexFallback(pattern, root) {
    const walker = document.createTreeWalker(
      root || document.body,
      NodeFilter.SHOW_TEXT,
      null
    );
    let node;
    while ((node = walker.nextNode())) {
      const text = node.textContent.trim();
      if (!text || text.length > 200) continue; // ignore blocs trop longs
      const match = text.match(pattern);
      if (match) return match[1] || match[0];
    }
    return null;
  }

  // ─── Nettoyage des valeurs ────────────────────────────────────────────────────

  /**
   * Extrait un nombre entier d'une chaîne (supprime €, espaces insécables, etc.)
   * Ex: "250 000 €" → 250000  |  "1 250 000 €" → 1250000
   * @param {string} raw
   * @returns {number|null}
   */
  function cleanPrix(raw) {
    if (!raw) return null;
    const cleaned = raw
      .replace(/\s/g, "")    // espaces normaux et insécables ( )
      .replace(/[^\d]/g, ""); // garde uniquement les chiffres
    const n = parseInt(cleaned, 10);
    return isNaN(n) || n < 10000 || n > 50000000 ? null : n;
  }

  /**
   * Extrait la surface en m² (accepte virgule décimale).
   * Ex: "64,5 m²" → 65  |  "28 m²" → 28
   * @param {string} raw
   * @returns {number|null}
   */
  function cleanSurface(raw) {
    if (!raw) return null;
    const match = raw.match(/(\d+[\.,]?\d*)\s*m/i);
    if (!match) return null;
    const n = parseFloat(match[1].replace(",", "."));
    return isNaN(n) || n < 5 || n > 2000 ? null : Math.round(n);
  }

  /**
   * Extrait la ville / code postal.
   * Retourne la chaîne nettoyée (sans la surface, le prix, etc.).
   * Ex: "Appartement 3 pièces à Lyon (69006)" → "Lyon (69006)"
   * @param {string} raw
   * @returns {string}
   */
  function cleanVille(raw) {
    if (!raw) return "";
    return raw
      .replace(/appartement|maison|studio|loft|local|bureau|terrain/gi, "")
      .replace(/\d+\s*pièce[s]?/gi, "")
      .replace(/\d+[\.,]?\d*\s*m²?/gi, "")
      .replace(/^\W+|\W+$/g, "")  // trim non-alphanumériques
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80); // limite la longueur de l'URL
  }

  // ─── Extraction des données ───────────────────────────────────────────────────

  /**
   * @typedef {Object} AnnonceData
   * @property {number|null} prix
   * @property {number|null} surface
   * @property {string}      ville
   */

  /** @returns {AnnonceData} */
  function extractData() {
    // ── Prix ──
    let prixRaw = trySelectors(CFG.prixSelectors);
    if (!prixRaw) {
      prixRaw = regexFallback(/(\d[\d\s ]{4,})\s*€/);
    }
    const prix = cleanPrix(prixRaw);

    // ── Surface ──
    let surfRaw = trySelectors(CFG.surfaceSelectors);
    if (!surfRaw) {
      surfRaw = regexFallback(/(\d+[\.,]?\d*)\s*m²/i);
    }
    const surface = cleanSurface(surfRaw);

    // ── Ville ──
    let villeRaw = trySelectors(CFG.villeSelectors);
    if (!villeRaw) {
      villeRaw = regexFallback(/\b(\d{5})\b/); // code postal comme dernier resort
    }
    const ville = cleanVille(villeRaw || "");

    return { prix, surface, ville };
  }

  // ─── Construction de l'URL ImmoVerdict ───────────────────────────────────────

  /** @param {AnnonceData} data */
  function buildURL({ prix, surface, ville }) {
    const params = new URLSearchParams();
    if (prix)    params.set("prix",    String(prix));
    if (surface) params.set("surface", String(surface));
    if (ville)   params.set("adresse", ville);
    params.set("source", "extension");
    params.set("step",   "1"); // ouvre directement le formulaire
    return `${BASE_URL}?${params.toString()}`;
  }

  // ─── Création du bouton ───────────────────────────────────────────────────────

  /**
   * Crée et retourne le bouton DOM ImmoVerdict.
   * @param {AnnonceData} data
   */
  function createButton(data) {
    const btn = document.createElement("a");
    btn.id          = BUTTON_ID;
    btn.href        = buildURL(data);
    btn.target      = "_blank";
    btn.rel         = "noopener noreferrer";

    // Libellé contextuel
    const parts = [];
    if (data.prix)    parts.push(data.prix.toLocaleString("fr-FR") + " €");
    if (data.surface) parts.push(data.surface + " m²");
    const info = parts.length > 0 ? ` · ${parts.join(" — ")}` : "";
    btn.setAttribute("aria-label", `Simuler ce bien sur ImmoVerdict${info}`);

    // ── Styles inline (aucune dépendance externe) ──────────────────────────────
    Object.assign(btn.style, {
      display:        "inline-flex",
      alignItems:     "center",
      gap:            "8px",
      background:     "linear-gradient(135deg, #f97316, #EA580C)",
      color:          "#ffffff",
      fontFamily:     "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      fontSize:       "14px",
      fontWeight:     "700",
      lineHeight:     "1",
      textDecoration: "none",
      padding:        "10px 16px",
      borderRadius:   "10px",
      border:         "none",
      cursor:         "pointer",
      boxShadow:      "0 2px 8px rgba(234,88,12,0.35)",
      margin:         "8px 0",
      whiteSpace:     "nowrap",
      transition:     "opacity 0.15s, transform 0.1s",
      zIndex:         "2147483647",
    });

    // Icône balance SVG inline
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("width",  "16");
    icon.setAttribute("height", "16");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("fill",    "none");
    icon.setAttribute("stroke",  "currentColor");
    icon.setAttribute("stroke-width", "2.5");
    icon.setAttribute("stroke-linecap", "round");
    icon.setAttribute("stroke-linejoin", "round");
    icon.innerHTML = `
      <line x1="12" y1="3" x2="12" y2="21"/>
      <path d="M5 10l7-7 7 7"/>
      <path d="M3 17h6a3 3 0 0 0 0-6H3l3 6z"/>
      <path d="M21 17h-6a3 3 0 0 1 0-6h6l-3 6z"/>
    `;

    const label = document.createElement("span");
    label.textContent = "Simuler sur ImmoVerdict";

    btn.appendChild(icon);
    btn.appendChild(label);

    // Hover
    btn.addEventListener("mouseenter", () => {
      btn.style.opacity   = "0.90";
      btn.style.transform = "scale(1.02)";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.opacity   = "1";
      btn.style.transform = "scale(1)";
    });

    return btn;
  }

  // ─── Injection dans le DOM ────────────────────────────────────────────────────

  /**
   * Injecte le bouton si la page est une annonce et que les données minimales
   * sont extraites. Idempotent (vérifie le marker).
   */
  function tryInject() {
    // Vérification page annonce
    if (!CFG.isAdPage()) return;

    // Déjà injecté ?
    if (document.getElementById(BUTTON_ID)) return;

    // Extraction
    const data = extractData();

    // On requiert au minimum le prix (la surface et ville sont optionnelles)
    if (!data.prix) return;

    // Trouver le point d'ancrage
    const anchor = CFG.anchorEl();
    if (!anchor) return;

    // Injection
    const btn = createButton(data);
    anchor.setAttribute(MARKER_ATTR, "1");

    // Insère après l'élément ancre (ou à la fin si pas de sibling)
    if (anchor.nextSibling) {
      anchor.parentNode.insertBefore(btn, anchor.nextSibling);
    } else {
      anchor.parentNode.appendChild(btn);
    }
  }

  // ─── MutationObserver (SPA / hydration asynchrone) ───────────────────────────

  let injectTimeout = null;

  /**
   * Debounce l'injection pour ne pas spammer lors des mutations en cascade.
   */
  function scheduleInject() {
    clearTimeout(injectTimeout);
    injectTimeout = setTimeout(tryInject, 600);
  }

  const observer = new MutationObserver((mutations) => {
    // Ignore les mutations qui n'ajoutent pas de nœuds
    const hasAddedNodes = mutations.some(m => m.addedNodes.length > 0);
    if (!hasAddedNodes) return;

    // Si le bouton a disparu (navigation SPA), relancer
    const btnGone = !document.getElementById(BUTTON_ID);
    if (btnGone) scheduleInject();
  });

  observer.observe(document.body, {
    childList: true,
    subtree:   true,
  });

  // Tentative initiale (page déjà chargée au moment de l'injection du script)
  scheduleInject();

})();
