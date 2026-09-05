import Image from "next/image";

import { PrintLayout } from "@/components/print/print-layout";
import { getThemeSettings } from "@/lib/data";
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

export const ARABIC_ADDRESS = "المقر الاجتماعي - المركز التجاري";

export function PrintPage({
  children,
  className,
  theme,
}: {
  children: React.ReactNode;
  className?: string;
  theme?: string;
}) {
  const activeTheme = theme || getThemeSettings().preset;
  return (
    <PrintLayout className={className} theme={activeTheme}>
      {children}
    </PrintLayout>
  );
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
  const isCustomLogo =
    Boolean(company.logo_path) &&
    !company.logo_path?.startsWith("/assets/logo") &&
    !company.logo_path?.startsWith("/assets/brand-icon");

  if (isCustomLogo && company.logo_path) {
    const dimensions = size === "large" ? { width: 180, height: 75 } : { width: 140, height: 60 };
    return (
      <div className={className}>
        <Image
          src={company.logo_path}
          alt={company.name}
          width={dimensions.width}
          height={dimensions.height}
          className={
            size === "large"
              ? "h-14 w-auto max-w-[180px] object-contain"
              : "h-11 w-auto max-w-[140px] object-contain"
          }
          priority
        />
      </div>
    );
  }

  // Modern corporate emblem mark
  const iconPx = size === "large" ? 48 : 40;
  return (
    <div className={`flex items-center ${className}`}>
      <Image
        src="/assets/brand-icon.svg"
        alt={company.name}
        width={iconPx}
        height={iconPx}
        style={{ width: `${iconPx}px`, height: `${iconPx}px` }}
        className="rounded-xl object-contain shadow-xs shrink-0"
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
    <div className="border-b-2 border-[var(--print-border-strong)] pb-3">
      <div className="flex items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="text-[9.5px] font-bold uppercase tracking-[0.2em] text-[var(--print-text-muted)]">
            {eyebrow}
          </div>
          <h1 className="font-[var(--font-print-serif)] text-[26px] font-black uppercase tracking-[0.04em] text-[var(--print-text)]">
            {title}
          </h1>
          <div className="text-[12px] font-bold text-[var(--print-text-muted)]">
            {company.name} · Tanger
          </div>
        </div>
        <PrintLogo company={company} size="large" className="shrink-0" />
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
    <section
      className={`rounded-xl border border-[var(--print-border-medium)] bg-white px-3.5 py-3 shadow-none ${className}`}
    >
      {title ? (
        <div className="mb-2 text-[9.5px] font-black uppercase tracking-[0.15em] text-[var(--print-text-muted)] border-b border-[var(--print-border-light)] pb-1">
          {title}
        </div>
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
    <div className={columns === 2 ? "grid grid-cols-2 gap-x-4 gap-y-2" : "grid gap-y-2"}>
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
      <div className="text-[8.5px] font-bold uppercase tracking-[0.1em] text-[var(--print-text-muted)]">
        {label}
      </div>
      <div className="mt-0.5 text-[12px] font-bold leading-snug text-[var(--print-text)]">
        {displayValue}
      </div>
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
      <div className="space-y-1 text-[11.5px] leading-snug text-[var(--print-text)]">
        <div className="text-[13.5px] font-black text-[var(--print-text)]">{party?.name || "Client Comptoir"}</div>
        <div className="text-[var(--print-text-muted)] font-medium">{party?.address || "Adresse non spécifiée"}</div>
        <div className="text-[var(--print-text-muted)] font-medium">Tél : <strong className="text-[var(--print-text)]">{party?.phone || "-"}</strong></div>
        <div className="text-[var(--print-text-muted)] font-mono text-[10.5px]">ICE : <strong className="text-[var(--print-text)] font-sans">{party?.ice || "-"}</strong></div>
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
  return (
    <div className={`overflow-hidden rounded-xl border border-[var(--print-border-strong)] bg-white ${className}`}>
      {children}
    </div>
  );
}

export function TotalsBox({
  rows,
}: {
  rows: Array<{ label: string; value: React.ReactNode; strong?: boolean }>;
}) {
  return (
    <div className="totals-box overflow-hidden rounded-xl border border-[var(--print-border-strong)] bg-white">
      <div className="border-b border-[var(--print-border-strong)] bg-white px-3 py-2 text-[9.5px] font-black uppercase tracking-[0.15em] text-[var(--print-text-muted)]">
        Totaux du document
      </div>
      {rows.map((row, index) => (
        <div
          key={`${row.label}-${index}`}
          className={`flex items-center justify-between gap-4 px-3.5 py-2 text-[11.5px] bg-white ${
            index < rows.length - 1 ? "border-b border-[var(--print-border-light)]" : ""
          } ${row.strong ? "text-[13.5px] font-black text-[var(--print-text)]" : "text-[var(--print-text)] font-semibold"}`}
        >
          <span className="font-semibold">{row.label}</span>
          <span className="font-bold">{row.value}</span>
        </div>
      ))}
    </div>
  );
}

export function SignatureStrip({
  left,
  right,
  compact = false,
  signatureData,
  signedByName,
  signedAt,
}: {
  left: string;
  right: string;
  compact?: boolean;
  signatureData?: string;
  signedByName?: string;
  signedAt?: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-6 text-[11px]">
      <div
        className={`rounded-xl border border-[var(--print-border-medium)] p-2.5 ${
          compact ? "min-h-[16mm]" : "min-h-[20mm]"
        } flex flex-col justify-between`}
      >
        <div className="font-bold text-[var(--print-text)]">{left}</div>
        <div className="border-b border-dashed border-[var(--print-border-light)]" />
      </div>
      <div
        className={`rounded-xl border border-[var(--print-border-medium)] p-2.5 ${
          compact ? "min-h-[16mm]" : "min-h-[20mm]"
        } flex flex-col justify-between text-right relative overflow-hidden`}
      >
        <div className="font-bold text-[var(--print-text)]">{right}</div>
        {signatureData ? (
          <div className="flex flex-col items-end my-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={signatureData}
              alt="Signature"
              className="max-h-[14mm] object-contain border border-dashed border-emerald-500/40 rounded p-1 bg-emerald-50/20"
            />
            <div className="text-[9px] text-emerald-700 font-semibold mt-0.5">
              ✓ Signé numériquement par {signedByName || "le client"} {signedAt ? `le ${signedAt}` : ""}
            </div>
          </div>
        ) : (
          <div className="border-b border-dashed border-[var(--print-border-light)]" />
        )}
      </div>
    </div>
  );
}

export function AddressBar({
  company,
  compact = false,
}: {
  company: CompanyRecord;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-[var(--print-border-medium)] bg-white px-3.5 ${
        compact ? "py-1.5 text-[9.5px]" : "py-2 text-[10px]"
      } text-center leading-relaxed text-[var(--print-text)]`}
    >
      <div className="font-extrabold text-[11px] uppercase tracking-wider text-[var(--print-accent-dark)]">
        {company.name}
      </div>
      <div className="text-[var(--print-text-muted)]">
        Siège social : {company.address} · Tél : {company.phone || "-"} · GSM : {company.gsm || "-"}
      </div>
      <div className="text-[var(--print-text-muted)] font-mono text-[8.5px]">
        RC : {company.rc || "-"} · IF : {company.if_number || "-"} · TP : {company.tp || "-"} · ICE : {company.ice || "-"}
      </div>
    </div>
  );
}

export function BilingualAddressBar({ company }: { company: CompanyRecord }) {
  return (
    <div className="mt-auto flex items-end justify-between gap-6 text-[11px] leading-5 text-[var(--print-text)]">
      <div className="flex-1">@ {company.address} - Tel: {company.phone || "-"} - GSM: {company.gsm || "-"}</div>
      <div className="flex-1 text-right font-[var(--font-arabic)]">
        {company.arabic_name ? `${company.arabic_name} - ` : ""}{company.address}
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
