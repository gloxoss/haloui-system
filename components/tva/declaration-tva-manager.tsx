"use client";

import { useState } from "react";
import {
  type TVADeclarationRecord,
  type TVADeclarationStatut,
  type TVARegime,
} from "@/lib/types";
import {
  calculerDeclarationTVAAction,
  changerStatutDeclarationTVAAction,
  enregistrerDeclarationTVAAction,
} from "@/app/actions";
import {
  FileCheck2,
  Calendar,
  Building2,
  Printer,
  CheckCircle2,
  RefreshCw,
  Send,
  AlertCircle,
  Download,
  ShieldCheck,
  CreditCard,
  Percent,
  Check,
} from "lucide-react";

type Props = {
  initialCalcul: any;
  declarations: TVADeclarationRecord[];
  currentPeriode: string;
};

export function DeclarationTVAManager({
  initialCalcul,
  declarations: initialDeclarations,
  currentPeriode,
}: Props) {
  const [periode, setPeriode] = useState<string>(currentPeriode);
  const [regime, setRegime] = useState<TVARegime>("encaissement");
  const [calcul, setCalcul] = useState(initialCalcul);
  const [declarations, setDeclarations] = useState<TVADeclarationRecord[]>(initialDeclarations);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal Télédéclaration
  const [teledeclareModalId, setTeledeclareModalId] = useState<number | null>(null);
  const [refTelepaiement, setRefTelepaiement] = useState<string>("");

  const handleCalculer = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await calculerDeclarationTVAAction(periode, regime);
      if (res.success && res.calcul) {
        setCalcul(res.calcul);
        setMsg({ type: "success", text: "Données fiscales recalculées avec succès." });
      } else {
        setMsg({ type: "error", text: res.error || "Erreur de calcul." });
      }
    } catch (err: any) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleEnregistrer = async (statut: TVADeclarationStatut = "validee") => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await enregistrerDeclarationTVAAction({
        periodeCode: periode,
        regime,
        statut,
      });

      if (res.success && res.declaration) {
        // Update list
        setDeclarations([
          res.declaration,
          ...declarations.filter((d) => d.periode_code !== res.declaration.periode_code),
        ]);
        setMsg({
          type: "success",
          text: `Déclaration ${periode} enregistrée avec le statut "${statut}".`,
        });
      } else {
        setMsg({ type: "error", text: res.error || "Erreur d'enregistrement." });
      }
    } catch (err: any) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleChangerStatut = async (id: number, statut: TVADeclarationStatut, ref?: string) => {
    try {
      const res = await changerStatutDeclarationTVAAction(id, statut, ref);
      if (res.success && res.declaration) {
        setDeclarations(declarations.map((d) => (d.id === id ? res.declaration : d)));
        setTeledeclareModalId(null);
        setRefTelepaiement("");
        setMsg({ type: "success", text: "Statut fiscal mis à jour." });
      }
    } catch (err: any) {
      setMsg({ type: "error", text: err.message });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5">
            <FileCheck2 className="w-7 h-7 text-primary" />
            Déclaration de TVA (SIMPL-TVA Maroc)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Rapprochement automatisé TVA collectée vs déductible, ventilation par taux (20%, 14%, 10%, 7%) et état fiscal certifié.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border bg-card text-xs font-semibold hover:bg-muted transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer l'état DGI</span>
          </button>
        </div>
      </div>

      {/* Filter / Period Bar */}
      <div className="p-4 rounded-2xl border bg-card/60 backdrop-blur-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
              Période Fiscale
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="month"
                value={periode}
                onChange={(e) => setPeriode(e.target.value)}
                className="px-3 py-1.5 rounded-xl border bg-background text-xs font-semibold focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
              Régime d'Imposition
            </label>
            <select
              value={regime}
              onChange={(e) => setRegime(e.target.value as TVARegime)}
              className="px-3 py-1.5 rounded-xl border bg-background text-xs font-semibold focus:outline-none"
            >
              <option value="encaissement">Régime de l'Encaissement (Standard)</option>
              <option value="debit">Régime des Débits (Facturation)</option>
            </select>
          </div>

          <div className="self-end">
            <button
              onClick={handleCalculer}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>{loading ? "Calcul..." : "Recalculer la période"}</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEnregistrer("validee")}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-sm hover:opacity-95 transition-all"
          >
            {saving ? "Sauvegarde..." : "Valider la déclaration"}
          </button>
        </div>
      </div>

      {msg && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            msg.type === "success"
              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
              : "bg-rose-500/10 text-rose-600 border border-rose-500/20"
          }`}
        >
          {msg.type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Top 3 Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1 : TVA Collectée */}
        <div className="p-5 rounded-2xl border bg-card/60 backdrop-blur-sm space-y-3">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase">
            <span>1. Total TVA Collectée</span>
            <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">Ventes</span>
          </div>
          <div>
            <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
              {calcul.tva_collectee_total.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DH
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Sur factures clients & caisse</p>
          </div>
        </div>

        {/* Card 2 : TVA Déductible */}
        <div className="p-5 rounded-2xl border bg-card/60 backdrop-blur-sm space-y-3">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase">
            <span>2. Total TVA Déductible</span>
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">Achats</span>
          </div>
          <div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {(calcul.tva_deductible_total + calcul.credit_tva_precedent).toLocaleString("fr-FR", {
                minimumFractionDigits: 2,
              })}{" "}
              DH
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Achats ({calcul.tva_deductible_total.toFixed(2)} DH) + Crédit antérieur ({calcul.credit_tva_precedent.toFixed(2)} DH)
            </p>
          </div>
        </div>

        {/* Card 3 : TVA Nette Due ou Crédit à Reporter */}
        <div
          className={`p-5 rounded-2xl border shadow-sm space-y-3 ${
            calcul.tva_nette_due > 0
              ? "bg-rose-500/5 border-rose-500/20"
              : "bg-emerald-500/5 border-emerald-500/20"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase">
            <span className={calcul.tva_nette_due > 0 ? "text-rose-600" : "text-emerald-600"}>
              3. {calcul.tva_nette_due > 0 ? "TVA Nette Due (À Payer)" : "Crédit de TVA à Reporter"}
            </span>
            <span
              className={`p-1.5 rounded-lg text-xs font-bold ${
                calcul.tva_nette_due > 0 ? "bg-rose-500/10 text-rose-600" : "bg-emerald-500/10 text-emerald-600"
              }`}
            >
              DGI
            </span>
          </div>
          <div>
            <div
              className={`text-2xl font-black ${
                calcul.tva_nette_due > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {(calcul.tva_nette_due > 0 ? calcul.tva_nette_due : calcul.credit_tva_a_reporter).toLocaleString(
                "fr-FR",
                { minimumFractionDigits: 2 }
              )}{" "}
              DH
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {calcul.tva_nette_due > 0
                ? "Montant exigible à télérégler avant le 20 du mois suivant"
                : "Crédit reportable sur la prochaine déclaration"}
            </p>
          </div>
        </div>
      </div>

      {/* Official Moroccan Tax Breakdown (Cadre A & Cadre B) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CADRE A : TVA COLLECTÉE */}
        <div className="rounded-2xl border bg-card/60 backdrop-blur-sm p-5 space-y-4 shadow-sm">
          <div className="border-b pb-2 flex items-center justify-between">
            <h2 className="font-bold text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center text-xs font-extrabold">
                A
              </span>
              <span>Ventilation TVA Collectée (Ventes)</span>
            </h2>
          </div>

          <table className="w-full text-xs text-left">
            <thead className="bg-muted/40 text-muted-foreground font-semibold">
              <tr>
                <th className="py-2 px-3">Taux Légal</th>
                <th className="py-2 px-3">Nature des Ventes</th>
                <th className="py-2 px-3 text-right">TVA Collectée</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              <tr>
                <td className="py-2.5 px-3 font-bold">20%</td>
                <td className="py-2.5 px-3 text-muted-foreground">Taux normal (Marchandises, Prestations)</td>
                <td className="py-2.5 px-3 text-right font-semibold">{calcul.tva_collectee_20.toFixed(2)} DH</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold">14%</td>
                <td className="py-2.5 px-3 text-muted-foreground">Transport de marchandises, Énergie MT</td>
                <td className="py-2.5 px-3 text-right font-semibold">{calcul.tva_collectee_14.toFixed(2)} DH</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold">10%</td>
                <td className="py-2.5 px-3 text-muted-foreground">Restauration, Hôtellerie, Banque</td>
                <td className="py-2.5 px-3 text-right font-semibold">{calcul.tva_collectee_10.toFixed(2)} DH</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold">7%</td>
                <td className="py-2.5 px-3 text-muted-foreground">Eau, Électricité BT, Produits de base</td>
                <td className="py-2.5 px-3 text-right font-semibold">{calcul.tva_collectee_7.toFixed(2)} DH</td>
              </tr>
            </tbody>
            <tfoot className="border-t font-bold bg-muted/20">
              <tr>
                <td colSpan={2} className="py-2.5 px-3">TOTAL TVA COLLECTÉE :</td>
                <td className="py-2.5 px-3 text-right text-blue-600 dark:text-blue-400">
                  {calcul.tva_collectee_total.toFixed(2)} DH
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* CADRE B : TVA DÉDUCTIBLE */}
        <div className="rounded-2xl border bg-card/60 backdrop-blur-sm p-5 space-y-4 shadow-sm">
          <div className="border-b pb-2 flex items-center justify-between">
            <h2 className="font-bold text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center text-xs font-extrabold">
                B
              </span>
              <span>Ventilation TVA Déductible (Achats & Frais)</span>
            </h2>
          </div>

          <table className="w-full text-xs text-left">
            <thead className="bg-muted/40 text-muted-foreground font-semibold">
              <tr>
                <th className="py-2 px-3">Taux Légal</th>
                <th className="py-2 px-3">Nature des Charges</th>
                <th className="py-2 px-3 text-right">TVA Déductible</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              <tr>
                <td className="py-2.5 px-3 font-bold">20%</td>
                <td className="py-2.5 px-3 text-muted-foreground">Fournitures, Achats stock, Honoraires</td>
                <td className="py-2.5 px-3 text-right font-semibold">{calcul.tva_deductible_20.toFixed(2)} DH</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold">14%</td>
                <td className="py-2.5 px-3 text-muted-foreground">Fret, Carburant véhicules utilitaires</td>
                <td className="py-2.5 px-3 text-right font-semibold">{calcul.tva_deductible_14.toFixed(2)} DH</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold">10%</td>
                <td className="py-2.5 px-3 text-muted-foreground">Frais de déplacement / missions</td>
                <td className="py-2.5 px-3 text-right font-semibold">{calcul.tva_deductible_10.toFixed(2)} DH</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold">7%</td>
                <td className="py-2.5 px-3 text-muted-foreground">Factures d'eau & électricité locaux</td>
                <td className="py-2.5 px-3 text-right font-semibold">{calcul.tva_deductible_7.toFixed(2)} DH</td>
              </tr>
              <tr className="bg-amber-500/5 font-semibold">
                <td colSpan={2} className="py-2 px-3">Crédit de TVA de la période antérieure :</td>
                <td className="py-2 px-3 text-right">{calcul.credit_tva_precedent.toFixed(2)} DH</td>
              </tr>
            </tbody>
            <tfoot className="border-t font-bold bg-muted/20">
              <tr>
                <td colSpan={2} className="py-2.5 px-3">TOTAL DÉDUCTIONS FISCALES :</td>
                <td className="py-2.5 px-3 text-right text-amber-600 dark:text-amber-400">
                  {(calcul.tva_deductible_total + calcul.credit_tva_precedent).toFixed(2)} DH
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Past Declarations History Table */}
      <div className="rounded-2xl border bg-card/60 backdrop-blur-sm overflow-hidden shadow-sm space-y-2 p-5">
        <h3 className="font-bold text-sm flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          <span>Historique des Déclarations DGI Télédéclarées</span>
        </h3>

        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 font-semibold text-muted-foreground uppercase border-b">
              <tr>
                <th className="py-2.5 px-3">Période</th>
                <th className="py-2.5 px-3">Date déclaration</th>
                <th className="py-2.5 px-3 text-right">TVA Collectée</th>
                <th className="py-2.5 px-3 text-right">TVA Déductible</th>
                <th className="py-2.5 px-3 text-right">TVA Nette Due</th>
                <th className="py-2.5 px-3 text-right">Crédit Reporté</th>
                <th className="py-2.5 px-3 text-center">Statut</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {declarations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-muted-foreground">
                    Aucune déclaration archivée.
                  </td>
                </tr>
              ) : (
                declarations.map((d) => (
                  <tr key={d.id} className="hover:bg-muted/30">
                    <td className="py-2.5 px-3 font-bold text-primary">{d.periode_code}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{d.date_declaration || "-"}</td>
                    <td className="py-2.5 px-3 text-right font-medium">
                      {d.tva_collectee_total.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DH
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium">
                      {d.tva_deductible_total.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DH
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-rose-600">
                      {d.tva_nette_due > 0 ? `${d.tva_nette_due.toLocaleString("fr-FR")} DH` : "-"}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-600">
                      {d.credit_tva_a_reporter > 0 ? `${d.credit_tva_a_reporter.toLocaleString("fr-FR")} DH` : "-"}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {d.statut === "validee" && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-600">
                          Validée
                        </span>
                      )}
                      {d.statut === "teledeclaree" && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-600">
                          Télédéclarée (SIMPL)
                        </span>
                      )}
                      {d.statut === "payee" && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600">
                          Payée ✅
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {d.statut === "validee" && (
                          <button
                            onClick={() => {
                              setTeledeclareModalId(d.id);
                              setRefTelepaiement("");
                            }}
                            className="px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 text-[11px] font-semibold transition-colors"
                          >
                            Télédéclarer
                          </button>
                        )}
                        {d.statut === "teledeclaree" && (
                          <button
                            onClick={() => handleChangerStatut(d.id, "payee")}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 text-[11px] font-semibold transition-colors"
                          >
                            Marquer Payée
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Télédéclaration */}
      {teledeclareModalId !== null && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl border shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold flex items-center gap-2">
              <Send className="w-5 h-5 text-purple-600" />
              Confirmation Télédéclaration SIMPL-TVA
            </h3>
            <p className="text-xs text-muted-foreground">
              Saisissez la référence du récépissé électronique ou du mandat de télé-règlement fourni par le portail de la DGI :
            </p>
            <div>
              <label className="block text-xs font-semibold mb-1">N° Récépissé / Référence Télé-règlement</label>
              <input
                type="text"
                value={refTelepaiement}
                onChange={(e) => setRefTelepaiement(e.target.value)}
                placeholder="ex: DGI-TVA-2026-987654"
                className="w-full px-3 py-2 rounded-xl border bg-background text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTeledeclareModalId(null)}
                className="px-3 py-1.5 rounded-xl border text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => handleChangerStatut(teledeclareModalId, "teledeclaree", refTelepaiement)}
                className="px-4 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700"
              >
                Confirmer la télédéclaration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
