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
  | "banque";

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
  updated_at: string;
};

export type BranchRecord = {
  id: number;
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
  total: number;
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

export type RevenueStats = {
  monthTotal: number;
  yearTotal: number;
  bestBranch: { name?: string; total?: number } | undefined;
  daily: RevenueDailyPoint[];
  monthlyByBranch: RevenueMonthlyBranchPoint[];
  pivot: RevenueMonthlyBranchPoint[];
};

export type SearchResult = {
  id: number;
  type: "document" | "product" | "client" | "fournisseur" | "employee";
  label: string;
  meta: string;
  href: string;
};
