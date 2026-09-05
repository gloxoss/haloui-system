PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  is_superadmin INTEGER NOT NULL DEFAULT 0,
  hidden_from_admin INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id INTEGER,
  timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  snapshot_json TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS company (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  arabic_name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT,
  gsm TEXT,
  rc TEXT,
  if_number TEXT,
  tp TEXT,
  ice TEXT,
  logo_path TEXT,
  legal_notice TEXT,
  attestation_template_simple TEXT DEFAULT '',
  attestation_template_salary TEXT DEFAULT '',
  attestation_template_visa TEXT DEFAULT '',
  attestation_template_bank TEXT DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS branches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  address TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  created_by INTEGER,
  updated_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  ice TEXT DEFAULT '',
  address TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_by INTEGER,
  updated_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS fournisseurs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  ice TEXT DEFAULT '',
  address TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_by INTEGER,
  updated_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS produits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ref TEXT NOT NULL,
  designation TEXT NOT NULL,
  unite TEXT NOT NULL DEFAULT 'u',
  prix_ht REAL NOT NULL DEFAULT 0,
  tva_rate REAL NOT NULL DEFAULT 20,
  active INTEGER NOT NULL DEFAULT 1,
  created_by INTEGER,
  updated_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER DEFAULT 1,
  type TEXT NOT NULL CHECK (type IN ('devis', 'facture', 'bl', 'bs', 'bc')),
  numero INTEGER NOT NULL,
  date TEXT NOT NULL,
  date_echeance TEXT DEFAULT '',
  branch_id INTEGER,
  source_branch_id INTEGER,
  destination_branch_id INTEGER,
  client_id INTEGER,
  fournisseur_id INTEGER,
  parent_document_id INTEGER,
  total_ht REAL NOT NULL DEFAULT 0,
  total_tva REAL NOT NULL DEFAULT 0,
  total_ttc REAL NOT NULL DEFAULT 0,
  remise REAL NOT NULL DEFAULT 0,
  avance REAL NOT NULL DEFAULT 0,
  reste REAL NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'brouillon' CHECK (status IN ('brouillon', 'valide', 'imprime')),
  created_by INTEGER,
  updated_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
  FOREIGN KEY (source_branch_id) REFERENCES branches(id) ON DELETE SET NULL,
  FOREIGN KEY (destination_branch_id) REFERENCES branches(id) ON DELETE SET NULL,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
  FOREIGN KEY (fournisseur_id) REFERENCES fournisseurs(id) ON DELETE SET NULL,
  FOREIGN KEY (parent_document_id) REFERENCES documents(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (company_id, type, numero)
);

CREATE TABLE IF NOT EXISTS document_lignes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  produit_id INTEGER,
  designation TEXT NOT NULL,
  quantite REAL NOT NULL DEFAULT 1,
  unite TEXT NOT NULL DEFAULT 'u',
  prix_unitaire_ht REAL NOT NULL DEFAULT 0,
  tva_rate REAL NOT NULL DEFAULT 20,
  remise REAL NOT NULL DEFAULT 0,
  total_ht REAL NOT NULL DEFAULT 0,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (produit_id) REFERENCES produits(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS employes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero INTEGER NOT NULL UNIQUE,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  date_naissance TEXT DEFAULT '',
  lieu_naissance TEXT DEFAULT '',
  etat_civil TEXT DEFAULT '',
  date_entree TEXT DEFAULT '',
  date_sortie TEXT DEFAULT '',
  cnss TEXT DEFAULT '',
  adresse TEXT DEFAULT '',
  telephone TEXT DEFAULT '',
  salaire REAL NOT NULL DEFAULT 0,
  photo_path TEXT DEFAULT '',
  created_by INTEGER,
  updated_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS attestations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employe_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  type TEXT NOT NULL,
  contenu_genere TEXT NOT NULL,
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employe_id) REFERENCES employes(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS chiffre_affaires (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  branch_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  montant REAL NOT NULL DEFAULT 0,
  especes REAL NOT NULL DEFAULT 0,
  carte REAL NOT NULL DEFAULT 0,
  cheque REAL NOT NULL DEFAULT 0,
  virement REAL NOT NULL DEFAULT 0,
  preuve_path TEXT DEFAULT '',
  statut_cloture TEXT DEFAULT 'brouillon',
  notes TEXT DEFAULT '',
  created_by INTEGER,
  updated_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (branch_id, date)
);

CREATE TABLE IF NOT EXISTS sorties_caisse (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  branch_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  montant REAL NOT NULL DEFAULT 0,
  motif TEXT NOT NULL,
  beneficiaire TEXT DEFAULT '',
  preuve_path TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_by INTEGER,
  updated_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sorties_caisse_date ON sorties_caisse(date);
CREATE INDEX IF NOT EXISTS idx_sorties_caisse_branch ON sorties_caisse(branch_id);

CREATE TABLE IF NOT EXISTS numerotation (
  type TEXT PRIMARY KEY,
  last_number INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS relances_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL DEFAULT 1,
  document_id INTEGER NOT NULL,
  client_id INTEGER NOT NULL,
  palier TEXT NOT NULL CHECK (palier IN ('prevenance', 'relance_1', 'relance_2', 'mise_en_demeure')),
  canal TEXT NOT NULL CHECK (canal IN ('whatsapp', 'email', 'appel', 'courrier')),
  destinataire TEXT NOT NULL,
  message_envoye TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'envoye' CHECK (statut IN ('envoye', 'ouvert', 'promesse_paiement', 'annule')),
  date_envoi TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT DEFAULT '',
  created_by INTEGER,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_relances_doc ON relances_log(document_id);
CREATE INDEX IF NOT EXISTS idx_relances_client ON relances_log(client_id);
CREATE INDEX IF NOT EXISTS idx_relances_date ON relances_log(date_envoi);
CREATE INDEX IF NOT EXISTS idx_documents_type_date ON documents(type, date);
CREATE INDEX IF NOT EXISTS idx_documents_branch ON documents(branch_id);
CREATE INDEX IF NOT EXISTS idx_ca_date ON chiffre_affaires(date);

CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL DEFAULT 1,
  client_id INTEGER NOT NULL,
  titre TEXT NOT NULL,
  reference TEXT NOT NULL,
  periodicite TEXT NOT NULL CHECK (periodicite IN ('mensuel', 'trimestriel', 'semestriel', 'annuel')),
  date_debut TEXT NOT NULL,
  date_fin TEXT DEFAULT '',
  prochaine_echeance TEXT NOT NULL,
  derniere_facturation_date TEXT DEFAULT '',
  statut TEXT NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif', 'suspendu', 'termine', 'brouillon')),
  mode_reglement TEXT NOT NULL DEFAULT 'virement' CHECK (mode_reglement IN ('prelevement', 'virement', 'cheque', 'especes', 'traite')),
  auto_generer INTEGER NOT NULL DEFAULT 1,
  generer_statut TEXT NOT NULL DEFAULT 'valide' CHECK (generer_statut IN ('brouillon', 'valide')),
  terme_paiement_jours INTEGER NOT NULL DEFAULT 30,
  notes TEXT DEFAULT '',
  total_ht REAL NOT NULL DEFAULT 0,
  total_tva REAL NOT NULL DEFAULT 0,
  total_ttc REAL NOT NULL DEFAULT 0,
  mrr REAL NOT NULL DEFAULT 0,
  arr REAL NOT NULL DEFAULT 0,
  created_by INTEGER,
  updated_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_company ON subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_client ON subscriptions(client_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_echeance ON subscriptions(prochaine_echeance);
CREATE INDEX IF NOT EXISTS idx_subscriptions_statut ON subscriptions(statut);

CREATE TABLE IF NOT EXISTS subscription_lignes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subscription_id INTEGER NOT NULL,
  produit_id INTEGER,
  designation TEXT NOT NULL,
  quantite REAL NOT NULL DEFAULT 1,
  unite TEXT NOT NULL DEFAULT 'mois',
  prix_unitaire_ht REAL NOT NULL DEFAULT 0,
  tva_rate REAL NOT NULL DEFAULT 20,
  remise REAL NOT NULL DEFAULT 0,
  total_ht REAL NOT NULL DEFAULT 0,
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
  FOREIGN KEY (produit_id) REFERENCES produits(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sub_lignes_sub ON subscription_lignes(subscription_id);

CREATE TABLE IF NOT EXISTS subscription_invoices_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subscription_id INTEGER NOT NULL,
  document_id INTEGER NOT NULL,
  periode_label TEXT NOT NULL,
  date_generation TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  montant_ttc REAL NOT NULL,
  created_by INTEGER,
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sub_invoices_sub ON subscription_invoices_log(subscription_id);
CREATE INDEX IF NOT EXISTS idx_sub_invoices_doc ON subscription_invoices_log(document_id);

