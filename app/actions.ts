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
  enregistrerRetourCaisse,
  getTicketPourRetour,
  validerBonAchat,
  consommerBonAchat,
  getBonAchatByCode,
  getBonAchatById,
  getRetourById,
  listBonsAchat,
  listRetoursCaisse,
  synchroniserTicketsHorsLigne,
} from "@/lib/pos";
import {
  getFideliteConfig,
  updateFideliteConfig,
  convertirPointsEnBonAchat,
  getHistoriqueFideliteClient,
  getFideliteStats,
  ajusterPointsManuel,
} from "@/lib/fidelite";
import {
  getGrillesTarifaires,
  getGrilleTarifaireById,
  creerGrilleTarifaire,
  updateGrilleTarifaire,
  supprimerGrilleTarifaire,
  calculerPrixArticleClient,
  assignerCategorieClient,
} from "@/lib/tarification";
import {
  getCommissionRegles,
  creerCommissionRegle,
  updateCommissionRegle,
  supprimerCommissionRegle,
  getCommerciaux,
  assignerCommercialAUser,
  getCommissionFiches,
  getCommissionFicheById,
  genererFicheCommissionMensuelle,
  changerStatutFicheCommission,
} from "@/lib/commissions";
import {
  getCRMOpportunites,
  getCRMOpportuniteById,
  creerCRMOpportunite,
  deplacerEtapeOpportunite,
  convertirOpportuniteEnDevis,
  ajouterActiviteOpportunite,
  getCRMPipelineKPIs,
  supprimerCRMOpportunite,
} from "@/lib/crm";
import {
  getMessagerieConfig,
  updateMessagerieConfig,
  envoyerNotificationMessage,
  getMessagerieLogs,
  genererLienWhatsAppWeb,
} from "@/lib/messagerie";
import {
  pointerHeure,
  getPointagesJour,
  getPointagesPeriode,
  getPointageStatsJournalieres,
  verifierCodePinEmploye,
  ajusterPointageManuel,
} from "@/lib/pointeuse";
import {
  creerDemandeConge,
  validerDemandeConge,
  getCongesDemandes,
  getSoldesCongesEmployes,
} from "@/lib/conges";
import {
  creerPretAvance,
  getPretsAvances,
  getPretById,
  genererBulletinsPaieMensuels,
  getBulletinsPaie,
  changerStatutBulletin,
} from "@/lib/paie-prets";
import {
  creerNoteFrais,
  validerNoteFrais,
  rembourserNoteFrais,
  getNotesFrais,
  getNoteFraisById,
  getNotesFraisStats,
} from "@/lib/notes-frais";
import {
  authentifierEmployePortal,
  setEmployePortalSession,
  clearEmployePortalSession,
  getEmployePortalSession,
  getEmployePortalData,
} from "@/lib/employe-portal-auth";
import {
  getMargeStatsGlobales,
  getMargeParProduit,
  getMargeParFamille,
  getMargeParClient,
  getMargeParBranch,
  getMargeEvolutionMensuelle,
} from "@/lib/marge";
import {
  calculerDeclarationTVA,
  enregistrerDeclarationTVA,
  changerStatutDeclarationTVA,
  getDeclarationsTVA,
  getDeclarationTVAById,
} from "@/lib/tva";
import {
  type NoteFraisCategorie,
  type NoteFraisModeRemboursement,
  type NoteFraisStatut,
  type TVADeclarationStatut,
  type TVARegime,
} from "@/lib/types";
import {
  type MessagerieCanal,
  type MessagerieNotificationType,
  type PointageMethode,
  type CongeType,
  type CongeStatut,
  type PretType,
  type PretStatut,
  type BulletinPaieStatut,
  type FideliteConfigRecord,
  type ClientCategorieTarifaire,
  type GrilleTarifaireType,
  type GrilleTarifaireRecord,
  type CommissionBaseCalcul,
  type CommissionFicheStatut,
  type CommissionRegleRecord,
  type CRMEtape,
} from "@/lib/types";
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
  type CaisseRetourCompensation,
  type DenominationsComptage,
  type EnregistrerRetourInput,
  type OfflineTicketRecord,
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
  commercialId?: number | null;
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

// ============================================================================
// ACTIONS : RETOURS DE CAISSE & BONS D'ACHAT
// ============================================================================

export async function enregistrerRetourCaisseAction(
  input: Omit<EnregistrerRetourInput, "userId" | "companyId">
) {
  const session = await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const result = enregistrerRetourCaisse({
      ...input,
      companyId,
      userId: session.user.id,
    });
    refresh(["/pos", "/produits", "/chiffre-affaires", "/dashboard"]);
    return { success: true as const, retour: result.retour, bonAchat: result.bonAchat };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg };
  }
}

export async function getTicketPourRetourAction(ticketNumeroOrId: string | number) {
  await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const ticket = getTicketPourRetour(ticketNumeroOrId, companyId);
    return { success: true as const, ticket };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, ticket: null };
  }
}

export async function validerBonAchatAction(code: string) {
  await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const res = validerBonAchat(code, companyId);
    return { success: true as const, ...res };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, valide: false, message: msg };
  }
}

export async function getBonAchatByCodeAction(code: string) {
  await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const bon = getBonAchatByCode(code, companyId);
    return { success: true as const, bon };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, bon: null };
  }
}

export async function listBonsAchatAction(branchId?: number) {
  await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const bons = listBonsAchat(companyId, branchId);
    return { success: true as const, bons };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, bons: [] };
  }
}

export async function listRetoursCaisseAction(branchId?: number) {
  await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const retours = listRetoursCaisse(companyId, branchId);
    return { success: true as const, retours };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, retours: [] };
  }
}

// ============================================================================
// ACTIONS : SYNCHRONISATION HORS-LIGNE (OFFLINE FIRST PWA)
// ============================================================================

export async function synchroniserTicketsHorsLigneAction(
  tickets: OfflineTicketRecord[],
  branchId: number
) {
  const session = await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const res = synchroniserTicketsHorsLigne(tickets, branchId, session.user.id, companyId);
    refresh(["/pos", "/chiffre-affaires", "/produits", "/dashboard"]);
    return { success: true as const, ...res };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, successes: [], errors: [] };
  }
}

// ============================================================================
// ACTIONS : PROGRAMME DE FIDÉLITÉ CLIENT & CASHBACK
// ============================================================================

export async function getFideliteConfigAction() {
  await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const config = getFideliteConfig(companyId);
    return { success: true as const, config };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, config: null };
  }
}

export async function updateFideliteConfigAction(patch: Partial<FideliteConfigRecord>) {
  await requireAdmin();
  const companyId = await getActiveCompanyId();
  try {
    const config = updateFideliteConfig(companyId, patch);
    refresh(["/pos", "/clients", "/parametres"]);
    return { success: true as const, config };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, config: null };
  }
}

export async function convertirPointsEnBonAchatAction(params: {
  branchId: number;
  clientId: number;
  pointsAConvertir: number;
  validiteMois?: number;
}) {
  const session = await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const result = convertirPointsEnBonAchat({
      companyId,
      branchId: params.branchId,
      clientId: params.clientId,
      userId: session.user.id,
      pointsAConvertir: params.pointsAConvertir,
      validiteMois: params.validiteMois,
    });
    refresh(["/pos", "/clients"]);
    return { ...result };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg };
  }
}

export async function getHistoriqueFideliteClientAction(clientId: number) {
  await requireAuth();
  try {
    const mouvements = getHistoriqueFideliteClient(clientId);
    return { success: true as const, mouvements };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, mouvements: [] };
  }
}

export async function getFideliteStatsAction() {
  await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const stats = getFideliteStats(companyId);
    return { success: true as const, stats };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, stats: null };
  }
}

export async function ajusterPointsManuelAction(params: {
  clientId: number;
  points: number;
  motif: string;
}) {
  await requireAdmin();
  const companyId = await getActiveCompanyId();
  try {
    const res = ajusterPointsManuel({
      companyId,
      clientId: params.clientId,
      points: params.points,
      motif: params.motif,
    });
    refresh(["/clients", "/pos"]);
    return { success: true as const, ...res };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg };
  }
}

// ============================================================================
// ACTIONS : TARIFICATION PERSONNALISÉE & GRILLES TARIFAIRES
// ============================================================================

export async function getGrillesTarifairesAction() {
  await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const grilles = getGrillesTarifaires(companyId);
    return { success: true as const, grilles };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, grilles: [] };
  }
}

export async function getGrilleTarifaireByIdAction(id: number) {
  await requireAuth();
  try {
    const data = getGrilleTarifaireById(id);
    return { success: true as const, ...data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, grille: null, lignes: [] };
  }
}

export async function creerGrilleTarifaireAction(data: {
  code: string;
  nom: string;
  typeGrille: GrilleTarifaireType;
  categorieCible?: ClientCategorieTarifaire | null;
  clientId?: number | null;
  dateDebut?: string | null;
  dateFin?: string | null;
  remiseGlobalePourcent?: number;
  notes?: string;
  lignes?: Array<{
    produitId: number;
    prixSpecifiqueHt?: number | null;
    remisePourcent?: number;
  }>;
}) {
  await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const grille = creerGrilleTarifaire({
      ...data,
      companyId,
    });
    refresh(["/grilles-tarifaires", "/produits", "/clients", "/pos"]);
    return { success: true as const, grille };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, grille: null };
  }
}

export async function updateGrilleTarifaireAction(
  id: number,
  data: Partial<GrilleTarifaireRecord> & {
    lignes?: Array<{
      produitId: number;
      prixSpecifiqueHt?: number | null;
      remisePourcent?: number;
    }>;
  }
) {
  await requireAuth();
  try {
    const grille = updateGrilleTarifaire(id, data);
    refresh(["/grilles-tarifaires", "/produits", "/clients", "/pos"]);
    return { success: true as const, grille };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, grille: null };
  }
}

export async function supprimerGrilleTarifaireAction(id: number) {
  await requireAuth();
  try {
    supprimerGrilleTarifaire(id);
    refresh(["/grilles-tarifaires", "/produits", "/clients"]);
    return { success: true as const };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg };
  }
}

export async function calculerPrixArticleClientAction(params: {
  produitId: number;
  clientId?: number | null;
}) {
  await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const res = calculerPrixArticleClient({
      companyId,
      produitId: params.produitId,
      clientId: params.clientId,
    });
    return { success: true as const, ...res };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, prix_applique_ht: 0, remise_appliquee_pourcent: 0 };
  }
}

export async function assignerCategorieClientAction(
  clientId: number,
  categorie: ClientCategorieTarifaire
) {
  await requireAuth();
  try {
    assignerCategorieClient(clientId, categorie);
    refresh(["/clients", "/grilles-tarifaires", "/pos"]);
    return { success: true as const };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg };
  }
}

// ============================================================================
// ACTIONS : COMMISSIONNEMENT DES COMMERCIAUX & VENDEURS
// ============================================================================

export async function getCommissionReglesAction() {
  await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const regles = getCommissionRegles(companyId);
    return { success: true as const, regles };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, regles: [] };
  }
}

export async function creerCommissionRegleAction(data: {
  nom: string;
  userId?: number | null;
  categorieProduit?: string | null;
  baseCalcul: CommissionBaseCalcul;
  tauxPourcent: number;
}) {
  await requireAdmin();
  const companyId = await getActiveCompanyId();
  try {
    const regle = creerCommissionRegle({
      ...data,
      companyId,
    });
    refresh(["/commissions"]);
    return { success: true as const, regle };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, regle: null };
  }
}

export async function updateCommissionRegleAction(
  id: number,
  patch: Partial<CommissionRegleRecord>
) {
  await requireAdmin();
  try {
    const regle = updateCommissionRegle(id, patch);
    refresh(["/commissions"]);
    return { success: true as const, regle };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, regle: null };
  }
}

export async function supprimerCommissionRegleAction(id: number) {
  await requireAdmin();
  try {
    supprimerCommissionRegle(id);
    refresh(["/commissions"]);
    return { success: true as const };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg };
  }
}

export async function getCommerciauxAction() {
  await requireAuth();
  try {
    const commerciaux = getCommerciaux();
    return { success: true as const, commerciaux };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, commerciaux: [] };
  }
}

export async function assignerCommercialAUserAction(
  userId: number,
  data: {
    isCommercial: boolean;
    codeCommercial?: string;
    tauxCommissionDefaut?: number;
  }
) {
  await requireAdmin();
  try {
    assignerCommercialAUser(userId, data);
    refresh(["/commissions", "/utilisateurs"]);
    return { success: true as const };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg };
  }
}

export async function getCommissionFichesAction(periodeMois?: string) {
  await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const fiches = getCommissionFiches(companyId, periodeMois);
    return { success: true as const, fiches };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, fiches: [] };
  }
}

export async function getCommissionFicheByIdAction(id: number) {
  await requireAuth();
  try {
    const data = getCommissionFicheById(id);
    return { success: true as const, ...data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, fiche: null, lignes: [] };
  }
}

export async function genererFicheCommissionMensuelleAction(params: {
  commercialId: number;
  periodeMois: string;
  ajustements?: number;
  notes?: string;
}) {
  await requireAdmin();
  const companyId = await getActiveCompanyId();
  try {
    const res = genererFicheCommissionMensuelle({
      ...params,
      companyId,
    });
    refresh(["/commissions"]);
    return { success: true as const, ...res };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, fiche: null, lignesCount: 0 };
  }
}

export async function changerStatutFicheCommissionAction(
  ficheId: number,
  statut: CommissionFicheStatut,
  detailsPaiement?: {
    datePaiement?: string;
    modePaiement?: string;
  }
) {
  await requireAdmin();
  try {
    const fiche = changerStatutFicheCommission(ficheId, statut, detailsPaiement);
    refresh(["/commissions"]);
    return { success: true as const, fiche };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, fiche: null };
  }
}

// ============================================================================
// ACTIONS : CRM & PIPELINE DES OPPORTUNITÉS
// ============================================================================

export async function getCRMOpportunitesAction(options?: {
  commercialId?: number;
  search?: string;
}) {
  await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const opportunites = getCRMOpportunites(companyId, options);
    return { success: true as const, opportunites };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, opportunites: [] };
  }
}

export async function getCRMOpportuniteByIdAction(id: number) {
  await requireAuth();
  try {
    const data = getCRMOpportuniteById(id);
    return { success: true as const, ...data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, opportunite: null, activites: [] };
  }
}

export async function creerCRMOpportuniteAction(data: {
  branchId?: number | null;
  titre: string;
  clientId?: number | null;
  clientNom: string;
  contactNom?: string;
  contactTelephone?: string;
  contactEmail?: string;
  commercialId?: number | null;
  etape?: CRMEtape;
  probabilitePourcent?: number;
  montantEstimeHt: number;
  dateCloturePrevue?: string | null;
  notes?: string;
}) {
  const session = await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const opportunite = creerCRMOpportunite({
      ...data,
      companyId,
      userId: session.user.id,
    });
    refresh(["/opportunites"]);
    return { success: true as const, opportunite };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, opportunite: null };
  }
}

export async function deplacerEtapeOpportuniteAction(
  id: number,
  nouvelleEtape: CRMEtape,
  options?: {
    probabiliteCustom?: number;
    notes?: string;
    motifPerte?: string;
  }
) {
  const session = await requireAuth();
  try {
    const opportunite = deplacerEtapeOpportunite(id, nouvelleEtape, {
      ...options,
      userId: session.user.id,
    });
    refresh(["/opportunites"]);
    return { success: true as const, opportunite };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, opportunite: null };
  }
}

export async function convertirOpportuniteEnDevisAction(opportuniteId: number) {
  const session = await requireAuth();
  try {
    const res = convertirOpportuniteEnDevis(opportuniteId, session.user.id);
    refresh(["/opportunites", "/devis"]);
    return { success: true as const, ...res };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, documentId: 0, numeroDevis: 0 };
  }
}

export async function ajouterActiviteOpportuniteAction(
  opportuniteId: number,
  data: {
    typeActivite: "appel" | "reunion" | "email" | "devis" | "changement_etape" | "note";
    titre: string;
    description?: string;
  }
) {
  const session = await requireAuth();
  try {
    ajouterActiviteOpportunite(opportuniteId, {
      ...data,
      userId: session.user.id,
    });
    refresh(["/opportunites"]);
    return { success: true as const };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg };
  }
}

export async function getCRMPipelineKPIsAction() {
  await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const kpis = getCRMPipelineKPIs(companyId);
    return { success: true as const, kpis };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, kpis: null };
  }
}

export async function supprimerCRMOpportuniteAction(id: number) {
  await requireAuth();
  try {
    supprimerCRMOpportunite(id);
    refresh(["/opportunites"]);
    return { success: true as const };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg };
  }
}

// ============================================================================
// SERVER ACTIONS : MESSAGERIE INTÉGRÉE WHATSAPP BUSINESS & SMS
// ============================================================================

export async function getMessagerieConfigAction() {
  await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const config = getMessagerieConfig(companyId);
    return { success: true as const, config };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, config: null };
  }
}

export async function updateMessagerieConfigAction(patch: any) {
  await requireAdmin();
  const companyId = await getActiveCompanyId();
  try {
    const config = updateMessagerieConfig(companyId, patch);
    refresh(["/messagerie", "/parametres"]);
    return { success: true as const, config };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, config: null };
  }
}

export async function envoyerNotificationMessageAction(data: {
  canal: MessagerieCanal;
  typeNotification: MessagerieNotificationType;
  documentId?: number | null;
  documentNumero?: string;
  destinataireNom: string;
  destinataireTelephone: string;
  message: string;
}) {
  const session = await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const res = await envoyerNotificationMessage({
      ...data,
      companyId,
      userId: session.user.id,
    });
    refresh(["/messagerie", "/factures", "/devis", "/bons-commande", "/bons-livraison"]);
    return { success: res.success, logId: res.logId, error: res.error, whatsappUrl: res.whatsappUrl };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, logId: 0 };
  }
}

export async function getMessagerieLogsAction(options?: { limit?: number; canal?: MessagerieCanal }) {
  await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const logs = getMessagerieLogs(companyId, options);
    return { success: true as const, logs };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, logs: [] };
  }
}

// ============================================================================
// SERVER ACTIONS : POINTEUSE VIRTUELLE & TEMPS DE TRAVAIL
// ============================================================================

export async function pointerHeureAction(data: {
  employeId?: number;
  pin?: string;
  qrToken?: string;
  typePointage?: "auto" | "arrivee" | "depart";
  methode?: PointageMethode;
  notes?: string;
}) {
  const companyId = await getActiveCompanyId();
  try {
    const res = pointerHeure({
      ...data,
      companyId,
    });
    refresh(["/pointeuse", "/personnel"]);
    return { success: true as const, ...res };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, message: msg };
  }
}

export async function getPointagesJourAction(date?: string) {
  await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const pointages = getPointagesJour(companyId, date);
    const stats = getPointageStatsJournalieres(companyId, date);
    return { success: true as const, pointages, stats };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, pointages: [], stats: null };
  }
}

export async function verifierCodePinAction(pin: string) {
  try {
    const emp = verifierCodePinEmploye(pin);
    if (!emp) return { success: false as const, error: "Code PIN incorrect." };
    return { success: true as const, employe: { id: emp.id, nom: emp.nom, prenom: emp.prenom, numero: emp.numero } };
  } catch (err) {
    return { success: false as const, error: "Erreur lors de la vérification." };
  }
}

export async function ajusterPointageManuelAction(pointageId: number, patch: any) {
  await requireAdmin();
  try {
    const updated = ajusterPointageManuel(pointageId, patch);
    refresh(["/pointeuse", "/personnel"]);
    return { success: true as const, pointage: updated };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg };
  }
}

// ============================================================================
// SERVER ACTIONS : GESTION DES CONGÉS & ABSENCES
// ============================================================================

export async function creerDemandeCongeAction(data: {
  employeId: number;
  typeConge: CongeType;
  dateDebut: string;
  dateFin: string;
  nbJours?: number;
  motif?: string;
  justificatifPath?: string;
}) {
  await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const demande = creerDemandeConge({
      ...data,
      companyId,
    });
    refresh(["/conges", "/personnel"]);
    return { success: true as const, demande };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg };
  }
}

export async function validerDemandeCongeAction(
  demandeId: number,
  decision: "approuve" | "refuse",
  motifRefus?: string
) {
  const session = await requireAdmin();
  try {
    const demande = validerDemandeConge(demandeId, {
      decision,
      validePar: session.user.id,
      motifRefus,
    });
    refresh(["/conges", "/personnel"]);
    return { success: true as const, demande };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg };
  }
}

export async function getCongesDemandesAction(options?: { statut?: CongeStatut; employeId?: number }) {
  await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const demandes = getCongesDemandes(companyId, options);
    const soldes = getSoldesCongesEmployes(companyId);
    return { success: true as const, demandes, soldes };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, demandes: [], soldes: [] };
  }
}

// ============================================================================
// SERVER ACTIONS : PRÊTS, AVANCES & BULLETINS DE PAIE
// ============================================================================

export async function creerPretAvanceAction(data: {
  employeId: number;
  type: PretType;
  montantTotal: number;
  dateOctroi: string;
  nbMensualites: number;
  modePaiement?: string;
  notes?: string;
}) {
  const session = await requireAdmin();
  const companyId = await getActiveCompanyId();
  try {
    const pret = creerPretAvance({
      ...data,
      companyId,
      userId: session.user.id,
    });
    refresh(["/paie", "/personnel"]);
    return { success: true as const, pret };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg };
  }
}

export async function getPretsAvancesAction(options?: { employeId?: number; statut?: PretStatut }) {
  await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const prets = getPretsAvances(companyId, options);
    return { success: true as const, prets };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, prets: [] };
  }
}

export async function getPretByIdAction(id: number) {
  await requireAuth();
  try {
    const pret = getPretById(id);
    return { success: true as const, pret };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, pret: null };
  }
}

export async function genererBulletinsPaieMensuelsAction(periodeMois: string) {
  const session = await requireAdmin();
  const companyId = await getActiveCompanyId();
  try {
    const bulletins = genererBulletinsPaieMensuels({
      companyId,
      periodeMois,
      userId: session.user.id,
    });
    refresh(["/paie", "/personnel"]);
    return { success: true as const, bulletins };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, bulletins: [] };
  }
}

export async function getBulletinsPaieAction(options?: { periodeMois?: string; employeId?: number }) {
  await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const bulletins = getBulletinsPaie(companyId, options);
    return { success: true as const, bulletins };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, bulletins: [] };
  }
}

export async function changerStatutBulletinAction(
  bulletinId: number,
  statut: BulletinPaieStatut,
  options?: { datePaiement?: string; modePaiement?: string }
) {
  await requireAdmin();
  try {
    const bulletin = changerStatutBulletin(bulletinId, statut, options);
    refresh(["/paie", "/personnel"]);
    return { success: true as const, bulletin };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg };
  }
}

// ============================================================================
// SERVER ACTIONS : NOTES DE FRAIS & FRAIS KILOMÉTRIQUES
// ============================================================================

export async function getNotesFraisAction(filters?: {
  employeId?: number;
  statut?: NoteFraisStatut;
  categorie?: NoteFraisCategorie;
  dateDebut?: string;
  dateFin?: string;
  search?: string;
}) {
  await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const notes = getNotesFrais(companyId, filters);
    return { success: true as const, notes };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, notes: [] };
  }
}

export async function creerNoteFraisAction(params: {
  employeId: number;
  dateDepense: string;
  categorie: NoteFraisCategorie;
  description: string;
  montantTtc: number;
  tvaRate?: number;
  distanceKm?: number;
  baremeKmUnitaire?: number;
  vehiculeImmatriculation?: string;
  justificatifPath?: string;
}) {
  const session = await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const note = creerNoteFrais({
      ...params,
      companyId,
      userId: session.user.id,
    });
    refresh(["/notes-frais", "/espace-employe"]);
    return { success: true as const, note };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, note: null };
  }
}

export async function validerNoteFraisAction(
  id: number,
  decision: "approuve" | "refuse",
  motifRefus?: string
) {
  const session = await requireAdmin();
  try {
    const note = validerNoteFrais(id, decision, motifRefus, session.user.id);
    refresh(["/notes-frais", "/espace-employe"]);
    return { success: true as const, note };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, note: null };
  }
}

export async function rembourserNoteFraisAction(
  id: number,
  modeRemboursement: NoteFraisModeRemboursement = "virement",
  dateRemboursement?: string
) {
  const session = await requireAdmin();
  try {
    const note = rembourserNoteFrais(id, modeRemboursement, dateRemboursement, session.user.id);
    refresh(["/notes-frais", "/espace-employe"]);
    return { success: true as const, note };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, note: null };
  }
}

export async function getNotesFraisStatsAction() {
  await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const stats = getNotesFraisStats(companyId);
    return { success: true as const, stats };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, stats: null };
  }
}

// ============================================================================
// SERVER ACTIONS : PORTAIL EMPLOYÉ EN LIBRE-SERVICE
// ============================================================================

export async function loginEmployePortalAction(identifiant: string, pin: string) {
  try {
    const res = authentifierEmployePortal(identifiant, pin);
    if (!res.success || !res.employe) {
      return { success: false as const, error: res.error || "Échec de connexion." };
    }

    const today = new Date().toISOString();
    await setEmployePortalSession({
      employeId: res.employe.id,
      nom: res.employe.nom,
      prenom: res.employe.prenom,
      matricule: String(res.employe.numero_employe || res.employe.numero),
      cin: res.employe.cin || res.employe.cnss || "N/A",
      loginAt: today,
    });

    return { success: true as const, employe: res.employe };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg };
  }
}

export async function logoutEmployePortalAction() {
  await clearEmployePortalSession();
  redirect("/espace-employe/login");
}

export async function soumettreDemandeCongePortalAction(params: {
  employeId: number;
  typeConge: CongeType;
  dateDebut: string;
  dateFin: string;
  nbJours: number;
  motif?: string;
}) {
  const session = await getEmployePortalSession();
  if (!session || session.employeId !== params.employeId) {
    return { success: false as const, error: "Session collaborateur non autorisée." };
  }

  const companyId = await getActiveCompanyId();
  try {
    const demande = creerDemandeConge({
      ...params,
      companyId,
    });
    refresh(["/conges", "/espace-employe"]);
    return { success: true as const, demande };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg };
  }
}

export async function soumettreNoteFraisPortalAction(params: {
  employeId: number;
  dateDepense: string;
  categorie: NoteFraisCategorie;
  description: string;
  montantTtc: number;
  tvaRate?: number;
  distanceKm?: number;
  baremeKmUnitaire?: number;
  vehiculeImmatriculation?: string;
  justificatifPath?: string;
}) {
  const session = await getEmployePortalSession();
  if (!session || session.employeId !== params.employeId) {
    return { success: false as const, error: "Session collaborateur non autorisée." };
  }

  const companyId = await getActiveCompanyId();
  try {
    const note = creerNoteFrais({
      ...params,
      companyId,
    });
    refresh(["/notes-frais", "/espace-employe"]);
    return { success: true as const, note };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg };
  }
}

// ============================================================================
// SERVER ACTIONS : ANALYSE DE MARGE BRUTE & RENTABILITÉ
// ============================================================================

export async function getMargeDashboardDataAction(filters?: {
  dateDebut?: string;
  dateFin?: string;
  branchId?: number;
  famille?: string;
  clientId?: number;
}) {
  await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const stats = getMargeStatsGlobales(companyId, filters);
    const produits = getMargeParProduit(companyId, filters, 25);
    const familles = getMargeParFamille(companyId, filters);
    const clients = getMargeParClient(companyId, filters, 15);
    const branches = getMargeParBranch(companyId, filters);
    const evolution = getMargeEvolutionMensuelle(companyId);

    return {
      success: true as const,
      data: {
        stats,
        produits,
        familles,
        clients,
        branches,
        evolution,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg };
  }
}

// ============================================================================
// SERVER ACTIONS : RAPPROCHEMENT FISCAL & DÉCLARATION TVA (DGI)
// ============================================================================

export async function calculerDeclarationTVAAction(periodeCode: string, regime: TVARegime = "encaissement") {
  await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const calc = calculerDeclarationTVA({
      companyId,
      periodeCode,
      regime,
    });
    return { success: true as const, calcul: calc };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, calcul: null };
  }
}

export async function enregistrerDeclarationTVAAction(params: {
  periodeCode: string;
  regime?: TVARegime;
  statut?: TVADeclarationStatut;
  notes?: string;
}) {
  const session = await requireAdmin();
  const companyId = await getActiveCompanyId();
  try {
    const decl = enregistrerDeclarationTVA({
      ...params,
      companyId,
      userId: session.user.id,
    });
    refresh(["/declaration-tva"]);
    return { success: true as const, declaration: decl };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, declaration: null };
  }
}

export async function changerStatutDeclarationTVAAction(
  id: number,
  statut: TVADeclarationStatut,
  referenceTelepaiement?: string
) {
  await requireAdmin();
  try {
    const decl = changerStatutDeclarationTVA(id, statut, referenceTelepaiement);
    refresh(["/declaration-tva"]);
    return { success: true as const, declaration: decl };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, declaration: null };
  }
}

export async function getDeclarationsTVAAction() {
  await requireAuth();
  const companyId = await getActiveCompanyId();
  try {
    const declarations = getDeclarationsTVA(companyId);
    return { success: true as const, declarations };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg, declarations: [] };
  }
}







