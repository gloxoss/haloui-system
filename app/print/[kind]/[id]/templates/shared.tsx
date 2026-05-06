import Image from "next/image";

import { PrintLayout } from "@/components/print/print-layout";
import {
  type BranchRecord,
  type CompanyRecord,
  type DocumentLineInput,
  type DocumentRecord,
  type EmployeeRecord,
  type EntityRecord,
} from "@/lib/types";
import { formatDate, formatNumber } from "@/lib/utils";

export type PrintableDocument = DocumentRecord & {
  branch_name?: string | null;
  source_branch_name?: string | null;
  destination_branch_name?: string | null;
  client_name?: string | null;
  fournisseur_name?: string | null;
  created_by_name?: string | null;
  updated_by_name?: string | null;
  lines: DocumentLineInput[];
  amount_in_words: string;
};

export type PrintableAttestation = {
  id: number;
  employe_id: number;
  date: string;
  type: string;
  contenu_genere: string;
  created_by: number | null;
  created_at: string;
  numero: number;
  nom: string;
  prenom: string;
  date_naissance: string;
  lieu_naissance: string;
  etat_civil: string;
  date_entree: string;
  date_sortie: string;
  cnss: string;
  adresse: string;
  telephone: string;
  salaire: number;
  photo_path: string;
};

export const ARABIC_ADDRESS = "شارع الإمام مسلم درادب رقم 37 - طنجة";

export function PrintPage({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <PrintLayout className={className}>{children}</PrintLayout>;
}

export function PrintLogo({
  company,
  size = "large",
  className = "",
}: {
  company: CompanyRecord;
  size?: "small" | "large";
  className?: string;
}) {
  const dimensions = size === "large" ? { width: 196, height: 102 } : { width: 150, height: 78 };

  return (
    <div className={className}>
      <Image
        src={company.logo_path || "/assets/logo.svg"}
        alt={company.name}
        width={dimensions.width}
        height={dimensions.height}
        className={size === "large" ? "h-auto w-[156px] object-contain" : "h-auto w-[122px] object-contain"}
        priority
      />
    </div>
  );
}

export function PrintDocumentHeader({
  company,
  title,
  eyebrow = "Document commercial",
}: {
  company: CompanyRecord;
  title: string;
  eyebrow?: string;
}) {
  return (
    <div className="border-b border-[#cdb79a] pb-2.5">
      <div className="flex items-end justify-between gap-5">
        <div className="space-y-0.5">
          <div className="text-[8.5px] font-semibold uppercase tracking-[0.16em] text-[#8a6b49]">{eyebrow}</div>
          <h1 className="font-[var(--font-print-serif)] text-[19px] font-semibold uppercase tracking-[0.03em] text-[#2f2218]">
            {title}
          </h1>
          <div className="text-[10.5px] text-[#6b5a47]">{company.name} · Tanger</div>
        </div>
        <PrintLogo company={company} size="small" className="shrink-0" />
      </div>
    </div>
  );
}

export function InfoCard({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-[11px] border border-[#d2c1ab] bg-[#f8f4ed] px-3 py-2.5 ${className}`}>
      {title ? (
        <div className="mb-1.5 text-[8.5px] font-semibold uppercase tracking-[0.14em] text-[#876947]">{title}</div>
      ) : null}
      {children}
    </section>
  );
}

export function InfoGrid({
  children,
  columns = 2,
}: {
  children: React.ReactNode;
  columns?: 1 | 2;
}) {
  return (
    <div className={columns === 2 ? "grid grid-cols-2 gap-x-3 gap-y-1.5" : "grid gap-y-1.5"}>
      {children}
    </div>
  );
}

export function InfoField({
  label,
  value,
  align = "left",
}: {
  label: string;
  value: React.ReactNode;
  align?: "left" | "right";
}) {
  const displayValue = value === null || value === undefined || value === "" ? "-" : value;

  return (
    <div className={align === "right" ? "text-right" : ""}>
      <div className="text-[8px] font-semibold uppercase tracking-[0.1em] text-[#8b6f4f]">{label}</div>
      <div className="mt-0.5 text-[10.5px] font-semibold leading-[1.25] text-[#241912]">{displayValue}</div>
    </div>
  );
}

export function PartyCard({
  title,
  party,
}: {
  title: string;
  party?: EntityRecord | null;
}) {
  return (
    <InfoCard title={title}>
      <div className="space-y-0.5 text-[10.5px] leading-[1.3] text-[#2d2118]">
        <div className="text-[11.5px] font-semibold">{party?.name || "Comptoir"}</div>
        <div>{party?.address || "-"}</div>
        <div>Tél: {party?.phone || "-"}</div>
        <div>ICE: {party?.ice || "-"}</div>
      </div>
    </InfoCard>
  );
}

export function LedgerTable({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`overflow-hidden rounded-[12px] border border-[#d2c1ab] ${className}`}>{children}</div>;
}

export function TotalsBox({
  rows,
}: {
  rows: Array<{ label: string; value: React.ReactNode; strong?: boolean }>;
}) {
  return (
    <div className="totals-box overflow-hidden rounded-[12px] border border-[#c7b08f] bg-[#fcfaf6]">
      <div className="border-b border-[#d8cab8] px-2.5 py-1.5 text-[8.5px] font-semibold uppercase tracking-[0.14em] text-[#876947]">
        Totaux
      </div>
      {rows.map((row, index) => (
        <div
          key={`${row.label}-${index}`}
          className={`flex items-center justify-between gap-4 px-2.5 py-1.5 text-[10.5px] ${
            index < rows.length - 1 ? "border-b border-[#e4d9ca]" : ""
          } ${row.strong ? "font-semibold text-[#22170f]" : "text-[#3b2b1f]"}`}
        >
          <span>{row.label}</span>
          <span>{row.value}</span>
        </div>
      ))}
    </div>
  );
}

export function SignatureStrip({
  left,
  right,
}: {
  left: string;
  right: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-6 pt-0.5 text-[10.5px]">
      <div>
        <div className="font-semibold text-[#2d2118]">{left}</div>
        <div className="mt-1 h-[9mm] border-b border-dashed border-[#baa487]" />
      </div>
      <div className="text-right">
        <div className="font-semibold text-[#2d2118]">{right}</div>
        <div className="mt-1 h-[9mm] border-b border-dashed border-[#baa487]" />
      </div>
    </div>
  );
}

export function AddressBar({ company }: { company: CompanyRecord }) {
  return (
    <div className="rounded-[12px] border border-[#d2c1ab] px-3 py-1.5 text-center text-[9px] leading-[1.35] text-[#4a3829]">
      <div>Siège social: {company.address}</div>
      <div>Tel: {company.phone} · GSM: {company.gsm}</div>
      <div>RC: {company.rc} · IF: {company.if_number} · TP: {company.tp} · ICE: {company.ice}</div>
    </div>
  );
}

export function BilingualAddressBar({ company }: { company: CompanyRecord }) {
  return (
    <div className="mt-auto flex items-end justify-between gap-6 text-[11px] leading-5">
      <div className="flex-1">@ {company.address} - Tel: {company.phone} - GSM: {company.gsm}</div>
      <div className="flex-1 text-right font-[var(--font-arabic)]">
        {ARABIC_ADDRESS} - {company.gsm} - {company.phone}
      </div>
    </div>
  );
}

export function PlainDocumentHeading({
  company,
}: {
  company: CompanyRecord;
}) {
  return (
    <div className="mb-3 flex justify-center">
      <div className="text-center">
        <PrintLogo company={company} />
      </div>
    </div>
  );
}

export function formatPrintAmount(value: number | string | null | undefined) {
  const numeric = typeof value === "string" ? Number(value) : value ?? 0;
  return formatNumber(numeric);
}

export function formatPrintDate(value: string | null | undefined) {
  return value ? formatDate(value) : "—";
}

export function filterPrintableLines(lines: DocumentLineInput[]) {
  return lines.filter((line) => {
    const hasDesignation = Boolean(line.designation?.trim());
    const hasProduct = line.produit_id != null;
    const hasPrice = Number(line.prix_unitaire_ht) > 0;
    const hasStoredTotal = Number(line.total_ht) > 0;
    const hasDiscount = Number(line.remise) > 0;

    return hasDesignation || hasProduct || hasPrice || hasStoredTotal || hasDiscount;
  });
}

export function dottedValue(value: string | null | undefined) {
  return value?.trim() ? value : " ";
}

export function resolvePartyLine(party: EntityRecord | null | undefined) {
  if (!party) {
    return "—";
  }

  return [party.name, party.address].filter(Boolean).join(", ");
}

export function extractDateFromNotes(notes: string | null | undefined) {
  const match = notes?.match(/\b(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})\b/);
  return match?.[1] ?? null;
}

export type PrintDocumentContext = {
  company: CompanyRecord;
  document: PrintableDocument;
  branch?: BranchRecord | null;
  sourceBranch?: BranchRecord | null;
  destinationBranch?: BranchRecord | null;
  party?: EntityRecord | null;
};

export type PrintEmployeeContext = {
  company: CompanyRecord;
  employee: EmployeeRecord;
  paper?: "jaune" | "blanc";
};

export type PrintAttestationContext = {
  company: CompanyRecord;
  attestation: PrintableAttestation;
};
