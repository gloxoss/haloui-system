"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { requireAdmin, requireAuth, requireSuperadmin, updateUserPassword } from "@/lib/auth";
import { FEATURE_TOGGLE_DEFINITIONS } from "@/lib/constants";
import { getCompany, getEmployeeById } from "@/lib/data";
import { extractCityFromAddress, interpolateTemplate } from "@/lib/attestations";
import { ACTIVE_COMPANY_COOKIE, getActiveCompany, getActiveCompanyId } from "@/lib/company";
import {
  batchSaveDailyRevenue,
  bulkSaveProducts,
  convertDocument,
  createAttestation,
  deleteEmployee,
  deleteEntity,
  deleteProduct,
  deleteBranch,
  deleteSortieCaisse,
  resetBusinessData,
  saveBranch,
  saveCashDayClosing,
  saveCompany,
  saveDocument,
  saveEmployee,
  saveEntity,
  saveFeatureFlags,
  saveThemeSettings,
  saveProduct,
  saveSortieCaisse,
  saveUser,
  syncRevenueFromSystemSales,
  syncSelectedSalesDocuments,
  updateDocumentStatus,
  upsertRevenueEntry,
} from "@/lib/data";
import { createDatabaseBackup } from "@/lib/db";
import { formatDate, formatNumber, monthKey, safeJsonParse, todayIso, toNumber } from "@/lib/utils";
import {
  type DocumentLineInput,
  type DocumentStatus,
  type DocumentType,
  type EmployeeAttestationType,
  type PartyType,
  type ThemeDensity,
  type ThemePreset,
} from "@/lib/types";

function refresh(paths: string[]) {
  for (const path of paths) {
    revalidatePath(path);
  }
}

export async function switchActiveCompanyAction(companyId: number) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_COMPANY_COOKIE, String(companyId), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  refresh(["/", "/dashboard", "/factures", "/devis", "/bons", "/bons-livraison", "/bons-commande", "/bons-sortie", "/chiffre-affaires", "/parametres", "/personnel"]);
}

export async function saveCompanyAction(formData: FormData) {
  const session = await requireSuperadmin();
  const targetId = Number(formData.get("id")) || 1;
  const current = getCompany(targetId);

  saveCompany(
    {
      ...current,
      id: targetId as 1,
      name: String(formData.get("name") || current.name),
      arabic_name: String(formData.get("arabic_name") || current.arabic_name),
      address: String(formData.get("address") || current.address),
      phone: String(formData.get("phone") || ""),
      gsm: String(formData.get("gsm") || ""),
      rc: String(formData.get("rc") || ""),
      if_number: String(formData.get("if_number") || ""),
      tp: String(formData.get("tp") || ""),
      ice: String(formData.get("ice") || ""),
      logo_path: String(formData.get("logo_path") || ""),
      legal_notice: String(formData.get("legal_notice") || ""),
      attestation_template_simple: String(formData.get("attestation_template_simple") || current.attestation_template_simple || ""),
      attestation_template_salary: String(formData.get("attestation_template_salary") || current.attestation_template_salary || ""),
      attestation_template_visa: String(formData.get("attestation_template_visa") || current.attestation_template_visa || ""),
      attestation_template_bank: String(formData.get("attestation_template_bank") || current.attestation_template_bank || ""),
      attestation_templates_json: String(formData.get("attestation_templates_json") || current.attestation_templates_json || ""),
    },
    session.user.id,
  );

  refresh(["/dashboard", "/parametres"]);
}

export async function saveCompanyAttestationTemplatesAction(formData: FormData) {
  const session = await requireSuperadmin();
  const companyId = Number(formData.get("company_id")) || (await getActiveCompanyId());
  const jsonRaw = String(formData.get("attestation_templates_json") || "{}");

  const current = getCompany(companyId);
  saveCompany(
    {
      ...current,
      attestation_templates_json: jsonRaw,
    },
    session.user.id,
  );

  refresh(["/parametres", "/personnel", "/personnel/attestation"]);
}

export async function saveBranchAction(formData: FormData) {
  const session = await requireSuperadmin();
  const activeCompanyId = await getActiveCompanyId();
  saveBranch(
    {
      id: Number(formData.get("id")) || undefined,
      company_id: Number(formData.get("company_id")) || activeCompanyId,
      name: String(formData.get("name") || ""),
      address: String(formData.get("address") || ""),
      phone: String(formData.get("phone") || ""),
      active: Number(formData.get("active") || 1),
    },
    session.user.id,
  );
  refresh(["/parametres", "/dashboard", "/chiffre-affaires"]);
}

export async function deleteBranchAction(formData: FormData) {
  const session = await requireSuperadmin();
  const id = Number(formData.get("id"));
  if (id) {
    deleteBranch(id, session.user.id);
  }
  refresh(["/parametres", "/dashboard", "/chiffre-affaires"]);
}

export async function saveUserAction(formData: FormData) {
  const session = await requireSuperadmin();
  saveUser(
    {
      id: Number(formData.get("id")) || undefined,
      username: String(formData.get("username") || ""),
      full_name: String(formData.get("full_name") || ""),
      role: String(formData.get("role") || "user") as "admin" | "user",
      active: Number(formData.get("active") || 1),
      password: String(formData.get("password") || "") || undefined,
    },
    session.user.id,
  );
  refresh(["/utilisateurs"]);
}

export async function saveFeatureFlagsAction(formData: FormData) {
  const session = await requireSuperadmin();

  const payload = Object.fromEntries(
    FEATURE_TOGGLE_DEFINITIONS.map((definition) => [
      definition.key,
      formData.get(definition.key) === "1",
    ]),
  );

  saveFeatureFlags(payload, session.user.id);
  refresh([
    "/dashboard",
    "/devis",
    "/factures",
    "/bons-livraison",
    "/bons-sortie",
    "/bons-commande",
    "/produits",
    "/clients",
    "/fournisseurs",
    "/personnel",
    "/personnel/attestation",
    "/chiffre-affaires",
    "/utilisateurs",
    "/parametres",
  ]);
}

export async function saveThemeSettingsAction(formData: FormData) {
  const session = await requireSuperadmin();

  const preset = String(formData.get("theme_preset") || "") as ThemePreset;
  const density = String(formData.get("theme_density") || "") as ThemeDensity;
  const customAccent = String(formData.get("custom_accent") || "").trim();
  const customAccentSoft = String(formData.get("custom_accent_soft") || "").trim();
  const customSidebarBg = String(formData.get("custom_sidebar_bg") || "").trim();
  const customBg = String(formData.get("custom_bg") || "").trim();

  const customColors = customAccent
    ? {
        accent: customAccent,
        accentSoft: customAccentSoft || `${customAccent}20`,
        sidebarBg: customSidebarBg || "#ffffff",
        background: customBg || "#f8fafc",
      }
    : undefined;

  saveThemeSettings(
    {
      preset,
      density,
      customColors,
    },
    session.user.id,
  );

  const cookieStore = await cookies();
  if (preset) {
    cookieStore.set("app_theme", preset, { path: "/", maxAge: 31536000 });
  }
  if (density) {
    cookieStore.set("app_density", density, { path: "/", maxAge: 31536000 });
  }

  revalidatePath("/", "layout");
}

export async function manualBackupAction() {
  await requireSuperadmin();
  createDatabaseBackup("backup-manual");
  refresh(["/parametres"]);
}

export async function resetBusinessDataAction() {
  await requireSuperadmin();
  createDatabaseBackup("backup-before-reset");
  resetBusinessData();
  refresh([
    "/dashboard",
    "/devis",
    "/factures",
    "/bons-livraison",
    "/bons-sortie",
    "/bons-commande",
    "/produits",
    "/clients",
    "/fournisseurs",
    "/personnel",
    "/personnel/attestation",
    "/chiffre-affaires",
    "/utilisateurs",
    "/parametres",
  ]);
}

export async function quickCreateEntityAction(
  type: PartyType,
  payload: {
    name: string;
    ice?: string;
    address?: string;
    phone?: string;
    email?: string;
    notes?: string;
  },
) {
  const session = await requireAuth();
  const id = saveEntity(
    type,
    {
      name: payload.name,
      ice: payload.ice ?? "",
      address: payload.address ?? "",
      phone: payload.phone ?? "",
      email: payload.email ?? "",
      notes: payload.notes ?? "",
    },
    session.user.id,
  );
  refresh([`/${type}`]);

  return {
    id,
    name: payload.name,
    ice: payload.ice ?? "",
    address: payload.address ?? "",
    phone: payload.phone ?? "",
    email: payload.email ?? "",
  };
}

export async function saveEntityAction(type: PartyType, formData: FormData) {
  const session = await requireAuth();
  saveEntity(
    type,
    {
      id: Number(formData.get("id")) || undefined,
      name: String(formData.get("name") || ""),
      ice: String(formData.get("ice") || ""),
      address: String(formData.get("address") || ""),
      phone: String(formData.get("phone") || ""),
      email: String(formData.get("email") || ""),
      notes: String(formData.get("notes") || ""),
    },
    session.user.id,
  );
  refresh([`/${type}`]);
}

export async function deleteEntityAction(type: PartyType, formData: FormData) {
  const session = await requireAuth();
  deleteEntity(type, Number(formData.get("id")), session.user.id);
  refresh([`/${type}`]);
}

export async function saveProductAction(formData: FormData) {
  const session = await requireAuth();
  const activeCompanyId = await getActiveCompanyId();
  saveProduct(
    {
      id: Number(formData.get("id")) || undefined,
      company_id: Number(formData.get("company_id")) || activeCompanyId,
      ref: String(formData.get("ref") || ""),
      designation: String(formData.get("designation") || ""),
      unite: String(formData.get("unite") || "u"),
      prix_ht: toNumber(formData.get("prix_ht")),
      tva_rate: toNumber(formData.get("tva_rate")),
      active: Number(formData.get("active") || 1),
    },
    session.user.id,
  );
  refresh(["/produits"]);
}

export async function deleteProductAction(formData: FormData) {
  const session = await requireAuth();
  deleteProduct(Number(formData.get("id")), session.user.id);
  refresh(["/produits"]);
}

export async function bulkSaveProductsAction(formData: FormData) {
  const session = await requireAuth();
  const raw = String(formData.get("rows") || "").trim();

  if (!raw) {
    redirect("/produits?import=empty");
  }

  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));

  const items: Array<{ ref?: string; designation: string; prix_ht: number; unite?: string }> = [];
  let skipped = 0;

  for (const line of lines) {
    const cells = line
      .split(/\t|\||;/)
      .map((cell) => cell.trim())
      .filter((cell) => cell.length > 0);

    if (cells.length < 2) {
      skipped += 1;
      continue;
    }

    let ref: string | undefined;
    let designation: string;
    let prixRaw: string;
    let unite: string | undefined;

    if (cells.length === 2) {
      [designation, prixRaw] = cells;
    } else if (cells.length === 3) {
      [ref, designation, prixRaw] = cells;
    } else {
      [ref, designation, prixRaw, unite] = cells;
    }

    const prix = toNumber(prixRaw);

    if (!designation || prix <= 0) {
      skipped += 1;
      continue;
    }

    items.push({ ref, designation, prix_ht: prix, unite });
  }

  const inserted = items.length > 0 ? bulkSaveProducts(items, session.user.id) : 0;

  refresh(["/produits"]);
  redirect(`/produits?imported=${inserted}&skipped=${skipped}`);
}

export async function saveDocumentAction(formData: FormData) {
  const session = await requireAuth();
  const slug = String(formData.get("slug") || "devis");
  const lines = safeJsonParse<Array<DocumentLineInput>>(
    String(formData.get("lines_json") || "[]"),
    [],
  );

  const activeCompanyId = await getActiveCompanyId();
  const documentId = saveDocument(
    {
      id: Number(formData.get("id")) || undefined,
      company_id: Number(formData.get("company_id")) || activeCompanyId,
      type: formData.get("type") as DocumentType,
      date: String(formData.get("date") || todayIso()),
      branch_id: Number(formData.get("branch_id")) || null,
      source_branch_id: Number(formData.get("source_branch_id")) || null,
      destination_branch_id:
        Number(formData.get("destination_branch_id")) || null,
      client_id: Number(formData.get("client_id")) || null,
      fournisseur_id: Number(formData.get("fournisseur_id")) || null,
      parent_document_id: Number(formData.get("parent_document_id")) || null,
      notes: String(formData.get("notes") || ""),
      avance: toNumber(formData.get("avance")),
      status: String(formData.get("status") || "brouillon") as DocumentStatus,
      lines,
    },
    session.user.id,
  );

  refresh(["/dashboard", `/${slug}`]);
  redirect(`/${slug}/${documentId}/edit`);
}

export async function updateDocumentStatusAction(formData: FormData) {
  const session = await requireAuth();
  const slug = String(formData.get("slug") || "devis");
  const id = Number(formData.get("id"));
  const status = String(formData.get("status")) as DocumentStatus;
  updateDocumentStatus(id, status, session.user.id);
  refresh(["/dashboard", `/${slug}`]);
}

export async function convertDocumentAction(formData: FormData) {
  const session = await requireAuth();
  const sourceId = Number(formData.get("source_id"));
  const targetType = String(formData.get("target_type")) as "facture" | "bl";
  const targetId = convertDocument(sourceId, targetType, session.user.id);
  const slug = targetType === "facture" ? "factures" : "bons-livraison";
  refresh(["/dashboard", "/devis", `/${slug}`]);
  redirect(`/${slug}/${targetId}/edit`);
}

export async function saveEmployeeAction(formData: FormData) {
  const session = await requireAuth();
  const employeeId = saveEmployee(
    {
      id: Number(formData.get("id")) || undefined,
      nom: String(formData.get("nom") || ""),
      prenom: String(formData.get("prenom") || ""),
      date_naissance: String(formData.get("date_naissance") || ""),
      lieu_naissance: String(formData.get("lieu_naissance") || ""),
      etat_civil: String(formData.get("etat_civil") || ""),
      date_entree: String(formData.get("date_entree") || ""),
      date_sortie: String(formData.get("date_sortie") || ""),
      cnss: String(formData.get("cnss") || ""),
      adresse: String(formData.get("adresse") || ""),
      telephone: String(formData.get("telephone") || ""),
      salaire: toNumber(formData.get("salaire")),
      photo_path: String(formData.get("photo_path") || ""),
    },
    session.user.id,
  );
  refresh(["/personnel"]);
  redirect(`/personnel/${employeeId}/edit`);
}

export async function deleteEmployeeAction(formData: FormData) {
  const session = await requireAuth();
  deleteEmployee(Number(formData.get("id")), session.user.id);
  refresh(["/personnel"]);
}

export async function createAttestationAction(formData: FormData) {
  const session = await requireAuth();
  const employeeId = Number(formData.get("employee_id") || formData.get("employe_id"));
  const type = String(formData.get("type") || "simple");
  const date = String(formData.get("date") || todayIso());
  const customTitle = String(formData.get("title") || formData.get("custom_title") || "").trim();
  const customObjet = String(formData.get("objet") || formData.get("custom_objet") || "").trim();
  const customBody = String(formData.get("custom_body") || "").trim();
  const company = await getActiveCompany();
  const customVille = String(formData.get("ville") || formData.get("custom_ville") || "").trim() || extractCityFromAddress(company?.address);
  const customSignataire = String(formData.get("signataire") || formData.get("custom_signataire") || "La Direction Générale").trim();

  let customContent: string | undefined = undefined;
  if (customBody) {
    const employee = getEmployeeById(employeeId);
    const resolvedBody = employee
      ? interpolateTemplate(customBody, {
          societe: company?.name?.trim() || "STE OURIDA STATION SARL",
          employe: `${employee.prenom} ${employee.nom}`.trim(),
          prenom: employee.prenom || "-",
          nom: employee.nom || "-",
          cnss: employee.cnss || "-",
          cin: (employee as { cin?: string }).cin || "-",
          date_entree: employee.date_entree ? formatDate(employee.date_entree) : "-",
          date_sortie: employee.date_sortie ? formatDate(employee.date_sortie) : "-",
          salaire: `${formatNumber(employee.salaire ?? 0)} MAD`,
          date_du_jour: formatDate(date),
          ville: customVille,
        })
      : customBody;

    customContent = JSON.stringify({
      title: customTitle || undefined,
      objet: customObjet || undefined,
      body: resolvedBody,
      ville: customVille,
      date,
      signataire: customSignataire,
    });
  }

  const id = createAttestation(
    employeeId,
    type,
    date,
    session.user.id,
    customContent,
  );
  refresh(["/personnel"]);
  redirect(`/print/attestation/${id}`);
}

export async function saveRevenueCellAction(formData: FormData) {
  const session = await requireAuth();
  upsertRevenueEntry(
    Number(formData.get("branch_id")),
    String(formData.get("date")),
    toNumber(formData.get("montant")),
    session.user.id,
    String(formData.get("notes") || ""),
  );
  refresh(["/dashboard", "/chiffre-affaires"]);
}

export async function syncRevenueAction(formData: FormData) {
  const session = await requireAuth();
  const month = String(formData.get("month") || monthKey());
  syncRevenueFromSystemSales(month, session.user.id);
  refresh(["/dashboard", "/chiffre-affaires"]);
}

export async function syncSelectedSalesAction(documentIds: number[], month: string) {
  const session = await requireAuth();
  syncSelectedSalesDocuments(documentIds, month, session.user.id);
  refresh(["/dashboard", "/chiffre-affaires"]);
  return { success: true };
}

export async function saveDailyRevenueAction(formData: FormData) {
  const session = await requireAuth();
  const date = String(formData.get("date") || todayIso());
  const entries: Array<{ branchId: number; montant: number; notes?: string }> = [];

  for (const [key, value] of formData.entries()) {
    if (key.startsWith("montant_")) {
      const branchId = Number(key.replace("montant_", ""));
      if (branchId > 0) {
        entries.push({
          branchId,
          montant: toNumber(value),
          notes: String(formData.get(`notes_${branchId}`) || ""),
        });
      }
    }
  }

  if (entries.length > 0) {
    batchSaveDailyRevenue(date, entries, session.user.id);
  }
  refresh(["/dashboard", "/chiffre-affaires"]);
}

export async function saveBatchRevenueCellsAction(
  entries: Array<{ branchId: number; date: string; montant: number }>,
) {
  const session = await requireAuth();
  for (const entry of entries) {
    upsertRevenueEntry(entry.branchId, entry.date, entry.montant, session.user.id);
  }
  refresh(["/dashboard", "/chiffre-affaires"]);
  return { success: true };
}

export async function saveCashDayClosingAction(formData: FormData) {
  const session = await requireAuth();
  const branch_id = Number(formData.get("branch_id"));
  const date = String(formData.get("date") || todayIso());
  const especes = toNumber(formData.get("especes"));
  const carte = toNumber(formData.get("carte"));
  const cheque = toNumber(formData.get("cheque"));
  const virement = toNumber(formData.get("virement"));
  const preuve_path = String(formData.get("preuve_path") || "");
  const notes = String(formData.get("notes") || "");
  const statut_cloture = (formData.get("statut_cloture") as "brouillon" | "cloture") || "cloture";

  saveCashDayClosing(
    {
      branch_id,
      date,
      especes,
      carte,
      cheque,
      virement,
      preuve_path,
      notes,
      statut_cloture,
    },
    session.user.id,
  );

  refresh(["/dashboard", "/chiffre-affaires"]);
}

export async function saveSortieCaisseAction(formData: FormData) {
  const session = await requireAuth();
  const idRaw = formData.get("id");
  const id = idRaw ? Number(idRaw) : undefined;
  const branch_id = Number(formData.get("branch_id"));
  const date = String(formData.get("date") || todayIso());
  const montant = toNumber(formData.get("montant"));
  const motif = String(formData.get("motif") || "Dépense courante");
  const beneficiaire = String(formData.get("beneficiaire") || "");
  const preuve_path = String(formData.get("preuve_path") || "");
  const notes = String(formData.get("notes") || "");

  saveSortieCaisse(
    {
      id,
      branch_id,
      date,
      montant,
      motif,
      beneficiaire,
      preuve_path,
      notes,
    },
    session.user.id,
  );

  refresh(["/dashboard", "/chiffre-affaires"]);
}

export async function deleteSortieCaisseAction(formData: FormData) {
  const session = await requireAuth();
  const id = Number(formData.get("id"));
  if (id > 0) {
    deleteSortieCaisse(id, session.user.id);
  }
  refresh(["/dashboard", "/chiffre-affaires"]);
}

export async function changeOwnPasswordAction(formData: FormData) {
  const session = await requireAuth();
  const password = String(formData.get("password") || "");
  const confirmation = String(formData.get("password_confirmation") || "");

  if (!password || password.length < 8 || password !== confirmation) {
    redirect("/premier-mot-de-passe?error=1");
  }

  updateUserPassword(session.user.id, password);
  redirect("/dashboard");
}

export async function setLocaleAction(locale: "fr" | "ar") {
  const cookieStore = await cookies();
  cookieStore.set("app_locale", locale === "ar" ? "ar" : "fr", {
    path: "/",
    maxAge: 31536000,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}
