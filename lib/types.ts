export type Role = "superadmin" | "admin" | "user";
export type ManagedRole = "admin" | "user";

export type FeatureKey =
  | "devis"
  | "factures"
  | "bons_livraison"
  | "bons_sortie"
  | "bons_commande"
  | "produits"
  | "clients"
  | "fournisseurs"
  | "personnel"
  | "attestations"
  | "chiffre_affaires"
  | "utilisateurs"
  | "multi_societes"
  | "multi_branches"
  | "multi_langue"
  | "gestion_tva"
  | "relances"
  | "abonnements";

export type FeatureFlags = Record<FeatureKey, boolean>;

export type ThemePreset =
  | "slate-minimal"
  | "corporate-navy"
  | "emerald-luxe"
  | "indigo-royal"
  | "crimson-executive"
  | "ocean-cyan"
  | "sunset-amber"
  | "violet-plum"
  | "monochrome-black"
  | "olive-ledger"
  | "haloui-classic"
  | "dark-executive"
  | "custom";
export type ThemeDensity = "compact" | "comfortable";

export type CustomThemeColors = {
  accent: string;
  accentSoft?: string;
  sidebarBg?: string;
  background?: string;
};

export type ThemeSettings = {
  preset: ThemePreset;
  density: ThemeDensity;
  customColors?: CustomThemeColors;
};

export type DocumentType = "devis" | "facture" | "bl" | "bs" | "bc";

export type DocumentStatus = "brouillon" | "valide" | "imprime";

export type DocumentModuleSlug =
  | "devis"
  | "factures"
  | "bons-livraison"
  | "bons-sortie"
  | "bons-commande";

export type PartyType = "clients" | "fournisseurs";

export type EmployeeAttestationType =
  | "simple"
  | "avec-salaire"
  | "visa"
  | "banque"
  | "stage"
  | "certificat-travail"
  | "ordre-mission"
  | "conge"
  | "recommandation"
  | "custom"
  | (string & {});

export type AttestationCustomPayload = {
  title: string;
  objet?: string;
  body: string;
  ville: string;
  date: string;
  signataire: string;
};

export type SessionUser = {
  id: number;
  username: string;
  role: Role;
  name: string;
};

export type CompanyRecord = {
  id: number;
  name: string;
  arabic_name: string;
  address: string;
  phone: string;
  gsm: string;
  rc: string;
  if_number: string;
  tp: string;
  ice: string;
  logo_path: string;
  legal_notice: string;
  attestation_template_simple: string;
  attestation_template_salary: string;
  attestation_template_visa: string;
  attestation_template_bank: string;
  attestation_templates_json?: string;
  updated_at: string;
};

export type AttestationTemplateConfigItem = {
  id?: string;
  name?: string;
  title: string;
  objet?: string;
  body: string;
  signataire?: string;
  active?: boolean;
  isCustom?: boolean;
};

export type AttestationTemplatesConfig = Record<string, AttestationTemplateConfigItem>;

export type BranchRecord = {
  id: number;
  company_id?: number;
  name: string;
  address: string;
  phone: string;
  active: number;
};

export type EntityRecord = {
  id: number;
  name: string;
  ice: string;
  address: string;
  phone: string;
  email: string;
  notes?: string;
};

export type ProductRecord = {
  id: number;
  company_id?: number;
  ref: string;
  designation: string;
  unite: string;
  prix_ht: number;
  tva_rate: number;
  active: number;
};

export type UserRecord = {
  id: number;
  username: string;
  full_name: string;
  role: Role;
  active: number;
  is_superadmin?: number;
  email?: string;
  phone?: string;
  created_at: string;
  updated_at?: string;
};

export type DocumentLineInput = {
  id?: number;
  produit_id?: number | null;
  designation: string;
  quantite: number;
  unite: string;
  prix_unitaire_ht: number;
  tva_rate: number;
  remise: number;
  total_ht: number;
};

export type DocumentRecord = {
  id: number;
  company_id?: number | null;
  type: DocumentType;
  numero: number;
  date: string;
  date_echeance?: string;
  branch_id: number | null;
  source_branch_id: number | null;
  destination_branch_id: number | null;
  client_id: number | null;
  fournisseur_id: number | null;
  parent_document_id: number | null;
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  remise: number;
  avance: number;
  reste: number;
  notes: string;
  status: DocumentStatus;
  created_by: number | null;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
};

export type EmployeeRecord = {
  id: number;
  numero: number;
  nom: string;
  prenom: string;
  date_naissance: string;
  lieu_naissance: string;
  etat_civil: string;
  date_entree: string;
  date_sortie: string;
  cnss: string;
  adresse: string;
  telephone: string;
  salaire: number;
  photo_path: string;
};

export type AttestationRecord = {
  id: number;
  employe_id: number;
  date: string;
  type: EmployeeAttestationType;
  contenu_genere: string;
  created_by: number | null;
  created_at: string;
};

export type RevenueCell = {
  branch_id: number;
  date: string;
  montant: number;
};

export type RevenueGridRow = {
  date: string;
  values: Record<number, number>;
  systemValues: Record<number, number>;
  total: number;
  systemTotal: number;
  diff: number;
};

export type RevenueDailyPoint = {
  date: string;
  total: number;
};

export type RevenueMonthlyBranchPoint = {
  month: string;
  name: string;
  total: number;
};

export type SalesDocumentSyncCandidate = {
  id: number;
  type: "facture" | "bl";
  numero: number;
  date: string;
  branch_id: number;
  branch_name: string;
  party_name: string;
  total_ttc: number;
  status: string;
};

export type RevenueStats = {
  monthTotal: number;
  yearTotal: number;
  systemMonthTotal: number;
  diffMonthTotal: number;
  bestBranch: { name?: string; total?: number } | undefined;
  daily: RevenueDailyPoint[];
  monthlyByBranch: RevenueMonthlyBranchPoint[];
  pivot: RevenueMonthlyBranchPoint[];
  paymentMethods: {
    especes: number;
    carte: number;
    cheque: number;
    virement: number;
  };
  sortiesTotal: number;
  netCaisse: number;
  bestDay?: { date: string; total: number };
  avgDaily: number;
};

export type SortieCaisseRecord = {
  id: number;
  branch_id: number;
  branch_name?: string;
  date: string;
  montant: number;
  motif: string;
  beneficiaire: string;
  preuve_path: string;
  notes: string;
  created_by: number | null;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
};

export type CashDaySummary = {
  date: string;
  branch_id: number;
  branch_name?: string;
  especes: number;
  carte: number;
  cheque: number;
  virement: number;
  total_recettes: number;
  total_sorties: number;
  solde_net_caisse: number;
  preuve_path: string;
  statut_cloture: "brouillon" | "cloture";
  notes: string;
  sorties: SortieCaisseRecord[];
};

export type SearchResult = {
  id: number;
  type: "document" | "product" | "client" | "fournisseur" | "employee";
  label: string;
  meta: string;
  href: string;
};

export type RelancePalier = "prevenance" | "relance_1" | "relance_2" | "mise_en_demeure";
export type RelanceCanal = "whatsapp" | "email" | "appel" | "courrier";
export type RelanceStatut = "envoye" | "ouvert" | "promesse_paiement" | "annule";

export type RelanceLogRecord = {
  id: number;
  company_id: number;
  document_id: number;
  client_id: number;
  palier: RelancePalier;
  canal: RelanceCanal;
  destinataire: string;
  message_envoye: string;
  statut: RelanceStatut;
  date_envoi: string;
  notes: string;
  created_by: number | null;
  created_by_name?: string;
  client_name?: string;
  document_numero?: number;
};

export type RelanceTemplates = {
  prevenance: string;
  relance_1: string;
  relance_2: string;
  mise_en_demeure: string;
};

export type RelanceSettings = {
  delais: {
    prevenance: number; // e.g. -3
    relance_1: number;  // e.g. 7
    relance_2: number;  // e.g. 15
    mise_en_demeure: number; // e.g. 30
  };
  rib: string;
  banque: string;
  titulaire_compte: string;
  templates_fr: RelanceTemplates;
  templates_ar: RelanceTemplates;
};

export type FactureImpayeeItem = {
  id: number;
  company_id: number;
  numero: number;
  date: string;
  date_echeance: string;
  client_id: number;
  client_name: string;
  client_phone: string;
  client_email: string;
  client_ice?: string;
  total_ttc: number;
  avance: number;
  reste: number;
  status: string;
  jours_retard: number;
  palier_recommande: RelancePalier;
  dernier_palier?: RelancePalier | null;
  derniere_relance_date?: string | null;
  derniere_relance_canal?: RelanceCanal | null;
  nombre_relances: number;
};

export type BalanceAgeeStats = {
  total_creances: number;
  total_echu: number;
  total_non_echu: number;
  tranches: {
    non_echu: { montant: number; count: number };
    j1_15: { montant: number; count: number };
    j16_30: { montant: number; count: number };
    j31_60: { montant: number; count: number };
    j61_plus: { montant: number; count: number };
  };
  par_palier: {
    prevenance: { montant: number; count: number };
    relance_1: { montant: number; count: number };
    relance_2: { montant: number; count: number };
    mise_en_demeure: { montant: number; count: number };
  };
  relances_ce_mois: number;
};

export type Periodicite = "mensuel" | "trimestriel" | "semestriel" | "annuel";
export type SubscriptionStatut = "actif" | "suspendu" | "termine" | "brouillon";
export type SubscriptionModeReglement = "prelevement" | "virement" | "cheque" | "especes" | "traite";

export type SubscriptionLine = {
  id?: number;
  subscription_id?: number;
  produit_id?: number | null;
  designation: string;
  quantite: number;
  unite?: string;
  prix_unitaire_ht: number;
  tva_rate: number;
  remise?: number;
  total_ht: number;
};

export type SubscriptionItem = {
  id: number;
  company_id: number;
  client_id: number;
  client_name: string;
  client_phone: string;
  client_email?: string;
  client_ice?: string;
  titre: string;
  reference: string;
  periodicite: Periodicite;
  date_debut: string;
  date_fin?: string;
  prochaine_echeance: string;
  derniere_facturation_date?: string;
  statut: SubscriptionStatut;
  mode_reglement: SubscriptionModeReglement;
  auto_generer: number;
  generer_statut: "brouillon" | "valide";
  terme_paiement_jours: number;
  notes?: string;
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  mrr: number;
  arr: number;
  created_at: string;
  updated_at: string;
  lignes?: SubscriptionLine[];
  factures_count: number;
  est_echu: boolean;
};

export type SubscriptionStats = {
  total_mrr: number;
  total_arr: number;
  actifs_count: number;
  echus_count: number;
  suspendus_count: number;
  total_count: number;
  total_echu_ttc: number;
  par_periodicite: Record<Periodicite, { count: number; mrr: number; ttc: number }>;
  par_mode_reglement: Record<SubscriptionModeReglement, { count: number; ttc: number }>;
};

export type SubscriptionInvoiceRecord = {
  id: number;
  subscription_id: number;
  document_id: number;
  document_numero: number;
  periode_label: string;
  date_generation: string;
  montant_ttc: number;
  document_status: string;
  document_date: string;
  document_date_echeance: string;
  document_reste: number;
};

