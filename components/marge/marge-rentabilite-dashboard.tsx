"use client";

import { useState } from "react";
import {
  type MargeBranchItem,
  type MargeClientItem,
  type MargeFamilleItem,
  type MargeProduitItem,
  type MargeStatsGlobales,
} from "@/lib/types";
import {
  PieChart,
  TrendingUp,
  Package,
  Layers,
  Users,
  Building2,
  Calendar,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  DollarSign,
  Percent,
} from "lucide-react";

type Props = {
  initialStats: MargeStatsGlobales;
  initialProduits: MargeProduitItem[];
  initialFamilles: MargeFamilleItem[];
  initialClients: MargeClientItem[];
  initialBranches: MargeBranchItem[];
  initialEvolution: Array<{ mois: string; ca_ht: number; cout_achat: number; marge_brute: number; taux_marge: number }>;
  branches: Array<{ id: number; name: string }>;
};

export function MargeRentabiliteDashboard({
  initialStats,
  initialProduits,
  initialFamilles,
  initialClients,
  initialBranches,
  initialEvolution,
  branches,
}: Props) {
  const [stats] = useState(initialStats);
  const [produits] = useState(initialProduits);
  const [familles] = useState(initialFamilles);
  const [clients] = useState(initialClients);
  const [branchesData] = useState(initialBranches);
  const [evolution] = useState(initialEvolution);

  const [activeTab, setActiveTab] = useState<"produits" | "familles" | "clients" | "branches" | "evolution">("produits");
  const [searchProduit, setSearchProduit] = useState("");
  const [sortField, setSortField] = useState<"marge_brute" | "taux_marge" | "ca_ht">("marge_brute");

  const filteredProduits = produits
    .filter((p) => {
      if (!searchProduit.trim()) return true;
      const q = searchProduit.toLowerCase();
      return p.ref.toLowerCase().includes(q) || p.designation.toLowerCase().includes(q) || p.categorie.toLowerCase().includes(q);
    })
    .sort((a, b) => b[sortField] - a[sortField]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5">
            <PieChart className="w-7 h-7 text-primary" />
            Analyse de Marge Brute & Rentabilité
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Calcul en temps réel de la marge commerciale et du taux de marge basé sur les coûts de revient et PMP d'achat.
          </p>
        </div>
      </div>

      {/* Global KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-5 rounded-2xl border bg-card/60 backdrop-blur-sm shadow-sm flex flex-col justify-between">
          <div className="text-xs font-semibold uppercase text-muted-foreground">Chiffre d'Affaires HT</div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold text-foreground">
              {stats.ca_total_ht.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DH
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Ventes facturées & caisse</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl border bg-card/60 backdrop-blur-sm shadow-sm flex flex-col justify-between">
          <div className="text-xs font-semibold uppercase text-muted-foreground">Coût d'Achat (PMP)</div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold text-slate-600 dark:text-slate-400">
              {stats.cout_total_achat.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DH
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Marchandises consommées</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl border bg-card/60 backdrop-blur-sm shadow-sm flex flex-col justify-between border-emerald-500/20 bg-emerald-500/5">
          <div className="text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
            <span>Marge Brute Réalisée</span>
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {stats.marge_brute_totale.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DH
            </div>
            <p className="text-[11px] text-emerald-600/80 mt-0.5">Gain commercial net</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl border bg-card/60 backdrop-blur-sm shadow-sm flex flex-col justify-between">
          <div className="text-xs font-semibold uppercase text-muted-foreground flex items-center justify-between">
            <span>Taux de Marge</span>
            <Percent className="w-4 h-4 text-primary" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold text-primary">
              {stats.taux_marge_global}%
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Marge / Vente HT</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl border bg-card/60 backdrop-blur-sm shadow-sm flex flex-col justify-between">
          <div className="text-xs font-semibold uppercase text-muted-foreground">Taux de Marque</div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
              {stats.taux_marque_global}%
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Marge / Coût d'achat</p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-border overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab("produits")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors shrink-0 ${
            activeTab === "produits"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Rentabilité par Produit ({produits.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("familles")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors shrink-0 ${
            activeTab === "familles"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Par Famille / Catégorie ({familles.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("clients")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors shrink-0 ${
            activeTab === "clients"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Par Client & Catégorie Tarifaire ({clients.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("branches")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors shrink-0 ${
            activeTab === "branches"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Par Point de Vente / Magasin ({branchesData.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("evolution")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors shrink-0 ${
            activeTab === "evolution"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Évolution Mensuelle ({evolution.length})</span>
        </button>
      </div>

      {/* TAB 1 : RENTABILITÉ PAR PRODUIT */}
      {activeTab === "produits" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex items-center gap-2 w-full sm:w-80 relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Filtrer un produit par réf, nom, famille..."
                value={searchProduit}
                onChange={(e) => setSearchProduit(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border bg-background text-xs focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Trier par :</span>
              <button
                onClick={() => setSortField("marge_brute")}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                  sortField === "marge_brute" ? "bg-primary text-primary-foreground border-primary" : "bg-card"
                }`}
              >
                Marge (DH)
              </button>
              <button
                onClick={() => setSortField("taux_marge")}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                  sortField === "taux_marge" ? "bg-primary text-primary-foreground border-primary" : "bg-card"
                }`}
              >
                Taux Marge (%)
              </button>
              <button
                onClick={() => setSortField("ca_ht")}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                  sortField === "ca_ht" ? "bg-primary text-primary-foreground border-primary" : "bg-card"
                }`}
              >
                Chiffre d'Affaires
              </button>
            </div>
          </div>

          <div className="rounded-2xl border bg-card/60 backdrop-blur-sm overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase border-b">
                  <tr>
                    <th className="py-3 px-4">Article</th>
                    <th className="py-3 px-4">Famille</th>
                    <th className="py-3 px-4 text-right">Qté Vendue</th>
                    <th className="py-3 px-4 text-right">CA Ventes HT</th>
                    <th className="py-3 px-4 text-right">Coût Achat Total</th>
                    <th className="py-3 px-4 text-right">Marge Brute</th>
                    <th className="py-3 px-4 text-right">Taux Marge</th>
                    <th className="py-3 px-4 text-center">Niveau</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredProduits.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-muted-foreground text-xs">
                        Aucun produit trouvé.
                      </td>
                    </tr>
                  ) : (
                    filteredProduits.map((p) => {
                      const isHigh = p.taux_marge >= 35;
                      const isMedium = p.taux_marge >= 15 && p.taux_marge < 35;
                      return (
                        <tr key={p.produit_id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-xs">{p.designation}</div>
                            <div className="text-[11px] text-muted-foreground font-mono">{p.ref}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-md bg-muted text-[11px] font-medium">
                              {p.categorie}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-xs">
                            {p.quantite_vendue}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-xs">
                            {p.ca_ht.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DH
                          </td>
                          <td className="py-3 px-4 text-right text-xs text-muted-foreground">
                            {p.cout_total_achat.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DH
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-xs text-emerald-600 dark:text-emerald-400">
                            +{p.marge_brute.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DH
                          </td>
                          <td className="py-3 px-4 text-right font-extrabold text-xs">
                            {p.taux_marge}%
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isHigh ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600">
                                Forte (★)
                              </span>
                            ) : isMedium ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600">
                                Standard
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600">
                                Faible
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2 : PAR FAMILLE DE PRODUITS */}
      {activeTab === "familles" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {familles.map((f) => (
              <div
                key={f.famille}
                className="p-5 rounded-2xl border bg-card/60 backdrop-blur-sm space-y-3 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="font-bold text-sm">{f.famille}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-primary/10 text-primary">
                    {f.taux_marge}% marge
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Nombre d'articles :</span>
                    <strong className="text-foreground">{f.nb_produits}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Quantité vendue :</span>
                    <strong className="text-foreground">{f.quantite_vendue}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Chiffre d'Affaires HT :</span>
                    <strong className="text-foreground">{f.ca_ht.toLocaleString("fr-FR")} DH</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Coût d'achat total :</span>
                    <strong className="text-foreground">{f.cout_total_achat.toLocaleString("fr-FR")} DH</strong>
                  </div>
                </div>

                <div className="pt-2 border-t flex items-center justify-between">
                  <span className="text-xs font-semibold">Marge Brute Dégagée :</span>
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    +{f.marge_brute.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DH
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3 : PAR CLIENT ET CATÉGORIE TARIFAIRE */}
      {activeTab === "clients" && (
        <div className="rounded-2xl border bg-card/60 backdrop-blur-sm overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase border-b">
              <tr>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Grille Tarifaire</th>
                <th className="py-3 px-4 text-right">CA Réalisé HT</th>
                <th className="py-3 px-4 text-right">Coût Marchandises</th>
                <th className="py-3 px-4 text-right">Marge Brute</th>
                <th className="py-3 px-4 text-right">Taux de Marge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-muted-foreground text-xs">
                    Aucune vente client enregistrée.
                  </td>
                </tr>
              ) : (
                clients.map((c) => (
                  <tr key={c.client_id} className="hover:bg-muted/30">
                    <td className="py-3 px-4 font-semibold text-xs">{c.client_nom}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase bg-muted">
                        {c.categorie_tarifaire}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-xs">
                      {c.ca_ht.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DH
                    </td>
                    <td className="py-3 px-4 text-right text-xs text-muted-foreground">
                      {c.cout_total_achat.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DH
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-xs text-emerald-600 dark:text-emerald-400">
                      +{c.marge_brute.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DH
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-xs">
                      {c.taux_marge}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4 : PAR BRANCHE / MAGASIN */}
      {activeTab === "branches" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {branchesData.map((b) => (
            <div key={b.branch_id} className="p-5 rounded-2xl border bg-card/60 backdrop-blur-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2 font-bold text-base">
                  <Building2 className="w-5 h-5 text-primary" />
                  <span>{b.branch_nom}</span>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-500/10 text-emerald-600">
                  {b.taux_marge}% marge
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-3 rounded-xl bg-muted/40">
                  <div className="text-muted-foreground text-[11px]">Ventes HT</div>
                  <div className="font-bold text-sm mt-0.5">
                    {b.ca_ht.toLocaleString("fr-FR")} DH
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-muted/40">
                  <div className="text-muted-foreground text-[11px]">Coût PMP</div>
                  <div className="font-bold text-sm mt-0.5">
                    {b.cout_total_achat.toLocaleString("fr-FR")} DH
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600">
                  <div className="text-[11px] font-semibold">Marge Brute</div>
                  <div className="font-black text-sm mt-0.5">
                    {b.marge_brute.toLocaleString("fr-FR")} DH
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 5 : ÉVOLUTION MENSUELLE */}
      {activeTab === "evolution" && (
        <div className="rounded-2xl border bg-card/60 backdrop-blur-sm overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase border-b">
              <tr>
                <th className="py-3 px-4">Mois</th>
                <th className="py-3 px-4 text-right">CA Facturé HT</th>
                <th className="py-3 px-4 text-right">Coût Achat PMP</th>
                <th className="py-3 px-4 text-right">Marge Brute</th>
                <th className="py-3 px-4 text-right">Taux de Marge (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {evolution.map((ev) => (
                <tr key={ev.mois} className="hover:bg-muted/30">
                  <td className="py-3 px-4 font-bold text-xs">{ev.mois}</td>
                  <td className="py-3 px-4 text-right font-medium text-xs">
                    {ev.ca_ht.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DH
                  </td>
                  <td className="py-3 px-4 text-right text-xs text-muted-foreground">
                    {ev.cout_achat.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DH
                  </td>
                  <td className="py-3 px-4 text-right font-black text-xs text-emerald-600 dark:text-emerald-400">
                    +{ev.marge_brute.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DH
                  </td>
                  <td className="py-3 px-4 text-right font-black text-xs">
                    {ev.taux_marge}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
