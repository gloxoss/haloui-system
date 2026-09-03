import {
  type FeatureKey,
  type DocumentModuleSlug,
  type DocumentStatus,
  type DocumentType,
  type EmployeeAttestationType,
  type ThemeSettings,
} from "@/lib/types";

export const APP_NAME = "Système de Gestion Commerciale";
export const APP_VERSION = "0.1.0";
export const DEFAULT_LOCALE = "fr-MA";
export const DEFAULT_CURRENCY = "MAD";
export const DEFAULT_TVA_RATE = 0;
export const ADMIN_TEMP_PASSWORD = "admin123";
export const DEFAULT_SUPERADMIN_USERNAME = "dev-admin";
export const DEFAULT_SUPERADMIN_PASSWORD = "DevAdmin@2026";
export const DEFAULT_SUPERADMIN_NAME = "Super Administrateur";

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

export const DEFAULT_THEME_SETTINGS = {
  preset: "slate-minimal",
  density: "compact",
} satisfies ThemeSettings;

export const THEME_PRESET_DEFINITIONS = [
  {
    key: "slate-minimal",
    label: "Ardoise minimaliste",
    description: "Le rendu le plus net: fond clair, gris bleuté et accent ardoise moderne.",
    swatches: ["#334155", "#64748b", "#f1f5f9"],
  },
  {
    key: "corporate-navy",
    label: "Bleu corporatif",
    description: "Bleu roi d'affaires puissant et contrastes éclatants.",
    swatches: ["#1e40af", "#3b82f6", "#dbeafe"],
  },
  {
    key: "emerald-luxe",
    label: "Émeraude moderne",
    description: "Vert finance prestigieux, dynamique et rassurant.",
    swatches: ["#065f46", "#059669", "#d1fae5"],
  },
  {
    key: "indigo-royal",
    label: "Indigo royal",
    description: "Palette tech moderne aux teintes violettes profondes.",
    swatches: ["#4338ca", "#6366f1", "#e0e7ff"],
  },
  {
    key: "crimson-executive",
    label: "Bordeaux & Carmin",
    description: "Rouge noble et chaleureux, style direction et prestige.",
    swatches: ["#991b1b", "#dc2626", "#fee2e2"],
  },
  {
    key: "ocean-cyan",
    label: "Océan Pacifique",
    description: "Bleu canard et cyan contemporain, frais et énergique.",
    swatches: ["#0e7490", "#06b6d4", "#cffafe"],
  },
  {
    key: "sunset-amber",
    label: "Cuivre & Terre de Sienne",
    description: "Tons chauds cuivrés et ambrés d'inspiration atelier artisanal.",
    swatches: ["#c2410c", "#f97316", "#ffedd5"],
  },
  {
    key: "violet-plum",
    label: "Pourpre & Violet",
    description: "Nuances créatives haut de gamme et distinctives.",
    swatches: ["#6b21a8", "#a855f7", "#f3e8ff"],
  },
  {
    key: "monochrome-black",
    label: "Noir & Blanc exécutif",
    description: "Style épuré, typographique et contrasté: noir et blanc absolu.",
    swatches: ["#18181b", "#71717a", "#f4f4f5"],
  },
  {
    key: "olive-ledger",
    label: "Olive comptoir",
    description: "Ambiance institutionnelle, comptable et sobre.",
    swatches: ["#3f4a36", "#51653d", "#e1e8d9"],
  },
  {
    key: "haloui-classic",
    label: "Ambre chaleureux",
    description: "Palette artisanale aux tons dorés et ambrés.",
    swatches: ["#7c2d12", "#b45309", "#fef3c7"],
  },
] as const;

export const THEME_DENSITY_DEFINITIONS = [
  {
    key: "compact",
    label: "Compacte",
    description: "Plus d'informations visibles, plus minimaliste.",
  },
  {
    key: "comfortable",
    label: "Confortable",
    description: "Un peu plus d'air entre les blocs et les champs.",
  },
] as const;

export const SEED_COMPANY = {
  id: 1 as const,
  name: "Entreprise Commerciale",
  arabic_name: "الشركة التجارية",
  address: "Boulevard Mohammed V, Tanger",
  phone: "05 39 00 00 00",
  gsm: "06 61 00 00 00",
  rc: "12345",
  if_number: "12345678",
  tp: "12345678",
  ice: "000000000000000",
  logo_path: "/assets/logo.svg",
  legal_notice:
    "Entreprise Commerciale - RC 12345 - IF 12345678 - TP 12345678 - ICE 000000000000000",
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
  { ref: "ART-001", designation: "Article Standard A", prix_ht: 120, unite: "u" },
  { ref: "ART-002", designation: "Produit Finition B", prix_ht: 250, unite: "u" },
  { ref: "ART-003", designation: "Pack Fourniture C", prix_ht: 450, unite: "lot" },
  { ref: "ART-004", designation: "Matière Première D", prix_ht: 85, unite: "kg" },
  { ref: "SRV-001", designation: "Prestation Technique E", prix_ht: 350, unite: "h" },
  { ref: "ART-005", designation: "Équipement Modulaire F", prix_ht: 850, unite: "u" },
  { ref: "ART-006", designation: "Consommable Atelier G", prix_ht: 45, unite: "boite" },
  { ref: "SRV-002", designation: "Maintenance & Support H", prix_ht: 600, unite: "forfait" },
];

export const SEED_PRODUCTS_BATCH_V2_REFS = new Set<string>([]);

export const SEED_BRANCHES = [
  {
    name: "Magasin Principal (Centre)",
    address: "Boulevard Mohammed V, Tanger",
    phone: "05 39 00 00 01",
  },
  {
    name: "Succursale 2",
    address: "Avenue Hassan II, Tanger",
    phone: "05 39 00 00 02",
  },
  {
    name: "Dépôt Central",
    address: "Zone Industrielle, Tanger",
    phone: "05 39 00 00 03",
  },
];

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
  { href: "/parametres", label: "Paramètres", superadminOnly: true as const },
] as const;

export function getDocumentModule(slug: string) {
  return DOCUMENT_MODULES.find((module) => module.slug === slug);
}

export function getModuleSlugByType(type: DocumentType) {
  return DOCUMENT_MODULES.find((module) => module.type === type)?.slug ?? "devis";
}
