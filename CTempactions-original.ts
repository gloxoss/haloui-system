"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin, requireAuth, requireSuperadmin, updateUserPassword } from "@/lib/auth";
import { FEATURE_TOGGLE_DEFINITIONS } from "@/lib/constants";
import { getCompany } from "@/lib/data";
import {
  convertDocument,
  createAttestation,
  deleteEmployee,
  deleteEntity,
  deleteProduct,
  saveBranch,
  saveCompany,
  saveDocument,
  saveEmployee,
  saveEntity,
  saveFeatureFlags,
  saveProduct,
  resetBusinessData,
  saveUser,
  updateDocumentStatus,
  upsertRevenueEntry,
} from "@/lib/data";
import { createDatabaseBackup } from "@/lib/db";
import { safeJsonParse, todayIso, toNumber } from "@/lib/utils";
import {
  type DocumentLineInput,
  type DocumentStatus,
  type DocumentType,
  type EmployeeAttestationType,
  type PartyType,
} from "@/lib/types";

function refresh(paths: string[]) {
  for (const path of paths) {
    revalidatePath(path);
  }
}

export async function saveCompanyAction(formData: FormData) {
  const session = await requireSuperadmin();
  const current = getCompany();

  saveCompany(
    {
      ...current,
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
      attestation_template_simple: String(
        formData.get("attestation_template_simple") || current.attestation_template_simple,
      ),
      attestation_template_salary: String(
        formData.get("attestation_template_salary") || current.attestation_template_salary,
      ),
      attestation_template_visa: String(
        formData.get("attestation_template_visa") || current.attestation_template_visa,
      ),
      attestation_template_bank: String(
        formData.get("attestation_template_bank") || current.attestation_template_bank,
      ),
    },
    session.user.id,
  );

  refresh(["/dashboard", "/parametres", "/personnel/attestation"]);
}

export async function saveBranchAction(formData: FormData) {
  const session = await requireSuperadmin();
  saveBranch(
    {
      id: Number(formData.get("id")) || undefined,
      name: String(formData.get("name") || ""),
      address: String(formData.get("address") || ""),
      phone: String(formData.get("phone") || ""),
      active: formData.has("id") ? Number(formData.get("active") === "1") : Number(formData.get("active") || 1),
    },
    session.user.id,
  );
  refresh(["/parametres", "/dashboard"]);
}

export async function saveUserAction(formData: FormData) {
  const session = await requireAdmin();
  const submittedRole = String(formData.get("role") || "user");
  saveUser(
    {
      id: Number(formData.get("id")) || undefined,
      username: String(formData.get("username") || ""),
      full_name: String(formData.get("full_name") || ""),
      role: submittedRole === "admin" ? "admin" : "user",
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

export async function manualBackupAction() {
  await requireSuperadmin();
  createDatabaseBackup("haloui-manual");
  refresh(["/parametres"]);
}

export async function resetBusinessDataAction() {
  await requireSuperadmin();
  createDatabaseBackup("haloui-before-reset");
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

export async function deleteEntityAction(type: PartyType, formData: FormData) {
  const session = await requireAuth();
  deleteEntity(type, Number(formData.get("id")), session.user.id);
  refresh([`/${type}`]);
}

export async function saveProductAction(formData: FormData) {
  const session = await requireAuth();
  saveProduct(
    {
      id: Number(formData.get("id")) || undefined,
      ref: String(formData.get("ref") || ""),
      designation: String(formData.get("designation") || ""),
      unite: String(formData.get("unite") || "u"),
      prix_ht: toNumber(formData.get("prix_ht")),
      tva_rate: 0,
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

export async function saveDocumentAction(formData: FormData) {
  const session = await requireAuth();
  const slug = String(formData.get("slug") || "devis");
  const lines = safeJsonParse<Array<DocumentLineInput>>(
    String(formData.get("lines_json") || "[]"),
    [],
  );

  const documentId = saveDocument(
    {
      id: Number(formData.get("id")) || undefined,
      type: formData.get("type") as DocumentType,
      date: String(formData.get("date") || todayIso()),
      branch_id: Number(formData.get("branch_id")) || null,
      source_branch_id: Number(formData.get("source_branch_id")) || null,
      destination_branch_id: Number(formData.get("destination_branch_id")) || null,
      client_id: Number(formData.get("client_id")) || null,
      fournisseur_id: Number(formData.get("fournisseur_id")) || null,
      parent_document_id: Number(formData.get("parent_document_id")) || null,
      notes: String(formData.get("notes") || ""),
      avance: toNumber(formData.get("avance")),
      status: (String(formData.get("status") || "brouillon") as DocumentStatus),
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
  const id = createAttestation(
    Number(formData.get("employe_id")),
    String(formData.get("type") || "simple") as EmployeeAttestationType,
    String(formData.get("date") || todayIso()),
    session.user.id,
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
