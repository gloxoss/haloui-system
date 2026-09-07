"use client";

import { useState } from "react";
import { type EmployePortalData } from "@/lib/employe-portal-auth";
import {
  logoutEmployePortalAction,
  soumettreDemandeCongePortalAction,
  soumettreNoteFraisPortalAction,
} from "@/app/actions";
import {
  type CongeType,
  type NoteFraisCategorie,
} from "@/lib/types";
import {
  User,
  LogOut,
  Calendar,
  FileText,
  CreditCard,
  Clock,
  Plus,
  CheckCircle2,
  AlertCircle,
  Download,
  Printer,
  ChevronRight,
  ShieldCheck,
  Building2,
  Award,
  Receipt,
  Car,
  DollarSign,
} from "lucide-react";

type Props = {
  data: EmployePortalData;
};

export function PortalEmployeDashboard({ data }: Props) {
  const { employe, bulletins, attestations, conges: initialConges, notesFrais: initialNotes, prets, pointagesRecents, soldeConges } = data;

  const [activeTab, setActiveTab] = useState<"paie" | "attestations" | "conges" | "notes_frais" | "pointages">("paie");

  // State local pour mises à jour dynamiques
  const [conges, setConges] = useState(initialConges);
  const [notesFrais, setNotesFrais] = useState(initialNotes);

  // Modal Congé
  const [isCongeModalOpen, setIsCongeModalOpen] = useState(false);
  const [congeType, setCongeType] = useState<CongeType>("conge_paye");
  const [congeDateDebut, setCongeDateDebut] = useState("");
  const [congeDateFin, setCongeDateFin] = useState("");
  const [congeNbJours, setCongeNbJours] = useState(1);
  const [congeMotif, setCongeMotif] = useState("");
  const [congeSubmitting, setCongeSubmitting] = useState(false);
  const [congeError, setCongeError] = useState("");

  // Modal Note de Frais
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteDate, setNoteDate] = useState(new Date().toISOString().slice(0, 10));
  const [noteCategorie, setNoteCategorie] = useState<NoteFraisCategorie>("deplacement");
  const [noteDescription, setNoteDescription] = useState("");
  const [noteMontantTtc, setNoteMontantTtc] = useState<number>(0);
  const [noteDistanceKm, setNoteDistanceKm] = useState<number>(0);
  const [noteVehicule, setNoteVehicule] = useState("");
  const [noteSubmitting, setNoteSubmitting] = useState(false);
  const [noteError, setNoteError] = useState("");

  // Auto calculate number of days between two dates
  const handleDateChange = (debut: string, fin: string) => {
    setCongeDateDebut(debut);
    setCongeDateFin(fin);
    if (debut && fin) {
      const d1 = new Date(debut);
      const d2 = new Date(fin);
      const diffTime = d2.getTime() - d1.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      if (diffDays > 0) {
        setCongeNbJours(diffDays);
      }
    }
  };

  const handleCongeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!congeDateDebut || !congeDateFin) {
      setCongeError("Veuillez sélectionner les dates de début et fin.");
      return;
    }

    setCongeSubmitting(true);
    setCongeError("");

    try {
      const res = await soumettreDemandeCongePortalAction({
        employeId: employe.id,
        typeConge: congeType,
        dateDebut: congeDateDebut,
        dateFin: congeDateFin,
        nbJours: congeNbJours,
        motif: congeMotif,
      });

      if (res.success && res.demande) {
        setConges([res.demande, ...conges]);
        setIsCongeModalOpen(false);
        setCongeMotif("");
      } else {
        setCongeError(res.error || "Erreur lors de la soumission.");
      }
    } catch (err: any) {
      setCongeError(err.message || "Erreur inattendue.");
    } finally {
      setCongeSubmitting(false);
    }
  };

  const handleNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteDescription.trim()) {
      setNoteError("Veuillez saisir un motif.");
      return;
    }

    setNoteSubmitting(true);
    setNoteError("");

    try {
      const montantFinal = noteCategorie === "frais_km" ? noteDistanceKm * 2.5 : noteMontantTtc;
      const res = await soumettreNoteFraisPortalAction({
        employeId: employe.id,
        dateDepense: noteDate,
        categorie: noteCategorie,
        description: noteDescription,
        montantTtc: montantFinal,
        distanceKm: noteDistanceKm,
        baremeKmUnitaire: 2.5,
        vehiculeImmatriculation: noteVehicule,
      });

      if (res.success && res.note) {
        setNotesFrais([res.note, ...notesFrais]);
        setIsNoteModalOpen(false);
        setNoteDescription("");
        setNoteMontantTtc(0);
        setNoteDistanceKm(0);
      } else {
        setNoteError(res.error || "Erreur lors du dépôt de la note.");
      }
    } catch (err: any) {
      setNoteError(err.message || "Erreur inattendue.");
    } finally {
      setNoteSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm leading-tight flex items-center gap-2">
                <span>Espace Collaborateur</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary">
                  Libre-Service
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {employe.nom} {employe.prenom} (Mat: {employe.numero_employe || employe.numero})
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => logoutEmployePortalAction()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-rose-600 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Profile Card & Highlights */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-80 h-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center font-extrabold text-2xl text-white">
                {employe.prenom[0]}
                {employe.nom[0]}
              </div>
              <div>
                <h1 className="text-xl font-bold">
                  {employe.prenom} {employe.nom}
                </h1>
                <p className="text-xs text-slate-300 mt-0.5 flex flex-wrap items-center gap-3">
                  <span>Matricule : <strong className="text-white">{employe.numero_employe || employe.numero}</strong></span>
                  <span>CIN : <strong className="text-white">{employe.cin || employe.cnss || "N/A"}</strong></span>
                  <span>Poste : <strong className="text-white">{employe.poste || "Salarié"}</strong></span>
                </p>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-[11px] text-slate-300 font-medium">Solde Congés Payés</div>
                <div className="text-xl font-extrabold text-emerald-400 mt-0.5">
                  {soldeConges.payesRestants} j.
                </div>
                <div className="text-[10px] text-slate-400">sur {soldeConges.payesAcquis} j. acquis</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-[11px] text-slate-300 font-medium">Dernière Paie Nette</div>
                <div className="text-xl font-extrabold text-teal-300 mt-0.5">
                  {bulletins[0] ? `${bulletins[0].salaire_net.toLocaleString("fr-FR")} DH` : "N/A"}
                </div>
                <div className="text-[10px] text-slate-400">{bulletins[0]?.periode_mois || "Aucun"}</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 col-span-2 sm:col-span-1">
                <div className="text-[11px] text-slate-300 font-medium">Notes de Frais</div>
                <div className="text-xl font-extrabold text-amber-300 mt-0.5">
                  {notesFrais.filter((n) => n.statut === "en_attente").length} en attente
                </div>
                <div className="text-[10px] text-slate-400">{notesFrais.length} total déposées</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-px">
          <button
            onClick={() => setActiveTab("paie")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-colors shrink-0 ${
              activeTab === "paie"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Bulletins de Paie ({bulletins.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("attestations")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-colors shrink-0 ${
              activeTab === "attestations"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Mes Attestations ({attestations.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("conges")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-colors shrink-0 ${
              activeTab === "conges"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Mes Congés & Absences ({conges.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("notes_frais")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-colors shrink-0 ${
              activeTab === "notes_frais"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Mes Notes de Frais ({notesFrais.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("pointages")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-colors shrink-0 ${
              activeTab === "pointages"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Pointages & Prêts</span>
          </button>
        </div>

        {/* TAB 1 : BULLETINS DE PAIE */}
        {activeTab === "paie" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                Historique de vos bulletins de paie
              </h2>
            </div>

            {bulletins.length === 0 ? (
              <div className="p-8 rounded-2xl border border-dashed text-center text-muted-foreground text-sm">
                Aucun bulletin de paie n'a encore été publié pour votre compte.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bulletins.map((b) => (
                  <div
                    key={b.id}
                    className="p-5 rounded-2xl border bg-card/70 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow space-y-4"
                  >
                    <div className="flex items-center justify-between border-b pb-3">
                      <div>
                        <div className="font-bold text-base">Mois {b.periode_mois}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          Réf : {b.numero_bulletin}
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        {b.statut === "paye" ? "Payé" : "Validé"}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2.5 rounded-xl bg-muted/40">
                        <div className="text-[11px] text-muted-foreground">Brut</div>
                        <div className="font-bold text-xs mt-0.5">
                          {b.salaire_brut.toFixed(2)} DH
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-muted/40">
                        <div className="text-[11px] text-muted-foreground">Retenues</div>
                        <div className="font-bold text-xs text-rose-500 mt-0.5">
                          -{b.total_retenues.toFixed(2)} DH
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                        <div className="text-[11px] font-semibold">Net à Payer</div>
                        <div className="font-extrabold text-sm mt-0.5">
                          {b.salaire_net.toFixed(2)} DH
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground space-y-1 pt-1">
                      <div className="flex justify-between">
                        <span>Heures normales / sup :</span>
                        <span className="font-medium text-foreground">
                          {b.heures_normales}h + {b.heures_sup}h sup
                        </span>
                      </div>
                      {b.retenue_prets_avances > 0 && (
                        <div className="flex justify-between text-amber-600">
                          <span>Retenue avance / prêt :</span>
                          <span className="font-medium">-{b.retenue_prets_avances.toFixed(2)} DH</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Date d'émission :</span>
                        <span className="font-medium text-foreground">{b.date_emission}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => window.print()}
                      className="w-full py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-xs transition-colors flex items-center justify-center gap-2"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Imprimer le bulletin de paie</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2 : MES ATTESTATIONS */}
        {activeTab === "attestations" && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
              Documents & Attestations RH délivrées
            </h2>

            {attestations.length === 0 ? (
              <div className="p-8 rounded-2xl border border-dashed text-center text-muted-foreground text-sm">
                Aucune attestation n'a encore été générée. Contactez votre service RH si nécessaire.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {attestations.map((att) => (
                  <div
                    key={att.id}
                    className="p-5 rounded-2xl border bg-card/70 backdrop-blur-sm shadow-sm flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-primary/10 text-primary">
                          {att.type.replace("_", " ")}
                        </span>
                        <span className="text-xs text-muted-foreground">{att.date_delivrance || att.date}</span>
                      </div>
                      <h3 className="font-bold text-sm mt-2">
                        Attestation officielle signée
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {att.notes || att.contenu_genere || "Certificat authentifié délivré par la direction."}
                      </p>
                    </div>

                    <button
                      onClick={() => window.print()}
                      className="w-full py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Consulter & Imprimer</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3 : CONGÉS & ABSENCES */}
        {activeTab === "conges" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold">Gestion des Congés</h2>
                <p className="text-xs text-muted-foreground">
                  Vos demandes de congés et solde légal en temps réel.
                </p>
              </div>
              <button
                onClick={() => setIsCongeModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow-sm hover:opacity-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Poser une demande de congé</span>
              </button>
            </div>

            {/* Solde Barometer */}
            <div className="p-4 rounded-2xl border bg-card/60 backdrop-blur-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs font-bold text-muted-foreground uppercase">
                  Droit aux congés payés annuel
                </div>
                <div className="text-sm">
                  Acquis : <strong>{soldeConges.payesAcquis} jours</strong> | Pris : <strong>{soldeConges.payesPris} jours</strong>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Solde restant</div>
                  <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                    {soldeConges.payesRestants} jours
                  </div>
                </div>
              </div>
            </div>

            {/* Conges List */}
            <div className="rounded-2xl border bg-card/60 backdrop-blur-sm overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase border-b">
                  <tr>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Période</th>
                    <th className="py-3 px-4">Jours</th>
                    <th className="py-3 px-4">Motif</th>
                    <th className="py-3 px-4 text-center">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {conges.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-muted-foreground text-xs">
                        Aucune demande de congé enregistrée.
                      </td>
                    </tr>
                  ) : (
                    conges.map((c) => (
                      <tr key={c.id} className="hover:bg-muted/30">
                        <td className="py-3 px-4 font-semibold text-xs">
                          {c.type_conge.replace("_", " ")}
                        </td>
                        <td className="py-3 px-4 text-xs">
                          Du {c.date_debut} au {c.date_fin}
                        </td>
                        <td className="py-3 px-4 font-bold text-xs">{c.nb_jours} j.</td>
                        <td className="py-3 px-4 text-xs text-muted-foreground max-w-xs truncate">
                          {c.motif || "-"}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {c.statut === "en_attente" && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600">
                              En attente validation
                            </span>
                          )}
                          {c.statut === "approuve" && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600">
                              Approuvé ✅
                            </span>
                          )}
                          {c.statut === "refuse" && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-600">
                              Refusé ❌
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4 : NOTES DE FRAIS */}
        {activeTab === "notes_frais" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold">Mes Notes de Frais & Dépenses</h2>
                <p className="text-xs text-muted-foreground">
                  Déposez vos frais de déplacement, repas ou barème kilométrique pour remboursement.
                </p>
              </div>
              <button
                onClick={() => setIsNoteModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow-sm hover:opacity-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Déposer une note de frais</span>
              </button>
            </div>

            <div className="rounded-2xl border bg-card/60 backdrop-blur-sm overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase border-b">
                  <tr>
                    <th className="py-3 px-4">Réf & Date</th>
                    <th className="py-3 px-4">Catégorie</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4 text-right">Montant</th>
                    <th className="py-3 px-4 text-center">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {notesFrais.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-muted-foreground text-xs">
                        Aucune note de frais déposée.
                      </td>
                    </tr>
                  ) : (
                    notesFrais.map((n) => (
                      <tr key={n.id} className="hover:bg-muted/30">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-xs text-primary">{n.numero}</div>
                          <div className="text-[11px] text-muted-foreground">{n.date_depense}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted">
                            {n.categorie}
                          </span>
                          {n.categorie === "frais_km" && (
                            <div className="text-[10px] text-muted-foreground">
                              {n.distance_km} km @ {n.bareme_km_unitaire} DH
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs font-normal">{n.description}</td>
                        <td className="py-3 px-4 text-right font-bold text-xs">
                          {n.montant_ttc.toFixed(2)} DH
                        </td>
                        <td className="py-3 px-4 text-center">
                          {n.statut === "en_attente" && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600">
                              En attente
                            </span>
                          )}
                          {n.statut === "approuve" && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-500/10 text-teal-600">
                              Validé (À rembourser)
                            </span>
                          )}
                          {n.statut === "rembourse" && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600">
                              Remboursé le {n.date_remboursement || "récent"}
                            </span>
                          )}
                          {n.statut === "refuse" && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-600">
                              Refusé
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5 : POINTAGES & PRÊTS */}
        {activeTab === "pointages" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recent Punches */}
            <div className="p-5 rounded-2xl border bg-card/60 backdrop-blur-sm space-y-4">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Derniers Pointages Présence
              </h3>
              {pointagesRecents.length === 0 ? (
                <div className="text-xs text-muted-foreground py-4 text-center">
                  Aucun pointage récent.
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {pointagesRecents.map((pt) => (
                    <div
                      key={pt.id}
                      className="p-2.5 rounded-xl border bg-background/50 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold">{pt.date_pointage}</div>
                        <div className="text-muted-foreground text-[11px]">
                          Arrivée : {pt.heure_arrivee} | Départ : {pt.heure_depart || "En cours"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{pt.total_heures}h</div>
                        {pt.heures_sup > 0 && (
                          <div className="text-[10px] text-amber-500 font-semibold">
                            +{pt.heures_sup}h sup
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Active Loans */}
            <div className="p-5 rounded-2xl border bg-card/60 backdrop-blur-sm space-y-4">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                Avances & Prêts Accordés
              </h3>
              {prets.length === 0 ? (
                <div className="text-xs text-muted-foreground py-4 text-center">
                  Aucun prêt ou avance en cours de remboursement.
                </div>
              ) : (
                <div className="space-y-3">
                  {prets.map((p) => (
                    <div key={p.id} className="p-3.5 rounded-xl border bg-background/50 space-y-2 text-xs">
                      <div className="flex justify-between font-bold">
                        <span>Prêt Personnel</span>
                        <span className="text-primary">{p.montant_total} DH</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full"
                          style={{
                            width: `${Math.min(100, (p.montant_rembourse / p.montant_total) * 100)}%`,
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>Remboursé : {p.montant_rembourse} DH</span>
                        <span>Solde restant : {p.solde_restant} DH</span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Mensualité : {p.montant_mensualite} DH/mois sur paie
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modal Poser Congé */}
      {isCongeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl border shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-base font-bold">Demande de Congé</h3>
              <button onClick={() => setIsCongeModalOpen(false)} className="text-xs font-semibold">✕</button>
            </div>

            {congeError && (
              <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs">
                {congeError}
              </div>
            )}

            <form onSubmit={handleCongeSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Type de congé *</label>
                <select
                  value={congeType}
                  onChange={(e) => setCongeType(e.target.value as CongeType)}
                  className="w-full p-2 rounded-xl border bg-background"
                >
                  <option value="conge_paye">Congé Payé Annuel (Solde: {soldeConges.payesRestants}j)</option>
                  <option value="conge_sans_solde">Congé Sans Solde</option>
                  <option value="maladie">Arrêt Maladie</option>
                  <option value="maternite">Maternité / Paternité</option>
                  <option value="evenement_familial">Événement Familial</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Date début *</label>
                  <input
                    type="date"
                    value={congeDateDebut}
                    onChange={(e) => handleDateChange(e.target.value, congeDateFin)}
                    className="w-full p-2 rounded-xl border bg-background"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Date fin *</label>
                  <input
                    type="date"
                    value={congeDateFin}
                    onChange={(e) => handleDateChange(congeDateDebut, e.target.value)}
                    className="w-full p-2 rounded-xl border bg-background"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Nombre de jours ouvrés *</label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={congeNbJours}
                  onChange={(e) => setCongeNbJours(Number(e.target.value))}
                  className="w-full p-2 rounded-xl border bg-background"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Motif / Justification</label>
                <textarea
                  rows={2}
                  value={congeMotif}
                  onChange={(e) => setCongeMotif(e.target.value)}
                  placeholder="ex: Vacances en famille"
                  className="w-full p-2 rounded-xl border bg-background"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsCongeModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl border"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={congeSubmitting}
                  className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground font-semibold"
                >
                  {congeSubmitting ? "Envoi..." : "Envoyer la demande"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Déposer Note de Frais */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl border shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-base font-bold">Déposer une Note de Frais</h3>
              <button onClick={() => setIsNoteModalOpen(false)} className="text-xs font-semibold">✕</button>
            </div>

            {noteError && (
              <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs">
                {noteError}
              </div>
            )}

            <form onSubmit={handleNoteSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Date dépense *</label>
                  <input
                    type="date"
                    value={noteDate}
                    onChange={(e) => setNoteDate(e.target.value)}
                    className="w-full p-2 rounded-xl border bg-background"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Catégorie *</label>
                  <select
                    value={noteCategorie}
                    onChange={(e) => setNoteCategorie(e.target.value as NoteFraisCategorie)}
                    className="w-full p-2 rounded-xl border bg-background"
                  >
                    <option value="deplacement">🚗 Déplacement</option>
                    <option value="repas">🍽️ Repas</option>
                    <option value="hotel">🏨 Hôtel</option>
                    <option value="frais_km">📍 Frais Km (2.5 DH/km)</option>
                    <option value="carburant">⛽ Carburant</option>
                    <option value="autre">📑 Autre</option>
                  </select>
                </div>
              </div>

              {noteCategorie === "frais_km" ? (
                <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 space-y-2">
                  <div className="font-semibold text-teal-700 dark:text-teal-300">
                    Barème officiel : 2.50 DH / km
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold mb-1">Distance (km) *</label>
                      <input
                        type="number"
                        value={noteDistanceKm || ""}
                        onChange={(e) => setNoteDistanceKm(Number(e.target.value))}
                        className="w-full p-2 rounded-xl border bg-background"
                        placeholder="ex: 120"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Immatriculation</label>
                      <input
                        type="text"
                        value={noteVehicule}
                        onChange={(e) => setNoteVehicule(e.target.value)}
                        className="w-full p-2 rounded-xl border bg-background"
                        placeholder="12345-A-26"
                      />
                    </div>
                  </div>
                  <div className="text-right font-bold text-teal-800 dark:text-teal-200">
                    Total : {(noteDistanceKm * 2.5).toFixed(2)} DH
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block font-semibold mb-1">Montant TTC (DH) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={noteMontantTtc || ""}
                    onChange={(e) => setNoteMontantTtc(Number(e.target.value))}
                    className="w-full p-2 rounded-xl border bg-background"
                    placeholder="0.00"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold mb-1">Motif / Description de la dépense *</label>
                <textarea
                  rows={2}
                  value={noteDescription}
                  onChange={(e) => setNoteDescription(e.target.value)}
                  placeholder="ex: Péage et carburant mission commerciale"
                  className="w-full p-2 rounded-xl border bg-background"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsNoteModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl border"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={noteSubmitting}
                  className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground font-semibold"
                >
                  {noteSubmitting ? "Dépôt..." : "Déposer la note"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
