import {
  AddressBar,
  PrintPage,
  type PrintAttestationContext,
  formatPrintDate,
} from "@/app/print/[kind]/[id]/templates/shared";

export default function AttestationTemplate({
  company,
  attestation,
}: PrintAttestationContext) {
  return (
    <PrintPage className="flex flex-col gap-4 bg-white py-[3mm]">
      <div className="text-right text-[11px] font-semibold text-[var(--print-text-muted)]">
        Tanger, le {formatPrintDate(attestation.date)}
      </div>

      <h1 className="mt-4 text-center font-[var(--font-print-serif)] text-[22px] font-bold uppercase underline underline-offset-[6px] text-[var(--print-text)]">
        ATTESTATION DE TRAVAIL
      </h1>

      <div>
        <p className="whitespace-pre-line font-[var(--font-print-serif)] text-[14px] leading-[1.7] text-justify text-[var(--print-text)]">
          {attestation.contenu_genere}
        </p>
      </div>

      <div className="mt-4 flex justify-end">
        <div className="w-[60mm] text-right">
          <div className="font-bold text-[var(--print-text)]">La direction</div>
          <div className="h-[34mm]" />
        </div>
      </div>

      <AddressBar company={company} />
    </PrintPage>
  );
}
