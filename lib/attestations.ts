import { DEFAULT_ATTESTATION_TEMPLATES } from "@/lib/constants";
import { type CompanyRecord, type EmployeeAttestationType } from "@/lib/types";
import { formatDate, formatNumber } from "@/lib/utils";

export type AttestationEmployeeLike = {
  prenom: string;
  nom: string;
  cnss?: string;
  date_entree?: string;
  salaire?: number;
};

type AttestationTemplateSource = Pick<
  CompanyRecord,
  | "name"
  | "attestation_template_simple"
  | "attestation_template_salary"
  | "attestation_template_visa"
  | "attestation_template_bank"
>;

type BuildAttestationOptions = {
  referenceDate?: string | Date | null;
};

const TEMPLATE_FIELD_BY_TYPE = {
  simple: "attestation_template_simple",
  "avec-salaire": "attestation_template_salary",
  visa: "attestation_template_visa",
  banque: "attestation_template_bank",
} as const satisfies Record<EmployeeAttestationType, keyof AttestationTemplateSource>;

const FALLBACK_COMPANY_NAME = "Patisserie Haloui";

function getTemplateForType(
  type: EmployeeAttestationType,
  company?: Partial<AttestationTemplateSource> | null,
) {
  const field = TEMPLATE_FIELD_BY_TYPE[type];
  const candidate = company?.[field];
  return typeof candidate === "string" && candidate.trim()
    ? candidate
    : DEFAULT_ATTESTATION_TEMPLATES[type];
}

function interpolateTemplate(template: string, values: Record<string, string>) {
  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, rawKey: string) => {
    const key = rawKey.toLowerCase();
    return values[key] ?? "";
  });
}

export function buildAttestationContent(
  employee: AttestationEmployeeLike,
  type: EmployeeAttestationType,
  company?: Partial<AttestationTemplateSource> | null,
  options?: BuildAttestationOptions,
) {
  const template = getTemplateForType(type, company);
  const fullName = `${employee.prenom} ${employee.nom}`.trim() || "-";
  const values = {
    societe: company?.name?.trim() || FALLBACK_COMPANY_NAME,
    employe: fullName,
    prenom: employee.prenom?.trim() || "-",
    nom: employee.nom?.trim() || "-",
    cnss: employee.cnss?.trim() || "-",
    date_entree: employee.date_entree ? formatDate(employee.date_entree) : "-",
    salaire: `${formatNumber(employee.salaire ?? 0)} MAD`,
    date_du_jour: formatDate(options?.referenceDate || new Date()),
  };

  return interpolateTemplate(template, values).trim();
}
