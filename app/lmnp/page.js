"use client";
import dynamic from "next/dynamic";
import { Component } from "react";

// Recharts + Turbopack ont un bug TDZ (Cannot access 'P' before initialization)
// lors du prérendu SSR. On désactive le SSR pour toute la page LMNP.
const LmnpClient = dynamic(() => import("./LmnpClient"), {
  ssr: false,
  loading: () => (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#94a3b8", fontSize: 14 }}>Chargement du simulateur…</div>
    </div>
  ),
});

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, fontFamily: "system-ui, sans-serif" }}>
          <div style={{ maxWidth: 480, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>
              Le simulateur n&apos;a pas pu se charger
            </h1>
            <p style={{ color: "#64748b", fontSize: 14, marginBottom: 16 }}>
              {this.state.error?.message ?? "Erreur inconnue"}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{ background: "#f97316", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
            >
              Réessayer
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function LmnpPage() {
  return (
    <ErrorBoundary>
      <LmnpClient />
    </ErrorBoundary>
  );
}
