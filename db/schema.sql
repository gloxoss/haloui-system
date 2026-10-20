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
  portal_enabled INTEGER NOT NULL DEFAULT 1,
  portal_access_code TEXT DEFAULT '',
  portal_token TEXT UNIQUE,
  portal_last_login TEXT DEFAULT '',
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
  code_barre TEXT DEFAULT '',
  categorie TEXT DEFAULT 'Général',
  rayon TEXT DEFAULT '',
  gestion_mode TEXT DEFAULT 'standard' CHECK (gestion_mode IN ('standard', 'lot_dlc', 'numero_serie')),
  seuil_alerte_dlc_jours INTEGER DEFAULT 30,
  nature_produit TEXT DEFAULT 'simple' CHECK (nature_produit IN ('simple', 'kit', 'composant')),
  mode_destockage_kit TEXT DEFAULT 'composants' CHECK (mode_destockage_kit IN ('composants', 'produit_fini')),
  cout_revient_calcule REAL DEFAULT 0,
  unite TEXT NOT NULL DEFAULT 'u',
  prix_ht REAL NOT NULL DEFAULT 0,
  tva_rate REAL NOT NULL DEFAULT 20,
  active INTEGER NOT NULL DEFAULT 1,
  image_url TEXT DEFAULT '',
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
  devise TEXT NOT NULL DEFAULT 'MAD',
  taux_change REAL NOT NULL DEFAULT 1.0,
  total_ht_base REAL NOT NULL DEFAULT 0,
  total_ttc_base REAL NOT NULL DEFAULT 0,
  avance_base REAL NOT NULL DEFAULT 0,
  reste_base REAL NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'brouillon' CHECK (status IN ('brouillon', 'valide', 'imprime')),
  signed_at TEXT DEFAULT '',
  signed_by_name TEXT DEFAULT '',
  signature_data TEXT DEFAULT '',
  signature_ip TEXT DEFAULT '',
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

CREATE TABLE IF NOT EXISTS bank_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL DEFAULT 1,
  nom_banque TEXT NOT NULL,
  intitule_compte TEXT NOT NULL,
  rib TEXT NOT NULL DEFAULT '',
  iban TEXT DEFAULT '',
  bic_swift TEXT DEFAULT '',
  devise TEXT NOT NULL DEFAULT 'MAD',
  solde_initial REAL NOT NULL DEFAULT 0,
  solde_actuel REAL NOT NULL DEFAULT 0,
  solde_rapproche REAL NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif', 'archive')),
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_company ON bank_accounts(company_id);

CREATE TABLE IF NOT EXISTS bank_statements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL DEFAULT 1,
  bank_account_id INTEGER NOT NULL,
  nom_fichier TEXT NOT NULL,
  format_fichier TEXT NOT NULL CHECK (format_fichier IN ('OFX', 'QIF', 'CSV')),
  date_import TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_debut TEXT DEFAULT '',
  date_fin TEXT DEFAULT '',
  solde_initial REAL NOT NULL DEFAULT 0,
  solde_final REAL NOT NULL DEFAULT 0,
  total_debits REAL NOT NULL DEFAULT 0,
  total_credits REAL NOT NULL DEFAULT 0,
  nb_operations INTEGER NOT NULL DEFAULT 0,
  nb_rapprochees INTEGER NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'en_cours' CHECK (statut IN ('en_cours', 'valide', 'archive')),
  imported_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (imported_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_bank_statements_account ON bank_statements(bank_account_id);

CREATE TABLE IF NOT EXISTS bank_operations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL DEFAULT 1,
  statement_id INTEGER NOT NULL,
  bank_account_id INTEGER NOT NULL,
  date_operation TEXT NOT NULL,
  date_valeur TEXT DEFAULT '',
  libelle TEXT NOT NULL,
  reference_bancaire TEXT DEFAULT '',
  type_mouvement TEXT NOT NULL CHECK (type_mouvement IN ('credit', 'debit')),
  montant REAL NOT NULL,
  categorie TEXT DEFAULT '',
  statut_rapprochement TEXT NOT NULL DEFAULT 'non_rapproche' CHECK (statut_rapprochement IN ('non_rapproche', 'suggere', 'rapproche', 'ignore')),
  rapprochement_score INTEGER NOT NULL DEFAULT 0,
  document_id INTEGER,
  document_type TEXT DEFAULT '',
  rapproche_le TEXT,
  rapproche_par INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (statement_id) REFERENCES bank_statements(id) ON DELETE CASCADE,
  FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL,
  FOREIGN KEY (rapproche_par) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_bank_ops_statement ON bank_operations(statement_id);
CREATE INDEX IF NOT EXISTS idx_bank_ops_account ON bank_operations(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_ops_statut ON bank_operations(statut_rapprochement);
CREATE INDEX IF NOT EXISTS idx_bank_ops_doc ON bank_operations(document_id);

CREATE TABLE IF NOT EXISTS exchange_rates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL DEFAULT 1,
  code TEXT NOT NULL,
  nom TEXT NOT NULL,
  nom_ar TEXT NOT NULL,
  symbole TEXT NOT NULL,
  taux REAL NOT NULL DEFAULT 1.0,
  taux_achat REAL DEFAULT 0,
  taux_vente REAL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'auto_api',
  est_actif INTEGER NOT NULL DEFAULT 1,
  est_devise_base INTEGER NOT NULL DEFAULT 0,
  derniere_mise_a_jour TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_id, code)
);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_company ON exchange_rates(company_id);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_code ON exchange_rates(code);

CREATE TABLE IF NOT EXISTS forex_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL DEFAULT 1,
  type_operation TEXT NOT NULL CHECK (type_operation IN ('vente', 'achat')),
  document_id INTEGER,
  sortie_caisse_id INTEGER,
  tiers_nom TEXT NOT NULL DEFAULT '',
  reference_piece TEXT NOT NULL,
  date_operation TEXT NOT NULL,
  date_reglement TEXT NOT NULL,
  devise TEXT NOT NULL,
  montant_devise REAL NOT NULL,
  taux_initial REAL NOT NULL,
  taux_reglement REAL NOT NULL,
  montant_initial_base REAL NOT NULL,
  montant_regle_base REAL NOT NULL,
  ecart_change REAL NOT NULL,
  type_resultat TEXT NOT NULL CHECK (type_resultat IN ('gain', 'perte', 'nul')),
  compte_comptable TEXT NOT NULL,
  notes TEXT DEFAULT '',
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_forex_company ON forex_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_forex_date ON forex_transactions(date_reglement);
CREATE INDEX IF NOT EXISTS idx_forex_doc ON forex_transactions(document_id);

-- ============================================================
-- TRANSFERTS INTER-DÉPÔTS & SUIVI DES STOCKS
-- ============================================================

CREATE TABLE IF NOT EXISTS stock_depots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL DEFAULT 1,
  branch_id INTEGER NOT NULL,
  produit_id INTEGER NOT NULL,
  quantite REAL NOT NULL DEFAULT 0,
  quantite_en_transit REAL NOT NULL DEFAULT 0,
  seuil_alerte REAL NOT NULL DEFAULT 5,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  FOREIGN KEY (produit_id) REFERENCES produits(id) ON DELETE CASCADE,
  UNIQUE (company_id, branch_id, produit_id)
);
CREATE INDEX IF NOT EXISTS idx_stock_depots_branch ON stock_depots(branch_id);
CREATE INDEX IF NOT EXISTS idx_stock_depots_produit ON stock_depots(produit_id);
CREATE INDEX IF NOT EXISTS idx_stock_depots_company ON stock_depots(company_id);

CREATE TABLE IF NOT EXISTS transferts_stock (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL DEFAULT 1,
  numero TEXT NOT NULL,
  date_transfert TEXT NOT NULL,
  source_branch_id INTEGER NOT NULL,
  destination_branch_id INTEGER NOT NULL,
  chauffeur_nom TEXT DEFAULT '',
  vehicule_matricule TEXT DEFAULT '',
  bon_transport_ref TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  statut TEXT NOT NULL DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'en_transit', 'recu', 'annule')),
  date_expedition TEXT DEFAULT '',
  expedie_par_id INTEGER,
  expedie_par_nom TEXT DEFAULT '',
  date_reception TEXT DEFAULT '',
  recu_par_id INTEGER,
  recu_par_nom TEXT DEFAULT '',
  total_articles INTEGER NOT NULL DEFAULT 0,
  total_quantite_expediee REAL NOT NULL DEFAULT 0,
  total_quantite_recue REAL NOT NULL DEFAULT 0,
  total_ecart REAL NOT NULL DEFAULT 0,
  motif_ecart_global TEXT DEFAULT '',
  created_by INTEGER,
  updated_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_branch_id) REFERENCES branches(id) ON DELETE RESTRICT,
  FOREIGN KEY (destination_branch_id) REFERENCES branches(id) ON DELETE RESTRICT,
  FOREIGN KEY (expedie_par_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (recu_par_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (company_id, numero)
);
CREATE INDEX IF NOT EXISTS idx_transferts_company ON transferts_stock(company_id);
CREATE INDEX IF NOT EXISTS idx_transferts_statut ON transferts_stock(statut);
CREATE INDEX IF NOT EXISTS idx_transferts_source ON transferts_stock(source_branch_id);
CREATE INDEX IF NOT EXISTS idx_transferts_dest ON transferts_stock(destination_branch_id);
CREATE INDEX IF NOT EXISTS idx_transferts_date ON transferts_stock(date_transfert);

CREATE TABLE IF NOT EXISTS transfert_stock_lignes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transfert_id INTEGER NOT NULL,
  produit_id INTEGER NOT NULL,
  designation TEXT NOT NULL,
  unite TEXT NOT NULL DEFAULT 'u',
  quantite_expediee REAL NOT NULL,
  quantite_recue REAL NOT NULL DEFAULT 0,
  ecart REAL NOT NULL DEFAULT 0,
  motif_ecart TEXT DEFAULT '',
  FOREIGN KEY (transfert_id) REFERENCES transferts_stock(id) ON DELETE CASCADE,
  FOREIGN KEY (produit_id) REFERENCES produits(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_transfert_lignes_transfert ON transfert_stock_lignes(transfert_id);
CREATE INDEX IF NOT EXISTS idx_transfert_lignes_produit ON transfert_stock_lignes(produit_id);

CREATE TABLE IF NOT EXISTS mouvements_stock (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL DEFAULT 1,
  branch_id INTEGER NOT NULL,
  produit_id INTEGER NOT NULL,
  type_mouvement TEXT NOT NULL CHECK (type_mouvement IN ('transfert_sortie', 'transfert_entree', 'perte_transport', 'initialisation', 'ajustement')),
  quantite REAL NOT NULL,
  stock_avant REAL NOT NULL,
  stock_apres REAL NOT NULL,
  reference_document TEXT NOT NULL,
  transfert_id INTEGER,
  motif TEXT DEFAULT '',
  user_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  FOREIGN KEY (produit_id) REFERENCES produits(id) ON DELETE CASCADE,
  FOREIGN KEY (transfert_id) REFERENCES transferts_stock(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_mouvements_company_branch ON mouvements_stock(company_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_mouvements_produit ON mouvements_stock(produit_id);
CREATE INDEX IF NOT EXISTS idx_mouvements_date ON mouvements_stock(created_at);

-- ============================================================
-- INVENTAIRES TOURNANTS & PÉRIODIQUES
-- ============================================================

CREATE TABLE IF NOT EXISTS inventaires (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL DEFAULT 1,
  branch_id INTEGER NOT NULL,
  numero TEXT NOT NULL,
  titre TEXT NOT NULL,
  type_inventaire TEXT NOT NULL CHECK (type_inventaire IN ('general', 'tournant_famille', 'tournant_rayon')),
  critere_filtre TEXT DEFAULT '',
  statut TEXT NOT NULL DEFAULT 'en_cours' CHECK (statut IN ('en_cours', 'cloture', 'annule')),
  date_debut TEXT NOT NULL,
  date_cloture TEXT DEFAULT '',
  total_articles INTEGER NOT NULL DEFAULT 0,
  total_comptes INTEGER NOT NULL DEFAULT 0,
  total_ecarts_qte REAL NOT NULL DEFAULT 0,
  total_valeur_ecart_ht REAL NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  created_by INTEGER,
  cloture_par_id INTEGER,
  cloture_par_nom TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (cloture_par_id) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (company_id, numero)
);
CREATE INDEX IF NOT EXISTS idx_inventaires_company_branch ON inventaires(company_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_inventaires_statut ON inventaires(statut);
CREATE INDEX IF NOT EXISTS idx_inventaires_date ON inventaires(date_debut);

CREATE TABLE IF NOT EXISTS inventaire_lignes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inventaire_id INTEGER NOT NULL,
  produit_id INTEGER NOT NULL,
  designation TEXT NOT NULL,
  ref TEXT NOT NULL,
  code_barre TEXT DEFAULT '',
  unite TEXT NOT NULL DEFAULT 'u',
  prix_unitaire_ht REAL NOT NULL DEFAULT 0,
  stock_theorique REAL NOT NULL DEFAULT 0,
  stock_physique REAL NOT NULL DEFAULT 0,
  ecart_quantite REAL NOT NULL DEFAULT 0,
  valeur_ecart_ht REAL NOT NULL DEFAULT 0,
  statut_comptage TEXT NOT NULL DEFAULT 'non_compte' CHECK (statut_comptage IN ('non_compte', 'conforme', 'ecart')),
  motif_ecart TEXT DEFAULT '',
  compte_at TEXT DEFAULT '',
  FOREIGN KEY (inventaire_id) REFERENCES inventaires(id) ON DELETE CASCADE,
  FOREIGN KEY (produit_id) REFERENCES produits(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_inventaire_lignes_inv ON inventaire_lignes(inventaire_id);
CREATE INDEX IF NOT EXISTS idx_inventaire_lignes_produit ON inventaire_lignes(produit_id);

-- ============================================================
-- TRAÇABILITÉ DES LOTS & DATES DE PÉREMPTION (DLC / DLUO)
-- ============================================================

CREATE TABLE IF NOT EXISTS produit_lots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL DEFAULT 1,
  branch_id INTEGER NOT NULL,
  produit_id INTEGER NOT NULL,
  numero_lot TEXT NOT NULL,
  date_fabrication TEXT DEFAULT '',
  date_peremption TEXT NOT NULL,
  quantite_initiale REAL NOT NULL DEFAULT 0,
  quantite_restante REAL NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif', 'alerte_peremption', 'perime', 'quarantaine', 'epuise')),
  cout_unitaire_ht REAL NOT NULL DEFAULT 0,
  fournisseur_id INTEGER,
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  FOREIGN KEY (produit_id) REFERENCES produits(id) ON DELETE CASCADE,
  FOREIGN KEY (fournisseur_id) REFERENCES fournisseurs(id) ON DELETE SET NULL,
  UNIQUE (company_id, branch_id, produit_id, numero_lot)
);
CREATE INDEX IF NOT EXISTS idx_lots_branch_prod ON produit_lots(branch_id, produit_id);
CREATE INDEX IF NOT EXISTS idx_lots_peremption ON produit_lots(date_peremption);
CREATE INDEX IF NOT EXISTS idx_lots_statut ON produit_lots(statut);

-- ============================================================
-- NUMÉROS DE SÉRIE UNITAIRES & GARANTIES
-- ============================================================

CREATE TABLE IF NOT EXISTS produit_series (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL DEFAULT 1,
  branch_id INTEGER NOT NULL,
  produit_id INTEGER NOT NULL,
  numero_serie TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'en_stock' CHECK (statut IN ('en_stock', 'vendu', 'en_transit', 'sav', 'defectueux')),
  document_achat_ref TEXT DEFAULT '',
  document_vente_id INTEGER,
  date_entree TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_sortie TEXT DEFAULT '',
  garantie_fin_date TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  FOREIGN KEY (produit_id) REFERENCES produits(id) ON DELETE CASCADE,
  FOREIGN KEY (document_vente_id) REFERENCES documents(id) ON DELETE SET NULL,
  UNIQUE (company_id, produit_id, numero_serie)
);
CREATE INDEX IF NOT EXISTS idx_series_branch_prod ON produit_series(branch_id, produit_id);
CREATE INDEX IF NOT EXISTS idx_series_numero ON produit_series(numero_serie);
CREATE INDEX IF NOT EXISTS idx_series_statut ON produit_series(statut);

-- ============================================================
-- AUDIT TRAÇABILITÉ AMONT/AVAL LOTS & SÉRIES
-- ============================================================

CREATE TABLE IF NOT EXISTS mouvements_lots_series (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL DEFAULT 1,
  mouvement_stock_id INTEGER,
  lot_id INTEGER,
  serie_id INTEGER,
  type_operation TEXT NOT NULL CHECK (type_operation IN ('entree', 'sortie', 'ajustement_inventaire', 'transfert', 'quarantaine')),
  quantite REAL NOT NULL DEFAULT 1,
  reference_doc TEXT NOT NULL,
  date_mouvement TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT DEFAULT '',
  FOREIGN KEY (mouvement_stock_id) REFERENCES mouvements_stock(id) ON DELETE CASCADE,
  FOREIGN KEY (lot_id) REFERENCES produit_lots(id) ON DELETE CASCADE,
  FOREIGN KEY (serie_id) REFERENCES produit_series(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_mvt_lots_series_lot ON mouvements_lots_series(lot_id);
CREATE INDEX IF NOT EXISTS idx_mvt_lots_series_serie ON mouvements_lots_series(serie_id);

-- ============================================================
-- WMS LÉGER : EMPLACEMENTS EN ENTREPÔT & BACS DE PICKING
-- ============================================================

CREATE TABLE IF NOT EXISTS emplacements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL DEFAULT 1,
  branch_id INTEGER NOT NULL,
  zone TEXT NOT NULL,
  allee TEXT NOT NULL,
  travee TEXT NOT NULL,
  niveau INTEGER NOT NULL DEFAULT 1,
  bac TEXT NOT NULL DEFAULT 'A',
  code_emplacement TEXT NOT NULL,
  type_emplacement TEXT NOT NULL DEFAULT 'picking' CHECK (type_emplacement IN ('picking', 'reserve', 'quarantaine', 'transit')),
  capacite_max_volume REAL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  UNIQUE (company_id, branch_id, code_emplacement)
);
CREATE INDEX IF NOT EXISTS idx_emplacements_branch ON emplacements(branch_id);
CREATE INDEX IF NOT EXISTS idx_emplacements_code ON emplacements(code_emplacement);
CREATE INDEX IF NOT EXISTS idx_emplacements_zone ON emplacements(zone);

CREATE TABLE IF NOT EXISTS produit_emplacements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL DEFAULT 1,
  branch_id INTEGER NOT NULL,
  produit_id INTEGER NOT NULL,
  emplacement_id INTEGER NOT NULL,
  is_principal INTEGER NOT NULL DEFAULT 1,
  quantite_stockee REAL NOT NULL DEFAULT 0,
  seuil_reassort_picking REAL DEFAULT 10,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  FOREIGN KEY (produit_id) REFERENCES produits(id) ON DELETE CASCADE,
  FOREIGN KEY (emplacement_id) REFERENCES emplacements(id) ON DELETE CASCADE,
  UNIQUE (branch_id, produit_id, emplacement_id)
);
CREATE INDEX IF NOT EXISTS idx_prod_emp_produit ON produit_emplacements(produit_id);
CREATE INDEX IF NOT EXISTS idx_prod_emp_emplacement ON produit_emplacements(emplacement_id);
CREATE INDEX IF NOT EXISTS idx_prod_emp_branch ON produit_emplacements(branch_id);

-- ============================================================
-- NOMENCLATURES & ORDRES DE FABRICATION (KITS / PACKS)
-- ============================================================

CREATE TABLE IF NOT EXISTS produit_nomenclatures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL DEFAULT 1,
  produit_parent_id INTEGER NOT NULL,
  composant_id INTEGER NOT NULL,
  quantite REAL NOT NULL DEFAULT 1,
  unite TEXT DEFAULT 'u',
  taux_perte_pourcent REAL DEFAULT 0,
  ordre INTEGER DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (produit_parent_id) REFERENCES produits(id) ON DELETE CASCADE,
  FOREIGN KEY (composant_id) REFERENCES produits(id) ON DELETE RESTRICT,
  UNIQUE (company_id, produit_parent_id, composant_id)
);
CREATE INDEX IF NOT EXISTS idx_nomenclatures_parent ON produit_nomenclatures(produit_parent_id);
CREATE INDEX IF NOT EXISTS idx_nomenclatures_composant ON produit_nomenclatures(composant_id);

CREATE TABLE IF NOT EXISTS ordres_fabrication (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL DEFAULT 1,
  branch_id INTEGER NOT NULL,
  numero TEXT NOT NULL,
  produit_id INTEGER NOT NULL,
  type_operation TEXT NOT NULL DEFAULT 'assemblage' CHECK (type_operation IN ('assemblage', 'desassemblage')),
  quantite_prevue REAL NOT NULL,
  quantite_realisee REAL NOT NULL DEFAULT 0,
  cout_total_ht REAL NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'termine' CHECK (statut IN ('planifie', 'en_cours', 'termine', 'annule')),
  date_ordre TEXT NOT NULL,
  date_fin TEXT DEFAULT '',
  responsable_id INTEGER,
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  FOREIGN KEY (produit_id) REFERENCES produits(id) ON DELETE RESTRICT,
  FOREIGN KEY (responsable_id) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (company_id, numero)
);
CREATE INDEX IF NOT EXISTS idx_ordres_fab_branch ON ordres_fabrication(branch_id);
CREATE INDEX IF NOT EXISTS idx_ordres_fab_produit ON ordres_fabrication(produit_id);
CREATE INDEX IF NOT EXISTS idx_ordres_fab_date ON ordres_fabrication(date_ordre);
CREATE INDEX IF NOT EXISTS idx_ordres_fab_statut ON ordres_fabrication(statut);

CREATE TABLE IF NOT EXISTS ordre_fabrication_lignes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ordre_id INTEGER NOT NULL,
  composant_id INTEGER NOT NULL,
  quantite_unitaire REAL NOT NULL,
  quantite_totale REAL NOT NULL,
  cout_unitaire_ht REAL NOT NULL DEFAULT 0,
  cout_total_ht REAL NOT NULL DEFAULT 0,
  FOREIGN KEY (ordre_id) REFERENCES ordres_fabrication(id) ON DELETE CASCADE,
  FOREIGN KEY (composant_id) REFERENCES produits(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_fab_lignes_ordre ON ordre_fabrication_lignes(ordre_id);
CREATE INDEX IF NOT EXISTS idx_fab_lignes_comp ON ordre_fabrication_lignes(composant_id);

-- ============================================================
-- MODULE CAISSE TACTILE (POS) & SESSIONS DE CAISSE (X / Z)
-- ============================================================

CREATE TABLE IF NOT EXISTS caisse_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL DEFAULT 1,
  branch_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  numero_session TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'ouverte' CHECK (statut IN ('ouverte', 'fermee')),
  date_ouverture TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fond_caisse_ouverture REAL NOT NULL DEFAULT 0,
  details_fond_ouverture_json TEXT DEFAULT '',
  date_fermeture TEXT DEFAULT '',
  montant_especes_theorique REAL DEFAULT 0,
  montant_especes_reel REAL DEFAULT 0,
  details_fond_fermeture_json TEXT DEFAULT '',
  ecart_caisse REAL DEFAULT 0,
  total_ventes_ht REAL DEFAULT 0,
  total_ventes_ttc REAL DEFAULT 0,
  total_especes REAL DEFAULT 0,
  total_carte REAL DEFAULT 0,
  total_cheque REAL DEFAULT 0,
  total_bon_achat REAL DEFAULT 0,
  total_virement REAL DEFAULT 0,
  total_sorties REAL DEFAULT 0,
  total_entrees REAL DEFAULT 0,
  nb_tickets INTEGER DEFAULT 0,
  notes_fermeture TEXT DEFAULT '',
  rapport_z_numero TEXT DEFAULT '',
  rapport_z_json TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (company_id, numero_session)
);
CREATE INDEX IF NOT EXISTS idx_caisse_sessions_branch ON caisse_sessions(branch_id);
CREATE INDEX IF NOT EXISTS idx_caisse_sessions_user ON caisse_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_caisse_sessions_statut ON caisse_sessions(statut);
CREATE INDEX IF NOT EXISTS idx_caisse_sessions_date ON caisse_sessions(date_ouverture);

CREATE TABLE IF NOT EXISTS caisse_tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  company_id INTEGER NOT NULL DEFAULT 1,
  branch_id INTEGER NOT NULL,
  numero_ticket TEXT NOT NULL,
  client_id INTEGER,
  client_nom TEXT DEFAULT 'Client Comptoir',
  total_ht REAL NOT NULL DEFAULT 0,
  total_tva REAL NOT NULL DEFAULT 0,
  total_ttc REAL NOT NULL DEFAULT 0,
  remise_globale REAL NOT NULL DEFAULT 0,
  montant_paye REAL NOT NULL DEFAULT 0,
  montant_rendu REAL NOT NULL DEFAULT 0,
  mode_reglement TEXT NOT NULL DEFAULT 'especes' CHECK (mode_reglement IN ('especes', 'carte', 'cheque', 'virement', 'bon_achat', 'mixte')),
  details_reglement_json TEXT DEFAULT '',
  statut TEXT NOT NULL DEFAULT 'valide' CHECK (statut IN ('en_attente', 'valide', 'annule')),
  notes TEXT DEFAULT '',
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES caisse_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (company_id, numero_ticket)
);
CREATE INDEX IF NOT EXISTS idx_caisse_tickets_session ON caisse_tickets(session_id);
CREATE INDEX IF NOT EXISTS idx_caisse_tickets_branch ON caisse_tickets(branch_id);
CREATE INDEX IF NOT EXISTS idx_caisse_tickets_statut ON caisse_tickets(statut);
CREATE INDEX IF NOT EXISTS idx_caisse_tickets_date ON caisse_tickets(created_at);

CREATE TABLE IF NOT EXISTS caisse_ticket_lignes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  produit_id INTEGER,
  ref TEXT NOT NULL,
  designation TEXT NOT NULL,
  prix_unitaire_ht REAL NOT NULL DEFAULT 0,
  prix_unitaire_ttc REAL NOT NULL DEFAULT 0,
  quantite REAL NOT NULL DEFAULT 1,
  tva_rate REAL NOT NULL DEFAULT 20,
  remise_pourcent REAL NOT NULL DEFAULT 0,
  total_ht REAL NOT NULL DEFAULT 0,
  total_ttc REAL NOT NULL DEFAULT 0,
  FOREIGN KEY (ticket_id) REFERENCES caisse_tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (produit_id) REFERENCES produits(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_caisse_ticket_lignes_ticket ON caisse_ticket_lignes(ticket_id);
CREATE INDEX IF NOT EXISTS idx_caisse_ticket_lignes_produit ON caisse_ticket_lignes(produit_id);

CREATE TABLE IF NOT EXISTS caisse_mouvements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  company_id INTEGER NOT NULL DEFAULT 1,
  branch_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('entree', 'sortie')),
  montant REAL NOT NULL,
  motif TEXT NOT NULL,
  beneficiaire TEXT DEFAULT '',
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES caisse_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_caisse_mouvements_session ON caisse_mouvements(session_id);
CREATE INDEX IF NOT EXISTS idx_caisse_mouvements_type ON caisse_mouvements(type);

CREATE TABLE IF NOT EXISTS bons_achat (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL DEFAULT 1,
  branch_id INTEGER NOT NULL,
  code TEXT NOT NULL UNIQUE,
  montant_initial REAL NOT NULL,
  montant_restant REAL NOT NULL,
  statut TEXT NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif', 'utilise', 'expire', 'annule')),
  date_emission TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_expiration TEXT NOT NULL,
  client_id INTEGER,
  client_nom TEXT DEFAULT '',
  ticket_origine_id INTEGER,
  retour_id INTEGER,
  notes TEXT DEFAULT '',
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_bons_achat_code ON bons_achat(code);
CREATE INDEX IF NOT EXISTS idx_bons_achat_statut ON bons_achat(statut);
CREATE INDEX IF NOT EXISTS idx_bons_achat_company ON bons_achat(company_id);

CREATE TABLE IF NOT EXISTS caisse_retours (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL DEFAULT 1,
  branch_id INTEGER NOT NULL,
  session_id INTEGER NOT NULL,
  numero_retour TEXT NOT NULL UNIQUE,
  ticket_origine_id INTEGER,
  ticket_origine_numero TEXT DEFAULT '',
  client_id INTEGER,
  client_nom TEXT DEFAULT 'Client Comptoir',
  mode_compensation TEXT NOT NULL DEFAULT 'bon_achat' CHECK (mode_compensation IN ('bon_achat', 'especes', 'carte', 'autre')),
  total_ht REAL NOT NULL DEFAULT 0,
  total_tva REAL NOT NULL DEFAULT 0,
  total_ttc REAL NOT NULL DEFAULT 0,
  bon_achat_id INTEGER,
  motif_general TEXT DEFAULT '',
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES caisse_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  FOREIGN KEY (ticket_origine_id) REFERENCES caisse_tickets(id) ON DELETE SET NULL,
  FOREIGN KEY (bon_achat_id) REFERENCES bons_achat(id) ON DELETE SET NULL,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_caisse_retours_session ON caisse_retours(session_id);
CREATE INDEX IF NOT EXISTS idx_caisse_retours_ticket ON caisse_retours(ticket_origine_id);
CREATE INDEX IF NOT EXISTS idx_caisse_retours_numero ON caisse_retours(numero_retour);

CREATE TABLE IF NOT EXISTS caisse_retour_lignes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  retour_id INTEGER NOT NULL,
  produit_id INTEGER,
  ref TEXT NOT NULL,
  designation TEXT NOT NULL,
  prix_unitaire_ht REAL NOT NULL DEFAULT 0,
  prix_unitaire_ttc REAL NOT NULL DEFAULT 0,
  quantite REAL NOT NULL DEFAULT 1,
  tva_rate REAL NOT NULL DEFAULT 20,
  total_ttc REAL NOT NULL DEFAULT 0,
  restitue_stock INTEGER NOT NULL DEFAULT 1,
  motif_ligne TEXT DEFAULT '',
  FOREIGN KEY (retour_id) REFERENCES caisse_retours(id) ON DELETE CASCADE,
  FOREIGN KEY (produit_id) REFERENCES produits(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_caisse_retour_lignes_retour ON caisse_retour_lignes(retour_id);
CREATE INDEX IF NOT EXISTS idx_caisse_retour_lignes_produit ON caisse_retour_lignes(produit_id);

-- ============================================================================
-- 1. PROGRAMME DE FIDÉLITÉ CLIENT & CASHBACK
-- ============================================================================
CREATE TABLE IF NOT EXISTS fidelite_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  company_id INTEGER NOT NULL DEFAULT 1,
  taux_dh_par_point REAL NOT NULL DEFAULT 1.0,
  valeur_cashback_par_100_pts REAL NOT NULL DEFAULT 5.0,
  seuil_conversion_min_pts INTEGER NOT NULL DEFAULT 100,
  palier_silver_pts INTEGER NOT NULL DEFAULT 500,
  palier_gold_pts INTEGER NOT NULL DEFAULT 1500,
  palier_vip_pts INTEGER NOT NULL DEFAULT 5000,
  remise_silver_pct REAL NOT NULL DEFAULT 2.0,
  remise_gold_pct REAL NOT NULL DEFAULT 5.0,
  remise_vip_pct REAL NOT NULL DEFAULT 10.0,
  active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fidelite_mouvements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL DEFAULT 1,
  client_id INTEGER NOT NULL,
  type_mouvement TEXT NOT NULL CHECK (type_mouvement IN ('gain_achat', 'conversion_remise', 'conversion_bon_achat', 'ajustement_manuel', 'expiration')),
  points REAL NOT NULL,
  points_avant REAL NOT NULL,
  points_apres REAL NOT NULL,
  document_type TEXT DEFAULT '',
  document_id INTEGER,
  bon_achat_id INTEGER,
  notes TEXT DEFAULT '',
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (bon_achat_id) REFERENCES bons_achat(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_fidelite_mouvements_client ON fidelite_mouvements(client_id);
CREATE INDEX IF NOT EXISTS idx_fidelite_mouvements_type ON fidelite_mouvements(type_mouvement);

-- ============================================================================
-- 2. TARIFICATION PERSONNALISÉE & GRILLES TARIFAIRES
-- ============================================================================
CREATE TABLE IF NOT EXISTS grilles_tarifaires (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL DEFAULT 1,
  code TEXT NOT NULL UNIQUE,
  nom TEXT NOT NULL,
  description TEXT DEFAULT '',
  type_application TEXT NOT NULL CHECK (type_application IN ('groupe_client', 'contrat_client')),
  categorie_client TEXT DEFAULT '',
  client_id INTEGER,
  date_debut TEXT DEFAULT '',
  date_fin TEXT DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_grilles_tarifaires_cat ON grilles_tarifaires(categorie_client);
CREATE INDEX IF NOT EXISTS idx_grilles_tarifaires_client ON grilles_tarifaires(client_id);

CREATE TABLE IF NOT EXISTS grille_tarifaire_lignes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  grille_id INTEGER NOT NULL,
  produit_id INTEGER,
  famille_produit TEXT DEFAULT '',
  prix_special_ht REAL,
  remise_pourcentage REAL DEFAULT 0,
  quantite_min REAL NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (grille_id) REFERENCES grilles_tarifaires(id) ON DELETE CASCADE,
  FOREIGN KEY (produit_id) REFERENCES produits(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_grille_lignes_grille ON grille_tarifaire_lignes(grille_id);
CREATE INDEX IF NOT EXISTS idx_grille_lignes_produit ON grille_tarifaire_lignes(produit_id);

-- ============================================================================
-- 3. COMMISSIONNEMENT DES COMMERCIAUX & VENDEURS
-- ============================================================================
CREATE TABLE IF NOT EXISTS commission_regles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL DEFAULT 1,
  commercial_id INTEGER NOT NULL,
  base_calcul TEXT NOT NULL CHECK (base_calcul IN ('chiffre_affaires_ht', 'marge_brute')),
  taux_pourcentage REAL NOT NULL DEFAULT 5,
  famille_produit TEXT DEFAULT '',
  produit_id INTEGER,
  date_debut TEXT DEFAULT '',
  date_fin TEXT DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (commercial_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (produit_id) REFERENCES produits(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_commission_regles_comm ON commission_regles(commercial_id);

CREATE TABLE IF NOT EXISTS commission_fiches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL DEFAULT 1,
  commercial_id INTEGER NOT NULL,
  periode TEXT NOT NULL,
  total_ca_ht REAL NOT NULL DEFAULT 0,
  total_marge_brute REAL NOT NULL DEFAULT 0,
  montant_commission REAL NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'validee', 'payee')),
  date_validation TEXT DEFAULT '',
  date_paiement TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (company_id, commercial_id, periode),
  FOREIGN KEY (commercial_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_commission_fiches_comm ON commission_fiches(commercial_id);
CREATE INDEX IF NOT EXISTS idx_commission_fiches_periode ON commission_fiches(periode);

CREATE TABLE IF NOT EXISTS commission_fiches_lignes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fiche_id INTEGER NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('facture', 'ticket')),
  document_id INTEGER NOT NULL,
  document_numero TEXT NOT NULL,
  date_vente TEXT NOT NULL,
  client_nom TEXT DEFAULT '',
  total_ht REAL NOT NULL DEFAULT 0,
  marge_brute REAL NOT NULL DEFAULT 0,
  taux_applique REAL NOT NULL DEFAULT 0,
  montant_commission REAL NOT NULL DEFAULT 0,
  FOREIGN KEY (fiche_id) REFERENCES commission_fiches(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_commission_lignes_fiche ON commission_fiches_lignes(fiche_id);

-- ============================================================================
-- 4. PIPELINE CRM KANBAN & OPPORTUNITÉS COMMERCIALES
-- ============================================================================
CREATE TABLE IF NOT EXISTS crm_opportunites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL DEFAULT 1,
  branch_id INTEGER,
  titre TEXT NOT NULL,
  client_id INTEGER,
  contact_nom TEXT DEFAULT '',
  contact_phone TEXT DEFAULT '',
  contact_email TEXT DEFAULT '',
  commercial_id INTEGER,
  etape TEXT NOT NULL DEFAULT 'nouveau_contact' CHECK (etape IN ('nouveau_contact', 'qualification', 'devis_envoye', 'negociation', 'gagne', 'perdu')),
  montant_estime REAL NOT NULL DEFAULT 0,
  probabilite REAL NOT NULL DEFAULT 10,
  date_cloture_prevue TEXT DEFAULT '',
  devis_id INTEGER,
  notes TEXT DEFAULT '',
  motif_perte TEXT DEFAULT '',
  ordre INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
  FOREIGN KEY (commercial_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (devis_id) REFERENCES documents(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_crm_opp_etape ON crm_opportunites(etape);
CREATE INDEX IF NOT EXISTS idx_crm_opp_commercial ON crm_opportunites(commercial_id);
CREATE INDEX IF NOT EXISTS idx_crm_opp_client ON crm_opportunites(client_id);

CREATE TABLE IF NOT EXISTS crm_opportunite_activites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  opportunite_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('appel', 'reunion', 'email', 'note', 'changement_etape')),
  titre TEXT NOT NULL,
  description TEXT DEFAULT '',
  date_activite TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (opportunite_id) REFERENCES crm_opportunites(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_crm_act_opp ON crm_opportunite_activites(opportunite_id);

-- ============================================================================
-- 5. MESSAGERIE INTÉGRÉE WHATSAPP BUSINESS & SMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS messagerie_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL DEFAULT 1 UNIQUE,
  whatsapp_actif INTEGER NOT NULL DEFAULT 1,
  whatsapp_phone_number_id TEXT DEFAULT '',
  whatsapp_access_token TEXT DEFAULT '',
  whatsapp_business_account_id TEXT DEFAULT '',
  sms_actif INTEGER NOT NULL DEFAULT 0,
  sms_provider TEXT DEFAULT 'generic',
  sms_api_key TEXT DEFAULT '',
  sms_sender_id TEXT DEFAULT 'HALOUI',
  auto_notify_commande INTEGER NOT NULL DEFAULT 1,
  auto_notify_livraison INTEGER NOT NULL DEFAULT 1,
  auto_notify_facture INTEGER NOT NULL DEFAULT 1,
  templates_json TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messagerie_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL DEFAULT 1,
  canal TEXT NOT NULL CHECK (canal IN ('whatsapp', 'sms')),
  type_notification TEXT NOT NULL CHECK (type_notification IN ('commande', 'livraison', 'facture', 'devis', 'rappel', 'libre')),
  document_id INTEGER,
  document_numero TEXT DEFAULT '',
  destinataire_nom TEXT NOT NULL,
  destinataire_telephone TEXT NOT NULL,
  message TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'envoye' CHECK (statut IN ('envoye', 'delivre', 'echec', 'en_attente')),
  external_message_id TEXT DEFAULT '',
  erreur_details TEXT DEFAULT '',
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_messagerie_company ON messagerie_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_messagerie_canal ON messagerie_logs(canal);
CREATE INDEX IF NOT EXISTS idx_messagerie_date ON messagerie_logs(created_at);

-- ============================================================================
-- 6. POINTEUSE VIRTUELLE & SUIVI DU TEMPS DE TRAVAIL
-- ============================================================================
CREATE TABLE IF NOT EXISTS pointages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL DEFAULT 1,
  employe_id INTEGER NOT NULL,
  date_pointage TEXT NOT NULL,
  heure_arrivee TEXT NOT NULL,
  heure_depart TEXT DEFAULT '',
  duree_pause_minutes REAL NOT NULL DEFAULT 0,
  total_heures REAL NOT NULL DEFAULT 0,
  heures_normales REAL NOT NULL DEFAULT 0,
  heures_sup REAL NOT NULL DEFAULT 0,
  methode_pointage TEXT NOT NULL DEFAULT 'tactile' CHECK (methode_pointage IN ('tactile', 'pin', 'qr_code')),
  statut TEXT NOT NULL DEFAULT 'en_cours' CHECK (statut IN ('en_cours', 'valide', 'anomalie')),
  motif_anomalie TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employe_id) REFERENCES employes(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_pointages_emp_date ON pointages(employe_id, date_pointage);
CREATE INDEX IF NOT EXISTS idx_pointages_company_date ON pointages(company_id, date_pointage);

-- ============================================================================
-- 7. GESTION COMPLÈTE DES CONGÉS & ABSENCES
-- ============================================================================
CREATE TABLE IF NOT EXISTS conges_demandes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL DEFAULT 1,
  employe_id INTEGER NOT NULL,
  type_conge TEXT NOT NULL CHECK (type_conge IN ('conge_paye', 'maladie', 'maternite', 'sans_solde', 'evenement_familial', 'autre')),
  date_debut TEXT NOT NULL,
  date_fin TEXT NOT NULL,
  nb_jours REAL NOT NULL DEFAULT 1,
  motif TEXT DEFAULT '',
  justificatif_path TEXT DEFAULT '',
  statut TEXT NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'approuve', 'refuse', 'annule')),
  valide_par INTEGER,
  date_decision TEXT DEFAULT '',
  motif_refus TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employe_id) REFERENCES employes(id) ON DELETE CASCADE,
  FOREIGN KEY (valide_par) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_conges_emp ON conges_demandes(employe_id);
CREATE INDEX IF NOT EXISTS idx_conges_statut ON conges_demandes(statut);

CREATE TABLE IF NOT EXISTS conges_mouvements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL DEFAULT 1,
  employe_id INTEGER NOT NULL,
  type_mouvement TEXT NOT NULL CHECK (type_mouvement IN ('acquisition', 'prise', 'ajustement')),
  nb_jours REAL NOT NULL,
  date_mouvement TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  description TEXT DEFAULT '',
  demande_id INTEGER,
  created_by INTEGER,
  FOREIGN KEY (employe_id) REFERENCES employes(id) ON DELETE CASCADE,
  FOREIGN KEY (demande_id) REFERENCES conges_demandes(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_conges_mvt_emp ON conges_mouvements(employe_id);

-- ============================================================================
-- 8. PRÊTS, AVANCES SUR SALAIRE & BULLETINS DE PAIE
-- ============================================================================
CREATE TABLE IF NOT EXISTS prets_avances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL DEFAULT 1,
  employe_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('avance_salaire', 'pret_personnel')),
  montant_total REAL NOT NULL,
  date_octroi TEXT NOT NULL,
  nb_mensualites INTEGER NOT NULL DEFAULT 1,
  montant_mensualite REAL NOT NULL,
  montant_rembourse REAL NOT NULL DEFAULT 0,
  solde_restant REAL NOT NULL,
  mode_paiement TEXT NOT NULL DEFAULT 'virement',
  statut TEXT NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif', 'solde', 'suspendu', 'annule')),
  notes TEXT DEFAULT '',
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employe_id) REFERENCES employes(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_prets_emp ON prets_avances(employe_id);

CREATE TABLE IF NOT EXISTS prets_echeancier (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pret_id INTEGER NOT NULL,
  employe_id INTEGER NOT NULL,
  numero_mensualite INTEGER NOT NULL,
  mois_prelevement TEXT NOT NULL,
  montant_echeance REAL NOT NULL,
  montant_preleve REAL NOT NULL DEFAULT 0,
  date_prelevement TEXT DEFAULT '',
  bulletin_id INTEGER,
  statut TEXT NOT NULL DEFAULT 'a_prelever' CHECK (statut IN ('a_prelever', 'preleve', 'reporte')),
  FOREIGN KEY (pret_id) REFERENCES prets_avances(id) ON DELETE CASCADE,
  FOREIGN KEY (employe_id) REFERENCES employes(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_prets_ech_pret ON prets_echeancier(pret_id);
CREATE INDEX IF NOT EXISTS idx_prets_ech_mois ON prets_echeancier(mois_prelevement);

CREATE TABLE IF NOT EXISTS bulletins_paie (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL DEFAULT 1,
  employe_id INTEGER NOT NULL,
  numero_bulletin TEXT NOT NULL UNIQUE,
  periode_mois TEXT NOT NULL,
  date_emission TEXT NOT NULL,
  salaire_base REAL NOT NULL DEFAULT 0,
  heures_normales REAL NOT NULL DEFAULT 0,
  heures_sup REAL NOT NULL DEFAULT 0,
  taux_horaire REAL NOT NULL DEFAULT 0,
  montant_heures_sup REAL NOT NULL DEFAULT 0,
  primes REAL NOT NULL DEFAULT 0,
  retenue_cnss REAL NOT NULL DEFAULT 0,
  retenue_amo REAL NOT NULL DEFAULT 0,
  retenue_ir REAL NOT NULL DEFAULT 0,
  retenue_prets_avances REAL NOT NULL DEFAULT 0,
  autres_retenues REAL NOT NULL DEFAULT 0,
  salaire_brut REAL NOT NULL DEFAULT 0,
  total_retenues REAL NOT NULL DEFAULT 0,
  salaire_net REAL NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'valide', 'paye')),
  date_paiement TEXT DEFAULT '',
  mode_paiement TEXT DEFAULT 'virement',
  notes TEXT DEFAULT '',
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_id, employe_id, periode_mois),
  FOREIGN KEY (employe_id) REFERENCES employes(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_bulletins_emp ON bulletins_paie(employe_id);
CREATE INDEX IF NOT EXISTS idx_bulletins_periode ON bulletins_paie(periode_mois);

CREATE TABLE IF NOT EXISTS notes_frais (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL DEFAULT 1,
  employe_id INTEGER NOT NULL,
  numero TEXT NOT NULL UNIQUE,
  date_depense TEXT NOT NULL,
  categorie TEXT NOT NULL CHECK (categorie IN ('deplacement', 'repas', 'hotel', 'peage', 'carburant', 'frais_km', 'fournitures', 'autre')),
  description TEXT NOT NULL,
  montant_ttc REAL NOT NULL DEFAULT 0,
  tva_rate REAL DEFAULT 0,
  montant_tva REAL DEFAULT 0,
  montant_ht REAL DEFAULT 0,
  distance_km REAL DEFAULT 0,
  bareme_km_unitaire REAL DEFAULT 2.5,
  vehicule_immatriculation TEXT DEFAULT '',
  justificatif_path TEXT DEFAULT '',
  statut TEXT NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'approuve', 'refuse', 'rembourse')),
  valide_par INTEGER,
  date_decision TEXT DEFAULT '',
  motif_refus TEXT DEFAULT '',
  date_remboursement TEXT DEFAULT '',
  mode_remboursement TEXT DEFAULT 'virement' CHECK (mode_remboursement IN ('especes', 'virement', 'paie', 'cheque')),
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employe_id) REFERENCES employes(id) ON DELETE CASCADE,
  FOREIGN KEY (valide_par) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_notes_frais_emp ON notes_frais(employe_id);
CREATE INDEX IF NOT EXISTS idx_notes_frais_statut ON notes_frais(statut);

CREATE TABLE IF NOT EXISTS tva_declarations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL DEFAULT 1,
  periode_type TEXT NOT NULL CHECK (periode_type IN ('mensuelle', 'trimestrielle')),
  periode_code TEXT NOT NULL,
  regime TEXT NOT NULL DEFAULT 'encaissement' CHECK (regime IN ('encaissement', 'debit')),
  tva_collectee_total REAL NOT NULL DEFAULT 0,
  tva_collectee_20 REAL NOT NULL DEFAULT 0,
  tva_collectee_14 REAL NOT NULL DEFAULT 0,
  tva_collectee_10 REAL NOT NULL DEFAULT 0,
  tva_collectee_7 REAL NOT NULL DEFAULT 0,
  tva_deductible_total REAL NOT NULL DEFAULT 0,
  tva_deductible_immo REAL NOT NULL DEFAULT 0,
  tva_deductible_charges REAL NOT NULL DEFAULT 0,
  tva_deductible_20 REAL NOT NULL DEFAULT 0,
  tva_deductible_14 REAL NOT NULL DEFAULT 0,
  tva_deductible_10 REAL NOT NULL DEFAULT 0,
  tva_deductible_7 REAL NOT NULL DEFAULT 0,
  credit_tva_precedent REAL NOT NULL DEFAULT 0,
  tva_nette_due REAL NOT NULL DEFAULT 0,
  credit_tva_a_reporter REAL NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'validee', 'teledeclaree', 'payee')),
  date_declaration TEXT DEFAULT '',
  reference_telepaiement TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_id, periode_code),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_tva_periode ON tva_declarations(periode_code);





