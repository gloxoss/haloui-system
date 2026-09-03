import {
  AddressBar,
  PrintLogo,
  PrintPage,
  type PrintAttestationContext,
  formatPrintDate,
} from "@/app/print/[kind]/[id]/templates/shared";
import { parseAttestationPayload } from "@/lib/attestations";

export default function AttestationTemplate({
  company,
  attestation,
}: PrintAttestationContext) {
  const payload = parseAttestationPayload(
    attestation.contenu_genere,
    attestation.type,
    attestation.date,
  );

  return (
    <PrintPage className="flex flex-col justify-between bg-white py-[4mm] px-[2mm] text-[var(--print-text)]">
      <div>
        {/* Official Header */}
        <div className="flex items-center justify-between border-b border-[var(--print-border)] pb-3">
          <div className="flex items-center gap-3">
            <PrintLogo company={company} size="large" />
            <div>
              <div className="font-bold text-[14px] uppercase tracking-wide">{company.name}</div>
              {company.arabic_name ? (
                <div className="font-[var(--font-amiri)] text-[13px] text-[var(--print-text-muted)]">
                  {company.arabic_name}
                </div>
              ) : null}
              <div className="text-[10px] text-[var(--print-text-muted)]">
                Département des Ressources Humaines
              </div>
            </div>
          </div>
          <div className="text-right text-[11.5px] font-semibold text-[var(--print-text-muted)]">
            {payload.ville}, le {formatPrintDate(payload.date || attestation.date)}
          </div>
        </div>

        {/* Optional Reference / Objet */}
        {payload.objet ? (
          <div className="mt-4 text-[12px] font-semibold italic text-[var(--print-text-muted)]">
            {payload.objet}
          </div>
        ) : null}

        {/* Dynamic Title */}
        <div className="my-8 text-center">
          <h1 className="inline-block font-[var(--font-print-serif)] text-[21px] font-black uppercase tracking-wider border-b-2 border-[var(--print-text)] pb-1">
            {payload.title}
          </h1>
        </div>

        {/* Custom Body with Preserved Spacing and Justified Paragraphs */}
        <div className="my-6">
          <p className="whitespace-pre-line font-[var(--font-print-serif)] text-[14px] leading-[1.85] text-justify text-[var(--print-text)]">
            {payload.body}
          </p>
        </div>

        {/* Signature and Official Visa Box */}
        <div className="mt-10 flex justify-end">
          <div className="w-[72mm] rounded-xl border border-dashed border-[var(--print-border-strong)] p-3 text-center">
            <div className="text-[11.5px] font-bold uppercase tracking-wider text-[var(--print-text)]">
              {payload.signataire || "La Direction Générale"}
            </div>
            <div className="text-[9.5px] text-[var(--print-text-muted)] mt-0.5">
              Signature & Cachet de l'établissement
            </div>
            <div className="h-[28mm]" />
          </div>
        </div>
      </div>

      {/* Official Legal Footer */}
      <AddressBar company={company} />
    </PrintPage>
  );
}
