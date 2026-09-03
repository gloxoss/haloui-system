import { ATTESTATION_TYPE_TITLES, DEFAULT_ATTESTATION_TEMPLATES } from "@/lib/constants";
import { type AttestationCustomPayload, type CompanyRecord, type EmployeeAttestationType } from "@/lib/types";
import { formatDate, formatNumber, todayIso } from "@/lib/utils";

export type AttestationEmployeeLike = {
  prenom: string;
  nom: string;
  cnss?: string;
  cin?: string;
  poste?: string;
  date_entree?: string;
  date_sortie?: string;
  salaire?: number;
};

type AttestationTemplateSource = Pick<
  CompanyRecord,
  | "name"
  | "address"
  | "attestation_template_simple"
  | "attestation_template_salary"
  | "attestation_template_visa"
  | "attestation_template_bank"
>;

type BuildAttestationOptions = {
  referenceDate?: string | Date | null;
  ville?: string;
};

const TEMPLATE_FIELD_BY_TYPE: Record<string, keyof AttestationTemplateSource> = {
  simple: "attestation_template_simple",
  "avec-salaire": "attestation_template_salary",
  visa: "attestation_template_visa",
  banque: "attestation_template_bank",
};

const FALLBACK_COMPANY_NAME = "Entreprise Commerciale";

export function getTemplateForType(
  type: string,
  company?: Partial<AttestationTemplateSource> | null,
) {
  const field = TEMPLATE_FIELD_BY_TYPE[type];
  const candidate = field ? company?.[field] : undefined;
  if (typeof candidate === "string" && candidate.trim()) {
    return candidate;
  }
  return DEFAULT_ATTESTATION_TEMPLATES[type] || DEFAULT_ATTESTATION_TEMPLATES.simple;
}

export function interpolateTemplate(template: string, values: Record<string, string>) {
  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, rawKey: string) => {
    const key = rawKey.toLowerCase();
    return values[key] ?? "";
  });
}

export function buildAttestationContent(
  employee: AttestationEmployeeLike,
  type: string,
  company?: Partial<AttestationTemplateSource> | null,
  options?: BuildAttestationOptions,
) {
  const template = getTemplateForType(type, company);
  const fullName = `${employee.prenom} ${employee.nom}`.trim() || "-";
  const values: Record<string, string> = {
    societe: company?.name?.trim() || FALLBACK_COMPANY_NAME,
    employe: fullName,
    prenom: employee.prenom?.trim() || "-",
    nom: employee.nom?.trim() || "-",
    cnss: employee.cnss?.trim() || "-",
    cin: employee.cin?.trim() || "-",
    poste: employee.poste?.trim() || "Employé(e)",
    date_entree: employee.date_entree ? formatDate(employee.date_entree) : "-",
    date_sortie: employee.date_sortie ? formatDate(employee.date_sortie) : "-",
    salaire: `${formatNumber(employee.salaire ?? 0)} MAD`,
    date_du_jour: formatDate(options?.referenceDate || new Date()),
    ville: options?.ville || "Tanger",
  };

  return interpolateTemplate(template, values).trim();
}

export function serializeAttestationPayload(payload: AttestationCustomPayload): string {
  return JSON.stringify(payload);
}

export function parseAttestationPayload(
  rawContent: string,
  fallbackType = "simple",
  fallbackDate = todayIso(),
): AttestationCustomPayload {
  const trimmed = (rawContent || "").trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === "object" && parsed !== null && parsed.body) {
        return {
          title: parsed.title || ATTESTATION_TYPE_TITLES[fallbackType] || "ATTESTATION DE TRAVAIL",
          objet: parsed.objet || "",
          body: parsed.body || "",
          ville: parsed.ville || "Tanger",
          date: parsed.date || fallbackDate,
          signataire: parsed.signataire || "La Direction",
        };
      }
    } catch {
      // fallback to plain string
    }
  }

  return {
    title: ATTESTATION_TYPE_TITLES[fallbackType] || "ATTESTATION DE TRAVAIL",
    objet: "",
    body: rawContent,
    ville: "Tanger",
    date: fallbackDate,
    signataire: "La Direction",
  };
}
