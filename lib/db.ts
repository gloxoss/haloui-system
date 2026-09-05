import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import bcrypt from "bcryptjs";
import Database from "better-sqlite3";

import {
  ADMIN_TEMP_PASSWORD,
  DEFAULT_ATTESTATION_TEMPLATES,
  DEFAULT_FEATURE_FLAGS,
  DEFAULT_THEME_SETTINGS,
  DEFAULT_SUPERADMIN_NAME,
  DEFAULT_SUPERADMIN_PASSWORD,
  DEFAULT_SUPERADMIN_USERNAME,
  SEED_BRANCHES,
  SEED_COMPANIES,
  SEED_COMPANY,
  SEED_PRODUCTS,
  SEED_PRODUCTS_BATCH_V2_REFS,
  DEVISES_STANDARDS,
} from "@/lib/constants";
import { type FeatureKey } from "@/lib/types";
import {
  BACKUP_DIR,
  DATA_DIR,
  DB_PATH,
  SCHEMA_PATH,
} from "@/lib/runtime-paths";

let dbInstance: Database.Database | null = null;

function ensureColumnExists(db: Database.Database, table: string, column: string, definition: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  const exists = columns.some((item) => item.name === column);

  if (!exists) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function ensureDataDirectories() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function escapeSqlPath(filePath: string) {
  return filePath.replace(/'/g, "''");
}

function timestampLabel() {
  return new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19);
}

export function createDatabaseBackup(prefix = "backup") {
  ensureDataDirectories();
  const backupPath = path.join(BACKUP_DIR, `${prefix}-${timestampLabel()}.db`);
  const db = getDb();
  db.exec(`VACUUM INTO '${escapeSqlPath(backupPath)}'`);
  return backupPath;
}

function backupDatabase(db: Database.Database) {
  const date = new Date().toISOString().slice(0, 10);
  const backupPath = path.join(BACKUP_DIR, `backup-${date}.db`);

  if (fs.existsSync(backupPath) || !fs.existsSync(DB_PATH)) {
    return;
  }

  db.exec(`VACUUM INTO '${escapeSqlPath(backupPath)}'`);
}

function createSettingsTable(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
}

function seedFeatureFlags(db: Database.Database) {
  const insertSetting = db.prepare(`
    INSERT INTO app_settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO NOTHING
  `);

  for (const [key, enabled] of Object.entries(DEFAULT_FEATURE_FLAGS) as Array<[FeatureKey, boolean]>) {
    insertSetting.run(`feature.${key}`, enabled ? "1" : "0");
  }

  insertSetting.run("theme.preset", DEFAULT_THEME_SETTINGS.preset);
  insertSetting.run("theme.density", DEFAULT_THEME_SETTINGS.density);
}

function getSuperadminConfig() {
  return {
    username: (
      process.env.APP_SUPERADMIN_USERNAME ||
      process.env.SUPERADMIN_USERNAME ||
      process.env.HALOUI_SUPERADMIN_USERNAME ||
      DEFAULT_SUPERADMIN_USERNAME
    ).trim(),
    password: (
      process.env.APP_SUPERADMIN_PASSWORD ||
      process.env.SUPERADMIN_PASSWORD ||
      process.env.HALOUI_SUPERADMIN_PASSWORD ||
      DEFAULT_SUPERADMIN_PASSWORD
    ).trim(),
    fullName: (
      process.env.APP_SUPERADMIN_NAME ||
      process.env.SUPERADMIN_NAME ||
      process.env.HALOUI_SUPERADMIN_NAME ||
      DEFAULT_SUPERADMIN_NAME
    ).trim(),
  };
}

function syncSuperadminUser(db: Database.Database) {
  const config = getSuperadminConfig();
  const passwordHash = bcrypt.hashSync(config.password, 10);

  const existing = db.prepare(`
    SELECT id
    FROM users
    WHERE is_superadmin = 1 OR username = ?
    ORDER BY is_superadmin DESC, id ASC
    LIMIT 1
  `).get(config.username) as { id: number } | undefined;

  if (existing) {
    db.prepare(`
      UPDATE users
      SET username = ?,
          password_hash = ?,
          full_name = ?,
          role = 'admin',
          active = 1,
          is_superadmin = 1,
          hidden_from_admin = 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(config.username, passwordHash, config.fullName, existing.id);

    db.prepare(`
      UPDATE users
      SET active = 0,
          hidden_from_admin = 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE is_superadmin = 1 AND id != ?
    `).run(existing.id);

    return existing.id;
  }

  const result = db.prepare(`
    INSERT INTO users (username, password_hash, full_name, role, active, is_superadmin, hidden_from_admin)
    VALUES (?, ?, ?, 'admin', 1, 1, 1)
  `).run(config.username, passwordHash, config.fullName);

  return Number(result.lastInsertRowid);
}

function seedIfNeeded(db: Database.Database, actorId: number) {
  const hasAdmin = db.prepare(`
    SELECT COUNT(*) AS count
    FROM users
    WHERE username = 'admin' AND is_superadmin = 0
  `).get() as { count: number };

  if (hasAdmin.count === 0) {
    const passwordHash = bcrypt.hashSync(ADMIN_TEMP_PASSWORD, 10);
    db.prepare(`
      INSERT INTO users (username, password_hash, full_name, role, active, is_superadmin, hidden_from_admin)
      VALUES ('admin', ?, 'Administrateur Haloui', 'admin', 1, 0, 0)
    `).run(passwordHash);
  }

  const hasCompany = db.prepare("SELECT COUNT(*) AS count FROM company").get() as { count: number };
  if (hasCompany.count === 0) {
    db.prepare(`
      INSERT INTO company (
        id, name, arabic_name, address, phone, gsm, rc, if_number, tp, ice, logo_path, legal_notice
      ) VALUES (
        @id, @name, @arabic_name, @address, @phone, @gsm, @rc, @if_number, @tp, @ice, @logo_path, @legal_notice
      )
    `).run(SEED_COMPANY);
  }

  const hasBranches = db.prepare("SELECT COUNT(*) AS count FROM branches").get() as { count: number };
  if (hasBranches.count === 0) {
    const statement = db.prepare(`
      INSERT INTO branches (name, address, phone, active, created_by, updated_by)
      VALUES (@name, @address, @phone, 1, @actor_id, @actor_id)
    `);

    const insertBranches = db.transaction((branches: typeof SEED_BRANCHES) => {
      for (const branch of branches) {
        statement.run({ ...branch, actor_id: actorId });
      }
    });

    insertBranches(SEED_BRANCHES);
  }

  const hasProducts = db.prepare("SELECT COUNT(*) AS count FROM produits").get() as { count: number };
  if (hasProducts.count === 0 && SEED_PRODUCTS.length > 0) {
    const statement = db.prepare(`
      INSERT INTO produits (ref, designation, unite, prix_ht, tva_rate, active, created_by, updated_by)
      VALUES (@ref, @designation, @unite, @prix_ht, 0, 1, @actor_id, @actor_id)
    `);

    const insertProducts = db.transaction((products: typeof SEED_PRODUCTS) => {
      for (const product of products) {
        statement.run({
          ref: product.ref,
          designation: product.designation,
          unite: product.unite ?? "u",
          prix_ht: product.prix_ht,
          actor_id: actorId,
        });
      }
    });

    insertProducts(SEED_PRODUCTS);
  }
}

function applyProductBatchV2(db: Database.Database, actorId: number) {
  const flagKey = "seed.products.batch.v2";
  const existing = db
    .prepare("SELECT value FROM app_settings WHERE key = ?")
    .get(flagKey) as { value: string } | undefined;

  if (existing?.value === "1") {
    return;
  }

  const batchProducts = SEED_PRODUCTS.filter((product) =>
    SEED_PRODUCTS_BATCH_V2_REFS.has(product.ref),
  );

  if (batchProducts.length === 0) {
    db.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, '1')").run(flagKey);
    return;
  }

  const checkStatement = db.prepare("SELECT 1 FROM produits WHERE ref = ? LIMIT 1");
  const insertStatement = db.prepare(`
    INSERT INTO produits (ref, designation, unite, prix_ht, tva_rate, active, created_by, updated_by)
    VALUES (@ref, @designation, @unite, @prix_ht, 0, 1, @actor_id, @actor_id)
  `);

  const apply = db.transaction(() => {
    for (const product of batchProducts) {
      if (checkStatement.get(product.ref)) {
        continue;
      }
      insertStatement.run({
        ref: product.ref,
        designation: product.designation,
        unite: product.unite ?? "u",
        prix_ht: product.prix_ht,
        actor_id: actorId,
      });
    }
    db.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, '1')").run(flagKey);
  });

  apply();
}

// Repairs any DB whose product catalog drifted from the latest SEED_PRODUCTS list,
// for example installs created before a batch was added. Idempotent: only inserts
// refs that are currently missing, and locks itself behind a one-shot flag once done.
function applyFullProductSeedIfMissing(db: Database.Database, actorId: number) {
  const flagKey = "seed.products.full.v1";
  const existing = db
    .prepare("SELECT value FROM app_settings WHERE key = ?")
    .get(flagKey) as { value: string } | undefined;

  if (existing?.value === "1") {
    return;
  }

  const checkStatement = db.prepare("SELECT 1 FROM produits WHERE ref = ? LIMIT 1");
  const insertStatement = db.prepare(`
    INSERT INTO produits (ref, designation, unite, prix_ht, tva_rate, active, created_by, updated_by)
    VALUES (@ref, @designation, @unite, @prix_ht, 0, 1, @actor_id, @actor_id)
  `);

  const apply = db.transaction(() => {
    for (const product of SEED_PRODUCTS) {
      if (checkStatement.get(product.ref)) {
        continue;
      }
      insertStatement.run({
        ref: product.ref,
        designation: product.designation,
        unite: product.unite ?? "u",
        prix_ht: product.prix_ht,
        actor_id: actorId,
      });
    }
    db.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, '1')").run(flagKey);
    db.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, '1')").run("seed.products.batch.v2");
  });

  apply();
}

function migrateDatabase(db: Database.Database) {
  const companyTableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='company'").get() as { sql?: string } | undefined;
  if (companyTableInfo?.sql && companyTableInfo.sql.includes("CHECK (id = 1)")) {
    db.exec(`
      CREATE TABLE company_new (
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
      INSERT INTO company_new (id, name, arabic_name, address, phone, gsm, rc, if_number, tp, ice, logo_path, legal_notice, updated_at)
      SELECT id, name, arabic_name, address, phone, gsm, rc, if_number, tp, ice, logo_path, legal_notice, updated_at
      FROM company;
      DROP TABLE company;
      ALTER TABLE company_new RENAME TO company;
    `);
  }

  const documentsTableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='documents'").get() as { sql?: string } | undefined;
  if (documentsTableInfo?.sql && documentsTableInfo.sql.includes("UNIQUE (type, numero)")) {
    db.exec(`
      CREATE TABLE documents_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_id INTEGER DEFAULT 1,
        type TEXT NOT NULL CHECK (type IN ('devis', 'facture', 'bl', 'bs', 'bc')),
        numero INTEGER NOT NULL,
        date TEXT NOT NULL,
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
      INSERT INTO documents_new (
        id, company_id, type, numero, date, branch_id, source_branch_id, destination_branch_id, client_id, fournisseur_id,
        parent_document_id, total_ht, total_tva, total_ttc, remise, avance, reste, notes, status, created_by, updated_by, created_at, updated_at
      )
      SELECT
        id, COALESCE(company_id, 1), type, numero, date, branch_id, source_branch_id, destination_branch_id, client_id, fournisseur_id,
        parent_document_id, total_ht, total_tva, total_ttc, remise, avance, reste, notes, status, created_by, updated_by, created_at, updated_at
      FROM documents;
      DROP TABLE documents;
      ALTER TABLE documents_new RENAME TO documents;
    `);
  }

  ensureColumnExists(db, "company", "attestation_template_simple", "TEXT DEFAULT ''");
  ensureColumnExists(db, "company", "attestation_template_salary", "TEXT DEFAULT ''");
  ensureColumnExists(db, "company", "attestation_template_visa", "TEXT DEFAULT ''");
  ensureColumnExists(db, "company", "attestation_template_bank", "TEXT DEFAULT ''");
  ensureColumnExists(db, "company", "attestation_templates_json", "TEXT DEFAULT ''");
  ensureColumnExists(db, "users", "is_superadmin", "INTEGER NOT NULL DEFAULT 0");
  ensureColumnExists(db, "users", "hidden_from_admin", "INTEGER NOT NULL DEFAULT 0");
  ensureColumnExists(db, "users", "email", "TEXT DEFAULT ''");
  ensureColumnExists(db, "users", "phone", "TEXT DEFAULT ''");

  ensureColumnExists(db, "chiffre_affaires", "especes", "REAL NOT NULL DEFAULT 0");
  ensureColumnExists(db, "chiffre_affaires", "carte", "REAL NOT NULL DEFAULT 0");
  ensureColumnExists(db, "chiffre_affaires", "cheque", "REAL NOT NULL DEFAULT 0");
  ensureColumnExists(db, "chiffre_affaires", "virement", "REAL NOT NULL DEFAULT 0");
  ensureColumnExists(db, "chiffre_affaires", "preuve_path", "TEXT DEFAULT ''");
  ensureColumnExists(db, "chiffre_affaires", "statut_cloture", "TEXT DEFAULT 'brouillon'");

  ensureColumnExists(db, "documents", "date_echeance", "TEXT DEFAULT ''");

  db.exec(`
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
  `);

  ensureColumnExists(db, "documents", "company_id", "INTEGER DEFAULT 1");
  ensureColumnExists(db, "branches", "company_id", "INTEGER DEFAULT 1");
  ensureColumnExists(db, "produits", "company_id", "INTEGER DEFAULT 1");
  ensureColumnExists(db, "chiffre_affaires", "company_id", "INTEGER DEFAULT 1");

  ensureColumnExists(db, "clients", "portal_enabled", "INTEGER NOT NULL DEFAULT 1");
  ensureColumnExists(db, "clients", "portal_access_code", "TEXT DEFAULT ''");
  ensureColumnExists(db, "clients", "portal_token", "TEXT");
  ensureColumnExists(db, "clients", "portal_last_login", "TEXT DEFAULT ''");

  ensureColumnExists(db, "documents", "signed_at", "TEXT DEFAULT ''");
  ensureColumnExists(db, "documents", "signed_by_name", "TEXT DEFAULT ''");
  ensureColumnExists(db, "documents", "signature_data", "TEXT DEFAULT ''");
  ensureColumnExists(db, "documents", "signature_ip", "TEXT DEFAULT ''");

  ensureColumnExists(db, "documents", "devise", "TEXT NOT NULL DEFAULT 'MAD'");
  ensureColumnExists(db, "documents", "taux_change", "REAL NOT NULL DEFAULT 1.0");
  ensureColumnExists(db, "documents", "total_ht_base", "REAL NOT NULL DEFAULT 0");
  ensureColumnExists(db, "documents", "total_ttc_base", "REAL NOT NULL DEFAULT 0");
  ensureColumnExists(db, "documents", "avance_base", "REAL NOT NULL DEFAULT 0");
  ensureColumnExists(db, "documents", "reste_base", "REAL NOT NULL DEFAULT 0");

  ensureColumnExists(db, "sorties_caisse", "devise", "TEXT NOT NULL DEFAULT 'MAD'");
  ensureColumnExists(db, "sorties_caisse", "taux_change", "REAL NOT NULL DEFAULT 1.0");
  ensureColumnExists(db, "sorties_caisse", "montant_devise", "REAL NOT NULL DEFAULT 0");

  db.exec(`
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
  `);

  ensureColumnExists(db, "produits", "code_barre", "TEXT DEFAULT ''");
  ensureColumnExists(db, "produits", "categorie", "TEXT DEFAULT 'Général'");
  ensureColumnExists(db, "produits", "rayon", "TEXT DEFAULT ''");
  ensureColumnExists(db, "produits", "gestion_mode", "TEXT DEFAULT 'standard'");
  ensureColumnExists(db, "produits", "seuil_alerte_dlc_jours", "INTEGER DEFAULT 30");

  db.exec(`
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
  `);

  ensureColumnExists(db, "fournisseurs", "delai_livraison_jours", "INTEGER DEFAULT 5");
  ensureColumnExists(db, "fournisseurs", "franco_port_ht", "REAL DEFAULT 0");

  ensureColumnExists(db, "produits", "stock_minimum", "REAL DEFAULT 5");
  ensureColumnExists(db, "produits", "stock_maximum", "REAL DEFAULT 50");
  ensureColumnExists(db, "produits", "delai_livraison_jours", "INTEGER DEFAULT 5");
  ensureColumnExists(db, "produits", "fournisseur_principal_id", "INTEGER");
  ensureColumnExists(db, "produits", "conditionnement_achat", "REAL DEFAULT 1");
  ensureColumnExists(db, "produits", "emplacement_code", "TEXT DEFAULT ''");

  ensureColumnExists(db, "stock_depots", "quantite_en_commande", "REAL DEFAULT 0");
  ensureColumnExists(db, "stock_depots", "point_de_commande", "REAL DEFAULT 10");

  db.exec(`
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
  `);

  ensureColumnExists(db, "produits", "nature_produit", "TEXT DEFAULT 'simple'");
  ensureColumnExists(db, "produits", "mode_destockage_kit", "TEXT DEFAULT 'composants'");
  ensureColumnExists(db, "produits", "cout_revient_calcule", "REAL DEFAULT 0");

  db.exec(`
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
  `);

  createSettingsTable(db);
  seedFeatureFlags(db);


  for (const comp of SEED_COMPANIES) {
    db.prepare(`
      INSERT INTO company (
        id, name, arabic_name, address, phone, gsm, rc, if_number, tp, ice, logo_path, legal_notice,
        attestation_template_simple, attestation_template_salary, attestation_template_visa, attestation_template_bank
      ) VALUES (
        @id, @name, @arabic_name, @address, @phone, @gsm, @rc, @if_number, @tp, @ice, @logo_path, @legal_notice,
        @attestation_template_simple, @attestation_template_salary, @attestation_template_visa, @attestation_template_bank
      )
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        arabic_name = excluded.arabic_name,
        address = excluded.address,
        phone = excluded.phone,
        rc = excluded.rc,
        if_number = excluded.if_number,
        tp = excluded.tp,
        ice = excluded.ice,
        legal_notice = excluded.legal_notice
    `).run(comp);
  }
}

function seedSubscriptionsIfEmpty(db: Database.Database, actorId: number) {
  const count = (db.prepare("SELECT COUNT(*) as count FROM subscriptions").get() as any)?.count ?? 0;
  if (count > 0) return;

  const client = db.prepare("SELECT id FROM clients ORDER BY id ASC LIMIT 1").get() as any;
  if (!client) return;

  const clientId = client.id;
  const today = new Date().toISOString().slice(0, 10);

  // Contract 1: Mensuel (Due today!)
  const sub1 = db.prepare(`
    INSERT INTO subscriptions (
      company_id, client_id, titre, reference, periodicite, date_debut, date_fin,
      prochaine_echeance, statut, mode_reglement, auto_generer, generer_statut,
      terme_paiement_jours, notes, total_ht, total_tva, total_ttc, mrr, arr, created_by, updated_by
    ) VALUES (
      1, ?, 'Contrat Maintenance IT & Infogérance', 'ABO-2026-001', 'mensuel', ?, '',
      ?, 'actif', 'prelevement', 1, 'valide', 30, 'Prélèvement mensuel automatique le 01 du mois',
      2500, 500, 3000, 3000, 36000, ?, ?
    )
  `).run(clientId, today, today, actorId, actorId);

  const sub1Id = Number(sub1.lastInsertRowid);
  db.prepare(`
    INSERT INTO subscription_lignes (subscription_id, designation, quantite, unite, prix_unitaire_ht, tva_rate, remise, total_ht)
    VALUES (?, 'Forfait Maintenance Informatique Préventive & Curative', 1, 'mois', 2500, 20, 0, 2500)
  `).run(sub1Id);

  // Contract 2: Trimestriel
  const nextMonth = new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10);
  const sub2 = db.prepare(`
    INSERT INTO subscriptions (
      company_id, client_id, titre, reference, periodicite, date_debut, date_fin,
      prochaine_echeance, statut, mode_reglement, auto_generer, generer_statut,
      terme_paiement_jours, notes, total_ht, total_tva, total_ttc, mrr, arr, created_by, updated_by
    ) VALUES (
      1, ?, 'Loyer Local Commercial & Entrepôt Stockage #2', 'ABO-2026-002', 'trimestriel', ?, '',
      ?, 'actif', 'virement', 1, 'valide', 15, 'Facturation trimestrielle par virement',
      15000, 0, 15000, 5000, 60000, ?, ?
    )
  `).run(clientId, today, nextMonth, actorId, actorId);

  const sub2Id = Number(sub2.lastInsertRowid);
  db.prepare(`
    INSERT INTO subscription_lignes (subscription_id, designation, quantite, unite, prix_unitaire_ht, tva_rate, remise, total_ht)
    VALUES (?, 'Loyer Trimestriel Entrepôt et Espace de Stockage', 1, 'trimestre', 15000, 0, 0, 15000)
  `).run(sub2Id);

  // Contract 3: Annuel
  const futureDate = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
  const sub3 = db.prepare(`
    INSERT INTO subscriptions (
      company_id, client_id, titre, reference, periodicite, date_debut, date_fin,
      prochaine_echeance, statut, mode_reglement, auto_generer, generer_statut,
      terme_paiement_jours, notes, total_ht, total_tva, total_ttc, mrr, arr, created_by, updated_by
    ) VALUES (
      1, ?, 'Abonnement Cloud ERP & Sauvegardes Quotidiennes', 'ABO-2026-003', 'annuel', ?, '',
      ?, 'actif', 'prelevement', 1, 'valide', 30, 'Renouvellement annuel avec prélèvement bancaire',
      12000, 2400, 14400, 1200, 14400, ?, ?
    )
  `).run(clientId, today, futureDate, actorId, actorId);

  const sub3Id = Number(sub3.lastInsertRowid);
  db.prepare(`
    INSERT INTO subscription_lignes (subscription_id, designation, quantite, unite, prix_unitaire_ht, tva_rate, remise, total_ht)
    VALUES (?, 'Licence Cloud Annuelle & Support Dédié 24/7', 1, 'an', 12000, 20, 0, 12000)
  `).run(sub3Id);
}

function seedPortalClientAccessIfMissing(db: Database.Database) {
  const clientsWithoutCode = db
    .prepare(`
      SELECT id, phone, ice
      FROM clients
      WHERE portal_access_code IS NULL OR portal_access_code = '' OR portal_token IS NULL OR portal_token = ''
    `)
    .all() as Array<{ id: number; phone?: string; ice?: string }>;

  for (const client of clientsWithoutCode) {
    const pin = String(100000 + ((client.id * 73931) % 900000));
    const token = crypto.randomBytes(16).toString("hex");
    db.prepare(`
      UPDATE clients
      SET portal_access_code = COALESCE(NULLIF(portal_access_code, ''), ?),
          portal_token = COALESCE(NULLIF(portal_token, ''), ?),
          portal_enabled = 1
      WHERE id = ?
    `).run(pin, token, client.id);
  }
}

function seedBankAccountsIfEmpty(db: Database.Database, actorId: number) {
  const count = (db.prepare("SELECT COUNT(*) as count FROM bank_accounts").get() as any)?.count ?? 0;
  if (count > 0) return;

  db.prepare(`
    INSERT INTO bank_accounts (
      company_id, nom_banque, intitule_compte, rib, iban, bic_swift, devise,
      solde_initial, solde_actuel, solde_rapproche, statut, created_by
    ) VALUES (
      1, 'Attijariwafa Bank', 'Compte Courant Principal MAD',
      '007 680 0001234567890123 45', 'MA64007680000123456789012345', 'BCMA MAMC', 'MAD',
      50000, 50000, 50000, 'actif', ?
    )
  `).run(actorId);

  db.prepare(`
    INSERT INTO bank_accounts (
      company_id, nom_banque, intitule_compte, rib, iban, bic_swift, devise,
      solde_initial, solde_actuel, solde_rapproche, statut, created_by
    ) VALUES (
      2, 'Banque Populaire (BCP)', 'Compte Courant Ananas Trans',
      '101 680 2121112345678901 12', 'MA64101680212111234567890112', 'BPOPMAMC', 'MAD',
      25000, 25000, 25000, 'actif', ?
    )
  `).run(actorId);
}

function seedExchangeRatesIfEmpty(db: Database.Database) {
  const row = db.prepare("SELECT COUNT(*) as count FROM exchange_rates").get() as { count: number };
  if (row.count > 0) return;

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO exchange_rates (
      company_id, code, nom, nom_ar, symbole, taux, taux_achat, taux_vente, source, est_actif, est_devise_base, derniere_mise_a_jour
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, 'auto_api', 1, ?, CURRENT_TIMESTAMP
    )
  `);

  for (const companyId of [1, 2]) {
    for (const cur of DEVISES_STANDARDS) {
      insertStmt.run(
        companyId,
        cur.code,
        cur.nom,
        cur.nomAr,
        cur.symbole,
        cur.tauxDefaut,
        Math.round(cur.tauxDefaut * 0.99 * 10000) / 10000,
        Math.round(cur.tauxDefaut * 1.01 * 10000) / 10000,
        cur.estBase ? 1 : 0
      );
    }
  }
}

function seedStockDepotsIfEmpty(db: Database.Database, actorId: number) {
  const countRow = db.prepare("SELECT COUNT(*) as count FROM stock_depots").get() as { count: number };
  if (countRow.count > 0) return;

  const branches = db.prepare("SELECT id, company_id, name FROM branches WHERE active = 1").all() as Array<{ id: number; company_id: number; name: string }>;
  const products = db.prepare("SELECT id, ref, designation FROM produits WHERE active = 1").all() as Array<{ id: number; ref: string; designation: string }>;

  if (branches.length === 0 || products.length === 0) return;

  const insertStock = db.prepare(`
    INSERT OR IGNORE INTO stock_depots (company_id, branch_id, produit_id, quantite, quantite_en_transit, seuil_alerte)
    VALUES (?, ?, ?, ?, 0, 5)
  `);

  const insertMvt = db.prepare(`
    INSERT INTO mouvements_stock (company_id, branch_id, produit_id, type_mouvement, quantite, stock_avant, stock_apres, reference_document, motif, user_id)
    VALUES (?, ?, ?, 'initialisation', ?, 0, ?, 'INIT-STOCK', 'Stock initial paramétré', ?)
  `);

  for (const branch of branches) {
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      const isMainBranch = branch.id === branches[0].id;
      const initialQty = isMainBranch ? (50 + (i * 15) % 120) : (10 + (i * 7) % 40);
      insertStock.run(branch.company_id || 1, branch.id, p.id, initialQty);
      insertMvt.run(branch.company_id || 1, branch.id, p.id, initialQty, initialQty, actorId);
    }
  }

  // Seed sample transfers for demonstration and direct usability
  const hasTransfers = (db.prepare("SELECT COUNT(*) as count FROM transferts_stock").get() as any)?.count ?? 0;
  if (hasTransfers === 0 && branches.length >= 2 && products.length >= 3) {
    const b1 = branches[0];
    const b2 = branches[1];
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();

    // Sample 1: Transfert "en_transit" (Sur la route - prêt pour réception physique Étape 2)
    const t1 = db.prepare(`
      INSERT INTO transferts_stock (
        company_id, numero, date_transfert, source_branch_id, destination_branch_id,
        chauffeur_nom, vehicule_matricule, bon_transport_ref, notes,
        statut, date_expedition, expedie_par_id, expedie_par_nom,
        total_articles, total_quantite_expediee, total_quantite_recue, total_ecart, created_by, updated_by
      ) VALUES (
        ?, 'BT-2026-0001', ?, ?, ?,
        'Youssef El Amrani', '12345-A-26 (Mercedes Sprinter)', 'BL-TR-8812', 'Transfert réapprovisionnement hebdomadaire urgent',
        'en_transit', ?, ?, 'Super Administrateur',
        2, 35, 0, 0, ?, ?
      )
    `).run(b1.company_id || 1, today, b1.id, b2.id, now, actorId, actorId, actorId);

    const t1Id = Number(t1.lastInsertRowid);
    db.prepare(`
      INSERT INTO transfert_stock_lignes (transfert_id, produit_id, designation, unite, quantite_expediee, quantite_recue, ecart)
      VALUES (?, ?, ?, 'u', 20, 0, 0)
    `).run(t1Id, products[0].id, products[0].designation);
    db.prepare(`
      INSERT INTO transfert_stock_lignes (transfert_id, produit_id, designation, unite, quantite_expediee, quantite_recue, ecart)
      VALUES (?, ?, ?, 'u', 15, 0, 0)
    `).run(t1Id, products[1].id, products[1].designation);

    // Update in-transit stock for products in b2 (destination)
    db.prepare("UPDATE stock_depots SET quantite_en_transit = quantite_en_transit + 20 WHERE branch_id = ? AND produit_id = ?").run(b2.id, products[0].id);
    db.prepare("UPDATE stock_depots SET quantite_en_transit = quantite_en_transit + 15 WHERE branch_id = ? AND produit_id = ?").run(b2.id, products[1].id);
    // Deduct from b1
    db.prepare("UPDATE stock_depots SET quantite = MAX(0, quantite - 20) WHERE branch_id = ? AND produit_id = ?").run(b1.id, products[0].id);
    db.prepare("UPDATE stock_depots SET quantite = MAX(0, quantite - 15) WHERE branch_id = ? AND produit_id = ?").run(b1.id, products[1].id);

    // Sample 2: Transfert "recu" (Clôturé avec conformité totale)
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const yesterdayIso = new Date(Date.now() - 86400000).toISOString();
    const t2 = db.prepare(`
      INSERT INTO transferts_stock (
        company_id, numero, date_transfert, source_branch_id, destination_branch_id,
        chauffeur_nom, vehicule_matricule, bon_transport_ref, notes,
        statut, date_expedition, expedie_par_id, expedie_par_nom,
        date_reception, recu_par_id, recu_par_nom,
        total_articles, total_quantite_expediee, total_quantite_recue, total_ecart, created_by, updated_by
      ) VALUES (
        ?, 'BT-2026-0002', ?, ?, ?,
        'Hassan Benali', '98765-B-14 (Fourgon Isuzu)', 'BL-TR-8790', 'Livraison matinale stock pièces',
        'recu', ?, ?, 'Super Administrateur',
        ?, ?, 'Responsable Dépôt',
        1, 10, 10, 0, ?, ?
      )
    `).run(b1.company_id || 1, yesterday, b1.id, b2.id, yesterdayIso, actorId, now, actorId, actorId, actorId);

    const t2Id = Number(t2.lastInsertRowid);
    db.prepare(`
      INSERT INTO transfert_stock_lignes (transfert_id, produit_id, designation, unite, quantite_expediee, quantite_recue, ecart)
      VALUES (?, ?, ?, 'u', 10, 10, 0)
    `).run(t2Id, products[2].id, products[2].designation);
  }
}

function seedInventairesAndLotsIfEmpty(db: Database.Database, actorId: number) {
  // 1. Update existing products with barcodes and classifications
  try {
    db.prepare(`UPDATE produits SET code_barre = '6111000000010', categorie = 'Carburants & Énergies', rayon = 'Pistes Carburants', gestion_mode = 'standard' WHERE ref = 'GASOIL-10'`).run();
    db.prepare(`UPDATE produits SET code_barre = '6111000000027', categorie = 'Carburants & Énergies', rayon = 'Pistes Carburants', gestion_mode = 'standard' WHERE ref = 'ESS-SP'`).run();
    db.prepare(`UPDATE produits SET code_barre = '6111000000034', categorie = 'Lubrifiants & Fluides', rayon = 'Baie d''Entretien', gestion_mode = 'lot_dlc', seuil_alerte_dlc_jours = 60 WHERE ref = 'LUB-15W40'`).run();
    db.prepare(`UPDATE produits SET code_barre = '6111000000041', categorie = 'Services Entretien', rayon = 'Baie d''Entretien', gestion_mode = 'standard' WHERE ref = 'SRV-LAVAGE'`).run();
    db.prepare(`UPDATE produits SET code_barre = '6111000000058', categorie = 'Matériaux BTP', rayon = 'Dépôt Matériaux', gestion_mode = 'standard' WHERE ref = 'CPJ-45'`).run();
    db.prepare(`UPDATE produits SET code_barre = '6111000000065', categorie = 'Logistique', rayon = 'Bureau Transport', gestion_mode = 'standard' WHERE ref = 'TRANS-FRET'`).run();
  } catch {}

  // 2. Add realistic sensitive products (food/drinks with lots & DLC, equipment with serial numbers)
  const additionalProducts = [
    {
      company_id: 1,
      ref: "EAU-SIDI-15L",
      designation: "EAU MINÉRALE SIDI ALI 1.5L (PACK 6)",
      code_barre: "6111234567890",
      prix_ht: 28.00,
      tva_rate: 20,
      unite: "pack",
      categorie: "Alimentaire & Boissons",
      rayon: "Boutique - Boissons",
      gestion_mode: "lot_dlc",
      seuil_alerte_dlc_jours: 30,
    },
    {
      company_id: 1,
      ref: "COCA-33CL",
      designation: "COCA-COLA CANETTE 33CL (PACK 24)",
      code_barre: "5449000000996",
      prix_ht: 110.00,
      tva_rate: 20,
      unite: "carton",
      categorie: "Alimentaire & Boissons",
      rayon: "Boutique - Boissons",
      gestion_mode: "lot_dlc",
      seuil_alerte_dlc_jours: 30,
    },
    {
      company_id: 1,
      ref: "CROISSANT-PUR",
      designation: "CROISSANTS PUR BEURRE FRAIS (X10)",
      code_barre: "6119876543210",
      prix_ht: 35.00,
      tva_rate: 20,
      unite: "boîte",
      categorie: "Alimentaire & Frais",
      rayon: "Boutique - Rayon Frais",
      gestion_mode: "lot_dlc",
      seuil_alerte_dlc_jours: 5,
    },
    {
      company_id: 1,
      ref: "CAFE-ILLY-1KG",
      designation: "CAFÉ EN GRAINS INTENSO ILLY 1KG",
      code_barre: "8003753900512",
      prix_ht: 220.00,
      tva_rate: 20,
      unite: "sac",
      categorie: "Café & Épicerie",
      rayon: "Café Station",
      gestion_mode: "lot_dlc",
      seuil_alerte_dlc_jours: 45,
    },
    {
      company_id: 1,
      ref: "SANDWICH-CLUB",
      designation: "SANDWICH CLUB THON & FROMAGE FRAIS",
      code_barre: "6113456789012",
      prix_ht: 22.00,
      tva_rate: 20,
      unite: "pièce",
      categorie: "Alimentaire & Frais",
      rayon: "Boutique - Rayon Frais",
      gestion_mode: "lot_dlc",
      seuil_alerte_dlc_jours: 3,
    },
    {
      company_id: 1,
      ref: "BAT-BOSCH-70AH",
      designation: "BATTERIE VÉHICULE BOSCH S4 12V 70AH",
      code_barre: "4047024123456",
      prix_ht: 980.00,
      tva_rate: 20,
      unite: "u",
      categorie: "Équipements & Batteries",
      rayon: "Baie Pièces & Équipements",
      gestion_mode: "numero_serie",
      seuil_alerte_dlc_jours: 0,
    },
    {
      company_id: 1,
      ref: "COMP-MICH-50L",
      designation: "COMPRESSEUR D'AIR MICHELIN 50L 2HP",
      code_barre: "3528700012345",
      prix_ht: 2450.00,
      tva_rate: 20,
      unite: "u",
      categorie: "Équipements & Outillage",
      rayon: "Baie Pièces & Équipements",
      gestion_mode: "numero_serie",
      seuil_alerte_dlc_jours: 0,
    },
    {
      company_id: 1,
      ref: "POMPE-PIUSI-12V",
      designation: "POMPE DE TRANSFERT CARBURANT PIUSI 12V",
      code_barre: "8050012345678",
      prix_ht: 1850.00,
      tva_rate: 20,
      unite: "u",
      categorie: "Équipements & Outillage",
      rayon: "Baie Pièces & Équipements",
      gestion_mode: "numero_serie",
      seuil_alerte_dlc_jours: 0,
    },
  ];

  const insertProd = db.prepare(`
    INSERT OR IGNORE INTO produits (
      company_id, ref, designation, code_barre, categorie, rayon, gestion_mode,
      seuil_alerte_dlc_jours, unite, prix_ht, tva_rate, active, created_by, updated_by
    ) VALUES (
      @company_id, @ref, @designation, @code_barre, @categorie, @rayon, @gestion_mode,
      @seuil_alerte_dlc_jours, @unite, @prix_ht, @tva_rate, 1, @actorId, @actorId
    )
  `);

  for (const p of additionalProducts) {
    insertProd.run({ ...p, actorId });
  }

  // Branch IDs
  const branches = db.prepare("SELECT id, name FROM branches").all() as Array<{ id: number; name: string }>;
  if (branches.length === 0) return;

  const boutique = branches.find((b) => b.name.includes("Boutique")) || branches[0];
  const baie = branches.find((b) => b.name.includes("Baie")) || branches[0];

  // Populate stock_depots for newly added products
  const allProds = db.prepare("SELECT id, ref, prix_ht, designation, code_barre, unite FROM produits").all() as Array<{
    id: number;
    ref: string;
    prix_ht: number;
    designation: string;
    code_barre: string;
    unite: string;
  }>;

  const insertStock = db.prepare(`
    INSERT OR IGNORE INTO stock_depots (company_id, branch_id, produit_id, quantite, quantite_en_transit, seuil_alerte)
    VALUES (1, ?, ?, ?, 0, 5)
  `);

  const initialStockMapping: Record<string, { branchId: number; qty: number }> = {
    "EAU-SIDI-15L": { branchId: boutique.id, qty: 40 },
    "COCA-33CL": { branchId: boutique.id, qty: 24 },
    "CROISSANT-PUR": { branchId: boutique.id, qty: 15 },
    "CAFE-ILLY-1KG": { branchId: boutique.id, qty: 12 },
    "SANDWICH-CLUB": { branchId: boutique.id, qty: 4 },
    "BAT-BOSCH-70AH": { branchId: baie.id, qty: 6 },
    "COMP-MICH-50L": { branchId: baie.id, qty: 2 },
    "POMPE-PIUSI-12V": { branchId: baie.id, qty: 3 },
  };

  for (const prod of allProds) {
    const setting = initialStockMapping[prod.ref];
    if (setting) {
      insertStock.run(setting.branchId, prod.id, setting.qty);
    }
  }

  // 3. Seed Lots (DLC / DLUO)
  const lotCount = (db.prepare("SELECT COUNT(*) as count FROM produit_lots").get() as any)?.count ?? 0;
  if (lotCount === 0) {
    const today = new Date();
    const addDays = (d: Date, days: number) => {
      const copy = new Date(d);
      copy.setDate(copy.getDate() + days);
      return copy.toISOString().slice(0, 10);
    };

    const eau = allProds.find((p) => p.ref === "EAU-SIDI-15L");
    const croissants = allProds.find((p) => p.ref === "CROISSANT-PUR");
    const sandwich = allProds.find((p) => p.ref === "SANDWICH-CLUB");
    const huile = allProds.find((p) => p.ref === "LUB-15W40");

    const insertLot = db.prepare(`
      INSERT OR IGNORE INTO produit_lots (
        company_id, branch_id, produit_id, numero_lot, date_fabrication, date_peremption,
        quantite_initiale, quantite_restante, statut, cout_unitaire_ht, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    if (eau) {
      insertLot.run(1, boutique.id, eau.id, "LOT-SIDI-26-A", addDays(today, -30), addDays(today, 180), 40, 40, "actif", 22.0, "Lot eau minérale conforme - DLUO longue");
    }
    if (croissants) {
      insertLot.run(1, boutique.id, croissants.id, "LOT-CR-0905", addDays(today, -1), addDays(today, 2), 15, 15, "alerte_peremption", 28.0, "Viennoiserie fraîche du jour - À vendre en priorité (48h)");
    }
    if (sandwich) {
      insertLot.run(1, boutique.id, sandwich.id, "LOT-SND-0830", addDays(today, -5), addDays(today, -1), 4, 4, "perime", 16.0, "Périmé depuis hier - Retrait impératif et mise au rebut");
    }
    if (huile) {
      insertLot.run(1, baie.id, huile.id, "LOT-LUB-8821B", addDays(today, -60), addDays(today, 700), 25, 25, "actif", 115.0, "Lot certifié raffinerie TotalEnergies Maroc");
    }
  }

  // 4. Seed Serial Numbers
  const seriesCount = (db.prepare("SELECT COUNT(*) as count FROM produit_series").get() as any)?.count ?? 0;
  if (seriesCount === 0) {
    const today = new Date();
    const addDays = (d: Date, days: number) => {
      const copy = new Date(d);
      copy.setDate(copy.getDate() + days);
      return copy.toISOString().slice(0, 10);
    };

    const bat = allProds.find((p) => p.ref === "BAT-BOSCH-70AH");
    const comp = allProds.find((p) => p.ref === "COMP-MICH-50L");
    const pompe = allProds.find((p) => p.ref === "POMPE-PIUSI-12V");

    const insertSerie = db.prepare(`
      INSERT OR IGNORE INTO produit_series (
        company_id, branch_id, produit_id, numero_serie, statut, document_achat_ref,
        date_entree, garantie_fin_date, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    if (bat) {
      insertSerie.run(1, baie.id, bat.id, "SN-BOSCH-2026-001", "en_stock", "FA-FOURN-8812", addDays(today, -15), addDays(today, 715), "Batterie neuve certifiée avec garantie 2 ans");
      insertSerie.run(1, baie.id, bat.id, "SN-BOSCH-2026-002", "en_stock", "FA-FOURN-8812", addDays(today, -15), addDays(today, 715), "Batterie neuve certifiée avec garantie 2 ans");
      insertSerie.run(1, baie.id, bat.id, "SN-BOSCH-2025-998", "vendu", "FA-FOURN-7730", addDays(today, -60), addDays(today, 670), "Vendue au client STE SKOURA VOYAGE (Facture FAC-2026-001)");
    }
    if (comp) {
      insertSerie.run(1, baie.id, comp.id, "SN-MICH-8841-A", "en_stock", "FA-FOURN-9014", addDays(today, -10), addDays(today, 355), "Compresseur atelier professionnel - Garantie 1 an");
    }
    if (pompe) {
      insertSerie.run(1, baie.id, pompe.id, "SN-PIUSI-5520", "en_stock", "FA-FOURN-9120", addDays(today, -5), addDays(today, 540), "Pompe transfert carburant haute précision 12V");
    }
  }

  // 5. Seed a realistic Inventory Session in progress
  const invCount = (db.prepare("SELECT COUNT(*) as count FROM inventaires").get() as any)?.count ?? 0;
  if (invCount === 0) {
    const todayIso = new Date().toISOString();
    const todayDate = todayIso.slice(0, 10);

    const inv = db.prepare(`
      INSERT INTO inventaires (
        company_id, branch_id, numero, titre, type_inventaire, critere_filtre,
        statut, date_debut, total_articles, total_comptes, total_ecarts_qte, total_valeur_ecart_ht,
        notes, created_by
      ) VALUES (
        1, ?, 'INV-2026-0001', 'Inventaire Tournant - Boutique Rayon Frais & Café', 'tournant_rayon', 'Boutique - Rayon Frais',
        'en_cours', ?, 4, 2, -1, -35.0, 'Comptage physique hebdomadaire des produits frais de la boutique', ?
      )
    `).run(boutique.id, todayDate, actorId);

    const invId = Number(inv.lastInsertRowid);

    const croissants = allProds.find((p) => p.ref === "CROISSANT-PUR");
    const sandwich = allProds.find((p) => p.ref === "SANDWICH-CLUB");
    const eau = allProds.find((p) => p.ref === "EAU-SIDI-15L");
    const coca = allProds.find((p) => p.ref === "COCA-33CL");

    const insertLigne = db.prepare(`
      INSERT INTO inventaire_lignes (
        inventaire_id, produit_id, designation, ref, code_barre, unite,
        prix_unitaire_ht, stock_theorique, stock_physique, ecart_quantite, valeur_ecart_ht,
        statut_comptage, motif_ecart, compte_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    if (croissants) {
      insertLigne.run(invId, croissants.id, croissants.designation, croissants.ref, croissants.code_barre, croissants.unite, croissants.prix_ht, 15, 14, -1, -35.0, "ecart", "Casse / Avarie en rayon", todayIso);
    }
    if (sandwich) {
      insertLigne.run(invId, sandwich.id, sandwich.designation, sandwich.ref, sandwich.code_barre, sandwich.unite, sandwich.prix_ht, 4, 4, 0, 0, "conforme", "", todayIso);
    }
    if (eau) {
      insertLigne.run(invId, eau.id, eau.designation, eau.ref, eau.code_barre, eau.unite, eau.prix_ht, 40, 0, -40, -1120.0, "non_compte", "", "");
    }
    if (coca) {
      insertLigne.run(invId, coca.id, coca.designation, coca.ref, coca.code_barre, coca.unite, coca.prix_ht, 24, 0, -24, -2640.0, "non_compte", "", "");
    }
  }
}

function seedWmsAndReapproIfEmpty(db: Database.Database, actorId: number) {
  const empCount = (db.prepare("SELECT COUNT(*) as count FROM emplacements").get() as any)?.count ?? 0;
  if (empCount > 0) return;

  const branches = db.prepare("SELECT id, name FROM branches").all() as Array<{ id: number; name: string }>;
  if (branches.length === 0) return;

  const boutique = branches.find((b) => b.name.includes("Boutique")) || branches[0];
  const baie = branches.find((b) => b.name.includes("Baie")) || branches[0];
  const depot = branches.find((b) => b.name.includes("Dépôt")) || branches[0];

  // 1. Update suppliers with lead times and franco thresholds
  const fournisseurs = db.prepare("SELECT id, name FROM fournisseurs").all() as Array<{ id: number; name: string }>;
  const updateFourn = db.prepare(`
    UPDATE fournisseurs
    SET delai_livraison_jours = ?, franco_port_ht = ?
    WHERE id = ?
  `);

  let fournSodipralId: number | null = null;
  let fournTotalId: number | null = null;
  let fournBoschId: number | null = null;

  for (const f of fournisseurs) {
    const n = f.name.toUpperCase();
    if (n.includes("SODIPRAL") || n.includes("CENTRALE") || n.includes("COCA")) {
      updateFourn.run(2, 1500, f.id);
      fournSodipralId = f.id;
    } else if (n.includes("TOTAL") || n.includes("AFRIQUIA") || n.includes("SHELL")) {
      updateFourn.run(3, 8000, f.id);
      fournTotalId = f.id;
    } else if (n.includes("BOSCH") || n.includes("AUTO") || n.includes("PIECE")) {
      updateFourn.run(5, 3500, f.id);
      fournBoschId = f.id;
    } else {
      updateFourn.run(4, 2000, f.id);
    }
  }

  // Fallback supplier IDs
  if (!fournSodipralId && fournisseurs.length > 0) fournSodipralId = fournisseurs[0].id;
  if (!fournTotalId && fournisseurs.length > 0) fournTotalId = fournisseurs[0].id;
  if (!fournBoschId && fournisseurs.length > 0) fournBoschId = fournisseurs[0].id;

  // 2. Create structured WMS rack locations for boutique and main warehouses
  const insertEmp = db.prepare(`
    INSERT INTO emplacements (
      company_id, branch_id, zone, allee, travee, niveau, bac, code_emplacement,
      type_emplacement, capacite_max_volume, active, notes
    ) VALUES (
      1, ?, ?, ?, ?, ?, ?, ?,
      ?, 100, 1, ?
    )
  `);

  const createdLocations: Record<string, number> = {};

  const locationsConfig = [
    // Zone A - Frais & Boissons (Boutique)
    { branchId: boutique.id, zone: "Zone A - Frais & Boissons", allee: "01", travee: "01", niveau: 1, bac: "A", type: "picking", notes: "Rayon Frais bas - Eau et sodas" },
    { branchId: boutique.id, zone: "Zone A - Frais & Boissons", allee: "01", travee: "01", niveau: 1, bac: "B", type: "picking", notes: "Rayon Frais bas - Boissons gazeuses" },
    { branchId: boutique.id, zone: "Zone A - Frais & Boissons", allee: "01", travee: "02", niveau: 1, bac: "A", type: "picking", notes: "Vitrines Réfrigérées - Viennoiserie" },
    { branchId: boutique.id, zone: "Zone A - Frais & Boissons", allee: "01", travee: "02", niveau: 1, bac: "B", type: "picking", notes: "Vitrines Réfrigérées - Sandwiches" },
    { branchId: boutique.id, zone: "Zone A - Frais & Boissons", allee: "01", travee: "03", niveau: 2, bac: "A", type: "reserve", notes: "Chambre Froide Réserve" },

    // Zone B - Épicerie & Café (Boutique)
    { branchId: boutique.id, zone: "Zone B - Épicerie & Snacks", allee: "02", travee: "01", niveau: 1, bac: "A", type: "picking", notes: "Rayon Café & Thés" },
    { branchId: boutique.id, zone: "Zone B - Épicerie & Snacks", allee: "02", travee: "01", niveau: 2, bac: "A", type: "picking", notes: "Rayon Biscuits & Chocolats" },

    // Zone C - Lubrifiants & Huiles (Baie d'Entretien)
    { branchId: baie.id, zone: "Zone C - Lubrifiants & Huiles", allee: "01", travee: "01", niveau: 1, bac: "A", type: "picking", notes: "Rack Sol - Bidons Huile 5L" },
    { branchId: baie.id, zone: "Zone C - Lubrifiants & Huiles", allee: "01", travee: "01", niveau: 2, bac: "A", type: "picking", notes: "Rack Milieu - Flacons additifs 1L" },
    { branchId: baie.id, zone: "Zone C - Lubrifiants & Huiles", allee: "01", travee: "02", niveau: 1, bac: "A", type: "reserve", notes: "Fûts 208L réserve lubrifiants" },

    // Zone D - Batteries & Outillage (Baie d'Entretien)
    { branchId: baie.id, zone: "Zone D - Batteries & Équipements", allee: "02", travee: "01", niveau: 1, bac: "A", type: "picking", notes: "Palette renforcée - Batteries 70Ah" },
    { branchId: baie.id, zone: "Zone D - Batteries & Équipements", allee: "02", travee: "02", niveau: 1, bac: "A", type: "picking", notes: "Étagère outillage compresseurs" },
    { branchId: baie.id, zone: "Zone D - Batteries & Équipements", allee: "02", travee: "02", niveau: 2, bac: "A", type: "picking", notes: "Étagère pompes transfert 12V" },

    // Zone E - Matériaux BTP (Dépôt)
    { branchId: depot.id, zone: "Zone E - Matériaux BTP", allee: "01", travee: "01", niveau: 1, bac: "A", type: "picking", notes: "Hangar stockage ciment CPJ 45" },
    { branchId: depot.id, zone: "Zone E - Matériaux BTP", allee: "01", travee: "02", niveau: 1, bac: "reserve", type: "reserve", notes: "Parc extérieur gravats et sable" },
  ];

  for (const loc of locationsConfig) {
    const code = `${loc.zone.slice(5, 6)}-${loc.allee}-${loc.travee}-${loc.niveau}-${loc.bac}`;
    const res = insertEmp.run(
      loc.branchId,
      loc.zone,
      loc.allee,
      loc.travee,
      loc.niveau,
      loc.bac,
      code,
      loc.type,
      loc.notes
    );
    createdLocations[code] = Number(res.lastInsertRowid);
  }

  // 3. Assign products to their primary picking rack and set replenishment thresholds
  const allProds = db.prepare("SELECT id, ref, designation FROM produits").all() as Array<{
    id: number;
    ref: string;
    designation: string;
  }>;

  const insertProdEmp = db.prepare(`
    INSERT INTO produit_emplacements (
      company_id, branch_id, produit_id, emplacement_id, is_principal,
      quantite_stockee, seuil_reassort_picking
    ) VALUES (
      1, ?, ?, ?, 1,
      ?, 10
    )
    ON CONFLICT(branch_id, produit_id, emplacement_id) DO UPDATE SET
      quantite_stockee = excluded.quantite_stockee
  `);

  const updateProdReappro = db.prepare(`
    UPDATE produits
    SET stock_minimum = @min,
        stock_maximum = @max,
        delai_livraison_jours = @delai,
        fournisseur_principal_id = @fournId,
        conditionnement_achat = @colis,
        emplacement_code = @code
    WHERE id = @id
  `);

  const productAssignments: Array<{
    refPrefix: string;
    branchId: number;
    empCode: string;
    min: number;
    max: number;
    delai: number;
    fournId: number | null;
    colis: number;
    stock: number;
  }> = [
    { refPrefix: "EAU-SIDI", branchId: boutique.id, empCode: "A-01-01-1-A", min: 30, max: 200, delai: 2, fournId: fournSodipralId, colis: 12, stock: 45 },
    { refPrefix: "COCA-33CL", branchId: boutique.id, empCode: "A-01-01-1-B", min: 24, max: 180, delai: 2, fournId: fournSodipralId, colis: 24, stock: 24 },
    { refPrefix: "CROISSANT", branchId: boutique.id, empCode: "A-01-02-1-A", min: 10, max: 50, delai: 1, fournId: fournSodipralId, colis: 10, stock: 15 },
    { refPrefix: "SANDWICH", branchId: boutique.id, empCode: "A-01-02-1-B", min: 5, max: 30, delai: 1, fournId: fournSodipralId, colis: 5, stock: 4 },
    { refPrefix: "CAFE-ILLY", branchId: boutique.id, empCode: "B-02-01-1-A", min: 8, max: 40, delai: 3, fournId: fournSodipralId, colis: 6, stock: 12 },
    { refPrefix: "HUILE", branchId: baie.id, empCode: "C-01-01-1-A", min: 15, max: 90, delai: 3, fournId: fournTotalId, colis: 6, stock: 20 },
    { refPrefix: "BAT-BOSCH", branchId: baie.id, empCode: "D-02-01-1-A", min: 4, max: 25, delai: 5, fournId: fournBoschId, colis: 1, stock: 6 },
    { refPrefix: "COMP-MICH", branchId: baie.id, empCode: "D-02-02-1-A", min: 2, max: 10, delai: 7, fournId: fournBoschId, colis: 1, stock: 3 },
    { refPrefix: "POMPE-PIUSI", branchId: baie.id, empCode: "D-02-02-2-A", min: 2, max: 8, delai: 7, fournId: fournBoschId, colis: 1, stock: 2 },
    { refPrefix: "CIMENT", branchId: depot.id, empCode: "E-01-01-1-A", min: 50, max: 500, delai: 2, fournId: fournTotalId, colis: 50, stock: 80 },
  ];

  for (const assign of productAssignments) {
    const prod = allProds.find((p) => p.ref.startsWith(assign.refPrefix));
    const empId = createdLocations[assign.empCode];
    if (prod && empId) {
      insertProdEmp.run(assign.branchId, prod.id, empId, assign.stock);
      updateProdReappro.run({
        id: prod.id,
        min: assign.min,
        max: assign.max,
        delai: assign.delai,
        fournId: assign.fournId,
        colis: assign.colis,
        code: assign.empCode,
      });
    }
  }
}

function initializeDatabase() {
  ensureDataDirectories();
  const isNewDatabase = !fs.existsSync(DB_PATH);
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(fs.readFileSync(SCHEMA_PATH, "utf8"));
  migrateDatabase(db);
  const superadminId = syncSuperadminUser(db);
  seedIfNeeded(db, superadminId);
  applyProductBatchV2(db, superadminId);
  applyFullProductSeedIfMissing(db, superadminId);
  seedSubscriptionsIfEmpty(db, superadminId);
  seedPortalClientAccessIfMissing(db);
  seedBankAccountsIfEmpty(db, superadminId);
  seedExchangeRatesIfEmpty(db);
  seedStockDepotsIfEmpty(db, superadminId);
  seedInventairesAndLotsIfEmpty(db, superadminId);
  seedWmsAndReapproIfEmpty(db, superadminId);

  if (!isNewDatabase) {
    backupDatabase(db);
  }

  return db;
}

export function getDb() {
  if (!dbInstance) {
    dbInstance = initializeDatabase();
  }

  return dbInstance;
}
