import {
  AddressBar,
  InfoCard,
  InfoField,
  InfoGrid,
  LedgerTable,
  PartyCard,
  PrintDocumentHeader,
  PrintPage,
  SignatureStrip,
  TotalsBox,
  type PrintDocumentContext,
  filterPrintableLines,
  formatPrintAmount,
  formatPrintDate,
} from "@/app/print/[kind]/[id]/templates/shared";

export default function BonLivraisonTemplate({
  company,
  document,
  branch,
  party,
}: PrintDocumentContext) {
  const printableLines = filterPrintableLines(document.lines);

  return (
    <PrintPage className="flex flex-col gap-3.5 py-[1.5mm]">
      <PrintDocumentHeader company={company} title="Bon de livraison" eyebrow="Bon client" />

      <div className="grid grid-cols-[1.12fr_0.88fr] gap-3">
        <InfoCard title="Informations de livraison">
          <InfoGrid columns={2}>
            <InfoField label="Date" value={formatPrintDate(document.date)} />
            <InfoField label="Numéro" value={document.numero} align="right" />
            <InfoField label="Magasin" value={branch?.name || document.branch_name || "-"} />
            <InfoField label="ICE société" value={company.ice} align="right" />
            <InfoField label="Adresse" value={party?.address || company.address} />
            <InfoField label="Ville" value="Tanger" align="right" />
          </InfoGrid>
        </InfoCard>

        <PartyCard title="Client" party={party} />
      </div>

      <LedgerTable>
        <table className="w-full border-collapse text-[11px]">
          <colgroup>
            <col className="w-[52%]" />
            <col className="w-[12%]" />
            <col className="w-[18%]" />
            <col className="w-[18%]" />
          </colgroup>
          <thead className="bg-[#f4ede3] text-[#2d2017]">
            <tr className="font-[var(--font-print-serif)] text-[12.5px] font-semibold">
              <th className="border-b border-[#d7c7b2] px-3 py-2 text-left">Désignation</th>
              <th className="border-b border-[#d7c7b2] px-2 py-2 text-center">Qté</th>
              <th className="border-b border-[#d7c7b2] px-2 py-2 text-right">PU</th>
              <th className="border-b border-[#d7c7b2] px-2 py-2 text-right">PT</th>
            </tr>
          </thead>
          <tbody>
            {printableLines.map((line, index) => {
              const lineTotal = Number(line.total_ht) * (1 + Number(line.tva_rate) / 100);

              return (
                <tr key={`${line.id ?? "line"}-${index}`} className="align-top">
                  <td className="border-b border-[#eadfce] px-3 py-2.5">{line.designation}</td>
                  <td className="border-b border-[#eadfce] px-2 py-2.5 text-center">
                    {line.quantite}
                    {line.unite && line.unite !== "u" ? ` ${line.unite}` : ""}
                  </td>
                  <td className="border-b border-[#eadfce] px-2 py-2.5 text-right">{formatPrintAmount(line.prix_unitaire_ht)}</td>
                  <td className="border-b border-[#eadfce] px-2 py-2.5 text-right font-medium">{formatPrintAmount(lineTotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </LedgerTable>

      <div className="grid grid-cols-[1fr_66mm] gap-3">
        <InfoCard title="Observation">
          <div className="text-[11px] leading-5 text-[#2d2118]">
            Livraison préparée pour {branch?.name || document.branch_name || "le magasin"}.
            {document.notes ? ` ${document.notes}` : ""}
          </div>
        </InfoCard>

        <TotalsBox
          rows={[
            { label: "Total", value: formatPrintAmount(document.total_ttc), strong: true },
            { label: "Acompte", value: formatPrintAmount(document.avance) },
            { label: "Reste", value: formatPrintAmount(document.reste), strong: true },
          ]}
        />
      </div>

      <SignatureStrip left="Le client" right="La direction" />

      <AddressBar company={company} />
    </PrintPage>
  );
}
