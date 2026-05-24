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

export const SEED_PRODUCTS: Array<{
  ref: string;
  designation: string;
  prix_ht: number;
  unite?: string;
}> = [
  { ref: "SALE-001", designation: "LES NAIMES POISSON", prix_ht: 8 },
  { ref: "SALE-002", designation: "MINI PASTILLA L.MER", prix_ht: 144 },
  { ref: "SALE-003", designation: "MINI PASTILLA F.MER", prix_ht: 12 },
  { ref: "SALE-004", designation: "MINI PASTILLA POULET (grand)", prix_ht: 120 },
  { ref: "SALE-005", designation: "MINI PASTILLA POULET (1pc)", prix_ht: 10 },
  { ref: "SALE-006", designation: "PASTILLA F.MER", prix_ht: 25 },
  { ref: "SALE-007", designation: "PASTILLA POULET", prix_ht: 20 },
  { ref: "SALE-008", designation: "SIGAR FROMAGE 12pc", prix_ht: 54 },
  { ref: "SALE-009", designation: "SIGAR FROMAGE 1pc", prix_ht: 4.5 },
  { ref: "SALE-010", designation: "SIGAR FROMAGE D.FU (grand)", prix_ht: 66 },
  { ref: "SALE-011", designation: "SIGAR FROMAGE D.FU (1pc)", prix_ht: 5.5 },
  { ref: "SALE-012", designation: "BRIWAT CREVETTE", prix_ht: 96 },
  { ref: "SALE-013", designation: "BRIWAT CREVETTE 1pc", prix_ht: 8 },
  { ref: "SALE-014", designation: "BRIWAT POULET 12pc", prix_ht: 72 },
  { ref: "SALE-015", designation: "BRIWAT POULET 1pc", prix_ht: 6 },
  { ref: "SALE-016", designation: "BRIWATE V.HACHEE", prix_ht: 90 },
  { ref: "SALE-017", designation: "BRIWATE V.HACHEE 1pc", prix_ht: 7.5 },
  { ref: "SALE-018", designation: "CARRE POULET", prix_ht: 78 },
  { ref: "SALE-019", designation: "CARRE POULET 1pc", prix_ht: 6.5 },
  { ref: "SALE-020", designation: "CROQUETTE CREVETTE", prix_ht: 96 },
  { ref: "SALE-021", designation: "CROQUETTE CREVETTE 1pc", prix_ht: 8 },
  { ref: "SALE-022", designation: "CROQUETTE POULET", prix_ht: 84 },
  { ref: "SALE-023", designation: "CROQUETTE POULET 1pc", prix_ht: 7 },
  { ref: "SALE-024", designation: "LES NAIMES POISSON (grand)", prix_ht: 96 },

  { ref: "STIKS-001", designation: "MACARON SPECIAL", prix_ht: 12 },
  { ref: "STIKS-002", designation: "BOITE MACARON", prix_ht: 50 },
  { ref: "STIKS-003", designation: "BRAWNIESE", prix_ht: 40 },
  { ref: "STIKS-004", designation: "BROWNIESE", prix_ht: 40 },
  { ref: "STIKS-005", designation: "CAKE AHMAD", prix_ht: 40 },
  { ref: "STIKS-006", designation: "CAKE CHOCO", prix_ht: 40 },
  { ref: "STIKS-007", designation: "CAKE CITRON", prix_ht: 120 },
  { ref: "STIKS-008", designation: "CAKE GRAND", prix_ht: 50 },
  { ref: "STIKS-009", designation: "CAKE MOYANE", prix_ht: 40 },
  { ref: "STIKS-010", designation: "CAKE PETITE", prix_ht: 20 },
  { ref: "STIKS-011", designation: "CHOCOLAT DUBAI 100", prix_ht: 100 },
  { ref: "STIKS-012", designation: "CHOCOLAT DUBAI 20", prix_ht: 20 },
  { ref: "STIKS-013", designation: "CHOCOLAT DUBAI 30", prix_ht: 30 },
  { ref: "STIKS-014", designation: "CHOCOLAT DUBAI 80", prix_ht: 80 },
  { ref: "STIKS-015", designation: "CONFLEX", prix_ht: 50 },
  { ref: "STIKS-016", designation: "FINGRZ", prix_ht: 50 },
  { ref: "STIKS-017", designation: "KACHTOTA NORMAL", prix_ht: 40 },
  { ref: "STIKS-018", designation: "KACHTOTA PISTACHE", prix_ht: 50 },
  { ref: "STIKS-019", designation: "MINI MACARON", prix_ht: 70 },
  { ref: "STIKS-020", designation: "SAN SEBASTIAN (petit)", prix_ht: 40 },
  { ref: "STIKS-021", designation: "SAN SEBASTIAN (grand)", prix_ht: 60 },
  { ref: "STIKS-022", designation: "STIKS CHOCOLAT", prix_ht: 40 },
  { ref: "STIKS-023", designation: "TARTE AU LAIT GRAND", prix_ht: 120 },
  { ref: "STIKS-024", designation: "TARTE AU LAIT PETIT", prix_ht: 20 },
  { ref: "STIKS-025", designation: "TIRAMISU COFEE", prix_ht: 60 },
  { ref: "STIKS-026", designation: "TIRAMISU PISTACHE", prix_ht: 80 },

  { ref: "CCHE-001", designation: "COOKIES (boite)", prix_ht: 40 },
  { ref: "CCHE-002", designation: "COOKIES (1pc)", prix_ht: 7 },
  { ref: "CCHE-003", designation: "COOKIES PISTACHE", prix_ht: 8 },
  { ref: "CCHE-004", designation: "MADELAINE", prix_ht: 7 },
  { ref: "CCHE-005", designation: "MINI MADELINE", prix_ht: 20 },
  { ref: "CCHE-006", designation: "STIKS PISTACHE", prix_ht: 60 },

  { ref: "GATEAU-001", designation: "GATEAUX ACAJOU", prix_ht: 130 },
  { ref: "GATEAU-002", designation: "GATEAUX NOISETTE", prix_ht: 130 },
  { ref: "GATEAU-003", designation: "GATEAUX NOIX", prix_ht: 130 },
  { ref: "GATEAU-004", designation: "GATEAUX AMANDE", prix_ht: 130 },

  { ref: "BOITES-001", designation: "Boite Sables", prix_ht: 25 },
  { ref: "BOITES-002", designation: "Pack 10 Boite Sables", prix_ht: 200 },
  { ref: "BOITES-003", designation: "Pack 5 Boite Sables", prix_ht: 100 },

  { ref: "PLATEAU-001", designation: "PLATEAU G.T", prix_ht: 200 },
  { ref: "PLATEAU-002", designation: "PLATEAU M.T", prix_ht: 150 },
  { ref: "PLATEAU-003", designation: "PLATEAU P.T", prix_ht: 130 },

  { ref: "RAMA-001", designation: "BRIWAT", prix_ht: 160 },
  { ref: "RAMA-002", designation: "CHBAKIA", prix_ht: 70 },
  { ref: "RAMA-003", designation: "MHANCHA", prix_ht: 160 },
  { ref: "RAMA-004", designation: "SFOUF E.G", prix_ht: 140 },

  { ref: "SACHET-001", designation: "BOITE SALE", prix_ht: 100 },
  { ref: "SACHET-002", designation: "FEKAS DIN OL FOMI", prix_ht: 25 },
  { ref: "SACHET-003", designation: "GRAINE AUX SAUCE", prix_ht: 25 },
  { ref: "SACHET-004", designation: "NOUGAT CHOCOLAT", prix_ht: 50 },
  { ref: "SACHET-005", designation: "RONDELLE FROMAGE", prix_ht: 25 },
  { ref: "SACHET-006", designation: "RONDELLE OLIVE", prix_ht: 25 },
  { ref: "SACHET-007", designation: "SACHET BATONNETS", prix_ht: 25 },
  { ref: "SACHET-008", designation: "SACHET FKAS OLIVE", prix_ht: 25 },
  { ref: "SACHET-009", designation: "SACHET FKS AMANDE", prix_ht: 25 },
  { ref: "SACHET-010", designation: "SACHET FKS FROMAGE", prix_ht: 25 },
  { ref: "SACHET-011", designation: "SACHET FKS PAPRIKA", prix_ht: 25 },
  { ref: "SACHET-012", designation: "SACHET GRAINE (sucre)", prix_ht: 25 },
  { ref: "SACHET-013", designation: "SACHET GRAINE (sale)", prix_ht: 25 },
  { ref: "SACHET-014", designation: "SACHET PALMIER FROMAGE", prix_ht: 25 },

  { ref: "GMAR-KG-001", designation: "GATEAUX AMANDE (KG)", prix_ht: 140, unite: "kg" },
  { ref: "GMAR-KG-002", designation: "GATEAUX NOIX (KG)", prix_ht: 140, unite: "kg" },
  { ref: "GMAR-KG-003", designation: "GATEAUX NOISETTE (KG)", prix_ht: 140, unite: "kg" },
  { ref: "GMAR-KG-004", designation: "GATEAUX ACAJOU (KG)", prix_ht: 140, unite: "kg" },
  { ref: "GMAR-KG-005", designation: "GATEAUX MAROCAIN", prix_ht: 1, unite: "kg" },
  { ref: "GMAR-KG-006", designation: "BRIWAT AMANDE (KG)", prix_ht: 160, unite: "kg" },
  { ref: "GMAR-KG-007", designation: "MHANCHA AMANDE (KG)", prix_ht: 160, unite: "kg" },
  { ref: "GMAR-KG-008", designation: "CORNE DE GAZELLE (KG)", prix_ht: 160, unite: "kg" },

  { ref: "GMAR-U-001", designation: "GATEAUX AMANDE Unité", prix_ht: 3.5, unite: "pièce" },
  { ref: "GMAR-U-002", designation: "GATEAUX NOIX Unité", prix_ht: 3.5, unite: "pièce" },
  { ref: "GMAR-U-003", designation: "GATEAUX NOISETTE Unité", prix_ht: 3.5, unite: "pièce" },
  { ref: "GMAR-U-004", designation: "GATEAUX ACAJOU Unité", prix_ht: 3.5, unite: "pièce" },
  { ref: "GMAR-U-005", designation: "CORNE DE GAZELLE Unité", prix_ht: 4, unite: "pièce" },
  { ref: "GMAR-U-006", designation: "MHANCHA AMANDE Unité", prix_ht: 4, unite: "pièce" },

  { ref: "RAMA-005", designation: "SEFOUF AUX AMANDES SPECIAL", prix_ht: 160 },
  { ref: "RAMA-006", designation: "CHBAKIA AMANDE", prix_ht: 140 },

  { ref: "PLATEAU-004", designation: "PLATEAU P.F", prix_ht: 130 },
  { ref: "PLATEAU-005", designation: "PLATEAU M.F", prix_ht: 150 },
  { ref: "PLATEAU-006", designation: "PLATEAU G.F", prix_ht: 200 },
];

// Refs added in batch v2 (3 extra images). Used by the one-shot DB migration
// to ensure existing installs receive these products on next launch.
export const SEED_PRODUCTS_BATCH_V2_REFS = new Set<string>([
  "GMAR-KG-001", "GMAR-KG-002", "GMAR-KG-003", "GMAR-KG-004",
  "GMAR-KG-005", "GMAR-KG-006", "GMAR-KG-007", "GMAR-KG-008",
  "GMAR-U-001", "GMAR-U-002", "GMAR-U-003", "GMAR-U-004",
  "GMAR-U-005", "GMAR-U-006",
  "RAMA-005", "RAMA-006",
  "PLATEAU-004", "PLATEAU-005", "PLATEAU-006",
]);

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
