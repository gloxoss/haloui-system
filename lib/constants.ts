import {
  type FeatureKey,
  type DocumentModuleSlug,
  type DocumentStatus,
  type DocumentType,
  type EmployeeAttestationType,
} from "@/lib/types";

export const APP_NAME = "Haloui System";
export const APP_VERSION = "0.1.0";
export const DEFAULT_LOCALE = "fr-MA";
export const DEFAULT_CURRENCY = "MAD";
export const DEFAULT_TVA_RATE = 0;
export const ADMIN_TEMP_PASSWORD = "admin123";
export const DEFAULT_SUPERADMIN_USERNAME = "haloui-dev";
export const DEFAULT_SUPERADMIN_PASSWORD = "HalouiDev@2026";
export const DEFAULT_SUPERADMIN_NAME = "Superadmin Haloui";

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  devis: "Devis",
  facture: "Facture",
  bl: "Bon de livraison",
  bs: "Bon de sortie",
  bc: "Bon de commande",
};

export const DOCUMENT_TYPE_COMPACT_LABELS: Record<DocumentType, string> = {
  devis: "Devis",
  facture: "Facture",
  bl: "Livraison",
  bs: "Sortie",
  bc: "Commande",
};

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  brouillon: "A finaliser",
  valide: "Pret a imprimer",
  imprime: "Termine",
};

export const DOCUMENT_MODULES: Array<{
  slug: DocumentModuleSlug;
  type: DocumentType;
  label: string;
}> = [
  { slug: "devis", type: "devis", label: "Devis" },
  { slug: "factures", type: "facture", label: "Factures" },
  { slug: "bons-livraison", type: "bl", label: "Bons de livraison" },
  { slug: "bons-sortie", type: "bs", label: "Bons de sortie" },
  { slug: "bons-commande", type: "bc", label: "Bons de commande" },
];

export const ATTESTATION_TYPE_LABELS: Record<EmployeeAttestationType, string> = {
  simple: "Simple",
  "avec-salaire": "Avec salaire",
  visa: "Pour visa",
  banque: "Pour banque",
};

export const DEFAULT_ATTESTATION_TEMPLATES: Record<EmployeeAttestationType, string> = {
  simple:
    "Nous soussignes, {{societe}}, attestons par la presente que {{employe}}, titulaire du numero CNSS {{cnss}}, est employe(e) au sein de notre societe depuis le {{date_entree}} en qualite de salarie(e).",
  "avec-salaire":
    "Nous soussignes, {{societe}}, attestons par la presente que {{employe}}, titulaire du numero CNSS {{cnss}}, est employe(e) au sein de notre societe depuis le {{date_entree}} en qualite de salarie(e). Son salaire mensuel brut est de {{salaire}}.",
  visa:
    "Nous soussignes, {{societe}}, attestons par la presente que {{employe}}, titulaire du numero CNSS {{cnss}}, est employe(e) au sein de notre societe depuis le {{date_entree}} en qualite de salarie(e). La presente attestation est delivree pour servir et valoir ce que de droit, notamment dans le cadre d'une demande de visa.",
  banque:
    "Nous soussignes, {{societe}}, attestons par la presente que {{employe}}, titulaire du numero CNSS {{cnss}}, est employe(e) au sein de notre societe depuis le {{date_entree}} en qualite de salarie(e). Son salaire mensuel brut est de {{salaire}}. La presente attestation est remise a l'interesse(e) pour constitution d'un dossier bancaire.",
};

export const FEATURE_TOGGLE_DEFINITIONS: Array<{
  key: FeatureKey;
  label: string;
  description: string;
}> = [
  { key: "devis", label: "Devis", description: "Afficher les devis et leur creation." },
  { key: "factures", label: "Factures", description: "Afficher les factures et leur creation." },
  { key: "bons_livraison", label: "Bons de livraison", description: "Afficher les bons de livraison." },
  { key: "bons_sortie", label: "Bons de sortie", description: "Afficher les bons de sortie." },
  { key: "bons_commande", label: "Bons de commande", description: "Afficher les bons de commande." },
  { key: "produits", label: "Produits", description: "Afficher le catalogue des produits." },
  { key: "clients", label: "Clients", description: "Afficher le repertoire clients." },
  { key: "fournisseurs", label: "Fournisseurs", description: "Afficher la page fournisseurs." },
  { key: "personnel", label: "Personnel", description: "Afficher les dossiers du personnel." },
  { key: "attestations", label: "Attestations", description: "Afficher la creation des attestations." },
  { key: "chiffre_affaires", label: "Chiffre d'affaires", description: "Afficher les recettes et statistiques." },
  { key: "utilisateurs", label: "Utilisateurs", description: "Afficher la gestion des comptes." },
];

export const DEFAULT_FEATURE_FLAGS: Record<FeatureKey, boolean> = {
  devis: true,
  factures: true,
  bons_livraison: true,
  bons_sortie: true,
  bons_commande: true,
  produits: true,
  clients: true,
  fournisseurs: false,
  personnel: true,
  attestations: true,
  chiffre_affaires: true,
  utilisateurs: true,
};

export const SEED_COMPANY = {
  id: 1 as const,
  name: "Patisserie Haloui",
  arabic_name: "حلويات الحلوي",
  address: "37, av imam mouslim Dradeb - Tanger",
  phone: "05 39 93 49 87",
  gsm: "06 68 70 69 38",
  rc: "53570",
  if_number: "81062511",
  tp: "50227788",
  ice: "001894660000040",
  logo_path: "/assets/logo.svg",
  legal_notice:
    "Patisserie Haloui - RC 53570 - IF 81062511 - TP 50227788 - ICE 001894660000040",
  attestation_template_simple: DEFAULT_ATTESTATION_TEMPLATES.simple,
  attestation_template_salary: DEFAULT_ATTESTATION_TEMPLATES["avec-salaire"],
  attestation_template_visa: DEFAULT_ATTESTATION_TEMPLATES.visa,
  attestation_template_bank: DEFAULT_ATTESTATION_TEMPLATES.banque,
};

export const SEED_BRANCHES = [
  "Sahat Al Madina",
  "37 Imam Mouslim (Dradeb)",
  "Mesnana",
  "Nador",
  "34 Imam Mouslim (Dradeb)",
  "Ain Hayani",
].map((name) => ({
  name,
  address: "Tanger",
  phone: "",
}));

export const PRIMARY_NAV_ITEMS = [
  { href: "/dashboard", label: "Tableau de bord" },
  { href: "/devis", label: "Devis", feature: "devis" as const },
  { href: "/factures", label: "Factures", feature: "factures" as const },
  { href: "/personnel", label: "Personnel", feature: "personnel" as const },
  { href: "/chiffre-affaires", label: "Chiffre d'affaires", feature: "chiffre_affaires" as const },
] as const;

export const BONS_NAV_ITEMS = [
  { href: "/bons-livraison", label: "Bons de livraison", feature: "bons_livraison" as const },
  { href: "/bons-sortie", label: "Bons de sortie", feature: "bons_sortie" as const },
  { href: "/bons-commande", label: "Bons de commande", feature: "bons_commande" as const },
] as const;

export const MORE_NAV_ITEMS = [
  { href: "/produits", label: "Produits", feature: "produits" as const },
  { href: "/clients", label: "Clients", feature: "clients" as const },
  { href: "/fournisseurs", label: "Fournisseurs", feature: "fournisseurs" as const },
  { href: "/utilisateurs", label: "Utilisateurs", feature: "utilisateurs" as const },
  { href: "/parametres", label: "Parametres", superadminOnly: true as const },
] as const;

export function getDocumentModule(slug: string) {
  return DOCUMENT_MODULES.find((module) => module.slug === slug);
}

export function getModuleSlugByType(type: DocumentType) {
  return DOCUMENT_MODULES.find((module) => module.type === type)?.slug ?? "devis";
}
