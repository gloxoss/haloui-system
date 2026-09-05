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
  changeUserPassword,
  convertDocument,
  createAttestation,
  deleteEmployee,
  deleteEntity,
  deleteProduct,
  deleteBranch,
  deleteSortieCaisse,
  deleteSubscription,
  enregistrerReglementRapide,
  generateBatchDueInvoices,
  generateSubscriptionInvoice,
  getClientByPortalCode,
  getClientByPortalToken,
  getPortalSyncExportPayload,
  getPortalSyncSettings,
  getRelanceSettings,
  getRelancesLogByDocument,
  getUserById,
  listSubscriptionInvoices,
  logRelance,
  regenerateClientPortalAccess,
  resetBusinessData,
  saveBranch,
  saveCashDayClosing,
  saveCompany,
  saveDocument,
  saveEmployee,
  saveEntity,
  saveFeatureFlags,
  savePortalSyncSettings,
  saveProduct,
  saveProductUnits,
  saveRelanceSettings,
  saveSortieCaisse,
  saveSubscription,
  saveThemeSettings,
  saveUser,
  signDocumentByClient,
  syncRevenueFromSystemSales,
  syncSelectedSalesDocuments,
  toggleSubscriptionStatus,
  updateDocumentStatus,
  updateProfile,
  upsertRevenueEntry,
  applyPortalSyncIncomingPull,
  saveBankAccount,
  importBankStatementData,
  autoReconcileStatement,
  reconcileBankOperation,
  unreconcileBankOperation,
  createExpenseFromBankOperation,
  deleteBankStatement,
  saveExchangeRate,
  getExchangeRate,
  syncCompanyExchangeRates,
  deleteForexTransaction,
} from "@/lib/data";
import {
  clearPortalClientSession,
  getPortalClientSession,
  setPortalClientSession,
} from "@/lib/portal-auth";
import {
  saveStockTransfertDraft,
  expedierStockTransfert,
  receptionnerStockTransfert,
  annulerStockTransfert,
  ajusterStockDepot,
  getDepotStockMap,
  getStockTransfertById,
} from "@/lib/stock-transferts";
import {
  creerInventaireSession,
  enregistrerComptageLigne,
  scanCodeBarreInventaire,
  alignerLignesTheorique,
  cloturerInventaire,
  annulerInventaire,
} from "@/lib/inventaires";
import {
  creerLot,
  creerSerie,
  bloquerLotQuarantaine,
  changerStatutSerie,
} from "@/lib/lots-series";
import {
  calculerBesoinsApprovisionnement,
  getReapproKPIs,
  genererBonsCommandeFournisseur,
  mettreAJourSeuilsProduit,
} from "@/lib/reapprovisionnement";
import {
  listEmplacements,
  creerEmplacement,
  genererMatriceEmplacements,
  listProduitsEmplacements,
  assignerProduitEmplacement,
  retirerProduitEmplacement,
  getWmsKPIs,
  genererPickingList,
} from "@/lib/wms";
import {
  getNomenclature,
  saveNomenclature,
  supprimerNomenclature,
  listKits,
  getNomenclaturesKPIs,
  lancerOrdreFabrication,
  listOrdresFabrication,
} from "@/lib/nomenclatures";
import { generateBarcodeSvg } from "@/lib/barcodes";
import {
  getSessionActive,
  getSessionById,
  ouvrirSessionCaisse,
  enregistrerTicketCaisse,
  getTicketById,
  enregistrerMouvementCaisse,
  genererRapportX,
  cloturerSessionCaisse,
  listSessionsCaisse,
} from "@/lib/pos";
import {
  type InventaireType,
  type SerieStatut,
  type EmplacementType,
  type EmplacementStatut,
  type ReapproUrgence,
  type NatureProduit,
  type ModeDestockageKit,
  type BarcodeSymbology,
  type LabelConfig,
  type CaisseModeReglement,
  type CaisseMouvementType,
  type DenominationsComptage,
  type PaiementPartiel,
} from "@/lib/types";
import { createDatabaseBackup, getDb } from "@/lib/db";
import { formatDate, formatNumber, monthKey, safeJsonParse, todayIso, toNumber } from "@/lib/utils";
import {
  type DocumentLineInput,
  type DocumentStatus,
  type DocumentType,
  type EmployeeAttestationType,
  type PartyType,
  type RelanceCanal,
  type RelancePalier,
  type RelanceSettings,
  type RelanceStatut,
  type Periodicite,
  type SubscriptionModeReglement,
  type SubscriptionStatut,
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

export async function updateProfileInfoAction(formData: FormData) {
  const session = await requireAuth();
  const fullName = String(formData.get("full_name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const phone = String(formData.get("phone") || "").trim();

  if (!fullName) {
    throw new Error("Le nom complet est obligatoire.");
  }

  updateProfile(session.user.id, {
    full_name: fullName,
    email,
    phone,
  });

  refresh(["/profil", "/dashboard", "/parametres"]);
}

export async function changeUserPasswordAction(formData: FormData) {
  const session = await requireAuth();
  const currentPassword = String(formData.get("current_password") || "");
  const newPassword = String(formData.get("new_password") || "");
  const confirmPassword = String(formData.get("confirm_password") || "");

  if (!currentPassword) {
    throw new Error("Veuillez saisir votre mot de passe actuel.");
  }
  if (!newPassword || newPassword.length < 6) {
    throw new Error("Le nouveau mot de passe doit comporter au moins 6 caractères.");
  }
  if (newPassword !== confirmPassword) {
    throw new Error("La confirmation du mot de passe ne correspond pas.");
  }

  changeUserPassword(session.user.id, currentPassword, newPassword);
  refresh(["/profil", "/parametres"]);
}

export async function saveCompanyAction(formData: FormData) {
  const session = await requireAdmin();
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
  const session = await requireAdmin();
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
  const session = await requireAdmin();
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
  const session = await requireAdmin();
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
  const session = await requireAuth();

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

  if (session.user.role === "superadmin" || session.user.role === "admin") {
    saveThemeSettings(
      {
        preset,
        density,
        customColors,
      },
      session.user.id,
    );
  }

  const cookieStore = await cookies();
  if (preset) {
    cookieStore.set("app_theme", preset, { path: "/", maxAge: 31536000 });
  }
  if (density) {
    cookieStore.set("app_density", density, { path: "/", maxAge: 31536000 });
  }
  if (customColors) {
    cookieStore.set("app_custom_colors", JSON.stringify(customColors), { path: "/", maxAge: 31536000 });
  } else if (preset && preset !== "custom") {
    cookieStore.delete("app_custom_colors");
  }

  revalidatePath("/", "layout");
}

export async function manualBackupAction() {
  await requireAdmin();
  createDatabaseBackup("backup-manual");
  refresh(["/parametres"]);
}

export async function saveProductUnitsAction(formData: FormData) {
  const session = await requireAdmin();
  const raw = String(formData.get("units") || "");
  const list = raw
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  saveProductUnits(list, session.user.id);
  refresh([
    "/parametres",
    "/produits",
    "/devis",
    "/factures",
    "/bons-livraison",
    "/bons-sortie",
    "/bons-commande",
  ]);
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
      devise: String(formData.get("devise") || "MAD").trim().toUpperCase(),
      taux_change: Number(formData.get("taux_change")) > 0 ? Number(formData.get("taux_change")) : 1.0,
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

export async function enregistrerRelanceAction(formData: FormData) {
  const session = await requireAuth();
  const companyId = await getActiveCompanyId();

  const document_id = Number(formData.get("document_id"));
  const client_id = Number(formData.get("client_id"));
  const palier = (formData.get("palier") as RelancePalier) || "prevenance";
  const canal = (formData.get("canal") as RelanceCanal) || "whatsapp";
  const destinataire = String(formData.get("destinataire") || "");
  const message_envoye = String(formData.get("message_envoye") || "");
  const statut = (formData.get("statut") as RelanceStatut) || "envoye";
  const notes = String(formData.get("notes") || "");

  if (!document_id || !client_id) {
    throw new Error("Document ou client invalide.");
  }

  logRelance({
    company_id: companyId,
    document_id,
    client_id,
    palier,
    canal,
    destinataire,
    message_envoye,
    statut,
    notes,
    created_by: session.user.id,
  });

  refresh(["/relances", "/dashboard", "/factures"]);
  return { success: true };
}

export async function enregistrerReglementRapideAction(formData: FormData) {
  const session = await requireAuth();
  const document_id = Number(formData.get("document_id"));
  const montant = Number(formData.get("montant"));
  const mode_paiement = String(formData.get("mode_paiement") || "Virement");
  const notes = String(formData.get("notes") || "");

  if (!document_id || isNaN(montant) || montant <= 0) {
    throw new Error("Montant ou document invalide.");
  }

  const result = enregistrerReglementRapide(
    document_id,
    montant,
    mode_paiement,
    notes,
    session.user.id
  );

  refresh(["/relances", "/dashboard", "/factures"]);
  return result;
}

export async function saveRelanceSettingsAction(formData: FormData) {
  const session = await requireAdmin();
  const companyId = await getActiveCompanyId();

  const rawJson = formData.get("settings_json");
  let newSettings: RelanceSettings;

  if (typeof rawJson === "string" && rawJson.trim()) {
    newSettings = safeJsonParse<RelanceSettings>(rawJson, getRelanceSettings(companyId));
  } else {
    const current = getRelanceSettings(companyId);
    newSettings = {
      delais: {
        prevenance: Number(formData.get("delai_prevenance") ?? current.delais.prevenance),
        relance_1: Number(formData.get("delai_relance_1") ?? current.delais.relance_1),
        relance_2: Number(formData.get("delai_relance_2") ?? current.delais.relance_2),
        mise_en_demeure: Number(formData.get("delai_mise_en_demeure") ?? current.delais.mise_en_demeure),
      },
      rib: String(formData.get("rib") || current.rib),
      banque: String(formData.get("banque") || current.banque),
      titulaire_compte: String(formData.get("titulaire_compte") || current.titulaire_compte),
      templates_fr: {
        prevenance: String(formData.get("template_fr_prevenance") || current.templates_fr.prevenance),
        relance_1: String(formData.get("template_fr_relance_1") || current.templates_fr.relance_1),
        relance_2: String(formData.get("template_fr_relance_2") || current.templates_fr.relance_2),
        mise_en_demeure: String(formData.get("template_fr_mise_en_demeure") || current.templates_fr.mise_en_demeure),
      },
      templates_ar: {
        prevenance: String(formData.get("template_ar_prevenance") || current.templates_ar.prevenance),
        relance_1: String(formData.get("template_ar_relance_1") || current.templates_ar.relance_1),
        relance_2: String(formData.get("template_ar_relance_2") || current.templates_ar.relance_2),
        mise_en_demeure: String(formData.get("template_ar_mise_en_demeure") || current.templates_ar.mise_en_demeure),
      },
    };
  }

  saveRelanceSettings(companyId, newSettings, session.user.id);
  refresh(["/parametres", "/relances"]);
  return { success: true };
}

export async function getRelancesHistoryAction(documentId: number) {
  await requireAuth();
  return getRelancesLogByDocument(documentId);
}

// ==========================================
// ACTIONS ABONNEMENTS (SUBSCRIPTIONS)
// ==========================================

export async function saveSubscriptionAction(input: {
  id?: number;
  client_id: number;
  titre: string;
  reference?: string;
  periodicite: Periodicite;
  date_debut: string;
  date_fin?: string;
  prochaine_echeance?: string;
  statut?: SubscriptionStatut;
  mode_reglement?: SubscriptionModeReglement;
  auto_generer?: number;
  generer_statut?: "brouillon" | "valide";
  terme_paiement_jours?: number;
  notes?: string;
  lignes: Array<{
    produit_id?: number | null;
    designation: string;
    quantite: number;
    unite?: string;
    prix_unitaire_ht: number;
    tva_rate: number;
    remise?: number;
  }>;
}) {
  const session = await requireAuth();
  const companyId = await getActiveCompanyId();

  const subId = saveSubscription(
    {
      ...input,
      company_id: companyId,
    },
    session.user.id
  );

  refresh(["/abonnements", "/dashboard"]);
  return { success: true, id: subId };
}

export async function generateSubscriptionInvoiceAction(subscriptionId: number) {
  const session = await requireAuth();
  const result = generateSubscriptionInvoice(subscriptionId, session.user.id);
  refresh(["/abonnements", "/factures", "/dashboard", "/relances"]);
  return { success: true, ...result };
}

export async function generateBatchDueInvoicesAction() {
  const session = await requireAuth();
  const companyId = await getActiveCompanyId();
  const result = generateBatchDueInvoices(companyId, session.user.id);
  refresh(["/abonnements", "/factures", "/dashboard", "/relances"]);
  return { success: true, ...result };
}

export async function toggleSubscriptionStatusAction(subscriptionId: number, newStatus: SubscriptionStatut) {
  const session = await requireAuth();
  toggleSubscriptionStatus(subscriptionId, newStatus, session.user.id);
  refresh(["/abonnements", "/dashboard"]);
  return { success: true };
}

export async function deleteSubscriptionAction(subscriptionId: number) {
  const session = await requireAuth();
  deleteSubscription(subscriptionId, session.user.id);
  refresh(["/abonnements", "/dashboard"]);
  return { success: true };
}

export async function getSubscriptionInvoicesAction(subscriptionId: number) {
  await requireAuth();
  return listSubscriptionInvoices(subscriptionId);
}

// ==========================================
// PORTAIL CLIENT DÉDIÉ (SERVER ACTIONS)
// ==========================================

// Rate limiting map for portal logins: max 5 failed attempts per 15 minutes per identifier
const portalLoginAttempts = new Map<string, { attempts: number; lockUntil: number }>();

export async function loginClientPortalAction(formData: FormData) {
  const identifier = String(formData.get("identifier") || "").trim();
  const code = String(formData.get("code") || "").trim();

  if (!identifier || !code) {
    return { success: false, error: "Veuillez saisir votre numéro (Téléphone ou ICE) et votre Code PIN." };
  }

  const rateKey = identifier.toLowerCase().replace(/\s+/g, "");
  const now = Date.now();
  const attemptRecord = portalLoginAttempts.get(rateKey);

  if (attemptRecord && attemptRecord.lockUntil > now) {
    const remainingMins = Math.ceil((attemptRecord.lockUntil - now) / 60000);
    return {
      success: false,
      error: `Trop de tentatives infructueuses. Accès temporairement verrouillé pour ${remainingMins} minute(s).`,
    };
  }

  const session = getClientByPortalCode(identifier, code);
  if (!session) {
    const currentAttempts = (attemptRecord?.attempts || 0) + 1;
    if (currentAttempts >= 5) {
      portalLoginAttempts.set(rateKey, { attempts: currentAttempts, lockUntil: now + 15 * 60 * 1000 });
      return {
        success: false,
        error: "Trop de tentatives erronées. Compte temporairement bloqué pendant 15 minutes par mesure de sécurité.",
      };
    } else {
      portalLoginAttempts.set(rateKey, { attempts: currentAttempts, lockUntil: 0 });
      return {
        success: false,
        error: `Identifiant ou code PIN incorrect (${5 - currentAttempts} essai(s) restant(s)).`,
      };
    }
  }

  // Clear failed attempts on success
  portalLoginAttempts.delete(rateKey);

  await setPortalClientSession(session);
  redirect("/espace-client");
}

export async function loginClientPortalWithTokenAction(token: string) {
  if (!token) return { success: false, error: "Lien d'accès manquant ou expiré." };
  const session = getClientByPortalToken(token);
  if (!session) return { success: false, error: "Ce lien d'accès est invalide ou expiré." };

  await setPortalClientSession(session);
  return { success: true };
}

export async function logoutClientPortalAction() {
  await clearPortalClientSession();
  redirect("/espace-client/login");
}

export async function signClientDocumentAction(input: {
  documentId: number;
  signerName: string;
  signatureData: string;
  documentType?: string;
}) {
  const session = await getPortalClientSession();
  if (!session) {
    return { success: false, error: "Session expirée. Veuillez vous reconnecter." };
  }

  if (!input.signerName?.trim()) {
    return { success: false, error: "Le nom du signataire est obligatoire." };
  }

  if (!input.signatureData || !input.signatureData.startsWith("data:image/")) {
    return { success: false, error: "Veuillez apposer votre signature sur l'écran avant de valider." };
  }

  const result = signDocumentByClient(
    session.clientId,
    input.documentId,
    input.signerName,
    input.signatureData
  );

  if (result.success) {
    const docKind = input.documentType || "bc";
    refresh([
      "/espace-client",
      "/bons-commande",
      "/devis",
      "/bons-livraison",
      `/print/${docKind}/${input.documentId}`,
    ]);
  }

  return result;
}

export async function regenerateClientPortalAccessAction(clientId: number) {
  const session = await requireAuth();

  // STRICT RBAC: Only superadmin is allowed to view, modify, or regenerate portal credentials
  if (session.user.role !== "superadmin") {
    return {
      success: false as const,
      error: "Accès refusé : Seul le super-administrateur (superadmin) est autorisé à gérer les accès du portail client.",
    };
  }

  const res = regenerateClientPortalAccess(clientId, session.user.id);
  refresh(["/clients"]);
  return { success: true as const, ...res };
}

// ==========================================
// PORTAIL CLIENT CLOUD SYNC SERVER ACTIONS
// ==========================================

export async function savePortalSyncSettingsAction(formData: FormData) {
  const session = await requireAuth();
  if (session.user.role !== "superadmin") {
    return { success: false as const, error: "Accès refusé : Seul le super-administrateur peut configurer la synchronisation cloud." };
  }

  const publicUrl = String(formData.get("public_url") || "").trim();
  const syncSecret = String(formData.get("sync_secret") || "").trim();
  const autoSync = formData.get("auto_sync") === "1";

  savePortalSyncSettings({ publicUrl, syncSecret, autoSync }, session.user.id);
  refresh(["/parametres", "/clients"]);
  return { success: true as const, message: "Paramètres de synchronisation cloud enregistrés avec succès." };
}

export async function regeneratePortalSyncSecretAction() {
  const session = await requireAuth();
  if (session.user.role !== "superadmin") {
    return { success: false as const, error: "Accès refusé : Seul le super-administrateur peut régénérer la clé secrète." };
  }

  const crypto = await import("crypto");
  const newSecret = crypto.randomBytes(16).toString("hex");
  savePortalSyncSettings({ syncSecret: newSecret }, session.user.id);
  refresh(["/parametres"]);
  return { success: true as const, syncSecret: newSecret };
}

export async function testPortalCloudConnectionAction() {
  const session = await requireAuth();
  if (session.user.role !== "superadmin") {
    return { success: false as const, error: "Accès refusé : Réservé au super-administrateur." };
  }

  const settings = getPortalSyncSettings();
  if (!settings.publicUrl) {
    return { success: false as const, error: "Veuillez d'abord configurer l'URL publique de votre portail client." };
  }

  try {
    const target = `${settings.publicUrl.replace(/\/+$/, "")}/api/portal/sync`;
    const res = await fetch(target, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${settings.syncSecret}`,
      },
      cache: "no-store",
    });

    if (res.status === 401) {
      return {
        success: false as const,
        error: "Échec d'authentification : La clé secrète ne correspond pas à celle configurée sur le serveur distant.",
      };
    }

    if (!res.ok) {
      return {
        success: false as const,
        error: `Le serveur distant a renvoyé le statut HTTP ${res.status}.`,
      };
    }

    const data = await res.json();
    return {
      success: true as const,
      message: `Connexion établie avec succès ! (${data.service || "Portail Déployé"})`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false as const,
      error: `Impossible de contacter l'adresse ${settings.publicUrl} (${msg}). Vérifiez que le serveur distant est bien en ligne.`,
    };
  }
}

export async function triggerPortalSyncAction() {
  const session = await requireAuth();
  if (session.user.role !== "superadmin") {
    return { success: false as const, error: "Accès refusé : Réservé au super-administrateur." };
  }

  const settings = getPortalSyncSettings();
  if (!settings.publicUrl) {
    return {
      success: false as const,
      error: "Veuillez configurer l'URL publique de votre portail client avant de synchroniser.",
    };
  }

  try {
    const payload = getPortalSyncExportPayload();
    const target = `${settings.publicUrl.replace(/\/+$/, "")}/api/portal/sync`;

    const res = await fetch(target, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.syncSecret}`,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (res.status === 401) {
      return {
        success: false as const,
        error: "Erreur d'authentification : La clé secrète est rejetée par le serveur distant.",
      };
    }

    if (!res.ok) {
      return {
        success: false as const,
        error: `Erreur du serveur distant : statut HTTP ${res.status}.`,
      };
    }

    const responseData = await res.json();
    if (!responseData.success) {
      return { success: false as const, error: responseData.error || "Erreur lors de la synchronisation." };
    }

    // Apply remote signatures and logins into local SQLite
    const { updatedSignatures } = applyPortalSyncIncomingPull(responseData);

    refresh(["/parametres", "/clients", "/bons-commande", "/espace-client"]);

    return {
      success: true as const,
      syncedDocuments: payload.documents.length,
      syncedClients: payload.clients.length,
      updatedSignatures,
      lastSyncedAt: new Date().toISOString(),
      message: `Synchronisation réussie ! ${payload.documents.length} document(s) et ${payload.clients.length} client(s) envoyés. ${updatedSignatures} signature(s) rapatriée(s).`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false as const,
      error: `Erreur de connexion : ${msg}`,
    };
  }
}

// ============================================================================
// ACTIONS RAPPROCHEMENT BANCAIRE
// ============================================================================

export async function saveBankAccountAction(formData: FormData) {
  const session = await requireAuth();
  const companyId = await getActiveCompanyId();

  const id = formData.get("id") ? Number(formData.get("id")) : undefined;
  const nomBanque = String(formData.get("nom_banque") || "").trim();
  const intitule = String(formData.get("intitule_compte") || "").trim();
  const rib = String(formData.get("rib") || "").trim();
  const iban = String(formData.get("iban") || "").trim();
  const bicSwift = String(formData.get("bic_swift") || "").trim();
  const devise = String(formData.get("devise") || "MAD").trim();
  const soldeInitial = Number(formData.get("solde_initial") || 0);

  if (!nomBanque || !intitule) {
    return { success: false as const, error: "Le nom de la banque et l'intitulé du compte sont obligatoires." };
  }

  saveBankAccount(
    {
      id,
      company_id: companyId,
      nom_banque: nomBanque,
      intitule_compte: intitule,
      rib,
      iban,
      bic_swift: bicSwift,
      devise,
      solde_initial: soldeInitial,
    },
    session.user.id,
  );

  refresh(["/rapprochement-bancaire", "/chiffre-affaires"]);
  return { success: true as const, message: "Compte bancaire enregistré avec succès." };
}

export async function importBankStatementAction(formData: FormData) {
  const session = await requireAuth();
  const companyId = await getActiveCompanyId();

  const accountId = Number(formData.get("bank_account_id"));
  if (!accountId) {
    return { success: false as const, error: "Veuillez sélectionner un compte bancaire." };
  }

  const file = formData.get("file") as File | null;
  const rawText = formData.get("raw_content") as string | null;

  let fileName = "releve.csv";
  let content = "";

  if (file && file.size > 0) {
    fileName = file.name;
    content = await file.text();
  } else if (rawText && rawText.trim()) {
    content = rawText.trim();
    fileName = String(formData.get("file_name") || "import-manuel.csv");
  } else {
    return { success: false as const, error: "Aucun fichier ou contenu de relevé fourni." };
  }

  try {
    const result = importBankStatementData(
      {
        accountId,
        companyId,
        fileName,
        rawContent: content,
      },
      session.user.id,
    );

    refresh(["/rapprochement-bancaire"]);
    return {
      success: true as const,
      statementId: result.statementId,
      nbOperations: result.nbOperations,
      message: `Relevé importé avec succès : ${result.nbOperations} opération(s) bancaire(s) extraite(s).`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: `Erreur d'import : ${msg}` };
  }
}

export async function autoReconcileAction(statementId: number, minScore = 85) {
  const session = await requireAuth();

  try {
    const result = autoReconcileStatement(statementId, minScore, session.user.id);
    refresh(["/rapprochement-bancaire", "/factures"]);
    return {
      success: true as const,
      reconciledCount: result.reconciledCount,
      message:
        result.reconciledCount > 0
          ? `Rapprochement automatique terminé : ${result.reconciledCount} opération(s) lettrée(s) avec succès.`
          : "Aucune nouvelle opération correspondant aux critères de confiance élevée n'a été trouvée.",
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: `Erreur de rapprochement : ${msg}` };
  }
}

export async function reconcileOperationAction(
  operationId: number,
  documentId: number,
  documentType: string,
) {
  const session = await requireAuth();

  try {
    const ok = reconcileBankOperation(operationId, documentId, documentType, session.user.id);
    if (!ok) {
      return { success: false as const, error: "Opération ou document introuvable." };
    }
    refresh(["/rapprochement-bancaire", "/factures", "/chiffre-affaires"]);
    return { success: true as const, message: "Opération rapprochée avec succès." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: `Erreur : ${msg}` };
  }
}

export async function unreconcileOperationAction(operationId: number) {
  await requireAuth();

  try {
    const ok = unreconcileBankOperation(operationId);
    if (!ok) {
      return { success: false as const, error: "Impossible d'annuler le rapprochement pour cette opération." };
    }
    refresh(["/rapprochement-bancaire", "/factures", "/chiffre-affaires"]);
    return { success: true as const, message: "Rapprochement annulé avec succès." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: `Erreur : ${msg}` };
  }
}

export async function createExpenseFromBankOpAction(formData: FormData) {
  const session = await requireAuth();

  const operationId = Number(formData.get("operation_id"));
  const motif = String(formData.get("motif") || "").trim();
  const branchId = formData.get("branch_id") ? Number(formData.get("branch_id")) : undefined;

  if (!operationId) {
    return { success: false as const, error: "Opération bancaire requise." };
  }

  try {
    const expenseId = createExpenseFromBankOperation(operationId, motif, branchId, session.user.id);
    refresh(["/rapprochement-bancaire", "/chiffre-affaires"]);
    return { success: true as const, expenseId, message: "Dépense créée et opération réconciliée avec succès." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: `Erreur : ${msg}` };
  }
}

export async function deleteBankStatementAction(statementId: number) {
  await requireAdmin();

  try {
    const ok = deleteBankStatement(statementId);
    if (!ok) {
      return { success: false as const, error: "Relevé bancaire introuvable." };
    }
    refresh(["/rapprochement-bancaire", "/factures"]);
    return { success: true as const, message: "Relevé bancaire supprimé et écritures restaurées." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: `Erreur : ${msg}` };
  }
}

export async function saveExchangeRateAction(input: {
  code: string;
  nom: string;
  nom_ar?: string;
  symbole?: string;
  taux: number;
  taux_achat?: number;
  taux_vente?: number;
  source?: "auto_api" | "bam" | "manuel";
  est_actif?: number;
}) {
  const session = await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const saved = saveExchangeRate(companyId, input, session.user.id);
    refresh(["/devises", "/factures", "/devis", "/bons-commande", "/parametres"]);
    return { success: true as const, rate: saved };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: `Erreur : ${msg}` };
  }
}

export async function syncExchangeRatesAction() {
  await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const res = await syncCompanyExchangeRates(companyId);
    refresh(["/devises", "/factures", "/devis", "/bons-commande", "/parametres"]);
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: `Erreur : ${msg}`, count: 0 };
  }
}

export async function recordPaymentWithForexAction(input: {
  documentId: number;
  montant: number;
  modePaiement: string;
  notes?: string;
  tauxReglement?: number;
}) {
  const session = await requireAuth();
  try {
    const res = enregistrerReglementRapide(
      input.documentId,
      input.montant,
      input.modePaiement,
      input.notes || "",
      session.user.id,
      input.tauxReglement
    );
    refresh(["/factures", "/bons-commande", "/relances", "/devises", "/chiffre-affaires", "/rapprochement-bancaire"]);
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: `Erreur : ${msg}` };
  }
}

export async function deleteForexTransactionAction(id: number) {
  const session = await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const ok = deleteForexTransaction(id, companyId, session.user.id);
    refresh(["/devises"]);
    return { success: Boolean(ok) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: `Erreur : ${msg}` };
  }
}

export async function getExchangeRateForCurrencyAction(code: string) {
  const companyId = await getActiveCompanyId();
  const rate = getExchangeRate(companyId, code.toUpperCase());
  return { rate: rate ? Number(rate.taux) : 1.0 };
}

/* ==========================================================================
   Stock Transfers (Transferts Inter-Dépôts) Actions
   ========================================================================== */

export async function saveStockTransfertDraftAction(input: {
  id?: number;
  sourceBranchId: number;
  destinationBranchId: number;
  chauffeurNom?: string;
  vehiculeMatricule?: string;
  bonTransportRef?: string;
  notes?: string;
  dateTransfert?: string;
  lignes: Array<{
    produitId: number;
    designation: string;
    unite?: string;
    quantiteExpediee: number;
  }>;
}) {
  const session = await requireAuth();
  const companyId = await getActiveCompanyId();

  if (input.sourceBranchId === input.destinationBranchId) {
    return { success: false as const, error: "Le dépôt source et le dépôt de destination doivent être différents." };
  }

  if (!input.lignes || input.lignes.length === 0) {
    return { success: false as const, error: "Veuillez ajouter au moins un article au bon de transfert." };
  }

  try {
    const id = saveStockTransfertDraft(
      {
        ...input,
        companyId,
      },
      session.user.id
    );

    refresh(["/transferts", "/bons-sortie"]);
    return { success: true as const, id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: `Erreur lors de l'enregistrement : ${msg}` };
  }
}

export async function expedierStockTransfertAction(
  id: number,
  transportData?: {
    chauffeurNom?: string;
    vehiculeMatricule?: string;
    bonTransportRef?: string;
    notes?: string;
  }
) {
  const session = await requireAuth();
  try {
    const userFullName = (session.user as any).full_name || session.user.name || session.user.username || "Expéditeur";
    const ok = expedierStockTransfert(id, transportData, session.user.id, userFullName);
    refresh(["/transferts", "/bons-sortie", "/produits"]);
    return { success: Boolean(ok) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: `Erreur d'expédition : ${msg}` };
  }
}

export async function receptionnerStockTransfertAction(
  id: number,
  receptionLines: Array<{
    lineId: number;
    quantiteRecue: number;
    motifEcart?: string;
  }>,
  motifGlobal?: string
) {
  const session = await requireAuth();
  try {
    const userFullName = (session.user as any).full_name || session.user.name || session.user.username || "Réceptionnaire";
    const ok = receptionnerStockTransfert(
      id,
      receptionLines,
      session.user.id,
      userFullName,
      motifGlobal
    );
    refresh(["/transferts", "/bons-sortie", "/produits"]);
    return { success: Boolean(ok) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: `Erreur de réception : ${msg}` };
  }
}

export async function annulerStockTransfertAction(id: number) {
  const session = await requireAuth();
  try {
    const ok = annulerStockTransfert(id, session.user.id);
    refresh(["/transferts", "/bons-sortie", "/produits"]);
    return { success: Boolean(ok) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: `Erreur d'annulation : ${msg}` };
  }
}

export async function ajusterStockDepotAction(
  branchId: number,
  produitId: number,
  nouvelleQuantite: number,
  motif: string
) {
  const session = await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const ok = ajusterStockDepot(
      companyId,
      branchId,
      produitId,
      nouvelleQuantite,
      motif,
      session.user.id
    );
    refresh(["/transferts", "/produits"]);
    return { success: Boolean(ok) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: `Erreur d'ajustement : ${msg}` };
  }
}

export async function getBranchStockMapAction(branchId: number) {
  await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const map = getDepotStockMap(companyId, branchId);
    return { success: true as const, stockMap: map };
  } catch (err) {
    return { success: false as const, stockMap: {} };
  }
}

// ============================================================
// SERVER ACTIONS : INVENTAIRES TOURNANTS & PÉRIODIQUES
// ============================================================

export async function creerInventaireSessionAction(data: {
  branchId: number;
  titre: string;
  typeInventaire: InventaireType;
  critereFiltre?: string;
  notes?: string;
}) {
  const session = await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const userFullName = (session.user as any).full_name || session.user.name || session.user.username;
    const inv = creerInventaireSession({
      ...data,
      companyId,
      userId: session.user.id,
      userFullName,
    });
    refresh(["/inventaires", "/transferts", "/produits"]);
    return { success: true as const, inventaire: inv };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg };
  }
}

export async function enregistrerComptageLigneAction(
  ligneId: number,
  stockPhysique: number,
  motifEcart?: string
) {
  await requireAuth();
  try {
    const ok = enregistrerComptageLigne(ligneId, stockPhysique, motifEcart);
    refresh(["/inventaires"]);
    return { success: Boolean(ok) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg };
  }
}

export async function scanCodeBarreInventaireAction(
  inventaireId: number,
  codeBarre: string,
  quantiteAjout: number = 1
) {
  await requireAuth();
  try {
    const res = scanCodeBarreInventaire(inventaireId, codeBarre, quantiteAjout);
    refresh(["/inventaires"]);
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, message: msg };
  }
}

export async function alignerLignesTheoriqueAction(
  inventaireId: number,
  mode: "non_comptes" | "tous" = "non_comptes"
) {
  await requireAuth();
  try {
    const ok = alignerLignesTheorique(inventaireId, mode);
    refresh(["/inventaires"]);
    return { success: Boolean(ok) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg };
  }
}

export async function cloturerInventaireAction(inventaireId: number) {
  const session = await requireAuth();
  try {
    const userFullName = (session.user as any).full_name || session.user.name || session.user.username;
    const ok = cloturerInventaire(inventaireId, session.user.id, userFullName);
    refresh(["/inventaires", "/transferts", "/produits"]);
    return { success: Boolean(ok) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg };
  }
}

export async function annulerInventaireAction(inventaireId: number) {
  const session = await requireAuth();
  try {
    const ok = annulerInventaire(inventaireId, session.user.id);
    refresh(["/inventaires"]);
    return { success: Boolean(ok) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg };
  }
}

// ============================================================
// SERVER ACTIONS : TRAÇABILITÉ DES LOTS & SÉRIES (DLC / DLUO)
// ============================================================

export async function creerLotAction(data: {
  branchId: number;
  produitId: number;
  numeroLot: string;
  dateFabrication?: string;
  datePeremption: string;
  quantiteInitiale: number;
  coutUnitaireHt?: number;
  fournisseurId?: number;
  notes?: string;
}) {
  await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const lot = creerLot({ ...data, companyId });
    refresh(["/lots-series", "/produits", "/transferts"]);
    return { success: true as const, lot };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg };
  }
}

export async function creerSerieAction(data: {
  branchId: number;
  produitId: number;
  numeroSerie: string;
  documentAchatRef?: string;
  garantieFinDate?: string;
  notes?: string;
}) {
  await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const serie = creerSerie({ ...data, companyId });
    refresh(["/lots-series", "/produits", "/transferts"]);
    return { success: true as const, serie };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg };
  }
}

export async function bloquerLotQuarantaineAction(lotId: number, motif: string) {
  const session = await requireAuth();
  try {
    const ok = bloquerLotQuarantaine(lotId, motif, session.user.id);
    refresh(["/lots-series", "/produits", "/transferts", "/inventaires"]);
    return { success: Boolean(ok) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg };
  }
}

export async function changerStatutSerieAction(
  serieId: number,
  statut: SerieStatut,
  motif?: string
) {
  const session = await requireAuth();
  try {
    const ok = changerStatutSerie(serieId, statut, motif, session.user.id);
    refresh(["/lots-series", "/produits"]);
    return { success: Boolean(ok) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg };
  }
}

// ==========================================
// RÉAPPROVISIONNEMENT INTELLIGENT ACTIONS
// ==========================================

export async function calculerBesoinsApprovisionnementAction(options?: {
  branchId?: number;
  horizonJours?: number;
  categorie?: string;
  fournisseurId?: number;
  urgence?: ReapproUrgence;
  search?: string;
}) {
  await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const suggestions = calculerBesoinsApprovisionnement({
      ...options,
      companyId,
    });
    return { success: true as const, suggestions };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, suggestions: [] };
  }
}

export async function getReapproKPIsAction(options?: {
  branchId?: number;
  horizonJours?: number;
}) {
  await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const kpis = getReapproKPIs({
      ...options,
      companyId,
    });
    return { success: true as const, kpis };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false as const,
      error: msg,
      kpis: {
        articlesEnRupture: 0,
        articlesACommander: 0,
        articlesSurstock: 0,
        budgetReapproEstimeHT: 0,
        fournisseursConcernes: 0,
      },
    };
  }
}

export async function genererBonsCommandeFournisseurAction(
  items: Array<{ produitId: number; quantite: number; prixUnitaireHT?: number }>,
  options: {
    branchId?: number;
    dateLivraisonSouhaitee?: string;
    notes?: string;
  }
) {
  const session = await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const bcs = genererBonsCommandeFournisseur(items, {
      ...options,
      companyId,
      userId: session.user.id,
    });
    refresh(["/reapprovisionnement", "/bons-commande", "/produits", "/transferts"]);
    return { success: true as const, bcs };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, bcs: [] };
  }
}

export async function mettreAJourSeuilsProduitAction(
  produitId: number,
  data: {
    stock_minimum?: number;
    stock_maximum?: number;
    delai_livraison_jours?: number;
    fournisseur_principal_id?: number | null;
    conditionnement_achat?: number;
    emplacement_code?: string;
  }
) {
  await requireAuth();
  try {
    mettreAJourSeuilsProduit(produitId, data);
    refresh(["/reapprovisionnement", "/produits", "/emplacements"]);
    return { success: true as const };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg };
  }
}

// ==========================================
// WMS & EMPLACEMENTS ACTIONS
// ==========================================

export async function listEmplacementsAction(options?: {
  branchId?: number;
  zone?: string;
  type?: EmplacementType;
  statut?: EmplacementStatut;
  search?: string;
}) {
  await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const emplacements = listEmplacements({
      ...options,
      companyId,
    });
    return { success: true as const, emplacements };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, emplacements: [] };
  }
}

export async function creerEmplacementAction(data: {
  branchId: number;
  zone: string;
  allee: string;
  travee: string;
  niveau: string;
  bac: string;
  type_emplacement?: EmplacementType;
  capacite_max_kg?: number;
  statut?: EmplacementStatut;
  notes?: string;
}) {
  await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const emplacement = creerEmplacement({
      ...data,
      companyId,
    });
    refresh(["/emplacements", "/produits"]);
    return { success: true as const, emplacement };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg };
  }
}

export async function genererMatriceEmplacementsAction(data: {
  branchId: number;
  zone: string;
  allees: string[];
  nbTravees: number;
  nbNiveaux: number;
  bacsParNiveau: string[];
  type_emplacement?: EmplacementType;
  capacite_max_kg?: number;
}) {
  await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const res = genererMatriceEmplacements({
      ...data,
      companyId,
    });
    refresh(["/emplacements", "/produits"]);
    return { success: true as const, totalCrees: res.totalCrees };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, totalCrees: 0 };
  }
}

export async function listProduitsEmplacementsAction(options?: {
  branchId?: number;
  produitId?: number;
  emplacementId?: number;
  search?: string;
}) {
  await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const list = listProduitsEmplacements({
      ...options,
      companyId,
    });
    return { success: true as const, list };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, list: [] };
  }
}

export async function assignerProduitEmplacementAction(data: {
  branchId: number;
  produitId: number;
  emplacementId: number;
  quantite?: number;
  capaciteMax?: number;
  estPrincipal?: boolean;
}) {
  await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    assignerProduitEmplacement({
      ...data,
      companyId,
    });
    refresh(["/emplacements", "/produits"]);
    return { success: true as const };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg };
  }
}

export async function retirerProduitEmplacementAction(produitEmplacementId: number) {
  await requireAuth();
  try {
    retirerProduitEmplacement(produitEmplacementId);
    refresh(["/emplacements", "/produits"]);
    return { success: true as const };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg };
  }
}

export async function getWmsKPIsAction(options?: { branchId?: number }) {
  await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const kpis = getWmsKPIs({
      ...options,
      companyId,
    });
    return { success: true as const, kpis };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false as const,
      error: msg,
      kpis: {
        totalEmplacements: 0,
        emplacementsOccupes: 0,
        emplacementsVides: 0,
        tauxOccupation: 0,
        totalProduitsCartographies: 0,
      },
    };
  }
}

export async function genererPickingListAction(documentId: number) {
  await requireAuth();
  try {
    const pickingList = genererPickingList(documentId);
    return { success: true as const, pickingList };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg };
  }
}

// ============================================================
// NOMENCLATURES & ORDRES DE FABRICATION
// ============================================================

export async function getNomenclatureAction(produitParentId: number, branchId?: number) {
  await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const nomenclature = getNomenclature(produitParentId, companyId, branchId);
    return { success: true as const, nomenclature };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg };
  }
}

export async function saveNomenclatureAction(input: {
  produitParentId: number;
  natureProduit?: NatureProduit;
  modeDestockageKit?: ModeDestockageKit;
  composants: Array<{
    composantId: number;
    quantite: number;
    unite?: string;
    tauxPertePourcent?: number;
    ordre?: number;
    notes?: string;
  }>;
}) {
  await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const updated = saveNomenclature({ ...input, companyId });
    refresh(["/nomenclatures", "/produits", "/dashboard"]);
    return { success: true as const, nomenclature: updated };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg };
  }
}

export async function supprimerNomenclatureAction(produitParentId: number) {
  await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    supprimerNomenclature(produitParentId, companyId);
    refresh(["/nomenclatures", "/produits"]);
    return { success: true as const };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg };
  }
}

export async function listKitsAction(branchId?: number) {
  await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const kits = listKits(companyId, branchId);
    return { success: true as const, kits };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, kits: [] };
  }
}

export async function getNomenclaturesKPIsAction() {
  await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const kpis = getNomenclaturesKPIs(companyId);
    return { success: true as const, kpis };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false as const,
      error: msg,
      kpis: {
        totalKits: 0,
        totalComposants: 0,
        totalOrdresFabrication: 0,
        valeurStockKitsHT: 0,
      },
    };
  }
}

export async function lancerOrdreFabricationAction(input: {
  branchId: number;
  produitId: number;
  typeOperation?: "assemblage" | "desassemblage";
  quantite: number;
  notes?: string;
}) {
  const session = await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const ofRecord = lancerOrdreFabrication({
      ...input,
      companyId,
      responsableId: session.user.id,
    });
    refresh(["/nomenclatures", "/produits", "/transferts", "/dashboard"]);
    return { success: true as const, ofRecord };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg };
  }
}

export async function listOrdresFabricationAction(branchId?: number) {
  await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const ordres = listOrdresFabrication(companyId, branchId);
    return { success: true as const, ordres };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, ordres: [] };
  }
}

// ============================================================
// ÉTIQUETTES & CODES-BARRES
// ============================================================

export async function generateBarcodeSvgAction(
  symbology: BarcodeSymbology,
  code: string,
  options?: { width?: number; height?: number; includeText?: boolean }
) {
  try {
    const svg = await generateBarcodeSvg(symbology, code, options);
    return { success: true as const, svg };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, svg: "" };
  }
}

export async function getEtiquettesProduitsAction(options?: {
  branchId?: number;
  search?: string;
  categorie?: string;
}) {
  await requireAuth();
  const companyId = await getActiveCompanyId();
  const db = getDb();

  try {
    let query = `
      SELECT
        p.id AS produit_id,
        p.ref,
        p.designation,
        p.code_barre,
        p.prix_ht,
        ROUND(p.prix_ht * (1 + p.tva_rate / 100), 2) AS prix_ttc,
        p.tva_rate,
        p.unite,
        p.categorie,
        p.emplacement_code,
        COALESCE(sd.quantite, 0) AS stock_actuel
      FROM produits p
      LEFT JOIN stock_depots sd ON sd.produit_id = p.id AND sd.branch_id = ?
      WHERE p.company_id = ? AND p.active = 1
    `;
    const params: any[] = [options?.branchId || 1, companyId];

    if (options?.search?.trim()) {
      query += " AND (p.ref LIKE ? OR p.designation LIKE ? OR p.code_barre LIKE ?)";
      const pattern = `%${options.search.trim()}%`;
      params.push(pattern, pattern, pattern);
    }

    if (options?.categorie && options.categorie !== "all") {
      query += " AND p.categorie = ?";
      params.push(options.categorie);
    }

    query += " ORDER BY p.designation ASC LIMIT 300";

    const rows = db.prepare(query).all(...params) as any[];
    return { success: true as const, produits: rows };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, produits: [] };
  }
}

// ============================================================
// CAISSE TACTILE (POS) & SESSIONS DE CAISSE (X / Z)
// ============================================================

export async function getSessionActiveAction(branchId: number) {
  const session = await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const caisseSession = getSessionActive(companyId, branchId);
    return { success: true as const, session: caisseSession };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, session: null };
  }
}

export async function ouvrirSessionCaisseAction(input: {
  branchId: number;
  fondInitial: number;
  detailsFondJson?: string;
}) {
  const session = await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const caisseSession = ouvrirSessionCaisse({
      ...input,
      companyId,
      userId: session.user.id,
    });
    refresh(["/pos", "/chiffre-affaires"]);
    return { success: true as const, session: caisseSession };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg };
  }
}

export async function enregistrerTicketCaisseAction(input: {
  sessionId: number;
  branchId: number;
  clientId?: number | null;
  clientNom?: string;
  lignes: Array<{
    produitId?: number | null;
    ref: string;
    designation: string;
    prixUnitaireHt: number;
    prixUnitaireTtc: number;
    quantite: number;
    tvaRate: number;
    remisePourcent?: number;
  }>;
  remiseGlobale?: number;
  modeReglement: CaisseModeReglement;
  montantPaye: number;
  detailsReglementJson?: string;
  paiementsPartiels?: PaiementPartiel[];
  notes?: string;
}) {
  const session = await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const ticket = enregistrerTicketCaisse({
      ...input,
      companyId,
      userId: session.user.id,
    });
    refresh(["/pos", "/chiffre-affaires", "/produits", "/dashboard"]);
    return { success: true as const, ticket };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg };
  }
}

export async function enregistrerMouvementCaisseAction(input: {
  sessionId: number;
  branchId: number;
  type: CaisseMouvementType;
  montant: number;
  motif: string;
  beneficiaire?: string;
}) {
  const session = await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const mvt = enregistrerMouvementCaisse({
      ...input,
      companyId,
      userId: session.user.id,
    });
    refresh(["/pos", "/chiffre-affaires"]);
    return { success: true as const, mouvement: mvt };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg };
  }
}

export async function genererRapportXAction(sessionId: number) {
  await requireAuth();
  try {
    const rapportX = genererRapportX(sessionId);
    return { success: true as const, rapport: rapportX };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg };
  }
}

export async function cloturerSessionCaisseAction(input: {
  sessionId: number;
  comptageReelEspeces: number;
  detailsComptageJson?: string;
  notes?: string;
}) {
  const session = await requireAuth();
  try {
    const rapportZ = cloturerSessionCaisse({
      ...input,
      userId: session.user.id,
    });
    refresh(["/pos", "/chiffre-affaires", "/dashboard"]);
    return { success: true as const, rapport: rapportZ };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg };
  }
}

export async function listSessionsCaisseAction(branchId?: number) {
  await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const sessions = listSessionsCaisse(companyId, branchId);
    return { success: true as const, sessions };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, sessions: [] };
  }
}

export async function getTicketByIdAction(ticketId: number) {
  await requireAuth();
  try {
    const ticket = getTicketById(ticketId);
    return { success: true as const, ticket };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, ticket: null };
  }
}



