"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AuthModal({ onClose }) {
  const [email,   setEmail]   = useState("");
  const [sent,    setSent]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const handleMagicLink = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    if (!supabase) { setError("Service d'authentification non disponible."); return; }
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/mon-espace`,
      },
    });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setSent(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
         onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative">
        {/* Fermer */}
        <button onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-lg">✕</button>

        {/* En-tête */}
        <div className="text-center mb-5">
          <div className="text-3xl mb-2">🔐</div>
          <h2 className="text-lg font-bold text-slate-900">Accéder à mon espace</h2>
          <p className="text-sm text-slate-500 mt-1">
            Sauvegardez vos simulations et accédez-y depuis n&apos;importe quel appareil.
          </p>
        </div>

        {sent ? (
          <div className="text-center space-y-3">
            <div className="text-4xl">📬</div>
            <p className="font-semibold text-slate-900">Vérifiez votre boîte mail</p>
            <p className="text-sm text-slate-500">
              Un lien de connexion a été envoyé à <strong>{email}</strong>.<br />
              Cliquez dessus pour vous connecter automatiquement.
            </p>
            <button onClick={onClose}
              className="w-full mt-2 rounded-xl bg-orange-500 text-white py-2.5 text-sm font-semibold hover:bg-orange-600 transition-colors">
              Fermer
            </button>
          </div>
        ) : (
          <form onSubmit={handleMagicLink} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Adresse e-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                required
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            {error && (
              <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <button type="submit" disabled={loading}
              className="w-full rounded-xl bg-orange-500 text-white py-2.5 text-sm font-bold hover:bg-orange-600 disabled:opacity-50 transition-colors">
              {loading ? "Envoi…" : "Recevoir un lien de connexion ✉️"}
            </button>

            <p className="text-[10px] text-slate-400 text-center">
              Pas de mot de passe — connexion sécurisée par lien magique.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
