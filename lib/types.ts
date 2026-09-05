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
  | "abonnements"
  | "portail_client"
  | "rapprochement_bancaire"
  | "multi_devises"
  | "transferts_stock"
  | "inventaires_stock"
  | "lots_series"
  | "reappro_intelligent"
  | "wms_emplacements"
  | "nomenclatures_fabrication"
  | "etiquettes_codes_barres"
  | "caisse_tactile_pos";

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
export type Branch = BranchRecord;

export type EntityRecord = {
  id: number;
  name: string;
  ice: string;
  address: string;
  phone: string;
  email: string;
  notes?: string;
  portal_enabled?: number;
  portal_access_code?: string;
  portal_token?: string;
  portal_last_login?: string;
};

export type ProductRecord = {
  id: number;
  company_id?: number;
  ref: string;
  designation: string;
  code_barre?: string;
  categorie?: string;
  rayon?: string;
  gestion_mode?: "standard" | "lot_dlc" | "numero_serie";
  seuil_alerte_dlc_jours?: number;
  unite: string;
  prix_ht: number;
  tva_rate: number;
  active: number;
};
export type Product = ProductRecord;

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
  devise?: string;
  taux_change?: number;
  total_ttc_base?: number;
  reste_base?: number;
  signed_at?: string;
  signed_by_name?: string;
  signature_data?: string;
  signature_ip?: string;
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

export type ClientPortalSession = {
  clientId: number;
  name: string;
  phone: string;
  ice?: string;
  email?: string;
  token: string;
};

export type PortalDocumentItem = {
  id: number;
  type: DocumentType;
  numero: number;
  date: string;
  date_echeance?: string;
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  avance: number;
  reste: number;
  status: DocumentStatus;
  signed_at?: string;
  signed_by_name?: string;
  signature_data?: string;
  notes?: string;
};

export type ClientPortalData = {
  client: {
    id: number;
    name: string;
    ice?: string;
    address?: string;
    phone?: string;
    email?: string;
    portal_access_code?: string;
    portal_token?: string;
    portal_last_login?: string;
  };
  company: {
    id: number;
    name: string;
    address: string;
    phone: string;
    ice: string;
    logo_path: string;
  };
  stats: {
    total_facture_ttc: number;
    total_regle_ttc: number;
    solde_du_ttc: number;
    factures_count: number;
    factures_impayees_count: number;
    devis_count: number;
    bc_en_attente_count: number;
  };
  factures: PortalDocumentItem[];
  bons_commande: PortalDocumentItem[];
  devis: PortalDocumentItem[];
  bons_livraison: PortalDocumentItem[];
  abonnements: SubscriptionItem[];
};

export type SignDocumentInput = {
  documentId: number;
  signerName: string;
  signatureData: string;
};

export type PortalSyncSettings = {
  publicUrl: string;
  syncSecret: string;
  autoSync: boolean;
  lastSyncedAt?: string;
};

export type PortalSyncExportPayload = {
  version: string;
  source: "desktop" | "cloud";
  exportedAt: string;
  company?: {
    id: number;
    name: string;
    arabic_name?: string;
    address?: string;
    phone?: string;
    gsm?: string;
    rc?: string;
    if_number?: string;
    tp?: string;
    ice?: string;
    legal_notice?: string;
    logo_path?: string;
  };
  clients: Array<{
    id: number;
    name: string;
    ice?: string;
    address?: string;
    phone?: string;
    email?: string;
    notes?: string;
    portal_enabled: number;
    portal_access_code: string;
    portal_token: string;
    portal_last_login?: string;
  }>;
  documents: Array<{
    id: number;
    company_id: number;
    client_id: number;
    type: string;
    numero: string;
    date: string;
    date_echeance?: string;
    total_ht: number;
    total_tva: number;
    total_ttc: number;
    avance: number;
    reste: number;
    status: string;
    signed_at?: string;
    signed_by_name?: string;
    signature_data?: string;
    notes?: string;
  }>;
  document_lines: Array<{
    id: number;
    document_id: number;
    reference?: string;
    description: string;
    quantite: number;
    unite?: string;
    prix_unitaire_ht: number;
    taux_tva: number;
    total_ht: number;
    total_ttc: number;
  }>;
};

export type PortalSyncResponse = {
  success: boolean;
  message?: string;
  error?: string;
  timestamp?: string;
  signedDocuments?: Array<{
    id: number;
    signed_at: string;
    signed_by_name: string;
    signature_data: string;
    status: string;
  }>;
  clientLastLogins?: Array<{
    id: number;
    portal_last_login: string;
  }>;
};

export type BankAccountRecord = {
  id: number;
  company_id: number;
  nom_banque: string;
  intitule_compte: string;
  rib: string;
  iban?: string;
  bic_swift?: string;
  devise: string;
  solde_initial: number;
  solde_actuel: number;
  solde_rapproche: number;
  statut: "actif" | "archive";
  created_by?: number | null;
  created_at: string;
  updated_at: string;
};

export type BankStatementRecord = {
  id: number;
  company_id: number;
  bank_account_id: number;
  nom_fichier: string;
  format_fichier: "OFX" | "QIF" | "CSV";
  date_import: string;
  date_debut?: string;
  date_fin?: string;
  solde_initial: number;
  solde_final: number;
  total_debits: number;
  total_credits: number;
  nb_operations: number;
  nb_rapprochees: number;
  statut: "en_cours" | "valide" | "archive";
  imported_by?: number | null;
  created_at: string;
};

export type BankOperationStatus = "non_rapproche" | "suggere" | "rapproche" | "ignore";

export type BankOperationRecord = {
  id: number;
  company_id: number;
  statement_id: number;
  bank_account_id: number;
  date_operation: string;
  date_valeur?: string;
  libelle: string;
  reference_bancaire?: string;
  type_mouvement: "credit" | "debit";
  montant: number;
  categorie?: string;
  statut_rapprochement: BankOperationStatus;
  rapprochement_score: number;
  document_id?: number | null;
  document_type?: string;
  rapproche_le?: string;
  rapproche_par?: number | null;
  created_at: string;
  matched_document?: {
    id: number;
    numero: number;
    type: string;
    date: string;
    total_ttc: number;
    reste: number;
    client_name?: string;
    fournisseur_name?: string;
  };
  suggestion?: {
    document_id: number;
    document_numero: number;
    document_type: string;
    document_date: string;
    entity_name: string;
    montant: number;
    score: number;
    motif: string;
  };
};

export type CurrencyRecord = {
  id: number;
  company_id: number;
  code: string;
  nom: string;
  nom_ar: string;
  symbole: string;
  taux: number;
  taux_achat?: number;
  taux_vente?: number;
  source: "auto_api" | "bam" | "manuel";
  est_actif: number;
  est_devise_base: number;
  derniere_mise_a_jour: string;
  created_at: string;
};

export type ForexTransactionRecord = {
  id: number;
  company_id: number;
  type_operation: "vente" | "achat";
  document_id?: number | null;
  sortie_caisse_id?: number | null;
  tiers_nom: string;
  reference_piece: string;
  date_operation: string;
  date_reglement: string;
  devise: string;
  montant_devise: number;
  taux_initial: number;
  taux_reglement: number;
  montant_initial_base: number;
  montant_regle_base: number;
  ecart_change: number;
  type_resultat: "gain" | "perte" | "nul";
  compte_comptable: string;
  notes?: string;
  created_by?: number | null;
  created_at: string;
};

export type ForexSummary = {
  totalGains: number;
  totalPertes: number;
  resultatNet: number;
  totalDevisesFactureesBase: number;
  countTransactions: number;
};

export type ReconciliationStats = {
  totalOperations: number;
  nbRapprochees: number;
  nbSuggeres: number;
  nbEnAttente: number;
  soldeReleve: number;
  soldeRapproche: number;
  soldeComptable: number;
  ecartRapprochement: number;
  tauxRapprochementPercent: number;
};

export type ParsedBankStatement = {
  format: "OFX" | "QIF" | "CSV";
  nomFichier: string;
  dateDebut?: string;
  dateFin?: string;
  soldeInitial?: number;
  soldeFinal?: number;
  devise?: string;
  operations: Array<{
    date: string;
    dateValeur?: string;
    libelle: string;
    reference?: string;
    type: "credit" | "debit";
    montant: number;
    categorie?: string;
  }>;
};

export type StockTransfertStatut = "brouillon" | "en_transit" | "recu" | "annule";

export type StockTransfertLine = {
  id: number;
  transfert_id?: number;
  produit_id: number;
  produit_ref?: string;
  designation: string;
  unite: string;
  quantite_expediee: number;
  quantite_recue: number;
  ecart: number;
  motif_ecart?: string;
};

export type StockTransfertRecord = {
  id: number;
  company_id: number;
  numero: string;
  date_transfert: string;
  source_branch_id: number;
  destination_branch_id: number;
  source_branch_name?: string;
  destination_branch_name?: string;
  chauffeur_nom: string;
  vehicule_matricule: string;
  bon_transport_ref: string;
  notes: string;
  statut: StockTransfertStatut;
  date_expedition?: string;
  expedie_par_id?: number | null;
  expedie_par_nom?: string;
  date_reception?: string;
  recu_par_id?: number | null;
  recu_par_nom?: string;
  total_articles: number;
  total_quantite_expediee: number;
  total_quantite_recue: number;
  total_ecart: number;
  motif_ecart_global?: string;
  created_by?: number | null;
  updated_by?: number | null;
  created_at: string;
  updated_at: string;
  lignes?: StockTransfertLine[];
};

export type StockDepotRecord = {
  id: number;
  company_id: number;
  branch_id: number;
  branch_name?: string;
  produit_id: number;
  produit_ref?: string;
  produit_designation?: string;
  produit_unite?: string;
  quantite: number;
  quantite_en_transit: number;
  seuil_alerte: number;
  updated_at: string;
};

export type StockMouvementRecord = {
  id: number;
  company_id: number;
  branch_id: number;
  branch_name?: string;
  produit_id: number;
  produit_designation?: string;
  type_mouvement: "transfert_sortie" | "transfert_entree" | "perte_transport" | "initialisation" | "ajustement";
  quantite: number;
  stock_avant: number;
  stock_apres: number;
  reference_document: string;
  transfert_id?: number | null;
  motif?: string;
  user_id?: number | null;
  user_nom?: string;
  created_at: string;
};

export type StockTransfertKPIs = {
  totalTransferts: number;
  enTransitCount: number;
  enTransitArticlesCount: number;
  enAttenteReceptionCount: number;
  recusCount: number;
  recusConformesCount: number;
  totalPiecesManquantes: number;
  tauxConformite: number;
};

// ============================================================
// INVENTAIRES TOURNANTS & PÉRIODIQUES
// ============================================================

export type InventaireStatut = "en_cours" | "cloture" | "annule";
export type InventaireType = "general" | "tournant_famille" | "tournant_rayon";
export type ComptageLigneStatut = "non_compte" | "conforme" | "ecart";

export type InventaireLigneRecord = {
  id?: number;
  inventaire_id: number;
  produit_id: number;
  designation: string;
  ref: string;
  produit_ref?: string;
  rayon?: string;
  categorie?: string;
  code_barre?: string;
  unite: string;
  prix_unitaire_ht: number;
  stock_theorique: number;
  stock_physique: number;
  ecart_quantite: number;
  valeur_ecart_ht: number;
  statut_comptage: ComptageLigneStatut;
  motif_ecart?: string;
  compte_at?: string;
};

export type InventaireRecord = {
  id: number;
  company_id: number;
  branch_id: number;
  branch_name?: string;
  numero: string;
  titre: string;
  type_inventaire: InventaireType;
  critere_filtre?: string;
  statut: InventaireStatut;
  date_debut: string;
  date_cloture?: string;
  total_articles: number;
  total_comptes: number;
  total_ecarts_qte: number;
  total_valeur_ecart_ht: number;
  notes?: string;
  created_by?: number;
  cloture_par_id?: number;
  cloture_par_nom?: string;
  created_at: string;
  updated_at?: string;
  lignes?: InventaireLigneRecord[];
};

export type InventaireKPIs = {
  sessionsEnCours: number;
  sessionsCloturees: number;
  tauxConformiteMoyen: number;
  totalEcartsQuantite: number;
  totalValeurEcartsMAD: number;
  totalArticlesEcart?: number;
  dernierInventaireCloture?: {
    numero: string;
    titre: string;
    date: string;
    tauxConformite: number;
  };
};

// ============================================================
// TRAÇABILITÉ DES LOTS & SÉRIES (DLC / DLUO)
// ============================================================

export type LotStatut = "actif" | "alerte_peremption" | "perime" | "quarantaine" | "epuise";

export type ProduitLotRecord = {
  id: number;
  company_id: number;
  branch_id: number;
  branch_name?: string;
  produit_id: number;
  produit_designation?: string;
  produit_ref?: string;
  code_barre?: string;
  unite?: string;
  numero_lot: string;
  date_fabrication?: string;
  date_peremption: string;
  jours_restants?: number;
  quantite_initiale: number;
  quantite_restante: number;
  statut: LotStatut;
  cout_unitaire_ht: number;
  valeur_stock_ht?: number;
  fournisseur_id?: number;
  fournisseur_nom?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
};

export type SerieStatut = "en_stock" | "vendu" | "en_transit" | "sav" | "defectueux";

export type ProduitSerieRecord = {
  id: number;
  company_id: number;
  branch_id: number;
  branch_name?: string;
  produit_id: number;
  produit_designation?: string;
  produit_ref?: string;
  code_barre?: string;
  numero_serie: string;
  statut: SerieStatut;
  document_achat_ref?: string;
  document_vente_id?: number;
  document_vente_numero?: string;
  date_entree: string;
  date_sortie?: string;
  garantie_fin_date?: string;
  jours_garantie_restants?: number;
  notes?: string;
  created_at: string;
  updated_at?: string;
};

export type LotsSeriesKPIs = {
  totalLotsActifs: number;
  lotsPerimes: number;
  lotsAlerteUrgent: number;
  lotsAlerteAttention: number;
  valeurStockPerimeMAD: number;
  totalSeriesActives: number;
  seriesSousGarantie: number;
  seriesEnSav: number;
};

// --- GESTION DES EMPLACEMENTS WMS ---
export type EmplacementType =
  | "picking"
  | "reserve"
  | "quarantaine"
  | "transit";

export type EmplacementStatut = "actif" | "inactif";

export type EmplacementRecord = {
  id: number;
  company_id: number;
  branch_id: number;
  branch_name?: string;
  zone: string;
  allee: string;
  travee: string;
  niveau: string;
  bac: string;
  code_emplacement: string;
  type_emplacement: EmplacementType;
  capacite_max_kg: number;
  statut: EmplacementStatut;
  notes?: string;
  nb_articles_assignes?: number;
  created_at: string;
  updated_at?: string;
};

export type ProduitEmplacementRecord = {
  id: number;
  company_id: number;
  branch_id: number;
  produit_id: number;
  produit_designation?: string;
  produit_ref?: string;
  code_barre?: string;
  emplacement_id: number;
  emplacement_code: string;
  zone?: string;
  allee?: string;
  travee?: string;
  niveau?: string;
  bac?: string;
  quantite: number;
  capacite_max: number;
  est_principal: boolean;
  created_at: string;
  updated_at?: string;
};

export type WmsKPIs = {
  totalEmplacements: number;
  emplacementsOccupes: number;
  emplacementsVides: number;
  tauxOccupation: number;
  totalProduitsCartographies: number;
};

export type PickingListItem = {
  produit_id: number;
  produit_ref: string;
  produit_designation: string;
  unite: string;
  quantite_demandee: number;
  quantite_prelevee?: number;
  emplacement_code: string;
  zone: string;
  allee: string;
  travee: string;
  niveau: string;
  bac: string;
  ordre_picking: number;
  code_barre?: string;
  numero_lot?: string;
};

export type PickingListRecord = {
  document_id: number;
  document_type: "bl" | "bs" | "bc" | "bt";
  document_numero: string;
  date_document: string;
  client_ou_destinataire?: string;
  depot_source_nom?: string;
  total_lignes: number;
  total_articles: number;
  items: PickingListItem[];
};

// --- RÉAPPROVISIONNEMENT INTELLIGENT ---
export type ReapproUrgence =
  | "rupture"
  | "critique"
  | "a_commander"
  | "optimal"
  | "surstock";

export type ReapproSuggestionRecord = {
  produit_id: number;
  reference: string;
  designation: string;
  categorie: string;
  unite: string;
  stock_actuel: number;
  stock_minimum: number;
  stock_maximum: number;
  quantite_en_commande: number;
  delai_livraison_jours: number;
  fournisseur_id?: number;
  fournisseur_nom?: string;
  fournisseur_delai?: number;
  fournisseur_franco_ht?: number;
  prix_achat_ht: number;
  conditionnement_achat: number;
  emplacement_code?: string;
  vmj: number; // Vente Moyenne Journalière
  rop: number; // Point de Commande (Reorder Point)
  quantite_suggeree: number;
  montant_estime_ht: number;
  urgence: ReapproUrgence;
  jours_autonomie: number;
};

export type ReapproKPIs = {
  articlesEnRupture: number;
  articlesACommander: number;
  articlesSurstock: number;
  budgetReapproEstimeHT: number;
  fournisseursConcernes: number;
};

// --- NOMENCLATURES & KITS / ASSEMBLAGE ---
export type NatureProduit = "simple" | "kit" | "composant";
export type ModeDestockageKit = "composants" | "produit_fini";

export type ProduitComposantRecord = {
  id: number;
  produit_parent_id: number;
  composant_id: number;
  composant_ref: string;
  composant_designation: string;
  composant_unite: string;
  composant_prix_achat_ht: number;
  composant_stock_actuel: number;
  quantite: number;
  unite: string;
  taux_perte_pourcent: number;
  ordre: number;
  notes?: string;
  cout_ligne_ht: number;
};

export type NomenclatureRecord = {
  produit_id: number;
  produit_ref: string;
  produit_designation: string;
  nature_produit: NatureProduit;
  mode_destockage_kit: ModeDestockageKit;
  prix_vente_ht: number;
  cout_revient_ht: number;
  marge_brute_ht: number;
  marge_pourcent: number;
  stock_virtuel_fabricable: number;
  stock_physique_kit: number;
  nb_composants: number;
  composants: ProduitComposantRecord[];
};

export type OrdreFabricationType = "assemblage" | "desassemblage";
export type OrdreFabricationStatut = "planifie" | "en_cours" | "termine" | "annule";

export type OrdreFabricationLigne = {
  id?: number;
  ordre_id?: number;
  composant_id: number;
  composant_ref: string;
  composant_designation: string;
  quantite_unitaire: number;
  quantite_totale: number;
  cout_unitaire_ht: number;
  cout_total_ht: number;
  unite?: string;
};

export type OrdreFabricationRecord = {
  id: number;
  company_id: number;
  branch_id: number;
  branch_nom?: string;
  numero: string;
  produit_id: number;
  produit_ref?: string;
  produit_designation?: string;
  type_operation: OrdreFabricationType;
  quantite_prevue: number;
  quantite_realisee: number;
  cout_total_ht: number;
  statut: OrdreFabricationStatut;
  date_ordre: string;
  date_fin?: string;
  responsable_id?: number | null;
  responsable_nom?: string;
  notes?: string;
  created_at: string;
  lignes?: OrdreFabricationLigne[];
};

export type NomenclaturesKPIs = {
  totalKits: number;
  totalComposants: number;
  totalOrdresFabrication: number;
  valeurStockKitsHT: number;
};

// --- ÉTIQUETTES & CODES-BARRES ---
export type BarcodeSymbology = "ean13" | "code128" | "qrcode";
export type LabelFormatType = "thermique_rouleau" | "planche_a4";

export type LabelDimensionPreset = {
  id: string;
  nom: string;
  nomAr: string;
  imprimanteCible: "Zebra" | "Dymo" | "Brother" | "A4 Standard";
  typeSupport: LabelFormatType;
  largeurMm: number;
  hauteurMm: number;
  colonnes?: number;
  lignes?: number;
  margeHautMm?: number;
  margeGaucheMm?: number;
  espaceColMm?: number;
  espaceLigMm?: number;
};

export type LabelConfig = {
  presetId: string;
  symbology: BarcodeSymbology;
  afficherNomEntreprise: boolean;
  afficherNomProduit: boolean;
  afficherPrixTTC: boolean;
  afficherPrixHT: boolean;
  afficherReference: boolean;
  afficherCodeBarreChiffre: boolean;
  afficherEmplacement: boolean;
  afficherDateOuLot: boolean;
  taillePrix: "normal" | "grand" | "tres_grand";
};

export type LabelItemToPrint = {
  produit_id: number;
  ref: string;
  designation: string;
  code_barre: string;
  prix_ht: number;
  prix_ttc: number;
  tva_rate: number;
  unite: string;
  emplacement_code?: string;
  numero_lot?: string;
  exemplaires: number;
};

// --- CAISSE TACTILE (POS) & SESSIONS (X / Z) ---
export type CaisseSessionStatut = "ouverte" | "fermee";
export type CaisseTicketStatut = "en_attente" | "valide" | "annule";
export type CaisseModeReglement = "especes" | "carte" | "cheque" | "virement" | "bon_achat" | "mixte";
export type CaisseMouvementType = "entree" | "sortie";

export type PaiementPartiel = {
  mode: "especes" | "carte" | "cheque" | "bon_achat" | "virement";
  montant: number;
  montant_recu?: number;
  montant_rendu?: number;
  reference?: string;
};

export type ParsedScaleBarcode = {
  isValidScaleBarcode: boolean;
  type?: "weight" | "price";
  prefix?: string;
  plu?: string;
  rawWeightGrams?: number;
  weightKg?: number;
  rawPriceCents?: number;
  priceDh?: number;
  matchedProductId?: number;
  calculatedQuantity?: number;
  calculatedTotalTtc?: number;
};

export type DenominationsComptage = {
  billets200?: number;
  billets100?: number;
  billets50?: number;
  billets20?: number;
  pieces10?: number;
  pieces5?: number;
  pieces2?: number;
  pieces1?: number;
  pieces050?: number;
  autre?: number;
};

export type CaisseSessionRecord = {
  id: number;
  company_id: number;
  branch_id: number;
  branch_name?: string;
  user_id: number;
  user_name?: string;
  numero_session: string;
  statut: CaisseSessionStatut;
  date_ouverture: string;
  fond_caisse_ouverture: number;
  details_fond_ouverture_json?: string;
  date_fermeture?: string;
  montant_especes_theorique: number;
  montant_especes_reel: number;
  details_fond_fermeture_json?: string;
  ecart_caisse: number;
  total_ventes_ht: number;
  total_ventes_ttc: number;
  total_especes: number;
  total_carte: number;
  total_cheque: number;
  total_bon_achat: number;
  total_virement: number;
  total_sorties: number;
  total_entrees: number;
  nb_tickets: number;
  notes_fermeture?: string;
  rapport_z_numero?: string;
  rapport_z_json?: string;
  created_at: string;
  updated_at: string;
};

export type CaisseTicketLigneRecord = {
  id?: number;
  ticket_id?: number;
  produit_id?: number | null;
  ref: string;
  designation: string;
  prix_unitaire_ht: number;
  prix_unitaire_ttc: number;
  quantite: number;
  tva_rate: number;
  remise_pourcent?: number;
  total_ht: number;
  total_ttc: number;
};

export type CaisseTicketRecord = {
  id: number;
  session_id: number;
  company_id: number;
  branch_id: number;
  branch_name?: string;
  numero_ticket: string;
  client_id?: number | null;
  client_nom: string;
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  remise_globale: number;
  montant_paye: number;
  montant_rendu: number;
  mode_reglement: CaisseModeReglement;
  details_reglement_json?: string;
  statut: CaisseTicketStatut;
  notes?: string;
  created_by?: number;
  created_by_name?: string;
  created_at: string;
  lignes: CaisseTicketLigneRecord[];
};

export type CaisseMouvementRecord = {
  id: number;
  session_id: number;
  company_id: number;
  branch_id: number;
  type: CaisseMouvementType;
  montant: number;
  motif: string;
  beneficiaire?: string;
  created_by?: number;
  created_by_name?: string;
  created_at: string;
};

export type RapportXData = {
  session: CaisseSessionRecord;
  fond_initial: number;
  total_ventes_ht: number;
  total_ventes_ttc: number;
  nb_tickets: number;
  par_mode_reglement: {
    especes: number;
    carte: number;
    cheque: number;
    bon_achat: number;
    virement: number;
    mixte: number;
  };
  total_entrees: number;
  total_sorties: number;
  theorique_especes_en_caisse: number;
  derniers_tickets: CaisseTicketRecord[];
  mouvements: CaisseMouvementRecord[];
  date_generation: string;
};

export type RapportZData = RapportXData & {
  numero_z: string;
  date_cloture: string;
  comptage_reel_especes: number;
  ecart_caisse: number;
  details_comptage: DenominationsComptage;
  notes: string;
  signataire: string;
};


