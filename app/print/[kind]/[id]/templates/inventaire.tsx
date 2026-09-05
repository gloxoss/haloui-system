import {
  InfoCard,
  InfoField,
  InfoGrid,
  LedgerTable,
  PrintDocumentHeader,
  PrintPage,
  formatPrintDate,
} from "@/app/print/[kind]/[id]/templates/shared";
import { INVENTAIRE_STATUT_LABELS, INVENTAIRE_TYPE_LABELS } from "@/lib/constants";
import { type BranchRecord, type CompanyRecord, type InventaireRecord } from "@/lib/types";

export type PrintInventaireContext = {
  company: CompanyRecord;
  inventaire: InventaireRecord;
  branch?: BranchRecord | null;
};

export default function InventaireTemplate({
  company,
  inventaire,
  branch,
}: PrintInventaireContext) {
  const lines = inventaire.lignes || [];
  const isCloture = inventaire.statut === "cloture";
  const typeConfig = INVENTAIRE_TYPE_LABELS[inventaire.type_inventaire] || {
    label: inventaire.type_inventaire,
  };
  const statutConfig = INVENTAIRE_STATUT_LABELS[inventaire.statut] || {
    label: inventaire.statut,
  };

  const title = isCloture
    ? "Procès-Verbal de Clôture d'Inventaire"
    : "Feuille de Comptage Physique d'Inventaire";

  const subtitle = isCloture
    ? "Régularisation comptable et ajustement des stocks physiques"
    : "Document contradictoire de relevé d'inventaire sur le terrain";

  return (
    <PrintPage className="flex flex-col justify-between h-full min-h-[inherit]">
      {/* Upper Content */}
      <div className="flex flex-col gap-4">
        <PrintDocumentHeader
          company={company}
          title={title}
          eyebrow={`Logistique & Gestion des Stocks • N° ${inventaire.numero}`}
        />

        {/* Metadata Cards */}
        <div className="grid grid-cols-3 gap-4">
          <InfoCard title="Paramètres de la Session">
            <InfoGrid columns={1}>
              <InfoField label="N° Référence" value={inventaire.numero} />
              <InfoField label="Type d'inventaire" value={typeConfig.label} />
              <InfoField
                label="Périmètre / Critère"
                value={inventaire.critere_filtre || "Ensemble du magasin"}
              />
              <InfoField label="Statut" value={statutConfig.label} />
            </InfoGrid>
          </InfoCard>

          <InfoCard title="Magasin & Emplacement">
            <InfoGrid columns={1}>
              <InfoField
                label="Point de vente / Dépôt"
                value={branch?.name || inventaire.branch_name || "Dépôt Principal"}
              />
              <InfoField
                label="Date de début"
                value={formatPrintDate(inventaire.date_debut || inventaire.created_at)}
              />
              <InfoField
                label="Date de clôture"
                value={
                  inventaire.date_cloture ? formatPrintDate(inventaire.date_cloture) : "En cours"
                }
              />
              <InfoField
                label="Supervisé par"
                value={inventaire.cloture_par_nom || "Équipe Magasin"}
              />
            </InfoGrid>
          </InfoCard>

          <InfoCard title="Synthèse & Rapprochement">
            <InfoGrid columns={1}>
              <InfoField
                label="Articles au catalogue"
                value={`${inventaire.total_articles} référence(s)`}
              />
              <InfoField
                label="Articles comptés"
                value={`${inventaire.total_comptes} / ${inventaire.total_articles}`}
              />
              <InfoField
                label="Écart net unités"
                value={
                  inventaire.total_ecarts_qte > 0
                    ? `+${inventaire.total_ecarts_qte} u`
                    : `${inventaire.total_ecarts_qte} u`
                }
              />
              <InfoField
                label="Valorisation écart (HT)"
                value={
                  inventaire.total_valeur_ecart_ht > 0
                    ? `+${inventaire.total_valeur_ecart_ht.toFixed(2)} MAD`
                    : `${inventaire.total_valeur_ecart_ht.toFixed(2)} MAD`
                }
              />
            </InfoGrid>
          </InfoCard>
        </div>

        {/* Notes if any */}
        {inventaire.notes && (
          <div className="p-2.5 rounded-lg border border-[var(--print-border)] bg-[var(--print-surface)] text-[11px]">
            <span className="font-bold text-[var(--print-text-muted)]">Observations : </span>
            <span className="text-[var(--print-text)]">{inventaire.notes}</span>
          </div>
        )}

        {/* Lines Table */}
        <div className="mt-2">
          <LedgerTable>
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[var(--print-border-strong)] bg-[var(--print-surface-muted)] text-[10px] font-black uppercase text-[var(--print-text-muted)]">
                  <th className="p-1.5 text-left w-[120px]">Réf / EAN</th>
                  <th className="p-1.5 text-left">Désignation de l'article</th>
                  <th className="p-1.5 text-left w-[110px]">Rayon / Empl.</th>
                  <th className="p-1.5 text-right w-[75px]">Théorique</th>
                  <th className="p-1.5 text-right w-[75px]">Physique</th>
                  <th className="p-1.5 text-right w-[70px]">Écart Qté</th>
                  <th className="p-1.5 text-right w-[95px]">Écart HT</th>
                  <th className="p-1.5 text-left w-[140px]">Motif / Justification</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, index) => {
                  const hasCount = l.statut_comptage !== "non_compte";
                  const isEcart = l.ecart_quantite !== 0;

                  return (
                    <tr
                      key={l.id || index}
                      className={`border-b border-[var(--print-border-light)] text-[10px] ${
                        isEcart && isCloture ? "bg-amber-50/40" : ""
                      }`}
                    >
                      <td className="p-1.5 font-mono">
                        {l.code_barre || l.ref || "-"}
                      </td>
                      <td className="p-1.5 font-semibold text-[var(--print-text)]">
                        {l.designation}
                      </td>
                      <td className="p-1.5 text-[var(--print-text-muted)]">
                        {l.rayon || l.categorie || "-"}
                      </td>
                      <td className="p-1.5 text-right font-medium">
                        {l.stock_theorique} {l.unite || "u"}
                      </td>
                      <td className="p-1.5 text-right font-bold">
                        {hasCount ? `${l.stock_physique} ${l.unite || "u"}` : "____"}
                      </td>
                      <td
                        className={`p-1.5 text-right font-bold ${
                          l.ecart_quantite < 0
                            ? "text-red-600"
                            : l.ecart_quantite > 0
                            ? "text-emerald-700"
                            : "text-gray-500"
                        }`}
                      >
                        {hasCount
                          ? l.ecart_quantite > 0
                            ? `+${l.ecart_quantite}`
                            : `${l.ecart_quantite}`
                          : "-"}
                      </td>
                      <td
                        className={`p-1.5 text-right font-bold ${
                          l.valeur_ecart_ht < 0
                            ? "text-red-600"
                            : l.valeur_ecart_ht > 0
                            ? "text-emerald-700"
                            : "text-gray-500"
                        }`}
                      >
                        {hasCount
                          ? l.valeur_ecart_ht > 0
                            ? `+${l.valeur_ecart_ht.toFixed(2)}`
                            : l.valeur_ecart_ht.toFixed(2)
                          : "-"}
                      </td>
                      <td className="p-1.5 text-[9px] text-[var(--print-text-muted)] italic">
                        {l.motif_ecart || (isEcart ? "En attente justification" : "Conforme")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </LedgerTable>
        </div>
      </div>

      {/* Signatures & Certification block at bottom */}
      <div className="mt-8 pt-4 border-t-2 border-[var(--print-border-strong)]">
        <div className="text-[10px] text-gray-500 text-center mb-3">
          Document contradictoire officiel certifiant l'exactitude des comptages physiques et régularisations comptables applicables.
        </div>
        <div className="grid grid-cols-3 gap-6 text-center text-[10.5px]">
          <div className="flex flex-col justify-between h-24 border border-dashed border-gray-300 rounded p-2">
            <span className="font-bold text-gray-600">L'Agent Compteur</span>
            <span className="text-[9px] text-gray-400">Date et signature</span>
          </div>
          <div className="flex flex-col justify-between h-24 border border-dashed border-gray-300 rounded p-2">
            <span className="font-bold text-gray-600">Le Responsable Magasin / Dépôt</span>
            <span className="text-[9px] text-gray-400">Cachet et visa</span>
          </div>
          <div className="flex flex-col justify-between h-24 border border-dashed border-gray-300 rounded p-2">
            <span className="font-bold text-gray-600">La Direction / Contrôle de Gestion</span>
            <span className="text-[9px] text-gray-400">Approbation des régularisations</span>
          </div>
        </div>
      </div>
    </PrintPage>
  );
}
