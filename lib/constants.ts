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
  category: "commercial" | "caisse" | "rh" | "multientite" | "systeme";
}> = [
  { key: "devis", label: "Devis", description: "Afficher les devis et leur création.", category: "commercial" },
  { key: "factures", label: "Factures", description: "Afficher les factures et leur création.", category: "commercial" },
  { key: "bons_livraison", label: "Bons de livraison", description: "Afficher les bons de livraison (BL).", category: "commercial" },
  { key: "bons_sortie", label: "Bons de sortie", description: "Afficher les bons de sortie (BS).", category: "commercial" },
  { key: "bons_commande", label: "Bons de commande", description: "Afficher les bons de commande (BC).", category: "commercial" },
  { key: "produits", label: "Articles & Catalogue", description: "Afficher le catalogue des produits et tarifs.", category: "commercial" },
  { key: "clients", label: "Clients", description: "Afficher le répertoire clients.", category: "commercial" },
  { key: "fournisseurs", label: "Fournisseurs", description: "Afficher le répertoire fournisseurs.", category: "commercial" },
  { key: "chiffre_affaires", label: "Chiffre d'affaires & Caisse", description: "Afficher le suivi des recettes, la caisse journalière et les statistiques.", category: "caisse" },
  { key: "personnel", label: "Personnel & Salaires", description: "Afficher la gestion des salariés et dossiers du personnel.", category: "rh" },
  { key: "attestations", label: "Attestations de travail", description: "Génération et impression des 10 modèles d'attestations.", category: "rh" },
  { key: "multi_societes", label: "Multi-Sociétés", description: "Activer le sélecteur d'entreprises (Ourida Station / Ananas Trans).", category: "multientite" },
  { key: "multi_branches", label: "Multi-Magasins & Pistes", description: "Activer la gestion de plusieurs points de vente et magasins.", category: "multientite" },
  { key: "multi_langue", label: "Sélecteur de Langue", description: "Activer le commutateur de langue bilingue (Français / العربية).", category: "systeme" },
  { key: "utilisateurs", label: "Gestion des Utilisateurs", description: "Réservé Superadmin : création et permissions des comptes d'accès.", category: "systeme" },
  { key: "gestion_tva", label: "Gestion de la TVA & Taxes", description: "Activer le calcul et l'affichage de la TVA sur les articles et les documents (Devis, Factures).", category: "commercial" },
  { key: "relances", label: "Relances Automatiques & Impayés", description: "Module intelligent de relances par paliers (J-3, J+7, J+15, J+30) par WhatsApp et Email.", category: "commercial" },
  { key: "abonnements", label: "Abonnements & Facturation Récurrente", description: "Gestion des contrats périodiques, prélèvements automatiques et tableau de bord MRR/ARR.", category: "commercial" },
  { key: "portail_client", label: "Portail Client Dédié", description: "Espace client sécurisé : solde dû, téléchargement devis/factures et signature de commandes.", category: "commercial" },
  { key: "rapprochement_bancaire", label: "Rapprochement Bancaire", description: "Import des relevés bancaires (OFX, QIF, CSV) et réconciliation automatique avec les factures et dépenses.", category: "caisse" },
  { key: "multi_devises", label: "Multi-Devises & Taux de Change", description: "Facturation et achats en devises étrangères (EUR, USD, GBP) avec taux en direct et calcul automatique des gains/pertes de change.", category: "commercial" },
  { key: "transferts_stock", label: "Transferts Inter-Dépôts & Bons BT", description: "Mouvements de stock entre magasins avec validation en 2 étapes (expédition puis réception physique).", category: "commercial" },
  { key: "inventaires_stock", label: "Inventaires Tournants & Périodiques", description: "Comptages physiques par rayon/code-barres, détection d'écarts et clôture avec ajustements automatiques.", category: "commercial" },
  { key: "lots_series", label: "Lots, Séries & DLC/DLUO", description: "Traçabilité des produits sensibles, suivi des numéros de lot et de série avec alertes d'expiration.", category: "commercial" },
  { key: "reappro_intelligent", label: "Réapprovisionnement Intelligent", description: "Calcul automatique des commandes fournisseurs basé sur les seuils, délais de livraison et vitesse d'écoulement (VMJ).", category: "commercial" },
  { key: "wms_emplacements", label: "Gestion des Emplacements WMS", description: "Cartographie détaillée (Allée/Travée/Niveau/Bac) et génération optimisée des listes de picking en serpentin.", category: "commercial" },
  { key: "nomenclatures_fabrication", label: "Nomenclatures & Kits (BOM)", description: "Produits composés (Kits/Packs), calcul du coût de revient, déstockage des composants et ordres de fabrication.", category: "commercial" },
  { key: "etiquettes_codes_barres", label: "Étiquettes & Codes-Barres", description: "Édition et impression en masse d'étiquettes de prix (EAN-13, Code 128, QR Code) pour imprimantes thermiques et A4.", category: "commercial" },
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
  chiffre_affaires: true,
  personnel: true,
  attestations: true,
  multi_societes: true,
  multi_branches: true,
  multi_langue: true,
  utilisateurs: true,
  gestion_tva: true,
  relances: true,
  abonnements: true,
  portail_client: true,
  rapprochement_bancaire: true,
  multi_devises: true,
  transferts_stock: true,
  inventaires_stock: true,
  lots_series: true,
  reappro_intelligent: true,
  wms_emplacements: true,
  nomenclatures_fabrication: true,
  etiquettes_codes_barres: true,
};

export const DEFAULT_PRODUCT_UNITS = [
  "u",
  "kg",
  "kilo",
  "g",
  "L",
  "litre",
  "tonne",
  "pièce",
  "boîte",
  "carton",
  "plateau",
  "bidon",
  "mètre",
  "m²",
  "voyage",
  "sac",
  "pack",
];

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
  {
    key: "dark-executive",
    label: "Sombre Exécutif (Mode Nuit)",
    description: "Design sombre prestigieux: fond nuit profonde, cartes contrastées et accent bleu moderne.",
    swatches: ["#090d16", "#1e293b", "#38bdf8"],
  },
  {
    key: "custom",
    label: "Palette Personnalisée (Sur-Mesure)",
    description: "Composez vos propres couleurs de marque (accent, menu, teintes douces).",
    swatches: ["#2563eb", "#0f172a", "#eff6ff"],
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

export const DEFAULT_RELANCE_TEMPLATES_FR = {
  prevenance: `Bonjour {{client_name}},

Nous vous rappelons avec courtoisie que la facture n° {{facture_numero}} d'un montant de {{montant_du}} arrive à échéance le {{date_echeance}}.

Vous pouvez consulter votre document ici : {{lien_facture}}

Coordonnées pour virement bancaire :
RIB : {{rib}}
Banque : {{banque}}

Nous restons à votre entière disposition pour tout renseignement.
Cordialement,
{{societe}}`,

  relance_1: `Bonjour {{client_name}},

Sauf erreur ou omission de notre part, nous constatons que la facture n° {{facture_numero}} du {{date_facture}} (Échéance le {{date_echeance}}) d'un montant restant de {{montant_du}} présente un retard de {{jours_retard}} jours.

Si le règlement a déjà été effectué, merci de nous transmettre le justificatif. Dans le cas contraire, nous vous remercions de bien vouloir régulariser cette situation dans les meilleurs délais.

Lien de la facture : {{lien_facture}}
RIB de virement : {{rib}} ({{banque}})

Bien cordialement,
{{societe}}`,

  relance_2: `Bonjour {{client_name}},

Malgré notre précédent rappel, la facture n° {{facture_numero}} reste impayée à ce jour, avec un retard de {{jours_retard}} jours pour un solde exigible de {{montant_du}}.

Nous vous prions de procéder au règlement immédiat afin d'éviter tout blocage de vos futures commandes ou livraisons.

Lien de la facture : {{lien_facture}}
RIB : {{rib}} ({{banque}})

Dans l'attente de votre confirmation rapide,
{{societe}}`,

  mise_en_demeure: `MISE EN DEMEURE - DERNIER AVIS AVANT CONTENTIEUX

À l'attention de {{client_name}},

Nous constatons que la facture n° {{facture_numero}} présente un retard critique de {{jours_retard}} jours pour un montant exigible de {{montant_du}}.

Faute de règlement sous 48 heures ouvrées, nous nous verrons contraints de transmettre votre dossier à notre service juridique pour engagement des poursuites légales de recouvrement, avec application des intérêts de retard.

Lien officiel : {{lien_facture}}
RIB de règlement : {{rib}} ({{banque}})

Comptant sur votre régularisation immédiate,
La Direction - {{societe}}`,
};

export const DEFAULT_RELANCE_TEMPLATES_AR = {
  prevenance: `السلام عليكم {{client_name}}،

نود تذكيركم بلطف بأن الفاتورة رقم {{facture_numero}} بمبلغ {{montant_du}} يحل أجل أدائها بتاريخ {{date_echeance}}.

يمكنكم الاطلاع على الفاتورة عبر الرابط التالي:
{{lien_facture}}

معلومات التحويل البنكي:
RIB: {{rib}}
البنك: {{banque}}

شكراً لثقتكم وتعاونكم الدائم.
{{societe}}`,

  relance_1: `السلام عليكم {{client_name}}،

نحيطكم علماً بأن الفاتورة رقم {{facture_numero}} بتاريخ {{date_facture}} (أجل الأداء: {{date_echeance}}) بمبلغ متبقي قدره {{montant_du}} قد تجاوزت أجل الاستحقاق بـ {{jours_retard}} يوماً.

إذا تم أداء المبلغ المرجو موافاتنا بوصل الأداء، وإلا نرجو منكم التفضل بتسوية الوضعية في أقرب الآجال.

رابط الفاتورة: {{lien_facture}}
رقم الحساب البنكي RIB: {{rib}} ({{banque}})

مع خالص التحيات،
{{societe}}`,

  relance_2: `السلام عليكم {{client_name}}،

على الرغم من تذكيرنا السابق، يؤسفنا إخباركم بأن الفاتورة رقم {{facture_numero}} لا تزال غير مسددة بتأخير قدره {{jours_retard}} يوماً، بمبلغ باقٍ قدره {{montant_du}}.\n\nنرجو منكم تسوية هذا المبلغ بصفة عاجلة تفادياً لأي تعليق للطلبيات أو التوصيلات القادمة.

رابط الفاتورة: {{lien_facture}}
رقم الحساب البنكي RIB: {{rib}} ({{banque}})

في انتظار تأكيدكم العاجل،
{{societe}}`,

  mise_en_demeure: `إنذار أخير قبل الإحالة على النزاعات القانونية

إلى السيد(ة) {{client_name}}،

نعلمكم بأن الفاتورة رقم {{facture_numero}} بلغت تأخيراً حرجاً قدره {{jours_retard}} يوماً بمبلغ مستحق قدره {{montant_du}}.

في حالة عدم التوصل بالأداء خلال 48 ساعة، سنكون مضطرين آسفين لإحالة الملف على مصلحة النزاعات لمباشرة إجراءات الاستخلاص القانونية مع احتساب فوائد التأخير.

رابط الفاتورة: {{lien_facture}}
رقم الحساب البنكي RIB: {{rib}} ({{banque}})

إدارة شركة {{societe}}`,
};

export const DEFAULT_RELANCE_SETTINGS = {
  delais: {
    prevenance: -3,
    relance_1: 7,
    relance_2: 15,
    mise_en_demeure: 30,
  },
  rib: "011 780 0000 123456789012 34",
  banque: "BMCE Bank of Africa",
  titulaire_compte: "STE OURIDA STATION SARL",
  templates_fr: DEFAULT_RELANCE_TEMPLATES_FR,
  templates_ar: DEFAULT_RELANCE_TEMPLATES_AR,
};

export const RELANCE_PALIER_LABELS: Record<string, { label: string; labelAr: string; color: string; badge: string }> = {
  prevenance: {
    label: "Palier 1 : Prévenance (J-3)",
    labelAr: "المرحلة 1 : تذكير استباقي (قبل 3 أيام)",
    color: "teal",
    badge: "J-3 Préventif",
  },
  relance_1: {
    label: "Palier 2 : 1ère Relance (J+7)",
    labelAr: "المرحلة 2 : تذكير ودي (بعد 7 أيام)",
    color: "yellow",
    badge: "J+7 Courtois",
  },
  relance_2: {
    label: "Palier 3 : 2ème Relance (J+15)",
    labelAr: "المرحلة 3 : إنذار حازم (بعد 15 يوماً)",
    color: "orange",
    badge: "J+15 Ferme",
  },
  mise_en_demeure: {
    label: "Palier 4 : Mise en Demeure (J+30)",
    labelAr: "المرحلة 4 : إنذار قانوني (بعد 30 يوماً)",
    color: "red",
    badge: "J+30 Contentieux",
  },
};

export const PERIODICITE_LABELS: Record<string, { label: string; labelAr: string; perUnit: string; perUnitAr: string; factor: number; code: string }> = {
  mensuel: { label: "Mensuel", labelAr: "شهري", perUnit: "/ mois", perUnitAr: "/ شهر", factor: 1, code: "M" },
  trimestriel: { label: "Trimestriel", labelAr: "فصلي (كل 3 أشهر)", perUnit: "/ trimestre", perUnitAr: "/ 3 أشهر", factor: 3, code: "T" },
  semestriel: { label: "Semestriel", labelAr: "نصف سنوي (كل 6 أشهر)", perUnit: "/ semestre", perUnitAr: "/ 6 أشهر", factor: 6, code: "S" },
  annuel: { label: "Annuel", labelAr: "سنوي", perUnit: "/ an", perUnitAr: "/ سنة", factor: 12, code: "A" },
};

export const SUBSCRIPTION_STATUT_LABELS: Record<string, { label: string; labelAr: string; color: string }> = {
  actif: { label: "Actif", labelAr: "نشط", color: "teal" },
  suspendu: { label: "Suspendu", labelAr: "معلق", color: "orange" },
  termine: { label: "Terminé", labelAr: "منتهي", color: "gray" },
  brouillon: { label: "Brouillon", labelAr: "مسودة", color: "blue" },
};

export const MODE_REGLEMENT_LABELS: Record<string, { label: string; labelAr: string }> = {
  prelevement: { label: "Prélèvement bancaire", labelAr: "اقتطاع بنكي" },
  virement: { label: "Virement bancaire", labelAr: "تحويل بنكي" },
  cheque: { label: "Chèque", labelAr: "شيك" },
  especes: { label: "Espèces", labelAr: "نقداً" },
  traite: { label: "Traite (LCN)", labelAr: "كمبيالة" },
};

export const PRIMARY_NAV_ITEMS = [
  { href: "/dashboard", label: "Tableau de bord" },
  { href: "/devis", label: "Devis", feature: "devis" as const },
  { href: "/factures", label: "Factures", feature: "factures" as const },
  { href: "/abonnements", label: "Abonnements", feature: "abonnements" as const },
  { href: "/relances", label: "Relances & Impayés", feature: "relances" as const },
  { href: "/personnel", label: "Personnel", feature: "personnel" as const },
  { href: "/chiffre-affaires", label: "Chiffre d'affaires", feature: "chiffre_affaires" as const },
  { href: "/rapprochement-bancaire", label: "Rapprochement bancaire", feature: "rapprochement_bancaire" as const },
  { href: "/devises", label: "Devises & Change", feature: "multi_devises" as const },
] as const;

export const DEVISES_STANDARDS = [
  { code: "MAD", nom: "Dirham Marocain", nomAr: "درهم مغربي", symbole: "DH", tauxDefaut: 1.0, estBase: true },
  { code: "EUR", nom: "Euro", nomAr: "يورو", symbole: "€", tauxDefaut: 10.87, estBase: false },
  { code: "USD", nom: "Dollar Américain", nomAr: "دولار أمريكي", symbole: "$", tauxDefaut: 9.36, estBase: false },
  { code: "GBP", nom: "Livre Sterling", nomAr: "جنيه إسترليني", symbole: "£", tauxDefaut: 12.65, estBase: false },
  { code: "CHF", nom: "Franc Suisse", nomAr: "فرنك سويسري", symbole: "CHF", tauxDefaut: 11.20, estBase: false },
  { code: "CAD", nom: "Dollar Canadien", nomAr: "دولار كندي", symbole: "$ CA", tauxDefaut: 7.25, estBase: false },
  { code: "AED", nom: "Dirham des Émirats", nomAr: "درهم إماراتي", symbole: "AED", tauxDefaut: 2.71, estBase: false },
  { code: "SAR", nom: "Riyal Saoudien", nomAr: "ريال سعودي", symbole: "SAR", tauxDefaut: 2.65, estBase: false },
  { code: "CNY", nom: "Yuan Chinois", nomAr: "يوان صيني", symbole: "¥", tauxDefaut: 1.38, estBase: false },
  { code: "TRY", nom: "Livre Turque", nomAr: "ليرة تركية", symbole: "₺", tauxDefaut: 0.28, estBase: false },
] as const;

export const BANQUES_MAROCAINES = [
  { code: "007", nom: "Attijariwafa Bank", nomAr: "التجاري وفا بنك", logo: "AWB" },
  { code: "101", nom: "Banque Populaire (BCP)", nomAr: "البنك الشعبي", logo: "BCP" },
  { code: "011", nom: "Bank of Africa (BMCE)", nomAr: "بنك أفريقيا", logo: "BOA" },
  { code: "230", nom: "CIH Bank", nomAr: "بنك القرض العقاري والسياحي", logo: "CIH" },
  { code: "022", nom: "Société Générale Maroc (SGMB)", nomAr: "الشركة العامة المغرب", logo: "SGMB" },
  { code: "013", nom: "BMCI (BNP Paribas)", nomAr: "البنك المغربي للتجارة والصناعة", logo: "BMCI" },
  { code: "225", nom: "Crédit Agricole du Maroc (CAM)", nomAr: "القرض الفلاحي للمغرب", logo: "CAM" },
  { code: "021", nom: "Crédit du Maroc (CDM)", nomAr: "مصرف المغرب", logo: "CDM" },
  { code: "350", nom: "Al Barid Bank", nomAr: "بريد بنك", logo: "ABB" },
  { code: "050", nom: "CFG Bank", nomAr: "سي إف جي بنك", logo: "CFG" },
  { code: "999", nom: "Autre établissement / Compte international", nomAr: "مؤسسة أخرى / حساب دولي", logo: "AUTRE" },
] as const;

export const BONS_NAV_ITEMS = [
  { href: "/bons-livraison", label: "Bons de livraison", feature: "bons_livraison" as const },
  { href: "/bons-sortie", label: "Bons de sortie", feature: "bons_sortie" as const },
  { href: "/bons-commande", label: "Bons de commande", feature: "bons_commande" as const },
  { href: "/transferts", label: "Transferts inter-dépôts", feature: "transferts_stock" as const },
  { href: "/inventaires", label: "Inventaires & Comptage", feature: "inventaires_stock" as const },
  { href: "/lots-series", label: "Lots, Séries & DLC", feature: "lots_series" as const },
  { href: "/reapprovisionnement", label: "Réapprovisionnement", feature: "reappro_intelligent" as const },
  { href: "/emplacements", label: "Emplacements & WMS", feature: "wms_emplacements" as const },
  { href: "/nomenclatures", label: "Nomenclatures & Kits", feature: "nomenclatures_fabrication" as const },
  { href: "/etiquettes", label: "Étiquettes & Codes-Barres", feature: "etiquettes_codes_barres" as const },
] as const;

export const INVENTAIRE_TYPE_LABELS: Record<string, { label: string; labelAr: string; color: string; description: string }> = {
  general: {
    label: "Inventaire Général",
    labelAr: "جرد عام شامل",
    color: "indigo",
    description: "Comptage complet de tous les articles du magasin / dépôt",
  },
  tournant_famille: {
    label: "Tournant par Famille",
    labelAr: "جرد دوري حسب الصنف",
    color: "teal",
    description: "Comptage ciblé d'une catégorie spécifique (Alimentaire, Lubrifiants...)",
  },
  tournant_rayon: {
    label: "Tournant par Rayon",
    labelAr: "جرد دوري حسب الجناح",
    color: "blue",
    description: "Comptage ciblé d'un emplacement / rayon physique",
  },
};

export const INVENTAIRE_STATUT_LABELS: Record<string, { label: string; labelAr: string; color: string }> = {
  en_cours: { label: "En cours de comptage", labelAr: "قيد الجرد", color: "blue" },
  cloture: { label: "Clôturé & Ajusté", labelAr: "مغلق ومصحح", color: "teal" },
  annule: { label: "Annulé", labelAr: "ملغى", color: "gray" },
};

export const MOTIFS_ECART_INVENTAIRE = [
  { value: "Casse / Avarie en rayon", label: "Casse / Avarie constatée en rayon" },
  { value: "Vol / Démarque inconnue", label: "Vol / Démarque inconnue" },
  { value: "Péremption / Date dépassée", label: "Péremption / Produit périmé retiré" },
  { value: "Erreur de saisie précédente", label: "Erreur d'écriture / Comptage antérieur" },
  { value: "Surplus / Retrouvé en réserve", label: "Surplus / Colis retrouvé en réserve" },
  { value: "Don / Dégustation / Offert", label: "Échantillon offert / Dégustation café" },
  { value: "Autre motif", label: "Autre justification" },
];

export const RAYONS_MAGASIN = [
  "Boutique - Rayon Frais",
  "Boutique - Boissons",
  "Boutique - Épicerie & Snacks",
  "Café Station",
  "Baie d'Entretien",
  "Baie Pièces & Équipements",
  "Pistes Carburants",
  "Dépôt Matériaux",
];

export const CATEGORIES_PRODUIT = [
  "Alimentaire & Frais",
  "Alimentaire & Boissons",
  "Café & Épicerie",
  "Carburants & Énergies",
  "Lubrifiants & Fluides",
  "Équipements & Batteries",
  "Équipements & Outillage",
  "Matériaux BTP",
  "Services Entretien",
  "Logistique",
  "Général",
];


export const MORE_NAV_ITEMS = [
  { href: "/produits", label: "Produits", feature: "produits" as const },
  { href: "/clients", label: "Clients", feature: "clients" as const },
  { href: "/fournisseurs", label: "Fournisseurs", feature: "fournisseurs" as const },
  { href: "/utilisateurs", label: "Utilisateurs", feature: "utilisateurs" as const, superadminOnly: true as const },
  { href: "/parametres", label: "Paramètres" },
] as const;

export function getDocumentModule(slug: string) {
  return DOCUMENT_MODULES.find((module) => module.slug === slug);
}

export function getModuleSlugByType(type: DocumentType) {
  return DOCUMENT_MODULES.find((module) => module.type === type)?.slug ?? "devis";
}

export const TYPES_EMPLACEMENT_LABELS: Record<string, { label: string; labelAr: string; color: string }> = {
  picking: { label: "Picking (Préparation)", labelAr: "منطقة الالتقاط", color: "blue" },
  reserve: { label: "Réserve (Racks Hauts)", labelAr: "مخزون احتياطي", color: "teal" },
  quarantaine: { label: "Quarantaine (Contrôle)", labelAr: "منطقة الحجر الصحي", color: "red" },
  transit: { label: "Transit (Quai Réception)", labelAr: "منطقة العبور", color: "orange" },
};

export const REAPPRO_URGENCE_LABELS: Record<string, { label: string; labelAr: string; color: string }> = {
  rupture: { label: "Rupture de stock", labelAr: "نفاد المخزون", color: "red" },
  critique: { label: "Stock critique", labelAr: "حرج (تحت حد الأمان)", color: "orange" },
  a_commander: { label: "À commander", labelAr: "يجب الطلب", color: "yellow" },
  optimal: { label: "Optimal", labelAr: "مخزون كافٍ", color: "teal" },
  surstock: { label: "Surstock", labelAr: "فائض عن الحاجة", color: "indigo" },
};

export const ZONES_ENTREPOT_DEFAULT = [
  "Zone A (Frais / Boissons)",
  "Zone B (Épicerie & Sec)",
  "Zone C (Lubrifiants & Fluides)",
  "Zone D (Batteries & Outillage)",
  "Zone E (Matériaux & Extérieur)",
];

export const NATURE_PRODUIT_LABELS: Record<string, { label: string; labelAr: string; color: string }> = {
  simple: { label: "Article standard (Simple)", labelAr: "منتج بسيط قياسي", color: "gray" },
  kit: { label: "Pack / Kit composé", labelAr: "حزمة / طقم مجمّع", color: "indigo" },
  composant: { label: "Composant élémentaire", labelAr: "مكوّن أولي", color: "teal" },
};

export const MODE_DESTOCKAGE_LABELS: Record<string, { label: string; labelAr: string; description: string }> = {
  composants: {
    label: "À la commande (Déstocker les composants)",
    labelAr: "عند الطلب (خصم المكونات)",
    description: "Le pack n'est pas assemblé d'avance. La vente décrémente chaque composant élémentaire.",
  },
  produit_fini: {
    label: "Pré-assemblé (Déstocker le kit fini)",
    labelAr: "مجمّع مسبقاً (خصم المنتج التام)",
    description: "Le pack est fabriqué au préalable via un Ordre de Fabrication en atelier.",
  },
};

export const ORDRE_FABRICATION_STATUT_LABELS: Record<string, { label: string; labelAr: string; color: string }> = {
  planifie: { label: "Planifié", labelAr: "مخطط له", color: "blue" },
  en_cours: { label: "En cours d'assemblage", labelAr: "قيد التجميع", color: "orange" },
  termine: { label: "Terminé", labelAr: "مكتمل", color: "teal" },
  annule: { label: "Annulé", labelAr: "ملغى", color: "gray" },
};

export const BARCODE_SYMBOLOGY_LABELS: Record<string, { label: string; labelAr: string; description: string }> = {
  ean13: {
    label: "EAN-13 (Standard Rayon)",
    labelAr: "EAN-13 (قياسي رفوف)",
    description: "Code à 13 chiffres universel pour la grande distribution et les supermarchés.",
  },
  code128: {
    label: "Code 128 (Logistique Alphanumérique)",
    labelAr: "Code 128 (لوجستي نصي)",
    description: "Code-barres haute densité acceptant lettres et chiffres pour références internes.",
  },
  qrcode: {
    label: "QR Code (2D Haute Densité)",
    labelAr: "QR Code (رمز استجابة سريعة)",
    description: "Matrice 2D scannable par smartphone et douchette 2D.",
  },
};

export const ETIQUETTES_FORMATS_PRESETS = [
  // Thermiques Rouleau
  {
    id: "zebra_50x30",
    nom: "Zebra 50 x 30 mm (Standard Rayon)",
    nomAr: "زيبرا 50 × 30 مم (قياسي)",
    imprimanteCible: "Zebra" as const,
    typeSupport: "thermique_rouleau" as const,
    largeurMm: 50,
    hauteurMm: 30,
  },
  {
    id: "zebra_70x35",
    nom: "Zebra 70 x 35 mm (Gondole & Carton)",
    nomAr: "زيبرا 70 × 35 مم (رف كرتون)",
    imprimanteCible: "Zebra" as const,
    typeSupport: "thermique_rouleau" as const,
    largeurMm: 70,
    hauteurMm: 35,
  },
  {
    id: "zebra_100x50",
    nom: "Zebra 100 x 50 mm (Logistique Palette)",
    nomAr: "زيبرا 100 × 50 مم (لوجستي)",
    imprimanteCible: "Zebra" as const,
    typeSupport: "thermique_rouleau" as const,
    largeurMm: 100,
    hauteurMm: 50,
  },
  {
    id: "brother_62x29",
    nom: "Brother DK-11209 (62 x 29 mm)",
    nomAr: "براذر 62 × 29 مم",
    imprimanteCible: "Brother" as const,
    typeSupport: "thermique_rouleau" as const,
    largeurMm: 62,
    hauteurMm: 29,
  },
  {
    id: "dymo_89x36",
    nom: "Dymo 99012 (89 x 36 mm)",
    nomAr: "دايمو 89 × 36 مم",
    imprimanteCible: "Dymo" as const,
    typeSupport: "thermique_rouleau" as const,
    largeurMm: 89,
    hauteurMm: 36,
  },
  {
    id: "dymo_54x25",
    nom: "Dymo 11352 (54 x 25 mm)",
    nomAr: "دايمو 54 × 25 مم",
    imprimanteCible: "Dymo" as const,
    typeSupport: "thermique_rouleau" as const,
    largeurMm: 54,
    hauteurMm: 25,
  },
  // Planches A4 Adhésives
  {
    id: "avery_24_a4",
    nom: "Planche A4 - 24 étiquettes (70 x 37 mm, 3x8)",
    nomAr: "ورقة A4 - 24 ملصق (3×8)",
    imprimanteCible: "A4 Standard" as const,
    typeSupport: "planche_a4" as const,
    largeurMm: 70,
    hauteurMm: 37,
    colonnes: 3,
    lignes: 8,
    margeHautMm: 0,
    margeGaucheMm: 0,
    espaceColMm: 0,
    espaceLigMm: 0,
  },
  {
    id: "avery_14_a4",
    nom: "Planche A4 - 14 étiquettes (105 x 42 mm, 2x7)",
    nomAr: "ورقة A4 - 14 ملصق (2×7)",
    imprimanteCible: "A4 Standard" as const,
    typeSupport: "planche_a4" as const,
    largeurMm: 105,
    hauteurMm: 42,
    colonnes: 2,
    lignes: 7,
    margeHautMm: 0,
    margeGaucheMm: 0,
    espaceColMm: 0,
    espaceLigMm: 0,
  },
  {
    id: "avery_40_a4",
    nom: "Planche A4 - 40 étiquettes (48.5 x 25.4 mm, 4x10)",
    nomAr: "ورقة A4 - 40 ملصق (4×10)",
    imprimanteCible: "A4 Standard" as const,
    typeSupport: "planche_a4" as const,
    largeurMm: 48.5,
    hauteurMm: 25.4,
    colonnes: 4,
    lignes: 10,
    margeHautMm: 0,
    margeGaucheMm: 0,
    espaceColMm: 0,
    espaceLigMm: 0,
  },
  {
    id: "avery_65_a4",
    nom: "Planche A4 - 65 étiquettes (38 x 21.2 mm, 5x13)",
    nomAr: "ورقة A4 - 65 ملصق (5×13)",
    imprimanteCible: "A4 Standard" as const,
    typeSupport: "planche_a4" as const,
    largeurMm: 38,
    hauteurMm: 21.2,
    colonnes: 5,
    lignes: 13,
    margeHautMm: 0,
    margeGaucheMm: 0,
    espaceColMm: 0,
    espaceLigMm: 0,
  },
];


