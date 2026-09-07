"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginEmployePortalAction } from "@/app/actions";
import { UserCheck, KeyRound, AlertCircle, ArrowRight, Shield } from "lucide-react";

export default function EmployePortalLoginPage() {
  const router = useRouter();
  const [identifiant, setIdentifiant] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifiant.trim() || !pin.trim()) {
      setErrorMsg("Veuillez renseigner votre identifiant et votre code PIN.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const res = await loginEmployePortalAction(identifiant, pin);
      if (res.success) {
        router.push("/espace-employe");
        router.refresh();
      } else {
        setErrorMsg(res.error || "Identifiants invalides.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Erreur de connexion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-foreground">
      <div className="w-full max-w-md space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 text-primary border border-primary/30 shadow-lg shadow-primary/10 mb-2">
            <UserCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Portail Collaborateur RH
          </h1>
          <p className="text-sm text-slate-400">
            Consultez vos bulletins de paie, attestations, congés et notes de frais en toute autonomie.
          </p>
        </div>

        {/* Login Card */}
        <div className="p-7 rounded-3xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl shadow-2xl space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Matricule ou N° CIN
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="ex: EMP-001 ou BK123456"
                  value={identifiant}
                  onChange={(e) => setIdentifiant(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all placeholder:text-slate-500"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  Code PIN personnel (4 chiffres)
                </label>
                <span className="text-[11px] text-slate-400">Défaut: 1234</span>
              </div>
              <div className="relative">
                <input
                  type="password"
                  maxLength={8}
                  placeholder="••••"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all placeholder:text-slate-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-md hover:opacity-95 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                "Vérification..."
              ) : (
                <>
                  <span>Accéder à mon espace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-3 border-t border-slate-800 text-center">
            <div className="inline-flex items-center gap-1.5 text-xs text-slate-400">
              <Shield className="w-3.5 h-3.5 text-primary" />
              <span>Accès sécurisé pour le personnel de l'entreprise</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
