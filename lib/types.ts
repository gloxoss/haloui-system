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
  | "utilisateurs";

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
  | "haloui-classic";
export type ThemeDensity = "compact" | "comfortable";

export type ThemeSettings = {
  preset: ThemePreset;
  density: ThemeDensity;
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
  id: 1;
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
  title: string;
  objet?: string;
  body: string;
  signataire?: string;
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
  created_at: string;
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
