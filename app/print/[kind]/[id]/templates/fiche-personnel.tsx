import Image from "next/image";

import {
  ARABIC_ADDRESS,
  PrintLogo,
  PrintPage,
  type PrintEmployeeContext,
  dottedValue,
  formatPrintDate,
} from "@/app/print/[kind]/[id]/templates/shared";

export default function FichePersonnelTemplate({
  company,
  employee,
  paper = "jaune",
}: PrintEmployeeContext) {
  return (
    <PrintPage
      className={`flex min-h-[272mm] flex-col px-[5mm] py-[4mm] ${
        paper === "blanc" ? "bg-white" : "bg-[#fff4c7]"
      }`}
    >
      <div className="flex min-h-full flex-col rounded-[20px] border border-[#d9caa8] bg-[rgba(255,255,255,0.34)] px-[5mm] py-[4mm]">
        <header className="grid grid-cols-[1fr_36mm] items-start gap-5 border-b border-[#cdb79a] pb-3">
          <div className="space-y-1.5">
            <PrintLogo company={company} size="small" className="-ml-1" />
            <div className="text-[8.5px] font-semibold uppercase tracking-[0.18em] text-[#896743]">
              Archive du personnel
            </div>
            <h1 className="font-[var(--font-print-serif)] text-[24px] font-semibold italic tracking-[0.01em] text-[#2c2018] underline decoration-[#6f5538] underline-offset-[5px]">
              DOSSIER PERSONNEL
            </h1>
          </div>

          <div className="rounded-[16px] border border-[#ccb89a] bg-[rgba(255,255,255,0.55)] px-3 py-2.5 text-right">
            <div className="text-[8px] font-semibold uppercase tracking-[0.16em] text-[#8a6a47]">
              Numero
            </div>
            <div className="mt-1.5 flex items-end justify-end gap-2 text-[#241912]">
              <span className="text-[14px] font-semibold">N</span>
              <span className="inline-flex min-w-[15mm] justify-center border-b border-dotted border-[#5f4b35] text-[24px] font-semibold leading-none">
                {employee.numero}
              </span>
            </div>
          </div>
        </header>

        <div className="mt-4 grid flex-1 grid-cols-[1fr_60mm] gap-5">
          <div className="grid content-start gap-3.5">
            <SectionCard title="Identite">
              <div className="grid gap-3">
                <FieldPair
                  left={{ label: "Nom", value: employee.nom }}
                  right={{ label: "Prenom", value: employee.prenom }}
                />
                <FieldLine
                  label="Date et lieu de naissance"
                  value={[formatPrintDate(employee.date_naissance), employee.lieu_naissance].filter(Boolean).join(" - ")}
                />
                <FieldPair
                  left={{ label: "Etat civil", value: employee.etat_civil }}
                  right={{ label: "N d'imm. CNSS", value: employee.cnss }}
                />
              </div>
            </SectionCard>

            <SectionCard title="Parcours">
              <div className="grid gap-3">
                <FieldPair
                  left={{ label: "Date d'entree", value: formatPrintDate(employee.date_entree) }}
                  right={{ label: "Date de sortie", value: employee.date_sortie ? formatPrintDate(employee.date_sortie) : "" }}
                />
                <FieldLine label="Telephone" value={employee.telephone} />
              </div>
            </SectionCard>

            <SectionCard title="Coordonnees">
              <FieldBlock label="Adresse du salarie" value={employee.adresse} tall />
            </SectionCard>
          </div>

          <aside className="grid content-start gap-3.5">
            <div className="rounded-[18px] border border-[#ccb89a] bg-[rgba(255,255,255,0.55)] p-3">
              <div className="mb-2 text-[8px] font-semibold uppercase tracking-[0.18em] text-[#8a6a47]">
                Photographie
              </div>
              <div className="flex h-[72mm] w-full items-center justify-center overflow-hidden rounded-[12px] border border-[#a88f6e] bg-[#fbf8f1]">
                {employee.photo_path ? (
                  <Image
                    src={employee.photo_path}
                    alt={`${employee.prenom} ${employee.nom}`}
                    width={320}
                    height={420}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid place-items-center px-4 text-center">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a6a47]">
                      Photo
                    </span>
                    <span className="mt-1 text-[11px] text-[#6c5a47]">
                      A ajouter pour completer le dossier.
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[18px] border border-[#ccb89a] bg-[rgba(255,255,255,0.55)] p-3">
              <div className="text-[8px] font-semibold uppercase tracking-[0.18em] text-[#8a6a47]">
                Reference
              </div>
              <div className="mt-2 space-y-2 text-[11px] leading-[1.45] text-[#31241a]">
                <div>
                  Document interne prepare pour le suivi du personnel et l'archivage administratif.
                </div>
                <div>
                  Ville: Tanger
                </div>
              </div>
            </div>
          </aside>
        </div>

        <footer className="mt-4 rounded-[18px] border border-[#d5c4a8] bg-[rgba(255,255,255,0.56)] px-4 py-3">
          <div className="grid grid-cols-[1.15fr_0.85fr] gap-4">
            <div className="text-[9px] leading-[1.55] text-[#4a3829]">
              <div className="font-semibold text-[#2e2219]">{company.name}</div>
              <div>{company.address}</div>
              <div>Tel: {company.phone} | GSM: {company.gsm}</div>
            </div>
            <div className="text-right font-[var(--font-arabic)] text-[9px] leading-[1.75] text-[#4a3829]">
              {ARABIC_ADDRESS}
            </div>
          </div>
        </footer>
      </div>
    </PrintPage>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[18px] border border-[#d5c4a8] bg-[rgba(255,255,255,0.5)] px-4 py-3">
      <div className="mb-2.5 text-[8px] font-semibold uppercase tracking-[0.18em] text-[#8a6a47]">
        {title}
      </div>
      {children}
    </section>
  );
}

function FieldPair({
  left,
  right,
}: {
  left: { label: string; value: string | null | undefined };
  right: { label: string; value: string | null | undefined };
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <FieldBlock label={left.label} value={left.value} />
      <FieldBlock label={right.label} value={right.value} />
    </div>
  );
}

function FieldLine({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return <FieldBlock label={label} value={value} />;
}

function FieldBlock({
  label,
  value,
  tall = false,
}: {
  label: string;
  value: string | null | undefined;
  tall?: boolean;
}) {
  return (
    <div className="grid gap-1.5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7b6245]">
        {label}
      </div>
      <div
        className={`border-b-[1.5px] border-dotted border-[#8e7757] text-[15px] leading-[1.5] text-[#241912] ${
          tall ? "min-h-[22mm] pb-2" : "min-h-[11mm]"
        }`}
      >
        {dottedValue(value)}
      </div>
    </div>
  );
}
