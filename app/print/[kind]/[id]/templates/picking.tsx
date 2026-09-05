import {
  InfoCard,
  InfoField,
  InfoGrid,
  LedgerTable,
  PrintDocumentHeader,
  PrintPage,
  formatPrintDate,
} from "@/app/print/[kind]/[id]/templates/shared";
import { type CompanyRecord, type PickingListRecord } from "@/lib/types";

export type PrintPickingContext = {
  company: CompanyRecord;
  pickingList: PickingListRecord;
};

export default function PickingTemplate({
  company,
  pickingList,
}: PrintPickingContext) {
  const items = pickingList.items || [];

  return (
    <PrintPage className="flex flex-col justify-between h-full min-h-[inherit]">
      {/* Upper Content */}
      <div className="flex flex-col gap-4">
        <PrintDocumentHeader
          company={company}
          title="Feuille de Préparation de Commande (Picking List)"
          eyebrow={`Logistique & Entrepôt WMS • Itinéraire S-Shape • ${pickingList.document_numero}`}
        />

        {/* Metadata Cards */}
        <div className="grid grid-cols-3 gap-4">
          <InfoCard title="Document & Destination">
            <InfoGrid columns={1}>
              <InfoField label="N° Document" value={pickingList.document_numero} />
              <InfoField
                label="Client / Destinataire"
                value={pickingList.client_ou_destinataire || "Magasin Central"}
              />
              <InfoField
                label="Date de la commande"
                value={formatPrintDate(pickingList.date_document)}
              />
            </InfoGrid>
          </InfoCard>

          <InfoCard title="Origine & Volume">
            <InfoGrid columns={1}>
              <InfoField
                label="Dépôt d'enlèvement"
                value={pickingList.depot_source_nom || "Entrepôt Principal"}
              />
              <InfoField
                label="Total articles"
                value={`${pickingList.total_articles} unité(s)`}
              />
              <InfoField
                label="Lignes de prélèvement"
                value={`${pickingList.total_lignes} ligne(s)`}
              />
            </InfoGrid>
          </InfoCard>

          <InfoCard title="Directives de Prélèvement">
            <div className="text-xs text-stone-600 leading-relaxed space-y-1">
              <p>
                <strong>Circuit S-Shape :</strong> Suivez l&apos;ordre séquentiel des emplacements pour minimiser les déplacements.
              </p>
              <p>
                Vérifiez la conformité des références et cochez les articles au fur et à mesure du prélèvement.
              </p>
            </div>
          </InfoCard>
        </div>

        {/* Picking Table */}
        <div className="mt-2">
          <LedgerTable>
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[var(--print-border-strong)] bg-[var(--print-surface-muted)] text-[10px] font-black uppercase text-[var(--print-text-muted)]">
                  <th className="p-1.5 text-center w-[45px]">Ordre</th>
                  <th className="p-1.5 text-left w-[130px]">Emplacement WMS</th>
                  <th className="p-1.5 text-center w-[110px]">Zone / Allée</th>
                  <th className="p-1.5 text-left">Désignation & Référence Article</th>
                  <th className="p-1.5 text-right w-[100px]">Qté Demandée</th>
                  <th className="p-1.5 text-center w-[70px]">Prélevé</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.ordre_picking}
                    className="border-b border-[var(--print-border)] hover:bg-[var(--print-surface)] transition-colors"
                  >
                    <td className="p-1.5 text-center font-bold text-stone-900 text-xs">
                      #{item.ordre_picking}
                    </td>
                    <td className="p-1.5">
                      <span className="font-mono font-bold text-xs bg-stone-100 px-1.5 py-0.5 rounded border border-stone-300 inline-block">
                        📍 {item.emplacement_code}
                      </span>
                    </td>
                    <td className="p-1.5 text-center text-xs text-stone-600">
                      Zone {item.zone} • Allée {item.allee}
                    </td>
                    <td className="p-1.5">
                      <div className="flex flex-col">
                        <span className="font-medium text-xs text-stone-900 leading-snug">
                          {item.produit_designation}
                        </span>
                        <span className="text-[10px] text-stone-500 font-mono">
                          Réf: {item.produit_ref} {item.code_barre ? `• EAN: ${item.code_barre}` : ""}
                        </span>
                      </div>
                    </td>
                    <td className="p-1.5 text-right font-bold text-xs text-stone-900">
                      {item.quantite_demandee} {item.unite}
                    </td>
                    <td className="p-1.5 text-center">
                      <div className="w-4 h-4 border border-stone-400 rounded mx-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </LedgerTable>
        </div>
      </div>

      {/* Footer Signatures */}
      <div className="mt-6 pt-4 border-t border-stone-200">
        <div className="grid grid-cols-2 gap-8 text-xs text-stone-600">
          <div className="border border-dashed border-stone-300 rounded p-3 h-24 flex flex-col justify-between">
            <span className="font-semibold text-stone-800">Visa du Préparateur / Magasinier :</span>
            <span className="text-[10px] text-stone-400">Date et Signature</span>
          </div>
          <div className="border border-dashed border-stone-300 rounded p-3 h-24 flex flex-col justify-between">
            <span className="font-semibold text-stone-800">Contrôle & Expédition (Chauffeur / Réceptionnaire) :</span>
            <span className="text-[10px] text-stone-400">Date et Signature</span>
          </div>
        </div>
      </div>
    </PrintPage>
  );
}
