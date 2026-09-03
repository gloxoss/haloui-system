import { ATTESTATION_TYPE_LABELS, ATTESTATION_TYPE_TITLES, DEFAULT_ATTESTATION_TEMPLATES } from "@/lib/constants";
import {
  type AttestationCustomPayload,
  type AttestationTemplateConfigItem,
  type AttestationTemplatesConfig,
  type CompanyRecord,
  type EmployeeAttestationType,
} from "@/lib/types";
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
  | "attestation_templates_json"
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

export function extractCityFromAddress(address?: string): string {
  if (!address) return "Sefrou";
  const lower = address.toLowerCase();
  if (lower.includes("sefrou") || lower.includes("séfrou")) return "Sefrou";
  if (lower.includes("tanger")) return "Tanger";
  if (lower.includes("casablanca")) return "Casablanca";
  if (lower.includes("rabat")) return "Rabat";
  if (lower.includes("fes") || lower.includes("fès")) return "Fès";
  const parts = address.split(/[,;\n]/).map((p) => p.trim()).filter(Boolean);
  return parts[parts.length - 1] || "Sefrou";
}

export function getCompanyAttestationConfigs(company?: Partial<CompanyRecord> | null): AttestationTemplatesConfig {
  let jsonConfig: AttestationTemplatesConfig = {};
  if (company?.attestation_templates_json) {
    try {
      jsonConfig = JSON.parse(company.attestation_templates_json);
    } catch {}
  }

  const result: AttestationTemplatesConfig = {};

  // 1. Initialize default models
  for (const type of Object.keys(DEFAULT_ATTESTATION_TEMPLATES)) {
    const existing = jsonConfig[type];
    if (existing && (existing as any)._deleted) {
      continue;
    }
    const defaultBody = getTemplateForType(type, company, false);
    const defaultTitle = ATTESTATION_TYPE_TITLES[type] || "ATTESTATION";
    const defaultName = ATTESTATION_TYPE_LABELS[type] || type;
    result[type] = {
      id: type,
      name: existing?.name || defaultName,
      title: existing?.title || defaultTitle,
      objet: existing?.objet ?? "",
      body: existing?.body || defaultBody,
      signataire: existing?.signataire || "La Direction Générale",
      active: existing?.active !== undefined ? Boolean(existing.active) : true,
      isCustom: Boolean(existing?.isCustom),
    };
  }

  // 2. Include any custom models added by the user
  for (const [key, item] of Object.entries(jsonConfig)) {
    if (!result[key] && item && !(item as any)._deleted) {
      result[key] = {
        id: key,
        name: item.name || item.title || key,
        title: item.title || "ATTESTATION",
        objet: item.objet ?? "",
        body: item.body || "",
        signataire: item.signataire || "La Direction Générale",
        active: item.active !== undefined ? Boolean(item.active) : true,
        isCustom: true,
      };
    }
  }

  return result;
}

export function getAttestationModelConfig(
  type: string,
  company?: Partial<CompanyRecord> | null,
): AttestationTemplateConfigItem {
  const configs = getCompanyAttestationConfigs(company);
  return (
    configs[type] || {
      title: ATTESTATION_TYPE_TITLES[type] || "ATTESTATION",
      objet: "",
      body: DEFAULT_ATTESTATION_TEMPLATES[type] || DEFAULT_ATTESTATION_TEMPLATES.simple,
      signataire: "La Direction Générale",
    }
  );
}

export function getTemplateForType(
  type: string,
  company?: Partial<AttestationTemplateSource> | null,
  checkJson = true,
) {
  if (checkJson && company?.attestation_templates_json) {
    try {
      const parsed = JSON.parse(company.attestation_templates_json);
      if (parsed[type]?.body && typeof parsed[type].body === "string" && parsed[type].body.trim()) {
        return parsed[type].body;
      }
    } catch {}
  }

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
    ville: options?.ville || extractCityFromAddress(company?.address),
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
  defaultVille = "Sefrou",
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
          ville: parsed.ville || defaultVille,
          date: parsed.date || fallbackDate,
          signataire: parsed.signataire || "La Direction Générale",
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
    ville: defaultVille,
    date: fallbackDate,
    signataire: "La Direction Générale",
  };
}
