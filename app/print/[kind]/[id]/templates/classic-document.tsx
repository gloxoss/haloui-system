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

type ClassicDocumentTemplateProps = PrintDocumentContext & {
  title: string;
  partyTitle: string;
  signatureLeft?: string;
  signatureRight?: string;
  footerNote?: React.ReactNode;
};

export default function ClassicDocumentTemplate({
  company,
  document,
  branch,
  party,
  title,
  partyTitle,
  signatureLeft = "Signature client",
  signatureRight = "La direction",
  footerNote,
}: ClassicDocumentTemplateProps) {
  const printableLines = filterPrintableLines(document.lines);
  const dense = printableLines.length >= 7;
  const ultraDense = printableLines.length >= 10;

  return (
    <PrintPage className={ultraDense ? "flex flex-col gap-2 py-0" : dense ? "flex flex-col gap-2.5 py-0.5" : "flex flex-col gap-3 py-[1mm]"}>
      <PrintDocumentHeader company={company} title={title} />

      <div className={dense ? "grid grid-cols-[1.08fr_0.92fr] gap-2.5" : "grid grid-cols-[1.12fr_0.88fr] gap-3"}>
        <InfoCard title="Informations du document">
          <InfoGrid columns={2}>
            <InfoField label="Date" value={formatPrintDate(document.date)} />
            <InfoField label="Numero" value={document.numero} align="right" />
            <InfoField label="Magasin" value={branch?.name || document.branch_name || "-"} />
            <InfoField label="ICE societe" value={company.ice} align="right" />
            <InfoField label="Adresse livraison" value={party?.address || company.address} />
            <InfoField label="Ville" value="Tanger" align="right" />
          </InfoGrid>
        </InfoCard>

        <PartyCard title={partyTitle} party={party} />
      </div>

      <LedgerTable>
        <table className={ultraDense ? "w-full border-collapse text-[10px]" : dense ? "w-full border-collapse text-[10.5px]" : "w-full border-collapse text-[11px]"}>
          <colgroup>
            <col className="w-[52%]" />
            <col className="w-[12%]" />
            <col className="w-[18%]" />
            <col className="w-[18%]" />
          </colgroup>
          <thead className="bg-[#f4ede3] text-[#2d2017]">
            <tr className={ultraDense ? "font-[var(--font-print-serif)] text-[11px] font-semibold" : dense ? "font-[var(--font-print-serif)] text-[11.5px] font-semibold" : "font-[var(--font-print-serif)] text-[12.5px] font-semibold"}>
              <th className={ultraDense ? "border-b border-[#d7c7b2] px-2.5 py-1.5 text-left" : "border-b border-[#d7c7b2] px-3 py-2 text-left"}>Designation</th>
              <th className={ultraDense ? "border-b border-[#d7c7b2] px-1.5 py-1.5 text-center" : "border-b border-[#d7c7b2] px-2 py-2 text-center"}>Qte</th>
              <th className={ultraDense ? "border-b border-[#d7c7b2] px-1.5 py-1.5 text-right" : "border-b border-[#d7c7b2] px-2 py-2 text-right"}>PU</th>
              <th className={ultraDense ? "border-b border-[#d7c7b2] px-1.5 py-1.5 text-right" : "border-b border-[#d7c7b2] px-2 py-2 text-right"}>PT</th>
            </tr>
          </thead>
          <tbody>
            {printableLines.map((line, index) => {
              const totalLine = Number(line.total_ht) * (1 + Number(line.tva_rate) / 100);

              return (
                <tr key={`${line.id ?? "line"}-${index}`} className="align-top">
                  <td className={ultraDense ? "border-b border-[#eadfce] px-2.5 py-1.5" : dense ? "border-b border-[#eadfce] px-3 py-2" : "border-b border-[#eadfce] px-3 py-2.5"}>{line.designation}</td>
                  <td className={ultraDense ? "border-b border-[#eadfce] px-1.5 py-1.5 text-center" : dense ? "border-b border-[#eadfce] px-2 py-2 text-center" : "border-b border-[#eadfce] px-2 py-2.5 text-center"}>{line.quantite}</td>
                  <td className={ultraDense ? "border-b border-[#eadfce] px-1.5 py-1.5 text-right" : dense ? "border-b border-[#eadfce] px-2 py-2 text-right" : "border-b border-[#eadfce] px-2 py-2.5 text-right"}>
                    {formatPrintAmount(line.prix_unitaire_ht)}
                  </td>
                  <td className={ultraDense ? "border-b border-[#eadfce] px-1.5 py-1.5 text-right font-medium" : dense ? "border-b border-[#eadfce] px-2 py-2 text-right font-medium" : "border-b border-[#eadfce] px-2 py-2.5 text-right font-medium"}>
                    {formatPrintAmount(totalLine)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </LedgerTable>

      <div className={dense ? "grid grid-cols-[1fr_54mm] gap-2.5" : "grid grid-cols-[1fr_58mm] gap-3"}>
        <div className={dense ? "space-y-2.5" : "space-y-3"}>
          <InfoCard title="Resume">
            <div className={ultraDense ? "text-[10px] leading-4 text-[#2d2118]" : dense ? "text-[10.5px] leading-[1.35] text-[#2d2118]" : "text-[11px] leading-5 text-[#2d2118]"}>
              Arrete le present {title.toLowerCase()} a la somme de {document.amount_in_words}.
            </div>
            {document.notes ? (
              <div className={ultraDense ? "mt-1.5 text-[10px] leading-4 text-[#2d2118]" : dense ? "mt-1.5 text-[10.5px] leading-[1.35] text-[#2d2118]" : "mt-2 text-[11px] leading-5 text-[#2d2118]"}>{document.notes}</div>
            ) : null}
            {footerNote ? (
              <div className={ultraDense ? "mt-1.5 text-[10px] leading-4 text-[#2d2118]" : dense ? "mt-1.5 text-[10.5px] leading-[1.35] text-[#2d2118]" : "mt-2 text-[11px] leading-5 text-[#2d2118]"}>{footerNote}</div>
            ) : null}
          </InfoCard>
        </div>

        <TotalsBox
          rows={[
            { label: "TOTAL", value: formatPrintAmount(document.total_ttc), strong: true },
            { label: "AVANCE", value: formatPrintAmount(document.avance) },
            { label: "RESTE", value: formatPrintAmount(document.reste), strong: true },
          ]}
        />
      </div>

      <SignatureStrip left={signatureLeft} right={signatureRight} />

      <AddressBar company={company} />
    </PrintPage>
  );
}
