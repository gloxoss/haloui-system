import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth";
import { getFeatureFlags } from "@/lib/data";
import { type DocumentType, type FeatureKey, type PartyType } from "@/lib/types";

export const DOCUMENT_FEATURE_MAP: Record<DocumentType, FeatureKey> = {
  devis: "devis",
  facture: "factures",
  bl: "bons_livraison",
  bs: "bons_sortie",
  bc: "bons_commande",
};

export const PARTY_FEATURE_MAP: Record<PartyType, FeatureKey> = {
  clients: "clients",
  fournisseurs: "fournisseurs",
};

export function isFeatureEnabled(feature: FeatureKey) {
  return getFeatureFlags()[feature];
}

export async function requireFeature(feature: FeatureKey) {
  const session = await requireAuth();

  if (session.user.role === "superadmin") {
    return session;
  }

  if (!isFeatureEnabled(feature)) {
    redirect("/dashboard");
  }

  return session;
}

export async function requireDocumentFeature(type: DocumentType) {
  return requireFeature(DOCUMENT_FEATURE_MAP[type]);
}

export async function requirePartyFeature(type: PartyType) {
  return requireFeature(PARTY_FEATURE_MAP[type]);
}
