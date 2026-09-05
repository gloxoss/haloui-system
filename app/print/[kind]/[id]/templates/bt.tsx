import {
  AddressBar,
  InfoCard,
  InfoField,
  InfoGrid,
  LedgerTable,
  PrintDocumentHeader,
  PrintPage,
  formatPrintDate,
} from "@/app/print/[kind]/[id]/templates/shared";
import { type BranchRecord, type CompanyRecord, type StockTransfertRecord } from "@/lib/types";

export type PrintTransfertContext = {
  company: CompanyRecord;
  transfert: StockTransfertRecord;
  sourceBranch?: BranchRecord | null;
  destinationBranch?: BranchRecord | null;
};

export default function BonTransfertTemplate({
  company,
  transfert,
  sourceBranch,
  destinationBranch,
}: PrintTransfertContext) {
  const lines = transfert.lignes || [];
  const minRows = 5;
  const emptyRowsCount = Math.max(0, minRows - lines.length);

  const isRecu = transfert.statut === "recu";
  const isTransit = transfert.statut === "en_transit";

  return (
    <PrintPage className="flex flex-col justify-between h-full min-h-[inherit]">
      {/* Upper Content */}
      <div className="flex flex-col gap-4">
        <PrintDocumentHeader
          company={company}
          title="Bon de Transfert"
          eyebrow="Logistique & Contrôle Contradictoire Inter-Dépôts"
        />

        {/* Depots: Source vs Destination */}
        <div className="grid grid-cols-2 gap-4">
          <InfoCard title="Dépôt Expéditeur (Départ)">
            <InfoGrid columns={1}>
              <InfoField
                label="Dépôt source"
                value={sourceBranch?.name || transfert.source_branch_name || "Dépôt central"}
              />
              <InfoField
                label="Date d'expédition"
                value={formatPrintDate(transfert.date_expedition || transfert.date_transfert)}
              />
              <InfoField
                label="Expédié par"
                value={transfert.expedie_par_nom || "Responsable logistique"}
              />
              <InfoField label="N° Bon de transfert" value={transfert.numero} />
            </InfoGrid>
          </InfoCard>

          <InfoCard title="Dépôt Destinataire (Arrivée)">
            <InfoGrid columns={1}>
              <InfoField
                label="Dépôt destinataire"
                value={destinationBranch?.name || transfert.destination_branch_name || "Magasin"}
              />
              <InfoField
                label="Statut du transfert"
                value={
                  isRecu
                    ? "✓ Réceptionné et validé"
                    : isTransit
                    ? "🚚 En cours d'acheminement"
                    : "Brouillon / Préparation"
                }
              />
              <InfoField
                label="Date de réception"
                value={transfert.date_reception ? formatPrintDate(transfert.date_reception) : "En attente"}
              />
              <InfoField
                label="Réceptionné par"
                value={transfert.recu_par_nom || "En attente de réception"}
              />
            </InfoGrid>
          </InfoCard>
        </div>

        {/* Transport & Carrier Metadata */}
        <InfoCard title="Informations de Transport & Véhicule">
          <div className="grid grid-cols-3 gap-3 text-[11px]">
            <div>
              <span className="font-bold text-[var(--print-text-muted)]">Chauffeur : </span>
              <span className="font-semibold text-[var(--print-text)]">
                {transfert.chauffeur_nom || "Non spécifié"}
              </span>
            </div>
            <div>
              <span className="font-bold text-[var(--print-text-muted)]">Véhicule (Matricule) : </span>
              <span className="font-semibold text-[var(--print-text)]">
                {transfert.vehicule_matricule || "Non spécifié"}
              </span>
            </div>
            <div>
              <span className="font-bold text-[var(--print-text-muted)]">Réf. Lettre de voiture : </span>
              <span className="font-semibold text-[var(--print-text)]">
                {transfert.bon_transport_ref || "—"}
              </span>
            </div>
          </div>
        </InfoCard>

        {/* Items Table with Contradictory Physical Check */}
        <LedgerTable>
          <table className="w-full border-collapse text-[11px]">
            <colgroup>
              <col className="w-[12%]" />
              <col className="w-[38%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
              <col className="w-[10%]" />
              <col className="w-[16%]" />
            </colgroup>
            <thead className="bg-white text-[var(--print-text)]">
              <tr className="font-[var(--font-print-serif)] text-[11px] font-black uppercase">
                <th className="border-b-2 border-[var(--print-border-strong)] px-3 py-2 text-left">
                  Réf.
                </th>
                <th className="border-b-2 border-[var(--print-border-strong)] px-3 py-2 text-left">
                  Désignation article
                </th>
                <th className="border-b-2 border-[var(--print-border-strong)] px-2 py-2 text-center">
                  Qté Expédiée
                </th>
                <th className="border-b-2 border-[var(--print-border-strong)] px-2 py-2 text-center">
                  Qté Reçue
                </th>
                <th className="border-b-2 border-[var(--print-border-strong)] px-2 py-2 text-center">
                  Écart
                </th>
                <th className="border-b-2 border-[var(--print-border-strong)] px-3 py-2 text-left">
                  Observations / Avaries
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {lines.map((line, index) => {
                const qteExp = Number(line.quantite_expediee);
                const qteRec = isRecu ? Number(line.quantite_recue) : null;
                const ecart = isRecu ? Number(line.ecart) : null;

                return (
                  <tr key={`${line.id}-${index}`} className="align-top">
                    <td className="border-b border-[var(--print-border-light)] px-3 py-2.5 font-mono text-[10px] text-[var(--print-text-muted)]">
                      {line.produit_ref || "—"}
                    </td>
                    <td className="border-b border-[var(--print-border-light)] px-3 py-2.5 font-semibold text-[var(--print-text)]">
                      {line.designation}
                    </td>
                    <td className="border-b border-[var(--print-border-light)] px-2 py-2.5 text-center font-bold text-[var(--print-text)]">
                      {qteExp} {line.unite || "u"}
                    </td>
                    <td className="border-b border-[var(--print-border-light)] px-2 py-2.5 text-center font-bold text-[var(--print-text)]">
                      {qteRec !== null ? `${qteRec} ${line.unite || "u"}` : "—"}
                    </td>
                    <td className="border-b border-[var(--print-border-light)] px-2 py-2.5 text-center font-bold">
                      {ecart !== null ? (
                        ecart === 0 ? (
                          <span className="text-teal-700">0</span>
                        ) : ecart < 0 ? (
                          <span className="text-red-700 font-black">{ecart}</span>
                        ) : (
                          <span className="text-blue-700">+{ecart}</span>
                        )
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="border-b border-[var(--print-border-light)] px-3 py-2.5 text-[10px] text-[var(--print-text-muted)]">
                      {line.motif_ecart || (isRecu && ecart === 0 ? "Conforme" : "—")}
                    </td>
                  </tr>
                );
              })}

              {Array.from({ length: emptyRowsCount }).map((_, idx) => (
                <tr key={`empty-bt-${idx}`} className="h-[30px]">
                  <td className="border-b border-[var(--print-border-light)]/40 px-3 py-2" />
                  <td className="border-b border-[var(--print-border-light)]/40 px-3 py-2" />
                  <td className="border-b border-[var(--print-border-light)]/40 px-2 py-2" />
                  <td className="border-b border-[var(--print-border-light)]/40 px-2 py-2" />
                  <td className="border-b border-[var(--print-border-light)]/40 px-2 py-2" />
                  <td className="border-b border-[var(--print-border-light)]/40 px-3 py-2" />
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-[var(--print-border-light)]/20 font-bold text-[11px]">
              <tr>
                <td colSpan={2} className="px-3 py-2 text-right uppercase">
                  Totaux :
                </td>
                <td className="px-2 py-2 text-center text-[var(--print-text)] font-black">
                  {transfert.total_quantite_expediee}
                </td>
                <td className="px-2 py-2 text-center text-[var(--print-text)] font-black">
                  {isRecu ? transfert.total_quantite_recue : "—"}
                </td>
                <td className="px-2 py-2 text-center font-black">
                  {isRecu ? (
                    transfert.total_ecart === 0 ? (
                      <span className="text-teal-700">0</span>
                    ) : (
                      <span className="text-red-700">{transfert.total_ecart}</span>
                    )
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2">
                  {isRecu && transfert.total_ecart === 0
                    ? "✓ Réception 100% conforme"
                    : isRecu && Number(transfert.total_ecart) < 0
                    ? "⚠️ Avarie / Manquant transport"
                    : ""}
                </td>
              </tr>
            </tfoot>
          </table>
        </LedgerTable>

        {transfert.notes || transfert.motif_ecart_global ? (
          <InfoCard title="Remarques & Observations Générales">
            <div className="text-[11px] leading-relaxed text-[var(--print-text)]">
              {transfert.notes && <div><strong>Motif :</strong> {transfert.notes}</div>}
              {transfert.motif_ecart_global && (
                <div className="mt-1 text-red-700">
                  <strong>Constat contradictoire à l'arrivée :</strong> {transfert.motif_ecart_global}
                </div>
              )}
            </div>
          </InfoCard>
        ) : null}
      </div>

      {/* Tripartite Signatures: Expéditeur, Transporteur, Réceptionnaire */}
      <div className="mt-auto flex flex-col gap-4 pt-6">
        <div className="grid grid-cols-3 gap-3">
          {/* Expéditeur */}
          <div className="rounded-xl border border-[var(--print-border-medium)] p-3 text-center min-h-[90px] flex flex-col justify-between">
            <div className="text-[9.5px] font-black uppercase text-[var(--print-text-muted)]">
              Visa Expéditeur (Départ)
            </div>
            <div className="text-[10px] text-[var(--print-text-muted)]">
              {transfert.expedie_par_nom || sourceBranch?.name || "Magasin source"}
            </div>
            <div className="border-b border-dashed border-[var(--print-border-light)] mt-4" />
          </div>

          {/* Transporteur */}
          <div className="rounded-xl border border-[var(--print-border-medium)] p-3 text-center min-h-[90px] flex flex-col justify-between">
            <div className="text-[9.5px] font-black uppercase text-[var(--print-text-muted)]">
              Visa Chauffeur / Transporteur
            </div>
            <div className="text-[10px] text-[var(--print-text-muted)]">
              {transfert.chauffeur_nom ? `Prise en charge : ${transfert.chauffeur_nom}` : "Prise en charge matérielle"}
            </div>
            <div className="border-b border-dashed border-[var(--print-border-light)] mt-4" />
          </div>

          {/* Réceptionnaire */}
          <div className="rounded-xl border border-[var(--print-border-medium)] p-3 text-center min-h-[90px] flex flex-col justify-between">
            <div className="text-[9.5px] font-black uppercase text-[var(--print-text-muted)]">
              Visa Réceptionnaire (Arrivée)
            </div>
            <div className="text-[10px] text-[var(--print-text-muted)]">
              {transfert.recu_par_nom || destinationBranch?.name || "Magasin destinataire"}
            </div>
            <div className="border-b border-dashed border-[var(--print-border-light)] mt-4" />
          </div>
        </div>

        <AddressBar company={company} />
      </div>
    </PrintPage>
  );
}
