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
