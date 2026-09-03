import {
  AddressBar,
  LedgerTable,
  PrintLogo,
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
  const lineCount = printableLines.length;

  // Smart adaptive density to prevent unnecessary page overflows
  const isCompact = lineCount > 7;
  const isUltraCompact = lineCount > 13;

  const minRows = lineCount > 5 ? 0 : 3;
  const emptyRowsCount = Math.max(0, minRows - lineCount);

  return (
    <PrintPage className="flex flex-col justify-between min-h-full">
      {/* Upper Content */}
      <div className={`flex flex-col ${isCompact ? "gap-2.5" : "gap-3.5"}`}>
        {/* Modern Header: Company on Left, Document Title on Right */}
        <div
          className={`flex items-start justify-between gap-6 border-b-2 border-[var(--print-border-strong)] ${
            isCompact ? "pb-2" : "pb-3"
          }`}
        >
          {/* Company Branding & Contact */}
          <div className="flex items-start gap-3.5">
            <PrintLogo company={company} size="large" className="shrink-0" />
            <div className="text-[11px] text-[var(--print-text-muted)] space-y-0.5 pt-0.5">
              <div className="flex items-baseline gap-2">
                <span className="text-[13px] font-black uppercase text-[var(--print-text)] tracking-tight">
                  {company.name}
                </span>
                {company.arabic_name ? (
                  <span className="font-[var(--font-arabic)] text-[11px] font-bold text-[var(--print-accent-dark)]">
                    {company.arabic_name}
                  </span>
                ) : null}
              </div>
              {company.address ? <div>{company.address}</div> : null}
              {company.phone || company.gsm ? (
                <div>
                  Tél : <strong className="text-[var(--print-text)]">{company.phone || company.gsm}</strong>
                </div>
              ) : null}
              {company.ice ? (
                <div className="font-mono text-[10px]">
                  ICE : <strong className="font-sans text-[var(--print-text)]">{company.ice}</strong>
                </div>
              ) : null}
            </div>
          </div>

          {/* Document Title & Metadata */}
          <div className="text-right space-y-0.5">
            <h1
              className={`${
                isCompact ? "text-[26px]" : "text-[28px]"
              } font-black uppercase tracking-tight text-[var(--print-accent-dark)] leading-none`}
            >
              Bon de livraison
            </h1>
            <div className="inline-flex flex-col items-end gap-0.5 pt-1 text-[11.5px]">
              <div>
                <span className="text-[var(--print-text-muted)] font-semibold">N° : </span>
                <span className="font-black text-[var(--print-text)]">BL-{document.numero}</span>
              </div>
              <div>
                <span className="text-[var(--print-text-muted)] font-semibold">Date : </span>
                <span className="font-bold text-[var(--print-text)]">{formatPrintDate(document.date)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Client Box: Clean & Full Width */}
        <div
          className={`rounded-xl border border-[var(--print-border-medium)] ${
            isCompact ? "p-2.5" : "p-3.5"
          } bg-white`}
        >
          <div className="text-[8.5px] font-black uppercase tracking-[0.15em] text-[var(--print-text-muted)] mb-1 border-b border-[var(--print-border-light)] pb-0.5">
            Destinataire / Client
          </div>
          <div className="grid grid-cols-2 gap-4 items-center">
            <div>
              <div className="text-[13px] font-black text-[var(--print-text)]">
                {party?.name || "Client Comptoir"}
              </div>
              {party?.address ? (
                <div className="text-[11px] font-medium text-[var(--print-text-muted)] mt-0.5">
                  {party.address}
                </div>
              ) : null}
            </div>
            <div className="text-right text-[11.5px] space-y-0.5">
              {party?.phone ? (
                <div>
                  Tél : <strong className="text-[var(--print-text)]">{party.phone}</strong>
                </div>
              ) : null}
              {party?.ice ? (
                <div className="font-mono text-[10px]">
                  ICE : <strong className="font-sans text-[var(--print-text)]">{party.ice}</strong>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Full-width Products Table */}
        <LedgerTable>
          <table className="w-full border-collapse">
            <colgroup>
              <col className="w-[54%]" />
              <col className="w-[12%]" />
              <col className="w-[17%]" />
              <col className="w-[17%]" />
            </colgroup>
            <thead className="bg-white text-[var(--print-text)]">
              <tr className="font-[var(--font-print-serif)] text-[11px] font-black uppercase">
                <th
                  className={`border-b-2 border-[var(--print-border-strong)] ${
                    isCompact ? "px-3 py-1.5" : "px-4 py-2.5"
                  } text-left`}
                >
                  Désignation
                </th>
                <th
                  className={`border-b-2 border-[var(--print-border-strong)] ${
                    isCompact ? "px-2 py-1.5" : "px-2 py-2.5"
                  } text-center`}
                >
                  Qté
                </th>
                <th
                  className={`border-b-2 border-[var(--print-border-strong)] ${
                    isCompact ? "px-3 py-1.5" : "px-3 py-2.5"
                  } text-right`}
                >
                  P.U. HT
                </th>
                <th
                  className={`border-b-2 border-[var(--print-border-strong)] ${
                    isCompact ? "px-3 py-1.5" : "px-4 py-2.5"
                  } text-right`}
                >
                  Montant TTC
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {printableLines.map((line, index) => {
                const lineTotal = Number(line.total_ht) * (1 + Number(line.tva_rate) / 100);

                return (
                  <tr key={`${line.id ?? "line"}-${index}`} className="align-top">
                    <td
                      className={`border-b border-[var(--print-border-light)] ${
                        isUltraCompact
                          ? "px-3 py-1 text-[11px]"
                          : isCompact
                          ? "px-3 py-1.5 text-[11.5px]"
                          : "px-4 py-2.5 text-[12px]"
                      } font-semibold text-[var(--print-text)]`}
                    >
                      {line.designation}
                    </td>
                    <td
                      className={`border-b border-[var(--print-border-light)] ${
                        isUltraCompact
                          ? "px-2 py-1 text-[11px]"
                          : isCompact
                          ? "px-2 py-1.5 text-[11.5px]"
                          : "px-2 py-2.5 text-[12px]"
                      } text-center font-bold text-[var(--print-text)]`}
                    >
                      {line.quantite}
                      {line.unite && line.unite !== "u" ? ` ${line.unite}` : ""}
                    </td>
                    <td
                      className={`border-b border-[var(--print-border-light)] ${
                        isUltraCompact
                          ? "px-3 py-1 text-[11px]"
                          : isCompact
                          ? "px-3 py-1.5 text-[11.5px]"
                          : "px-3 py-2.5 text-[12px]"
                      } text-right font-medium text-[var(--print-text)]`}
                    >
                      {formatPrintAmount(line.prix_unitaire_ht)}
                    </td>
                    <td
                      className={`border-b border-[var(--print-border-light)] ${
                        isUltraCompact
                          ? "px-3 py-1 text-[11px]"
                          : isCompact
                          ? "px-3 py-1.5 text-[11.5px]"
                          : "px-4 py-2.5 text-[12px]"
                      } text-right font-black text-[var(--print-text)]`}
                    >
                      {formatPrintAmount(lineTotal)}
                    </td>
                  </tr>
                );
              })}

              {/* Empty rows only for tiny documents */}
              {Array.from({ length: emptyRowsCount }).map((_, idx) => (
                <tr key={`empty-bl-${idx}`} className="h-[28px]">
                  <td className="border-b border-[var(--print-border-light)]/40 px-4 py-1" />
                  <td className="border-b border-[var(--print-border-light)]/40 px-2 py-1" />
                  <td className="border-b border-[var(--print-border-light)]/40 px-3 py-1" />
                  <td className="border-b border-[var(--print-border-light)]/40 px-4 py-1" />
                </tr>
              ))}
            </tbody>
          </table>
        </LedgerTable>
      </div>

      {/* Bottom Closing Section: Kept together to prevent orphaned footers */}
      <div
        className={`mt-auto flex flex-col ${
          isCompact ? "gap-2 pt-2" : "gap-3 pt-3"
        } break-inside-avoid page-break-inside-avoid`}
      >
        {/* Lower Details: Words Total + Clean Totals Box */}
        <div className="grid grid-cols-[1fr_64mm] gap-4 items-start pt-1">
          <div
            className={`${
              isCompact ? "text-[11px]" : "text-[11.5px]"
            } leading-relaxed text-[var(--print-text)] space-y-1`}
          >
            <div>
              Arrêté le présent bon de livraison à la somme de : <br />
              <span className="font-extrabold text-[12px] uppercase tracking-wide text-[var(--print-accent-dark)]">
                {document.amount_in_words}
              </span>
            </div>
            {document.notes ? (
              <div className="text-[10.5px] text-[var(--print-text-muted)] pt-0.5 border-t border-[var(--print-border-light)]">
                <strong>Remarques :</strong> {document.notes}
              </div>
            ) : null}
          </div>

          <TotalsBox
            rows={[
              { label: "TOTAL TTC", value: formatPrintAmount(document.total_ttc), strong: true },
              ...(Number(document.avance) > 0
                ? [{ label: "ACOMPTE", value: formatPrintAmount(document.avance) }]
                : []),
              ...(Number(document.avance) > 0
                ? [{ label: "RESTE À PAYER", value: formatPrintAmount(document.reste), strong: true }]
                : []),
            ]}
          />
        </div>

        {/* Bottom Pinned Section */}
        <SignatureStrip
          left="Le réceptionnaire (Client)"
          right="Le responsable expédition"
          compact={isCompact}
        />
        <AddressBar company={company} compact={isCompact} />
      </div>
    </PrintPage>
  );
}
