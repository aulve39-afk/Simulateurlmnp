"use client";
import { Component, useEffect, useState } from "react";

/* ── Capteur d'erreurs global (window.onerror + unhandledrejection) ─────────
   Attrape tout ce qui échappe à React. Affiche un bandeau rouge en haut.
── */
function GlobalErrorOverlay() {
  const [errs, setErrs] = useState([]);
  useEffect(() => {
    const push = (msg) => setErrs(p => [...p, msg].slice(-5));
    const onErr = (e) => push(`JS: ${e.message} (${e.filename?.split("/").pop()}:${e.lineno})`);
    const onRej = (e) => push(`Promise: ${e.reason?.message ?? String(e.reason)}`);
    window.addEventListener("error", onErr);
    window.addEventListener("unhandledrejection", onRej);
    return () => {
      window.removeEventListener("error", onErr);
      window.removeEventListener("unhandledrejection", onRej);
    };
  }, []);
  if (!errs.length) return null;
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 99999,
      background: "#dc2626", color: "#fff", padding: "12px 16px",
      fontFamily: "monospace", fontSize: 12, lineHeight: 1.6,
    }}>
      <strong>🐛 Erreur JavaScript — copiez ce texte :</strong>
      {errs.map((e, i) => <div key={i} style={{ marginTop: 4 }}>{e}</div>)}
    </div>
  );
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("[LMNP ErrorBoundary]", error, info?.componentStack);
  }
  render() {
    if (this.state.error) {
      const msg = this.state.error?.message ?? "Erreur inconnue";
      const stack = this.state.error?.stack ?? "";
      return (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, fontFamily: "system-ui, sans-serif", background: "#0f172a" }}>
          <div style={{ maxWidth: 600, width: "100%" }}>
            <div style={{ fontSize: 40, marginBottom: 12, textAlign: "center" }}>⚠️</div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", marginBottom: 8, textAlign: "center" }}>
              Le simulateur n&apos;a pas pu se charger
            </h1>
            <pre style={{ background: "#1e293b", color: "#fca5a5", padding: 16, borderRadius: 8, fontSize: 11, overflowX: "auto", marginBottom: 16, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
              {msg}{"\n\n"}{stack}
            </pre>
            <div style={{ textAlign: "center" }}>
              <button
                onClick={() => window.location.reload()}
                style={{ background: "#f97316", color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
              >
                Réessayer
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ── Chargement explicite via useEffect — évite toute la mécanique Suspense
   de next/dynamic qui peut masquer les erreurs.
   - Si l'import() échoue (chunk 404, erreur d'évaluation du module…)
     → on affiche l'erreur dans le bandeau rouge ET dans l'interface.
   - Si LmnpClient plante au rendu → ErrorBoundary l'attrape.
── */
function LmnpLoader() {
  const [Client, setClient] = useState(null);
  const [importError, setImportError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    import("./LmnpClient")
      .then((mod) => {
        if (!cancelled) setClient(() => mod.default);
      })
      .catch((err) => {
        console.error("[LMNP] import('./LmnpClient') failed:", err);
        if (!cancelled) setImportError(err);
      });
    return () => { cancelled = true; };
  }, []);

  if (importError) {
    const msg = importError?.message ?? String(importError);
    const stack = importError?.stack ?? "";
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, fontFamily: "system-ui, sans-serif", background: "#0f172a" }}>
        <div style={{ maxWidth: 600, width: "100%" }}>
          <div style={{ fontSize: 40, marginBottom: 12, textAlign: "center" }}>💥</div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", marginBottom: 8, textAlign: "center" }}>
            Échec du chargement du module
          </h1>
          <pre style={{ background: "#1e293b", color: "#fca5a5", padding: 16, borderRadius: 8, fontSize: 11, overflowX: "auto", marginBottom: 16, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
            {msg}{"\n\n"}{stack}
          </pre>
          <div style={{ textAlign: "center" }}>
            <button
              onClick={() => window.location.reload()}
              style={{ background: "#f97316", color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!Client) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#94a3b8", fontSize: 14 }}>Chargement du simulateur…</div>
      </div>
    );
  }

  return <Client />;
}

export default function LmnpPageClient() {
  return (
    <ErrorBoundary>
      <GlobalErrorOverlay />
      <LmnpLoader />
    </ErrorBoundary>
  );
}
