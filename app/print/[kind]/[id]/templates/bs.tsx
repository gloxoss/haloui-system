import {
  AddressBar,
  InfoCard,
  InfoField,
  InfoGrid,
  LedgerTable,
  PrintDocumentHeader,
  PrintPage,
  SignatureStrip,
  type PrintDocumentContext,
  formatPrintDate,
} from "@/app/print/[kind]/[id]/templates/shared";

export default function BonSortieTemplate({
  company,
  document,
  sourceBranch,
  destinationBranch,
}: PrintDocumentContext) {
  const minRows = 4;
  const emptyRowsCount = Math.max(0, minRows - document.lines.length);

  return (
    <PrintPage className="flex flex-col justify-between h-full min-h-[inherit]">
      {/* Upper Content */}
      <div className="flex flex-col gap-4">
        <PrintDocumentHeader company={company} title="Bon de sortie" eyebrow="Transfert & Mouvement interne" />

        <div className="grid grid-cols-2 gap-4">
          <InfoCard title="Magasin expéditeur (Départ)">
            <InfoGrid columns={1}>
              <InfoField label="Date de sortie" value={formatPrintDate(document.date)} />
              <InfoField label="N° Bon de sortie" value={`BS-${document.numero}`} />
              <InfoField label="Magasin source" value={sourceBranch?.name || document.source_branch_name || "Dépôt central"} />
            </InfoGrid>
          </InfoCard>

          <InfoCard title="Magasin destinataire (Arrivée)">
            <InfoGrid columns={1}>
              <InfoField label="Magasin de destination" value={destinationBranch?.name || document.destination_branch_name || "Magasin"} />
              <InfoField label="Adresse société" value={company.address} />
              <InfoField label="Référence interne" value={`MVT-${document.id}`} />
            </InfoGrid>
          </InfoCard>
        </div>

        <LedgerTable>
          <table className="w-full border-collapse text-[12px]">
            <colgroup>
              <col className="w-[60%]" />
              <col className="w-[20%]" />
              <col className="w-[20%]" />
            </colgroup>
            <thead className="bg-white text-[var(--print-text)]">
              <tr className="font-[var(--font-print-serif)] text-[12px] font-black uppercase">
                <th className="border-b-2 border-[var(--print-border-strong)] px-4 py-2.5 text-left">Désignation article</th>
                <th className="border-b-2 border-[var(--print-border-strong)] px-3 py-2.5 text-center">Quantité sortie</th>
                <th className="border-b-2 border-[var(--print-border-strong)] px-3 py-2.5 text-center">Unité</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {document.lines.map((line, index) => (
                <tr key={`${line.id ?? "line"}-${index}`} className="align-top">
                  <td className="border-b border-[var(--print-border-light)] px-4 py-3 font-semibold text-[var(--print-text)]">{line.designation}</td>
                  <td className="border-b border-[var(--print-border-light)] px-3 py-3 text-center font-bold text-[var(--print-text)]">{line.quantite}</td>
                  <td className="border-b border-[var(--print-border-light)] px-3 py-3 text-center font-medium text-[var(--print-text-muted)]">{line.unite || "u"}</td>
                </tr>
              ))}
              {Array.from({ length: emptyRowsCount }).map((_, idx) => (
                <tr key={`empty-bs-${idx}`} className="h-[36px]">
                  <td className="border-b border-[var(--print-border-light)]/40 px-4 py-2" />
                  <td className="border-b border-[var(--print-border-light)]/40 px-3 py-2" />
                  <td className="border-b border-[var(--print-border-light)]/40 px-3 py-2" />
                </tr>
              ))}
            </tbody>
          </table>
        </LedgerTable>

        {document.notes ? (
          <InfoCard title="Remarques & Motif de sortie">
            <div className="text-[12px] leading-relaxed text-[var(--print-text)]">{document.notes}</div>
          </InfoCard>
        ) : null}
      </div>

      {/* Pinned Footer */}
      <div className="mt-auto flex flex-col gap-4 pt-6">
        <SignatureStrip
          left={`Responsable : ${sourceBranch?.name || "Magasin source"}`}
          right={`Réceptionnaire : ${destinationBranch?.name || "Magasin destination"}`}
        />
        <AddressBar company={company} />
      </div>
    </PrintPage>
  );
}
