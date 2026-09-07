"use client";

import { useState } from "react";
import {
  type NoteFraisCategorie,
  type NoteFraisModeRemboursement,
  type NoteFraisRecord,
} from "@/lib/types";
import {
  creerNoteFraisAction,
  rembourserNoteFraisAction,
  validerNoteFraisAction,
} from "@/app/actions";
import {
  ReceiptText,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Car,
  Filter,
  Search,
  Check,
  Building2,
  Calendar,
  CreditCard,
  ChevronRight,
  AlertCircle,
} from "lucide-react";

type NotesFraisManagerProps = {
  initialNotes: NoteFraisRecord[];
  employes: Array<{ id: number; nom: string; prenom: string; numero_employe: string }>;
  stats: {
    totalDepenses: number;
    enAttenteCount: number;
    enAttenteTotal: number;
    approuveCount: number;
    approuveTotal: number;
    rembourseCount: number;
    rembourseTotal: number;
  };
  locale?: string;
  isRTL?: boolean;
};

const CATEGORIES_LABELS: Record<NoteFraisCategorie, { label: string; icon: string; color: string }> = {
  deplacement: { label: "Déplacement & Transport", icon: "🚗", color: "bg-blue-500/10 text-blue-500" },
  repas: { label: "Repas & Restauration", icon: "🍽️", color: "bg-amber-500/10 text-amber-500" },
  hotel: { label: "Hébergement / Hôtel", icon: "🏨", color: "bg-purple-500/10 text-purple-500" },
  peage: { label: "Péage & Stationnement", icon: "🛣️", color: "bg-indigo-500/10 text-indigo-500" },
  carburant: { label: "Carburant", icon: "⛽", color: "bg-emerald-500/10 text-emerald-500" },
  frais_km: { label: "Frais Kilométriques (Barème)", icon: "📍", color: "bg-teal-500/10 text-teal-500" },
  fournitures: { label: "Fournitures & Outillage", icon: "📦", color: "bg-cyan-500/10 text-cyan-500" },
  autre: { label: "Autre Dépense", icon: "📑", color: "bg-zinc-500/10 text-zinc-500" },
};

export function NotesFraisManager({
  initialNotes,
  employes,
  stats: initialStats,
  locale = "fr",
  isRTL = false,
}: NotesFraisManagerProps) {
  const [notes, setNotes] = useState<NoteFraisRecord[]>(initialNotes);
  const [stats, setStats] = useState(initialStats);
  const [filterStatut, setFilterStatut] = useState<string>("all");
  const [filterCategorie, setFilterCategorie] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Modal Saisie
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [formEmployeId, setFormEmployeId] = useState<number>(employes[0]?.id || 0);
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [formCategorie, setFormCategorie] = useState<NoteFraisCategorie>("deplacement");
  const [formDescription, setFormDescription] = useState<string>("");
  const [formMontantTtc, setFormMontantTtc] = useState<number>(0);
  const [formTvaRate, setFormTvaRate] = useState<number>(20);
  const [formDistanceKm, setFormDistanceKm] = useState<number>(0);
  const [formVehicule, setFormVehicule] = useState<string>("");

  // Modal Validation / Refus
  const [refusModalId, setRefusModalId] = useState<number | null>(null);
  const [motifRefus, setMotifRefus] = useState<string>("");

  // Modal Remboursement
  const [rembourseModalId, setRembourseModalId] = useState<number | null>(null);
  const [rembourseMode, setRembourseMode] = useState<NoteFraisModeRemboursement>("virement");

  const filteredNotes = notes.filter((n) => {
    if (filterStatut !== "all" && n.statut !== filterStatut) return false;
    if (filterCategorie !== "all" && n.categorie !== filterCategorie) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchNum = n.numero.toLowerCase().includes(q);
      const matchDesc = n.description.toLowerCase().includes(q);
      const matchEmp = `${n.employe_nom} ${n.employe_prenom}`.toLowerCase().includes(q);
      if (!matchNum && !matchDesc && !matchEmp) return false;
    }
    return true;
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmployeId) {
      setErrorMsg("Veuillez sélectionner un collaborateur.");
      return;
    }
    if (!formDescription.trim()) {
      setErrorMsg("Veuillez saisir une description.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await creerNoteFraisAction({
        employeId: formEmployeId,
        dateDepense: formDate,
        categorie: formCategorie,
        description: formDescription,
        montantTtc: formCategorie === "frais_km" ? formDistanceKm * 2.5 : formMontantTtc,
        tvaRate: formTvaRate,
        distanceKm: formDistanceKm,
        baremeKmUnitaire: 2.5,
        vehiculeImmatriculation: formVehicule,
      });

      if (res.success && res.note) {
        setNotes([res.note, ...notes]);
        setStats((prev) => ({
          ...prev,
          totalDepenses: prev.totalDepenses + res.note.montant_ttc,
          enAttenteCount: prev.enAttenteCount + 1,
          enAttenteTotal: prev.enAttenteTotal + res.note.montant_ttc,
        }));
        setIsModalOpen(false);
        setFormDescription("");
        setFormMontantTtc(0);
        setFormDistanceKm(0);
      } else {
        setErrorMsg(res.error || "Erreur lors de la création.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Erreur inattendue.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleValider = async (id: number, decision: "approuve" | "refuse", motif?: string) => {
    try {
      const res = await validerNoteFraisAction(id, decision, motif);
      if (res.success && res.note) {
        setNotes(notes.map((n) => (n.id === id ? res.note : n)));
        // Refresh local stats
        setStats((prev) => {
          const old = notes.find((n) => n.id === id);
          if (!old) return prev;
          if (decision === "approuve") {
            return {
              ...prev,
              enAttenteCount: Math.max(0, prev.enAttenteCount - 1),
              enAttenteTotal: Math.max(0, prev.enAttenteTotal - old.montant_ttc),
              approuveCount: prev.approuveCount + 1,
              approuveTotal: prev.approuveTotal + old.montant_ttc,
            };
          } else {
            return {
              ...prev,
              enAttenteCount: Math.max(0, prev.enAttenteCount - 1),
              enAttenteTotal: Math.max(0, prev.enAttenteTotal - old.montant_ttc),
              totalDepenses: Math.max(0, prev.totalDepenses - old.montant_ttc),
            };
          }
        });
        setRefusModalId(null);
        setMotifRefus("");
      }
    } catch (err: any) {
      alert("Erreur lors de la décision : " + err.message);
    }
  };

  const handleRembourser = async (id: number) => {
    try {
      const res = await rembourserNoteFraisAction(id, rembourseMode);
      if (res.success && res.note) {
        setNotes(notes.map((n) => (n.id === id ? res.note : n)));
        setStats((prev) => {
          const old = notes.find((n) => n.id === id);
          if (!old) return prev;
          return {
            ...prev,
            approuveCount: Math.max(0, prev.approuveCount - 1),
            approuveTotal: Math.max(0, prev.approuveTotal - old.montant_ttc),
            rembourseCount: prev.rembourseCount + 1,
            rembourseTotal: prev.rembourseTotal + old.montant_ttc,
          };
        });
        setRembourseModalId(null);
      }
    } catch (err: any) {
      alert("Erreur lors du remboursement : " + err.message);
    }
  };

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5">
            <ReceiptText className="w-7 h-7 text-primary" />
            Notes de Frais & Frais Kilométriques
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestion, approbation hiérarchique et remboursement des frais professionnels selon le barème fiscal marocain (2.50 DH/km).
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold shadow-sm hover:opacity-95 transition-all text-sm"
        >
          <Plus className="w-4 h-4" />
          Nouvelle Note de Frais
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border bg-card/60 backdrop-blur-sm shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Dépenses</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <ReceiptText className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold">{stats.totalDepenses.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DH</div>
            <p className="text-xs text-muted-foreground mt-1">{notes.length} notes enregistrées</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl border bg-card/60 backdrop-blur-sm shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">En Attente Validation</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
              {stats.enAttenteTotal.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DH
            </div>
            <p className="text-xs text-muted-foreground mt-1">{stats.enAttenteCount} demande(s) à valider</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl border bg-card/60 backdrop-blur-sm shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Approuvées / À Rembourser</span>
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-500">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-teal-600 dark:text-teal-400">
              {stats.approuveTotal.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DH
            </div>
            <p className="text-xs text-muted-foreground mt-1">{stats.approuveCount} prêtes pour règlement</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl border bg-card/60 backdrop-blur-sm shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Remboursé</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {stats.rembourseTotal.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DH
            </div>
            <p className="text-xs text-muted-foreground mt-1">{stats.rembourseCount} notes réglées</p>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl border bg-card/40 backdrop-blur-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 w-full sm:w-80 relative">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher par N°, motif, salarié..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <select
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value)}
            className="px-3 py-2 rounded-xl border bg-background text-xs font-medium focus:outline-none"
          >
            <option value="all">Tous les statuts</option>
            <option value="en_attente">⏳ En attente</option>
            <option value="approuve">✅ Approuvé</option>
            <option value="rembourse">💰 Remboursé</option>
            <option value="refuse">❌ Refusé</option>
          </select>

          <select
            value={filterCategorie}
            onChange={(e) => setFilterCategorie(e.target.value)}
            className="px-3 py-2 rounded-xl border bg-background text-xs font-medium focus:outline-none"
          >
            <option value="all">Toutes les catégories</option>
            <option value="deplacement">🚗 Déplacement</option>
            <option value="repas">🍽️ Repas</option>
            <option value="hotel">🏨 Hôtel</option>
            <option value="frais_km">📍 Frais Km</option>
            <option value="carburant">⛽ Carburant</option>
            <option value="peage">🛣️ Péage</option>
            <option value="fournitures">📦 Fournitures</option>
            <option value="autre">📑 Autre</option>
          </select>
        </div>
      </div>

      {/* Notes Table */}
      <div className="rounded-2xl border bg-card/60 backdrop-blur-sm overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase border-b">
              <tr>
                <th className="py-3.5 px-4">Réf & Date</th>
                <th className="py-3.5 px-4">Collaborateur</th>
                <th className="py-3.5 px-4">Catégorie</th>
                <th className="py-3.5 px-4">Description</th>
                <th className="py-3.5 px-4 text-right">Montant TTC</th>
                <th className="py-3.5 px-4 text-center">Statut</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredNotes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground">
                    Aucune note de frais trouvée.
                  </td>
                </tr>
              ) : (
                filteredNotes.map((note) => {
                  const cat = CATEGORIES_LABELS[note.categorie] || CATEGORIES_LABELS.autre;
                  return (
                    <tr key={note.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-xs text-primary">{note.numero}</div>
                        <div className="text-xs text-muted-foreground">{note.date_depense}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium">
                          {note.employe_nom} {note.employe_prenom}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          Mat: {note.employe_numero || "-"}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cat.color}`}>
                          <span>{cat.icon}</span>
                          {cat.label}
                        </span>
                        {note.categorie === "frais_km" && (
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {note.distance_km} km @ {note.bareme_km_unitaire} DH
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="truncate font-normal" title={note.description}>
                          {note.description}
                        </div>
                        {note.motif_refus && (
                          <div className="text-xs text-rose-500 italic mt-0.5">
                            Motif refus : {note.motif_refus}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-bold text-sm">
                          {note.montant_ttc.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DH
                        </div>
                        {note.montant_tva > 0 && (
                          <div className="text-[11px] text-muted-foreground">
                            dont TVA {note.tva_rate}%: {note.montant_tva.toFixed(2)} DH
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {note.statut === "en_attente" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                            <Clock className="w-3 h-3" /> En attente
                          </span>
                        )}
                        {note.statut === "approuve" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-600 border border-teal-500/20">
                            <CheckCircle2 className="w-3 h-3" /> Approuvé
                          </span>
                        )}
                        {note.statut === "rembourse" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            <Check className="w-3 h-3" /> Remboursé ({note.mode_remboursement})
                          </span>
                        )}
                        {note.statut === "refuse" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                            <XCircle className="w-3 h-3" /> Refusé
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {note.statut === "en_attente" && (
                            <>
                              <button
                                onClick={() => handleValider(note.id, "approuve")}
                                className="px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-600 hover:bg-teal-500/20 text-xs font-semibold transition-colors"
                                title="Approuver cette dépense"
                              >
                                Approuver
                              </button>
                              <button
                                onClick={() => {
                                  setRefusModalId(note.id);
                                  setMotifRefus("");
                                }}
                                className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 text-xs font-semibold transition-colors"
                                title="Refuser cette dépense"
                              >
                                Refuser
                              </button>
                            </>
                          )}

                          {note.statut === "approuve" && (
                            <button
                              onClick={() => setRembourseModalId(note.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 text-xs font-semibold transition-colors"
                            >
                              Rembourser
                            </button>
                          )}

                          {note.statut === "rembourse" && (
                            <span className="text-xs text-muted-foreground">
                              {note.date_remboursement || "Réglé"}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Création Note de Frais */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl border shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                Saisir une Note de Frais
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-sm">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Collaborateur *</label>
                <select
                  value={formEmployeId}
                  onChange={(e) => setFormEmployeId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  required
                >
                  {employes.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.nom} {emp.prenom} (N° {emp.numero_employe})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Date de la dépense *</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Catégorie *</label>
                  <select
                    value={formCategorie}
                    onChange={(e) => setFormCategorie(e.target.value as NoteFraisCategorie)}
                    className="w-full px-3 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                    required
                  >
                    <option value="deplacement">🚗 Déplacement</option>
                    <option value="repas">🍽️ Repas / Restaurant</option>
                    <option value="hotel">🏨 Hôtel / Hébergement</option>
                    <option value="peage">🛣️ Péage & Parking</option>
                    <option value="carburant">⛽ Carburant</option>
                    <option value="frais_km">📍 Frais Km (Barème)</option>
                    <option value="fournitures">📦 Fournitures</option>
                    <option value="autre">📑 Autre</option>
                  </select>
                </div>
              </div>

              {/* Si Frais Kilométriques */}
              {formCategorie === "frais_km" ? (
                <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 space-y-2">
                  <div className="text-xs font-bold text-teal-700 dark:text-teal-300">
                    Barème Kilométrique Marocain : 2.50 DH / km
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1">Distance (km) *</label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={formDistanceKm || ""}
                        onChange={(e) => setFormDistanceKm(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border bg-background text-sm"
                        placeholder="ex: 150"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Immatriculation Véhicule</label>
                      <input
                        type="text"
                        value={formVehicule}
                        onChange={(e) => setFormVehicule(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border bg-background text-sm"
                        placeholder="ex: 12345-A-26"
                      />
                    </div>
                  </div>
                  <div className="text-xs font-semibold text-teal-800 dark:text-teal-200 text-right pt-1">
                    Indemnité calculée : {(formDistanceKm * 2.5).toFixed(2)} DH
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Montant TTC (DH) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formMontantTtc || ""}
                      onChange={(e) => setFormMontantTtc(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border bg-background text-sm"
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Taux de TVA (%)</label>
                    <select
                      value={formTvaRate}
                      onChange={(e) => setFormTvaRate(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border bg-background text-sm"
                    >
                      <option value="20">20% (Normal)</option>
                      <option value="14">14% (Transport)</option>
                      <option value="10">10% (Restauration)</option>
                      <option value="7">7% (Eau / Élec)</option>
                      <option value="0">0% (Exonéré)</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Description / Motif de la dépense *</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  placeholder="ex: Visite de prospection client à Rabat et péage autoroute"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border text-sm font-semibold hover:bg-muted transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-all"
                >
                  {submitting ? "Enregistrement..." : "Enregistrer la note"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Refus */}
      {refusModalId !== null && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl border shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-rose-600 flex items-center gap-2">
              <XCircle className="w-5 h-5" />
              Motif du refus de la note
            </h3>
            <p className="text-xs text-muted-foreground">
              Veuillez indiquer la raison pour laquelle cette dépense est rejetée (justificatif illisible, plafond dépassé, etc.).
            </p>
            <textarea
              rows={3}
              value={motifRefus}
              onChange={(e) => setMotifRefus(e.target.value)}
              placeholder="ex: Justificatif manquant ou non conforme"
              className="w-full px-3 py-2 rounded-xl border bg-background text-sm"
              required
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRefusModalId(null)}
                className="px-3 py-1.5 rounded-xl border text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => handleValider(refusModalId, "refuse", motifRefus)}
                className="px-4 py-1.5 rounded-xl bg-rose-600 text-white font-semibold text-xs hover:bg-rose-700"
              >
                Confirmer le refus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Remboursement */}
      {rembourseModalId !== null && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl border shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-emerald-600 flex items-center gap-2">
              <Check className="w-5 h-5" />
              Remboursement de la note de frais
            </h3>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Mode de règlement *</label>
              <select
                value={rembourseMode}
                onChange={(e) => setRembourseMode(e.target.value as NoteFraisModeRemboursement)}
                className="w-full px-3 py-2 rounded-xl border bg-background text-sm"
              >
                <option value="virement">Virement bancaire</option>
                <option value="especes">Espèces (Sortie de caisse)</option>
                <option value="paie">Ajout sur le prochain bulletin de paie</option>
                <option value="cheque">Chèque</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRembourseModalId(null)}
                className="px-3 py-1.5 rounded-xl border text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => handleRembourser(rembourseModalId)}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700"
              >
                Valider le remboursement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
