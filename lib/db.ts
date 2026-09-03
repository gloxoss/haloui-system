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

  ensureColumnExists(db, "chiffre_affaires", "especes", "REAL NOT NULL DEFAULT 0");
  ensureColumnExists(db, "chiffre_affaires", "carte", "REAL NOT NULL DEFAULT 0");
  ensureColumnExists(db, "chiffre_affaires", "cheque", "REAL NOT NULL DEFAULT 0");
  ensureColumnExists(db, "chiffre_affaires", "virement", "REAL NOT NULL DEFAULT 0");
  ensureColumnExists(db, "chiffre_affaires", "preuve_path", "TEXT DEFAULT ''");
  ensureColumnExists(db, "chiffre_affaires", "statut_cloture", "TEXT DEFAULT 'brouillon'");

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
  `);

  ensureColumnExists(db, "documents", "company_id", "INTEGER DEFAULT 1");
  ensureColumnExists(db, "branches", "company_id", "INTEGER DEFAULT 1");
  ensureColumnExists(db, "produits", "company_id", "INTEGER DEFAULT 1");
  ensureColumnExists(db, "chiffre_affaires", "company_id", "INTEGER DEFAULT 1");

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
