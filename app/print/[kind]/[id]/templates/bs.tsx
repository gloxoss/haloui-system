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
  const fillerRows = Math.max(0, 2 - document.lines.length);

  return (
    <PrintPage className="flex flex-col gap-3.5 py-[1.5mm]">
      <PrintDocumentHeader company={company} title="Bon de sortie" eyebrow="Mouvement interne" />

      <div className="grid grid-cols-2 gap-3">
        <InfoCard title="Départ">
          <InfoGrid columns={1}>
            <InfoField label="Date" value={formatPrintDate(document.date)} />
            <InfoField label="Numéro" value={document.numero} />
            <InfoField label="Magasin source" value={sourceBranch?.name || document.source_branch_name || "-"} />
          </InfoGrid>
        </InfoCard>

        <InfoCard title="Arrivée">
          <InfoGrid columns={1}>
            <InfoField label="Magasin destination" value={destinationBranch?.name || document.destination_branch_name || "-"} />
            <InfoField label="Adresse société" value={company.address} />
            <InfoField label="Référence interne" value={`BS-${document.numero}`} />
          </InfoGrid>
        </InfoCard>
      </div>

      <LedgerTable>
        <table className="w-full border-collapse text-[11px]">
          <colgroup>
            <col className="w-[58%]" />
            <col className="w-[16%]" />
            <col className="w-[26%]" />
          </colgroup>
          <thead className="bg-[#f4ede3] text-[#2d2017]">
            <tr className="font-[var(--font-print-serif)] text-[12.5px] font-semibold">
              <th className="border-b border-[#d7c7b2] px-3 py-2 text-left">Désignation</th>
              <th className="border-b border-[#d7c7b2] px-2 py-2 text-center">Qté</th>
              <th className="border-b border-[#d7c7b2] px-2 py-2 text-center">Unité</th>
            </tr>
          </thead>
          <tbody>
            {document.lines.map((line, index) => (
              <tr key={`${line.id ?? "line"}-${index}`} className="align-top">
                <td className="border-b border-[#eadfce] px-3 py-2.5">{line.designation}</td>
                <td className="border-b border-[#eadfce] px-2 py-2.5 text-center">{line.quantite}</td>
                <td className="border-b border-[#eadfce] px-2 py-2.5 text-center">{line.unite || "-"}</td>
              </tr>
            ))}
            {Array.from({ length: fillerRows }).map((_, index) => (
              <tr key={`blank-${index}`}>
                <td className="h-7 border-b border-[#f0e7db] px-3">&nbsp;</td>
                <td className="border-b border-[#f0e7db] px-2">&nbsp;</td>
                <td className="border-b border-[#f0e7db] px-2">&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>
      </LedgerTable>

      {document.notes ? (
        <InfoCard title="Observations">
          <div className="text-[11px] leading-5 text-[#2d2118]">{document.notes}</div>
        </InfoCard>
      ) : null}

      <SignatureStrip
        left={`Responsable ${sourceBranch?.name || "magasin source"}`}
        right={`Responsable ${destinationBranch?.name || "magasin destination"}`}
      />

      <AddressBar company={company} />
    </PrintPage>
  );
}
