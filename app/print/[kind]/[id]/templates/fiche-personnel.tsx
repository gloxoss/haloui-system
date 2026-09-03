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
}: PrintEmployeeContext) {
  return (
    <PrintPage className="flex min-h-[272mm] flex-col bg-white px-[5mm] py-[4mm]">
      <div className="flex min-h-full flex-col rounded-[16px] border-2 border-[var(--print-border-strong)] bg-white px-[5mm] py-[4mm]">
        <header className="grid grid-cols-[1fr_36mm] items-start gap-5 border-b-2 border-[var(--print-border-strong)] pb-3">
          <div className="space-y-1.5">
            <PrintLogo company={company} size="small" className="-ml-1" />
            <div className="text-[8.5px] font-bold uppercase tracking-[0.18em] text-[var(--print-text-muted)]">
              Archive du personnel
            </div>
            <h1 className="font-[var(--font-print-serif)] text-[24px] font-bold tracking-[0.01em] text-[var(--print-text)]">
              DOSSIER PERSONNEL
            </h1>
          </div>

          <div className="rounded-[12px] border border-[var(--print-border-strong)] bg-white px-3 py-2.5 text-right">
            <div className="text-[8px] font-bold uppercase tracking-[0.16em] text-[var(--print-text-muted)]">
              Numéro
            </div>
            <div className="mt-1.5 flex items-end justify-end gap-2 text-[var(--print-text)]">
              <span className="text-[14px] font-bold">N°</span>
              <span className="inline-flex min-w-[15mm] justify-center border-b-2 border-dotted border-[var(--print-border-strong)] text-[24px] font-bold leading-none">
                {employee.numero}
              </span>
            </div>
          </div>
        </header>

        <div className="mt-4 grid flex-1 grid-cols-[1fr_60mm] gap-5">
          <div className="grid content-start gap-3.5">
            <SectionCard title="Identité">
              <div className="grid gap-3">
                <FieldPair
                  left={{ label: "Nom", value: employee.nom }}
                  right={{ label: "Prénom", value: employee.prenom }}
                />
                <FieldLine
                  label="Date et lieu de naissance"
                  value={[formatPrintDate(employee.date_naissance), employee.lieu_naissance].filter(Boolean).join(" - ")}
                />
                <FieldPair
                  left={{ label: "État civil", value: employee.etat_civil }}
                  right={{ label: "N° d'imm. CNSS", value: employee.cnss }}
                />
              </div>
            </SectionCard>

            <SectionCard title="Parcours">
              <div className="grid gap-3">
                <FieldPair
                  left={{ label: "Date d'entrée", value: formatPrintDate(employee.date_entree) }}
                  right={{ label: "Date de sortie", value: employee.date_sortie ? formatPrintDate(employee.date_sortie) : "" }}
                />
                <FieldLine label="Téléphone" value={employee.telephone} />
              </div>
            </SectionCard>

            <SectionCard title="Coordonnées">
              <FieldBlock label="Adresse du salarié" value={employee.adresse} tall />
            </SectionCard>
          </div>

          <aside className="grid content-start gap-3.5">
            <div className="rounded-[12px] border border-[var(--print-border-strong)] bg-white p-3">
              <div className="mb-2 text-[8px] font-bold uppercase tracking-[0.18em] text-[var(--print-text-muted)]">
                Photographie
              </div>
              <div className="flex h-[72mm] w-full items-center justify-center overflow-hidden rounded-[10px] border border-[var(--print-border-strong)] bg-white">
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
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--print-text-muted)]">
                      Photo
                    </span>
                    <span className="mt-1 text-[11px] text-[var(--print-text-muted)]">
                      À coller pour le dossier.
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[12px] border border-[var(--print-border-strong)] bg-white p-3">
              <div className="text-[8px] font-bold uppercase tracking-[0.18em] text-[var(--print-text-muted)]">
                Référence
              </div>
              <div className="mt-2 space-y-2 text-[11px] leading-[1.45] text-[var(--print-text)]">
                <div>
                  Document interne préparé pour le suivi du personnel et l'archivage administratif.
                </div>
                <div className="font-semibold">
                  Ville: Tanger
                </div>
              </div>
            </div>
          </aside>
        </div>

        <footer className="mt-4 rounded-[12px] border border-[var(--print-border-strong)] bg-white px-4 py-3">
          <div className="grid grid-cols-[1.15fr_0.85fr] gap-4">
            <div className="text-[9px] leading-[1.55] text-[var(--print-text)]">
              <div className="font-bold text-[var(--print-text)]">{company.name}</div>
              <div>{company.address}</div>
              <div className="text-[var(--print-text-muted)]">Tél: {company.phone || "-"} | GSM: {company.gsm || "-"}</div>
            </div>
            <div className="text-right font-[var(--font-arabic)] text-[9px] leading-[1.75] text-[var(--print-text)]">
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
    <section className="rounded-[12px] border border-[var(--print-border-strong)] bg-white px-4 py-3">
      <div className="mb-2.5 text-[8px] font-bold uppercase tracking-[0.18em] text-[var(--print-text-muted)]">
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
      <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--print-text-muted)]">
        {label}
      </div>
      <div
        className={`border-b-2 border-dotted border-[var(--print-border-strong)] text-[15px] font-semibold leading-[1.5] text-[var(--print-text)] ${
          tall ? "min-h-[22mm] pb-2" : "min-h-[11mm]"
        }`}
      >
        {dottedValue(value)}
      </div>
    </div>
  );
}
