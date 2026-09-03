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

export const ATTESTATION_TYPE_LABELS: Record<string, string> = {
  simple: "Attestation de travail (Standard)",
  "avec-salaire": "Attestation de travail avec salaire",
  visa: "Attestation pour demande de Visa",
  banque: "Attestation pour dossier bancaire",
  stage: "Attestation de stage",
  "certificat-travail": "Certificat de travail (Fin de contrat)",
  "ordre-mission": "Ordre de mission professionnelle",
  conge: "Titre de congé annuel payé",
  recommandation: "Lettre de recommandation",
  custom: "Document personnalisé (Modèle libre)",
};

export const ATTESTATION_TYPE_TITLES: Record<string, string> = {
  simple: "ATTESTATION DE TRAVAIL",
  "avec-salaire": "ATTESTATION DE TRAVAIL ET DE SALAIRE",
  visa: "ATTESTATION DE TRAVAIL",
  banque: "ATTESTATION DE TRAVAIL ET DE REVENUS",
  stage: "ATTESTATION DE STAGE",
  "certificat-travail": "CERTIFICAT DE TRAVAIL",
  "ordre-mission": "ORDRE DE MISSION",
  conge: "TITRE DE CONGÉ ANNUEL",
  recommandation: "LETTRE DE RECOMMANDATION",
  custom: "ATTESTATION OFFICIELLE",
};

export const DEFAULT_ATTESTATION_TEMPLATES: Record<string, string> = {
  simple:
    "Nous soussignés, {{societe}}, attestons par la présente que :\n\n{{employe}}, titulaire de la CNSS n° {{cnss}},\nest employé(e) au sein de notre société depuis le {{date_entree}} en qualité de salarié(e).\n\nCette attestation lui est délivrée sur sa demande pour servir et valoir ce que de droit.",
  "avec-salaire":
    "Nous soussignés, {{societe}}, attestons par la présente que :\n\n{{employe}}, titulaire de la CNSS n° {{cnss}},\nest employé(e) au sein de notre établissement depuis le {{date_entree}} en qualité de salarié(e).\n\nL'intéressé(e) perçoit à ce titre une rémunération mensuelle globale de {{salaire}}.\n\nLa présente attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit.",
  visa:
    "Nous soussignés, {{societe}}, attestons par la présente que :\n\n{{employe}}, titulaire de la CNSS n° {{cnss}},\nest employé(e) au sein de notre société en contrat à durée indéterminée depuis le {{date_entree}}.\n\nL'intéressé(e) bénéficie d'un congé autorisé pour la période sollicitée et reprendra ses fonctions au sein de notre entreprise à l'issue de son séjour.\n\nCette attestation est délivrée auprès des services consulaires pour l'obtention d'un visa de voyage.",
  banque:
    "Nous soussignés, {{societe}}, certifions par la présente que :\n\n{{employe}}, immatriculé(e) à la CNSS sous le n° {{cnss}},\nfait partie de notre personnel permanent depuis le {{date_entree}}.\n\nSon salaire mensuel net régulier s'élève à {{salaire}}.\n\nLa présente attestation est délivrée à l'intéressé(e) pour constitution de son dossier auprès des organismes bancaires.",
  stage:
    "Nous soussignés, {{societe}}, attestons par la présente que :\n\n{{employe}}\na effectué avec succès un stage pratique au sein de notre société du {{date_entree}} au {{date_sortie}}.\n\nDurant cette période de stage, l'intéressé(e) a fait preuve d'assiduité, de sérieux et de compétences remarquables dans l'exécution des missions qui lui ont été confiées.\n\nLa présente attestation lui est délivrée pour valoir ce que de droit.",
  "certificat-travail":
    "Nous soussignés, {{societe}}, certifions par la présente que :\n\n{{employe}}, titulaire de la CNSS n° {{cnss}},\na été employé(e) au sein de notre entreprise du {{date_entree}} au {{date_sortie}}.\n\nL'intéressé(e) quitte notre société libre de tout engagement professionnel et en conformité avec la réglementation en vigueur.\n\nFait pour servir et valoir ce que de droit.",
  "ordre-mission":
    "Nous soussignés, {{societe}}, ordonnons par la présente la mission suivante :\n\nIl est demandé à {{employe}}, titulaire de la CNSS n° {{cnss}},\nde se rendre en déplacement professionnel afin d'effectuer les opérations et démarches nécessaires pour le compte de notre société.\n\nPériode de mission : à compter du {{date_entree}}.\n\nLes autorités civiles et militaires sont priées de bien vouloir lui accorder aide et assistance en cas de besoin.",
  conge:
    "Nous soussignés, {{societe}}, certifions par la présente que :\n\n{{employe}}, titulaire de la CNSS n° {{cnss}},\nbénéficie d'un congé annuel payé régulier accordé par la direction pour la période sollicitée.\n\nL'intéressé(e) réintégrera son poste de travail dès expiration de la période de congé autorisée.",
  recommandation:
    "Par la présente, nous recommandons chaleureusement la candidature de :\n\n{{employe}}\nqui a exercé au sein de notre société {{societe}} depuis le {{date_entree}}.\n\nDurant son parcours parmi nous, il/elle a démontré un professionnalisme exemplaire, une rigueur constante et un grand esprit d'équipe.\n\nNous lui souhaitons pleine réussite dans ses futurs projets professionnels.",
  custom:
    "Nous soussignés, {{societe}}, attestons par la présente que :\n\n{{employe}}, titulaire du numéro CNSS {{cnss}},\nest employé(e) au sein de notre société depuis le {{date_entree}}.\n\n[Saisissez ici votre texte personnalisé...]",
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

export const SEED_COMPANIES = [
  {
    id: 1 as const,
    name: "STE OURIDA STATION SARL",
    arabic_name: "شركة وريدة محطة ش.م.م",
    address: "Ourida 4, Station Les Cerises, Route d'El Menzel, Sefrou",
    phone: "05 35 66 21 01",
    gsm: "06 61 00 00 00",
    rc: "1969",
    if_number: "20704112",
    tp: "15311035",
    ice: "001764405000093",
    logo_path: "/assets/logo.svg",
    legal_notice:
      "STE OURIDA STATION SARL - Station Les Cerises, Route d'El Menzel, Sefrou - RC 1969 - IF 20704112 - Patente 15311035 - CNSS 5298204 - ICE 001764405000093",
    attestation_template_simple: DEFAULT_ATTESTATION_TEMPLATES.simple,
    attestation_template_salary: DEFAULT_ATTESTATION_TEMPLATES["avec-salaire"],
    attestation_template_visa: DEFAULT_ATTESTATION_TEMPLATES.visa,
    attestation_template_bank: DEFAULT_ATTESTATION_TEMPLATES.banque,
  },
  {
    id: 2 as const,
    name: "STE ANANAS TRANS",
    arabic_name: "شركة أناناس ترونس",
    address: "Ourida 4, Station Les Cerises, Route d'El Menzel, Sefrou",
    phone: "05 35 66 21 01",
    gsm: "06 61 00 00 00",
    rc: "4603",
    if_number: "66015728",
    tp: "15302966",
    ice: "003536046000075",
    logo_path: "/assets/logo.svg",
    legal_notice:
      "STE ANANAS TRANS - Station Les Cerises, Route d'El Menzel, Sefrou - RC 4603 - IF 66015728 - Patente 15302966 - ICE 003536046000075",
    attestation_template_simple: DEFAULT_ATTESTATION_TEMPLATES.simple,
    attestation_template_salary: DEFAULT_ATTESTATION_TEMPLATES["avec-salaire"],
    attestation_template_visa: DEFAULT_ATTESTATION_TEMPLATES.visa,
    attestation_template_bank: DEFAULT_ATTESTATION_TEMPLATES.banque,
  },
];

export const SEED_COMPANY = SEED_COMPANIES[0];

export const SEED_PRODUCTS: Array<{
  company_id?: number;
  ref: string;
  designation: string;
  prix_ht: number;
  unite?: string;
}> = [
  { company_id: 1, ref: "GASOIL-10", designation: "GASOIL 10", prix_ht: 9.69, unite: "L" },
  { company_id: 1, ref: "ESS-SP", designation: "ESSENCE SANS PLOMB", prix_ht: 13.18, unite: "L" },
  { company_id: 1, ref: "LUB-15W40", designation: "HUILE MOTEUR 15W40 (5L)", prix_ht: 150.00, unite: "bidon" },
  { company_id: 1, ref: "SRV-LAVAGE", designation: "LAVAGE & GRAISSAGE", prix_ht: 41.67, unite: "u" },
  { company_id: 2, ref: "CPJ-45", designation: "CIMENT CPJ 45", prix_ht: 31250.00, unite: "tonne" },
  { company_id: 2, ref: "TRANS-FRET", designation: "TRANSPORT DE MARCHANDISES", prix_ht: 2192.98, unite: "voyage" },
];

export const SEED_CLIENTS = [
  {
    name: "STE SKOURA VOYAGE",
    ice: "003491188000002",
    address: "Centre Skoura, Province de Sefrou",
    phone: "05 35 66 21 01",
    email: "",
    notes: "Client professionnel transport & voyages - Sefrou / Skoura",
  },
  {
    name: "SOSEFSAKAN",
    ice: "003444453000071",
    address: "Zone Industrielle, Sefrou",
    phone: "05 35 66 21 01",
    email: "",
    notes: "Client professionnel - Négoce & BTP Sefrou",
  },
];

export const SEED_PRODUCTS_BATCH_V2_REFS = new Set<string>([]);

export const SEED_BRANCHES = [
  {
    company_id: 1,
    name: "Station Les Cerises - Pistes Carburant",
    address: "Ourida 4, Route d'El Menzel, Sefrou",
    phone: "05 35 66 21 01",
  },
  {
    company_id: 1,
    name: "Boutique & Café Station",
    address: "Ourida 4, Route d'El Menzel, Sefrou",
    phone: "05 35 66 21 01",
  },
  {
    company_id: 1,
    name: "Baie de Lavage & Graissage",
    address: "Ourida 4, Route d'El Menzel, Sefrou",
    phone: "05 35 66 21 01",
  },
  {
    company_id: 2,
    name: "Bureau Transport & Logistique",
    address: "Ourida 4, Route d'El Menzel, Sefrou",
    phone: "05 35 66 21 01",
  },
  {
    company_id: 2,
    name: "Dépôt Matériaux & Ciment",
    address: "Ourida 4, Route d'El Menzel, Sefrou",
    phone: "05 35 66 21 01",
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
