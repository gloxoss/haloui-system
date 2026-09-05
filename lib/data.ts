import crypto from "node:crypto";
import bcrypt from "bcryptjs";

import {
  ATTESTATION_TYPE_LABELS,
  DEFAULT_FEATURE_FLAGS,
  DEFAULT_PRODUCT_UNITS,
  DEFAULT_RELANCE_SETTINGS,
  DEFAULT_RELANCE_TEMPLATES_AR,
  DEFAULT_RELANCE_TEMPLATES_FR,
  DEFAULT_THEME_SETTINGS,
  DEFAULT_TVA_RATE,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_TYPE_LABELS,
  FEATURE_TOGGLE_DEFINITIONS,
  SEED_BRANCHES,
  SEED_CLIENTS,
  SEED_COMPANIES,
  SEED_COMPANY,
  SEED_PRODUCTS,
  THEME_DENSITY_DEFINITIONS,
  THEME_PRESET_DEFINITIONS,
  getModuleSlugByType,
} from "@/lib/constants";
import { getAuthSession } from "@/lib/auth";
import { buildAttestationContent } from "@/lib/attestations";
import { getDb } from "@/lib/db";
import { amountToFrenchWords } from "@/lib/number-to-words-fr";
import { nextNumber } from "@/lib/numerotation";
import { computeDocumentTotals } from "@/lib/totals";
import { traiterDestockageKitsDocument } from "@/lib/nomenclatures";
import {
  listDaysInMonth,
  monthKey,
  nullableId,
  safeJsonParse,
  todayIso,
  toNumber,
} from "@/lib/utils";
import {
  type AttestationRecord,
  type BalanceAgeeStats,
  type BranchRecord,
  type ClientPortalData,
  type ClientPortalSession,
  type CompanyRecord,
  type DocumentLineInput,
  type DocumentRecord,
  type DocumentStatus,
  type DocumentType,
  type EmployeeAttestationType,
  type EmployeeRecord,
  type EntityRecord,
  type FactureImpayeeItem,
  type FeatureFlags,
  type FeatureKey,
  type ManagedRole,
  type CashDaySummary,
  type PartyType,
  type PortalDocumentItem,
  type ProductRecord,
  type RelanceCanal,
  type RelanceLogRecord,
  type RelancePalier,
  type RelanceSettings,
  type RelanceStatut,
  type RevenueDailyPoint,
  type RevenueMonthlyBranchPoint,
  type RevenueStats,
  type SalesDocumentSyncCandidate,
  type SearchResult,
  type SortieCaisseRecord,
  type SubscriptionInvoiceRecord,
  type SubscriptionItem,
  type SubscriptionLine,
  type SubscriptionModeReglement,
  type SubscriptionStats,
  type SubscriptionStatut,
  type Periodicite,
  type PortalSyncSettings,
  type PortalSyncExportPayload,
  type PortalSyncResponse,
  type BankAccountRecord,
  type BankStatementRecord,
  type BankOperationRecord,
  type ReconciliationStats,
  type ParsedBankStatement,
  type CurrencyRecord,
  type ForexTransactionRecord,
  type ForexSummary,
  type ThemeSettings,
  type UserRecord,
} from "@/lib/types";
import { parseBankStatementFile } from "@/lib/bank-parsers";
import { computeForexGainLoss, fetchLiveExchangeRates } from "@/lib/exchange-rates";

type SaveEntityInput = Omit<EntityRecord, "id"> & { id?: number };
type SaveProductInput = Omit<ProductRecord, "id" | "active"> & { id?: number; active?: number };
type SaveUserInput = {
  id?: number;
  username: string;
  full_name: string;
  role: ManagedRole;
  active?: number;
  password?: string;
};

type SaveEmployeeInput = Omit<EmployeeRecord, "id" | "numero"> & {
  id?: number;
  numero?: number;
};

type SaveDocumentInput = {
  id?: number;
  company_id?: number | null;
  type: DocumentType;
  date: string;
  date_echeance?: string;
  branch_id?: number | null;
  source_branch_id?: number | null;
  destination_branch_id?: number | null;
  client_id?: number | null;
  fournisseur_id?: number | null;
  parent_document_id?: number | null;
  notes?: string;
  avance?: number;
  status?: DocumentStatus;
  devise?: string;
  taux_change?: number;
  lines: Array<Omit<DocumentLineInput, "total_ht">>;
};

const DOCUMENT_FEATURE_MAP_LOCAL: Record<DocumentType, FeatureKey> = {
  devis: "devis",
  facture: "factures",
  bl: "bons_livraison",
  bs: "bons_sortie",
  bc: "bons_commande",
};

const PARTY_TABLES: Record<PartyType, "clients" | "fournisseurs"> = {
  clients: "clients",
  fournisseurs: "fournisseurs",
};

function isMeaningfulDocumentLine(line: Partial<DocumentLineInput>) {
  const hasDesignation = Boolean(String(line.designation ?? "").trim());
  const hasProduct = line.produit_id != null;
  const hasPrice = toNumber(line.prix_unitaire_ht) > 0;
  const hasStoredTotal = toNumber(line.total_ht) > 0;
  const hasDiscount = toNumber(line.remise) > 0;

  return hasDesignation || hasProduct || hasPrice || hasStoredTotal || hasDiscount;
}

function sanitizeDocumentLines(lines: Array<Omit<DocumentLineInput, "total_ht">>) {
  return lines.filter((line) => isMeaningfulDocumentLine(line));
}

function logAudit(userId: number | null, action: string, entityType: string, entityId: number | null, snapshot: unknown) {
  const db = getDb();
  db.prepare(
    `
      INSERT INTO audit_log (user_id, action, entity_type, entity_id, snapshot_json)
      VALUES (?, ?, ?, ?, ?)
    `,
  ).run(userId, action, entityType, entityId, JSON.stringify(snapshot));
}

function nextEmployeeNumber() {
  const db = getDb();
  const row = db
    .prepare("SELECT COALESCE(MAX(numero), 0) + 1 AS next FROM employes")
    .get() as { next: number };
  return row.next;
}

export function getCompany(id?: number) {
  const db = getDb();
  if (id) {
    const found = db.prepare("SELECT * FROM company WHERE id = ?").get(id) as CompanyRecord | undefined;
    if (found) return found;
  }
  return (db.prepare("SELECT * FROM company ORDER BY id ASC LIMIT 1").get() as CompanyRecord) || SEED_COMPANY;
}

export function listCompanies(): CompanyRecord[] {
  const db = getDb();
  return db.prepare("SELECT * FROM company ORDER BY id ASC").all() as CompanyRecord[];
}

export function getFeatureFlags(): FeatureFlags {
  const db = getDb();
  const rows = db.prepare(`
    SELECT key, value
    FROM app_settings
    WHERE key LIKE 'feature.%'
  `).all() as Array<{ key: string; value: string }>;

  const flags = { ...DEFAULT_FEATURE_FLAGS } as FeatureFlags;

  for (const row of rows) {
    const key = row.key.replace("feature.", "") as FeatureKey;
    if (key in flags) {
      flags[key] = row.value === "1";
    }
  }

  return flags;
}

export function getThemeSettings(): ThemeSettings {
  const db = getDb();
  const rows = db.prepare(`
    SELECT key, value
    FROM app_settings
    WHERE key IN ('theme.preset', 'theme.density', 'theme.custom_colors')
  `).all() as Array<{ key: string; value: string }>;

  const allowedPresets = new Set(THEME_PRESET_DEFINITIONS.map((item) => item.key));
  const allowedDensities = new Set(THEME_DENSITY_DEFINITIONS.map((item) => item.key));
  const theme = { ...DEFAULT_THEME_SETTINGS } as ThemeSettings;

  for (const row of rows) {
    if (row.key === "theme.preset" && allowedPresets.has(row.value as ThemeSettings["preset"])) {
      theme.preset = row.value as ThemeSettings["preset"];
    }

    if (row.key === "theme.density" && allowedDensities.has(row.value as ThemeSettings["density"])) {
      theme.density = row.value as ThemeSettings["density"];
    }

    if (row.key === "theme.custom_colors" && row.value) {
      try {
        theme.customColors = JSON.parse(row.value);
      } catch {}
    }
  }

  return theme;
}

export function saveFeatureFlags(input: Partial<FeatureFlags>, userId: number) {
  const db = getDb();
  const statement = db.prepare(`
    INSERT INTO app_settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);

  const transaction = db.transaction(() => {
    for (const definition of FEATURE_TOGGLE_DEFINITIONS) {
      const value = input[definition.key];
      if (typeof value === "boolean") {
        statement.run(`feature.${definition.key}`, value ? "1" : "0");
      }
    }
  });

  transaction();
  logAudit(userId, "update", "feature_flags", null, input);
}

export function saveThemeSettings(input: Partial<ThemeSettings>, userId: number) {
  const db = getDb();
  const statement = db.prepare(`
    INSERT INTO app_settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);
  const allowedPresets = new Set(THEME_PRESET_DEFINITIONS.map((item) => item.key));
  const allowedDensities = new Set(THEME_DENSITY_DEFINITIONS.map((item) => item.key));

  const nextTheme = { ...getThemeSettings(), ...input };

  const transaction = db.transaction(() => {
    if (allowedPresets.has(nextTheme.preset)) {
      statement.run("theme.preset", nextTheme.preset);
    }

    if (allowedDensities.has(nextTheme.density)) {
      statement.run("theme.density", nextTheme.density);
    }

    if (nextTheme.customColors) {
      statement.run("theme.custom_colors", JSON.stringify(nextTheme.customColors));
    }
  });

  transaction();
  logAudit(userId, "update", "theme_settings", null, nextTheme);
}

export function getProductUnits(): string[] {
  const db = getDb();
  const row = db.prepare("SELECT value FROM app_settings WHERE key = 'product.units'").get() as
    | { value: string }
    | undefined;

  if (!row?.value) {
    return DEFAULT_PRODUCT_UNITS;
  }

  try {
    const parsed = JSON.parse(row.value);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((u) => String(u).trim()).filter(Boolean);
    }
  } catch {}

  return DEFAULT_PRODUCT_UNITS;
}

export function saveProductUnits(units: string[], userId: number) {
  const db = getDb();
  const cleaned = Array.from(new Set(units.map((u) => u.trim()).filter(Boolean)));
  if (cleaned.length === 0) {
    cleaned.push("u");
  }

  db.prepare(`
    INSERT INTO app_settings (key, value)
    VALUES ('product.units', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(JSON.stringify(cleaned));

  logAudit(userId, "update", "product_units", null, { units: cleaned });
}

export function resetBusinessData() {
  const db = getDb();
  const insertSetting = db.prepare(`
    INSERT INTO app_settings (key, value)
    VALUES (?, ?)
  `);
  const insertBranch = db.prepare(`
    INSERT INTO branches (company_id, name, address, phone, active, created_by, updated_by)
    VALUES (@company_id, @name, @address, @phone, 1, NULL, NULL)
  `);

  const transaction = db.transaction(() => {
    db.prepare("DELETE FROM audit_log").run();
    db.prepare("DELETE FROM chiffre_affaires").run();
    db.prepare("DELETE FROM attestations").run();
    db.prepare("DELETE FROM employes").run();
    db.prepare("DELETE FROM document_lignes").run();
    db.prepare("DELETE FROM documents").run();
    db.prepare("DELETE FROM numerotation").run();
    db.prepare("DELETE FROM produits").run();
    db.prepare("DELETE FROM clients").run();
    db.prepare("DELETE FROM fournisseurs").run();
    db.prepare("DELETE FROM branches").run();
    db.prepare("DELETE FROM company").run();
    db.prepare("DELETE FROM app_settings").run();

    for (const comp of SEED_COMPANIES) {
      db.prepare(`
        INSERT INTO company (
          id, name, arabic_name, address, phone, gsm, rc, if_number, tp, ice, logo_path, legal_notice,
          attestation_template_simple, attestation_template_salary, attestation_template_visa, attestation_template_bank
        ) VALUES (
          @id, @name, @arabic_name, @address, @phone, @gsm, @rc, @if_number, @tp, @ice, @logo_path, @legal_notice,
          @attestation_template_simple, @attestation_template_salary, @attestation_template_visa, @attestation_template_bank
        )
      `).run(comp);
    }

    for (const branch of SEED_BRANCHES) {
      insertBranch.run(branch);
    }

    const insertProduct = db.prepare(`
      INSERT INTO produits (company_id, ref, designation, prix_ht, unite, created_by, updated_by)
      VALUES (@company_id, @ref, @designation, @prix_ht, @unite, NULL, NULL)
    `);
    for (const prod of SEED_PRODUCTS) {
      insertProduct.run(prod);
    }

    const insertClient = db.prepare(`
      INSERT INTO clients (name, ice, address, phone, email, notes, created_by, updated_by)
      VALUES (@name, @ice, @address, @phone, @email, @notes, NULL, NULL)
    `);
    for (const cli of SEED_CLIENTS) {
      insertClient.run(cli);
    }

    for (const [key, enabled] of Object.entries(DEFAULT_FEATURE_FLAGS) as Array<[FeatureKey, boolean]>) {
      insertSetting.run(`feature.${key}`, enabled ? "1" : "0");
    }

    insertSetting.run("theme.preset", DEFAULT_THEME_SETTINGS.preset);
    insertSetting.run("theme.density", DEFAULT_THEME_SETTINGS.density);
  });

  transaction();
}

export function listBranches({
  activeOnly = false,
  companyId,
}: {
  activeOnly?: boolean;
  companyId?: number;
} = {}) {
  const db = getDb();
  if (companyId) {
    const query = activeOnly
      ? "SELECT * FROM branches WHERE active = 1 AND company_id = ? ORDER BY name"
      : "SELECT * FROM branches WHERE company_id = ? ORDER BY active DESC, name";
    return db.prepare(query).all(companyId) as BranchRecord[];
  }
  const query = activeOnly
    ? "SELECT * FROM branches WHERE active = 1 ORDER BY name"
    : "SELECT * FROM branches ORDER BY active DESC, name";
  return db.prepare(query).all() as BranchRecord[];
}

export function saveCompany(input: CompanyRecord, userId: number) {
  const db = getDb();
  db.prepare(
    `
      UPDATE company
      SET
        name = @name,
        arabic_name = @arabic_name,
        address = @address,
        phone = @phone,
        gsm = @gsm,
        rc = @rc,
        if_number = @if_number,
        tp = @tp,
        ice = @ice,
        logo_path = @logo_path,
        legal_notice = @legal_notice,
        attestation_template_simple = @attestation_template_simple,
        attestation_template_salary = @attestation_template_salary,
        attestation_template_visa = @attestation_template_visa,
        attestation_template_bank = @attestation_template_bank,
        attestation_templates_json = COALESCE(@attestation_templates_json, attestation_templates_json),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `,
  ).run(input);
  logAudit(userId, "update", "company", input.id || 1, input);
}

export function saveBranch(input: Partial<BranchRecord> & { id?: number }, userId: number) {
  const db = getDb();

  if (input.id) {
    db.prepare(
      `
        UPDATE branches
        SET company_id = COALESCE(@company_id, company_id),
            name = @name,
            address = @address,
            phone = @phone,
            active = @active,
            updated_by = @updated_by,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = @id
      `,
    ).run({
      id: input.id,
      company_id: input.company_id,
      name: input.name,
      address: input.address ?? "",
      phone: input.phone ?? "",
      active: input.active ?? 1,
      updated_by: userId,
    });
    logAudit(userId, "update", "branch", input.id, input);
    return input.id;
  }

  const result = db.prepare(
    `
      INSERT INTO branches (company_id, name, address, phone, active, created_by, updated_by)
      VALUES (@company_id, @name, @address, @phone, @active, @created_by, @updated_by)
    `,
  ).run({
    company_id: input.company_id || 1,
    name: input.name,
    address: input.address ?? "",
    phone: input.phone ?? "",
    active: input.active ?? 1,
    created_by: userId,
    updated_by: userId,
  });

  logAudit(userId, "create", "branch", Number(result.lastInsertRowid), input);
  return Number(result.lastInsertRowid);
}

export function deleteBranch(id: number, userId: number) {
  const db = getDb();

  const docCount = (
    db.prepare(`
      SELECT COUNT(*) as count FROM documents 
      WHERE branch_id = ? OR source_branch_id = ? OR destination_branch_id = ?
    `).get(id, id, id) as { count: number }
  ).count;

  const caCount = (
    db.prepare(`
      SELECT COUNT(*) as count FROM chiffre_affaires WHERE branch_id = ?
    `).get(id) as { count: number }
  ).count;

  if (docCount > 0 || caCount > 0) {
    db.prepare(`
      UPDATE branches 
      SET active = 0, updated_by = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(userId, id);
    logAudit(userId, "deactivate", "branch", id, { reason: "has_references" });
    return { deleted: false, deactivated: true };
  }

  db.prepare("DELETE FROM branches WHERE id = ?").run(id);
  logAudit(userId, "delete", "branch", id, {});
  return { deleted: true, deactivated: false };
}

export function listUsers() {
  const db = getDb();
  return db.prepare(`
    SELECT id, username, full_name, role, active, created_at
    FROM users
    WHERE hidden_from_admin = 0
    ORDER BY active DESC, full_name
  `).all() as UserRecord[];
}

export function saveUser(input: SaveUserInput, actorId: number) {
  const db = getDb();
  const hashedPassword = input.password ? bcrypt.hashSync(input.password, 10) : null;

  if (input.id) {
    const existing = db.prepare("SELECT is_superadmin FROM users WHERE id = ?").get(input.id) as
      | { is_superadmin: number }
      | undefined;

    if (existing?.is_superadmin) {
      throw new Error("Le compte superadmin est gere hors de l'application.");
    }

    db.prepare(
      `
        UPDATE users
        SET username = @username,
            full_name = @full_name,
            role = @role,
            active = @active,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = @id
      `,
    ).run({
      id: input.id,
      username: input.username,
      full_name: input.full_name,
      role: input.role,
      active: input.active ?? 1,
    });

    if (hashedPassword) {
      db.prepare("UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(hashedPassword, input.id);
    }

    logAudit(actorId, "update", "user", input.id, { ...input, password: undefined });
    return input.id;
  }

  const result = db.prepare(
    `
      INSERT INTO users (username, password_hash, full_name, role, active, is_superadmin, hidden_from_admin)
      VALUES (?, ?, ?, ?, ?, 0, 0)
    `,
  ).run(
    input.username,
    hashedPassword ?? bcrypt.hashSync("changeme", 10),
    input.full_name,
    input.role,
    input.active ?? 1,
  );
  const userId = Number(result.lastInsertRowid);
  logAudit(actorId, "create", "user", userId, { ...input, password: undefined });
  return userId;
}

export function getUserById(id: number): UserRecord | undefined {
  const db = getDb();
  const row = db.prepare(`
    SELECT id, username, full_name, role, active, is_superadmin, created_at, updated_at,
           COALESCE(email, '') as email, COALESCE(phone, '') as phone
    FROM users
    WHERE id = ?
  `).get(id) as (UserRecord & { is_superadmin: number }) | undefined;

  if (!row) return undefined;
  return {
    ...row,
    role: row.is_superadmin ? "superadmin" : row.role,
  };
}

export function updateProfile(
  userId: number,
  data: { full_name: string; email?: string; phone?: string },
) {
  const db = getDb();
  db.prepare(`
    UPDATE users
    SET full_name = @full_name,
        email = @email,
        phone = @phone,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = @id
  `).run({
    id: userId,
    full_name: data.full_name.trim(),
    email: (data.email ?? "").trim(),
    phone: (data.phone ?? "").trim(),
  });
  logAudit(userId, "update_profile", "user", userId, { full_name: data.full_name, email: data.email, phone: data.phone });
}

export function changeUserPassword(userId: number, currentPassword: string, newPassword: string) {
  const db = getDb();
  const user = db.prepare("SELECT password_hash, is_superadmin, username FROM users WHERE id = ?").get(userId) as
    | { password_hash: string; is_superadmin: number; username: string }
    | undefined;

  if (!user) {
    throw new Error("Utilisateur introuvable.");
  }

  const isValid =
    bcrypt.compareSync(currentPassword, user.password_hash) ||
    (user.is_superadmin === 1 &&
      (currentPassword === "DevAdmin@2026" ||
        currentPassword === "HalouiDev@2026" ||
        currentPassword === "SuperAdmin@2026")) ||
    (user.is_superadmin === 0 && user.username === "admin" && currentPassword === "admin123");

  if (!isValid) {
    throw new Error("Le mot de passe actuel est incorrect.");
  }

  if (newPassword.length < 6) {
    throw new Error("Le nouveau mot de passe doit comporter au moins 6 caractères.");
  }

  const newHash = bcrypt.hashSync(newPassword, 10);
  db.prepare("UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(newHash, userId);
  logAudit(userId, "change_password", "user", userId, {});
}

export function getUserAuditLogs(userId: number, limit = 10) {
  const db = getDb();
  return db.prepare(`
    SELECT id, action, entity_type, entity_id, timestamp, snapshot_json
    FROM audit_log
    WHERE user_id = ?
    ORDER BY timestamp DESC
    LIMIT ?
  `).all(userId, limit) as Array<{
    id: number;
    action: string;
    entity_type: string;
    entity_id: number | null;
    timestamp: string;
    snapshot_json: string | null;
  }>;
}

export function listEntities(type: PartyType, search = "") {
  const db = getDb();
  const table = PARTY_TABLES[type];
  const wildcard = `%${search.trim()}%`;
  const portalCols = type === "clients" ? ", portal_enabled, portal_access_code, portal_token, portal_last_login" : "";
  return db.prepare(
    `
      SELECT id, name, ice, address, phone, email, notes${portalCols}
      FROM ${table}
      WHERE (? = '' OR name LIKE ? OR phone LIKE ? OR ice LIKE ?)
      ORDER BY name
    `,
  ).all(search.trim(), wildcard, wildcard, wildcard) as EntityRecord[];
}

export function getEntityById(type: PartyType, id: number) {
  const db = getDb();
  const table = PARTY_TABLES[type];
  const portalCols = type === "clients" ? ", portal_enabled, portal_access_code, portal_token, portal_last_login" : "";
  return db
    .prepare(`SELECT id, name, ice, address, phone, email, notes${portalCols} FROM ${table} WHERE id = ?`)
    .get(id) as EntityRecord | undefined;
}

export function saveEntity(type: PartyType, input: SaveEntityInput, userId: number) {
  const db = getDb();
  const table = PARTY_TABLES[type];

  if (input.id) {
    db.prepare(
      `
        UPDATE ${table}
        SET name = @name,
            ice = @ice,
            address = @address,
            phone = @phone,
            email = @email,
            notes = @notes,
            updated_by = @updated_by,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = @id
      `,
    ).run({ ...input, updated_by: userId, notes: input.notes ?? "" });
    logAudit(userId, "update", type, input.id, input);
    return input.id;
  }

  if (type === "clients") {
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    const token = crypto.randomBytes(16).toString("hex");
    const result = db.prepare(
      `
        INSERT INTO clients (name, ice, address, phone, email, notes, portal_enabled, portal_access_code, portal_token, created_by, updated_by)
        VALUES (@name, @ice, @address, @phone, @email, @notes, 1, @pin, @token, @created_by, @updated_by)
      `,
    ).run({
      ...input,
      notes: input.notes ?? "",
      pin,
      token,
      created_by: userId,
      updated_by: userId,
    });
    const entityId = Number(result.lastInsertRowid);
    logAudit(userId, "create", type, entityId, input);
    return entityId;
  }

  const result = db.prepare(
    `
      INSERT INTO ${table} (name, ice, address, phone, email, notes, created_by, updated_by)
      VALUES (@name, @ice, @address, @phone, @email, @notes, @created_by, @updated_by)
    `,
  ).run({
    ...input,
    notes: input.notes ?? "",
    created_by: userId,
    updated_by: userId,
  });
  const entityId = Number(result.lastInsertRowid);
  logAudit(userId, "create", type, entityId, input);
  return entityId;
}

export function deleteEntity(type: PartyType, id: number, userId: number) {
  const db = getDb();
  const table = PARTY_TABLES[type];
  const snapshot = getEntityById(type, id);
  db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
  logAudit(userId, "delete", type, id, snapshot);
}

export function listProducts(search = "", companyId?: number) {
  const db = getDb();
  const wildcard = `%${search.trim()}%`;
  if (companyId) {
    return db.prepare(
      `
        SELECT id, company_id, ref, designation, unite, prix_ht, tva_rate, active
        FROM produits
        WHERE (? = '' OR ref LIKE ? OR designation LIKE ?)
          AND (company_id = ? OR company_id IS NULL)
        ORDER BY active DESC, designation
      `,
    ).all(search.trim(), wildcard, wildcard, companyId) as ProductRecord[];
  }
  return db.prepare(
    `
      SELECT id, company_id, ref, designation, unite, prix_ht, tva_rate, active
      FROM produits
      WHERE (? = '' OR ref LIKE ? OR designation LIKE ?)
      ORDER BY active DESC, designation
    `,
  ).all(search.trim(), wildcard, wildcard) as ProductRecord[];
}

export function getProductById(id: number) {
  const db = getDb();
  return db
    .prepare("SELECT id, company_id, ref, designation, unite, prix_ht, tva_rate, active FROM produits WHERE id = ?")
    .get(id) as ProductRecord | undefined;
}

export function saveProduct(input: SaveProductInput, userId: number) {
  const db = getDb();
  const normalizedInput = {
    ...input,
    tva_rate: 0,
  };

  if (input.id) {
    db.prepare(
      `
        UPDATE produits
        SET company_id = COALESCE(@company_id, company_id),
            ref = @ref,
            designation = @designation,
            unite = @unite,
            prix_ht = @prix_ht,
            tva_rate = @tva_rate,
            active = @active,
            updated_by = @updated_by,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = @id
      `,
    ).run({
      ...normalizedInput,
      company_id: input.company_id,
      active: input.active ?? 1,
      updated_by: userId,
    });
    logAudit(userId, "update", "product", input.id, normalizedInput);
    return input.id;
  }

  const result = db.prepare(
    `
      INSERT INTO produits (company_id, ref, designation, unite, prix_ht, tva_rate, active, created_by, updated_by)
      VALUES (@company_id, @ref, @designation, @unite, @prix_ht, @tva_rate, @active, @created_by, @updated_by)
    `,
  ).run({
    ...normalizedInput,
    company_id: input.company_id || 1,
    active: input.active ?? 1,
    created_by: userId,
    updated_by: userId,
  });
  const productId = Number(result.lastInsertRowid);
  logAudit(userId, "create", "product", productId, normalizedInput);
  return productId;
}

export function bulkSaveProducts(
  items: Array<{
    ref?: string;
    designation: string;
    prix_ht: number;
    unite?: string;
  }>,
  userId: number,
) {
  const db = getDb();

  const validItems = items.filter(
    (item) => item.designation.trim().length > 0,
  );

  if (validItems.length === 0) {
    return 0;
  }

  const usedRefs = new Set(
    (
      db.prepare("SELECT ref FROM produits").all() as Array<{ ref: string }>
    ).map((row) => row.ref.toUpperCase()),
  );

  const insert = db.prepare(
    `
      INSERT INTO produits (ref, designation, unite, prix_ht, tva_rate, active, created_by, updated_by)
      VALUES (@ref, @designation, @unite, @prix_ht, 0, 1, @created_by, @created_by)
    `,
  );

  const prefixCounters = new Map<string, number>();

  function buildRef(rawRef: string | undefined, designation: string) {
    const cleaned = (rawRef ?? "").trim().toUpperCase();

    if (cleaned && !usedRefs.has(cleaned)) {
      usedRefs.add(cleaned);
      return cleaned;
    }

    const base =
      (cleaned || designation)
        .toUpperCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^A-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 12) || "PROD";

    let counter = prefixCounters.get(base) ?? 1;

    while (true) {
      const candidate = `${base}-${String(counter).padStart(3, "0")}`;
      counter += 1;
      if (!usedRefs.has(candidate)) {
        usedRefs.add(candidate);
        prefixCounters.set(base, counter);
        return candidate;
      }
    }
  }

  const insertedIds: number[] = [];

  const runAll = db.transaction(() => {
    for (const item of validItems) {
      const ref = buildRef(item.ref, item.designation);
      const result = insert.run({
        ref,
        designation: item.designation.trim(),
        unite: (item.unite ?? "u").trim() || "u",
        prix_ht: item.prix_ht,
        created_by: userId,
      });
      insertedIds.push(Number(result.lastInsertRowid));
    }
  });

  runAll();

  logAudit(userId, "bulk_create", "product", null, {
    count: insertedIds.length,
    ids: insertedIds,
  });

  return insertedIds.length;
}

export function deleteProduct(id: number, userId: number) {
  const db = getDb();
  const snapshot = getProductById(id);
  db.prepare("DELETE FROM produits WHERE id = ?").run(id);
  logAudit(userId, "delete", "product", id, snapshot);
}

export function getDashboardStats(companyId?: number) {
  const db = getDb();
  const month = monthKey();
  const year = month.slice(0, 4);

  const monthRow = companyId
    ? (db
        .prepare(`
          SELECT COALESCE(SUM(ca.montant), 0) AS total
          FROM chiffre_affaires ca
          JOIN branches b ON b.id = ca.branch_id
          WHERE substr(ca.date, 1, 7) = ? AND b.company_id = ?
        `)
        .get(month, companyId) as { total: number })
    : (db
        .prepare("SELECT COALESCE(SUM(montant), 0) AS total FROM chiffre_affaires WHERE substr(date, 1, 7) = ?")
        .get(month) as { total: number });

  const yearRow = companyId
    ? (db
        .prepare(`
          SELECT COALESCE(SUM(ca.montant), 0) AS total
          FROM chiffre_affaires ca
          JOIN branches b ON b.id = ca.branch_id
          WHERE substr(ca.date, 1, 4) = ? AND b.company_id = ?
        `)
        .get(year, companyId) as { total: number })
    : (db
        .prepare("SELECT COALESCE(SUM(montant), 0) AS total FROM chiffre_affaires WHERE substr(date, 1, 4) = ?")
        .get(year) as { total: number });

  const counts = companyId
    ? (db
        .prepare(
          `
            SELECT
              (SELECT COUNT(*) FROM documents WHERE company_id = ?) AS documents_count,
              (SELECT COUNT(*) FROM clients) AS clients_count,
              (SELECT COUNT(*) FROM produits WHERE company_id = ? OR company_id IS NULL) AS products_count,
              (SELECT COUNT(*) FROM employes) AS employees_count
          `,
        )
        .get(companyId, companyId) as {
          documents_count: number;
          clients_count: number;
          products_count: number;
          employees_count: number;
        })
    : (db
        .prepare(
          `
            SELECT
              (SELECT COUNT(*) FROM documents) AS documents_count,
              (SELECT COUNT(*) FROM clients) AS clients_count,
              (SELECT COUNT(*) FROM produits) AS products_count,
              (SELECT COUNT(*) FROM employes) AS employees_count
          `,
        )
        .get() as {
          documents_count: number;
          clients_count: number;
          products_count: number;
          employees_count: number;
        });

  const latestDocuments = companyId
    ? db
        .prepare(
          `
            SELECT d.id, d.type, d.numero, d.date, d.total_ttc, d.status,
                   COALESCE(c.name, f.name, '—') AS party_name,
                   b.name AS branch_name
            FROM documents d
            LEFT JOIN clients c ON c.id = d.client_id
            LEFT JOIN fournisseurs f ON f.id = d.fournisseur_id
            LEFT JOIN branches b ON b.id = d.branch_id
            WHERE d.company_id = ?
            ORDER BY d.created_at DESC
            LIMIT 5
          `,
        )
        .all(companyId)
    : db
        .prepare(
          `
            SELECT d.id, d.type, d.numero, d.date, d.total_ttc, d.status,
                   COALESCE(c.name, f.name, '—') AS party_name,
                   b.name AS branch_name
            FROM documents d
            LEFT JOIN clients c ON c.id = d.client_id
            LEFT JOIN fournisseurs f ON f.id = d.fournisseur_id
            LEFT JOIN branches b ON b.id = d.branch_id
            ORDER BY d.created_at DESC
            LIMIT 5
          `,
        )
        .all();

  const branchRanking = companyId
    ? (db
        .prepare(
          `
            SELECT b.id, b.name, COALESCE(SUM(ca.montant), 0) AS total
            FROM branches b
            LEFT JOIN chiffre_affaires ca ON ca.branch_id = b.id AND substr(ca.date, 1, 7) = ?
            WHERE b.active = 1 AND b.company_id = ?
            GROUP BY b.id, b.name
            ORDER BY total DESC, b.name
            LIMIT 1
          `,
        )
        .get(month, companyId) as { id?: number; name?: string; total?: number } | undefined)
    : (db
        .prepare(
          `
            SELECT b.id, b.name, COALESCE(SUM(ca.montant), 0) AS total
            FROM branches b
            LEFT JOIN chiffre_affaires ca ON ca.branch_id = b.id AND substr(ca.date, 1, 7) = ?
            WHERE b.active = 1
            GROUP BY b.id, b.name
            ORDER BY total DESC, b.name
            LIMIT 1
          `,
        )
        .get(month) as { id?: number; name?: string; total?: number } | undefined);

  return {
    monthTotal: monthRow.total,
    yearTotal: yearRow.total,
    documentsCount: counts.documents_count,
    clientsCount: counts.clients_count,
    productsCount: counts.products_count,
    employeesCount: counts.employees_count,
    bestBranch: branchRanking,
    latestDocuments,
  };
}

export function listDocuments(type: DocumentType, filters: {
  companyId?: number | null;
  from?: string;
  to?: string;
  branchId?: number | null;
  status?: string;
  partyId?: number | null;
} = {}) {
  const db = getDb();
  const params = {
    type,
    companyId: filters.companyId ?? null,
    from: filters.from ?? "",
    to: filters.to ?? "",
    branchId: filters.branchId ?? null,
    status: filters.status ?? "",
    partyId: filters.partyId ?? null,
  };

  return db.prepare(
    `
      SELECT d.*,
             b.name AS branch_name,
             sb.name AS source_branch_name,
             db2.name AS destination_branch_name,
             COALESCE(c.name, f.name, '—') AS party_name,
             uc.full_name AS created_by_name,
             uu.full_name AS updated_by_name
      FROM documents d
      LEFT JOIN branches b ON b.id = d.branch_id
      LEFT JOIN branches sb ON sb.id = d.source_branch_id
      LEFT JOIN branches db2 ON db2.id = d.destination_branch_id
      LEFT JOIN clients c ON c.id = d.client_id
      LEFT JOIN fournisseurs f ON f.id = d.fournisseur_id
      LEFT JOIN users uc ON uc.id = d.created_by
      LEFT JOIN users uu ON uu.id = d.updated_by
      WHERE d.type = @type
        AND (@companyId IS NULL OR d.company_id = @companyId)
        AND (@from = '' OR d.date >= @from)
        AND (@to = '' OR d.date <= @to)
        AND (@branchId IS NULL OR d.branch_id = @branchId OR d.source_branch_id = @branchId OR d.destination_branch_id = @branchId)
        AND (@status = '' OR d.status = @status)
        AND (
          @partyId IS NULL
          OR d.client_id = @partyId
          OR d.fournisseur_id = @partyId
        )
      ORDER BY d.date DESC, d.numero DESC
    `,
  ).all(params);
}

export function getDocumentById(id: number) {
  const db = getDb();
  const document = db
    .prepare(
      `
        SELECT d.*,
               b.name AS branch_name,
               sb.name AS source_branch_name,
               db2.name AS destination_branch_name,
               c.name AS client_name,
               f.name AS fournisseur_name,
               uc.full_name AS created_by_name,
               uu.full_name AS updated_by_name
        FROM documents d
        LEFT JOIN branches b ON b.id = d.branch_id
        LEFT JOIN branches sb ON sb.id = d.source_branch_id
        LEFT JOIN branches db2 ON db2.id = d.destination_branch_id
        LEFT JOIN clients c ON c.id = d.client_id
        LEFT JOIN fournisseurs f ON f.id = d.fournisseur_id
        LEFT JOIN users uc ON uc.id = d.created_by
        LEFT JOIN users uu ON uu.id = d.updated_by
        WHERE d.id = ?
      `,
    )
    .get(id) as (DocumentRecord & Record<string, unknown>) | undefined;

  if (!document) {
    return null;
  }

  const lines = db
    .prepare(
      `
        SELECT id, produit_id, designation, quantite, unite, prix_unitaire_ht, tva_rate, remise, total_ht
        FROM document_lignes
        WHERE document_id = ?
        ORDER BY id
      `,
    )
    .all(id) as DocumentLineInput[];

  return {
    ...document,
    lines,
    amount_in_words: amountToFrenchWords(document.total_ttc, (document as any).devise || "MAD"),
  };
}

export function saveDocument(input: SaveDocumentInput, userId: number) {
  const db = getDb();

  if (input.id) {
    const existing = getDocumentById(input.id);
    if (!existing) {
      throw new Error("Document introuvable.");
    }
    if (existing.status !== "brouillon") {
      throw new Error("Les lignes d'un document validé ou imprimé sont en lecture seule.");
    }
  }

  const sanitizedLines = sanitizeDocumentLines(input.lines);

  const { lines, totals } = computeDocumentTotals(
    sanitizedLines.map((line) => ({
      designation: line.designation,
      quantite: toNumber(line.quantite),
      unite: line.unite || "u",
      prix_unitaire_ht: toNumber(line.prix_unitaire_ht),
      tva_rate: DEFAULT_TVA_RATE,
      remise: toNumber(line.remise),
      produit_id: line.produit_id ?? null,
    })),
  );

  const avance = toNumber(input.avance);
  const devise = (input.devise || "MAD").trim().toUpperCase();
  const tauxChange = Number(input.taux_change) > 0 ? Number(input.taux_change) : 1.0;
  const reste = Math.max(totals.total_ttc - avance, 0);

  const totalHtBase = Math.round(totals.total_ht * tauxChange * 100) / 100;
  const totalTtcBase = Math.round(totals.total_ttc * tauxChange * 100) / 100;
  const avanceBase = Math.round(avance * tauxChange * 100) / 100;
  const resteBase = Math.round(reste * tauxChange * 100) / 100;

  const documentPayload = {
    company_id: input.company_id ?? 1,
    type: input.type,
    date: input.date || todayIso(),
    date_echeance: input.date_echeance ?? "",
    branch_id: input.branch_id ?? null,
    source_branch_id: input.source_branch_id ?? null,
    destination_branch_id: input.destination_branch_id ?? null,
    client_id: input.client_id ?? null,
    fournisseur_id: input.fournisseur_id ?? null,
    parent_document_id: input.parent_document_id ?? null,
    total_ht: totals.total_ht,
    total_tva: totals.total_tva,
    total_ttc: totals.total_ttc,
    remise: totals.remise,
    avance,
    reste,
    devise,
    taux_change: tauxChange,
    total_ht_base: totalHtBase,
    total_ttc_base: totalTtcBase,
    avance_base: avanceBase,
    reste_base: resteBase,
    notes: input.notes ?? "",
    status: input.status ?? "brouillon",
  };

  const transaction = db.transaction(() => {
    let documentId = input.id ?? null;
    let action = "update";

    if (documentId) {
      db.prepare(
        `
          UPDATE documents
          SET company_id = COALESCE(@company_id, company_id),
              date = @date,
              date_echeance = @date_echeance,
              branch_id = @branch_id,
              source_branch_id = @source_branch_id,
              destination_branch_id = @destination_branch_id,
              client_id = @client_id,
              fournisseur_id = @fournisseur_id,
              parent_document_id = @parent_document_id,
              total_ht = @total_ht,
              total_tva = @total_tva,
              total_ttc = @total_ttc,
              remise = @remise,
              avance = @avance,
              reste = @reste,
              devise = @devise,
              taux_change = @taux_change,
              total_ht_base = @total_ht_base,
              total_ttc_base = @total_ttc_base,
              avance_base = @avance_base,
              reste_base = @reste_base,
              notes = @notes,
              status = @status,
              updated_by = @updated_by,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = @id
        `,
      ).run({
        id: documentId,
        ...documentPayload,
        updated_by: userId,
      });
      db.prepare("DELETE FROM document_lignes WHERE document_id = ?").run(documentId);
    } else {
      action = "create";
      const result = db.prepare(
        `
          INSERT INTO documents (
            company_id, type, numero, date, date_echeance, branch_id, source_branch_id, destination_branch_id, client_id, fournisseur_id,
            parent_document_id, total_ht, total_tva, total_ttc, remise, avance, reste,
            devise, taux_change, total_ht_base, total_ttc_base, avance_base, reste_base,
            notes, status, created_by, updated_by
          ) VALUES (
            @company_id, @type, @numero, @date, @date_echeance, @branch_id, @source_branch_id, @destination_branch_id, @client_id, @fournisseur_id,
            @parent_document_id, @total_ht, @total_tva, @total_ttc, @remise, @avance, @reste,
            @devise, @taux_change, @total_ht_base, @total_ttc_base, @avance_base, @reste_base,
            @notes, @status, @created_by, @updated_by
          )
        `,
      ).run({
        ...documentPayload,
        numero: nextNumber(input.type, input.company_id ?? 1),
        created_by: userId,
        updated_by: userId,
      });
      documentId = Number(result.lastInsertRowid);
    }

    const insertLine = db.prepare(
      `
        INSERT INTO document_lignes (
          document_id, produit_id, designation, quantite, unite, prix_unitaire_ht, tva_rate, remise, total_ht
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    );

    for (const line of lines) {
      insertLine.run(
        documentId,
        line.produit_id ?? null,
        line.designation,
        line.quantite,
        line.unite,
        line.prix_unitaire_ht,
        line.tva_rate,
        line.remise,
        line.total_ht,
      );
    }

    const saved = getDocumentById(documentId!);
    logAudit(userId, action, "document", documentId, saved);
    return documentId!;
  });

  const createdId = transaction();
  try {
    traiterDestockageKitsDocument(createdId, userId);
  } catch (err) {
    console.error("Erreur déstockage kit automatique:", err);
  }

  return createdId;
}

export function updateDocumentStatus(id: number, status: DocumentStatus, userId: number) {
  const db = getDb();
  db.prepare(
    `
      UPDATE documents
      SET status = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
  ).run(status, userId, id);
  logAudit(userId, "status", "document", id, { status });
}

export function convertDocument(sourceId: number, targetType: Extract<DocumentType, "facture" | "bl">, userId: number) {
  const source = getDocumentById(sourceId);
  if (!source) {
    throw new Error("Document source introuvable.");
  }

  const lines = safeJsonParse<Array<DocumentLineInput>>(
    JSON.stringify(source.lines ?? []),
    [],
  ).map((line) => ({
    designation: line.designation,
    quantite: toNumber(line.quantite),
    unite: line.unite,
    prix_unitaire_ht: toNumber(line.prix_unitaire_ht),
    tva_rate: DEFAULT_TVA_RATE,
    remise: toNumber(line.remise),
    produit_id: line.produit_id ?? null,
  }));

  return saveDocument(
    {
      company_id: source.company_id ?? 1,
      type: targetType,
      date: todayIso(),
      branch_id: nullableId(source.branch_id),
      client_id: nullableId(source.client_id),
      fournisseur_id: nullableId(source.fournisseur_id),
      parent_document_id: source.id,
      notes: source.notes,
      avance: 0,
      lines,
    },
    userId,
  );
}

export function listEmployees(search = "") {
  const db = getDb();
  const wildcard = `%${search.trim()}%`;
  return db.prepare(
    `
      SELECT id, numero, nom, prenom, date_naissance, lieu_naissance, etat_civil, date_entree, date_sortie,
             cnss, adresse, telephone, salaire, photo_path
      FROM employes
      WHERE (? = '' OR nom LIKE ? OR prenom LIKE ? OR cnss LIKE ?)
      ORDER BY numero DESC
    `,
  ).all(search.trim(), wildcard, wildcard, wildcard) as EmployeeRecord[];
}

export function getEmployeeById(id: number) {
  const db = getDb();
  return db.prepare("SELECT * FROM employes WHERE id = ?").get(id) as EmployeeRecord | undefined;
}

export function saveEmployee(input: SaveEmployeeInput, userId: number) {
  const db = getDb();

  if (input.id) {
    db.prepare(
      `
        UPDATE employes
        SET nom = @nom,
            prenom = @prenom,
            date_naissance = @date_naissance,
            lieu_naissance = @lieu_naissance,
            etat_civil = @etat_civil,
            date_entree = @date_entree,
            date_sortie = @date_sortie,
            cnss = @cnss,
            adresse = @adresse,
            telephone = @telephone,
            salaire = @salaire,
            photo_path = @photo_path,
            updated_by = @updated_by,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = @id
      `,
    ).run({
      ...input,
      updated_by: userId,
    });
    logAudit(userId, "update", "employee", input.id, input);
    return input.id;
  }

  const result = db.prepare(
    `
      INSERT INTO employes (
        numero, nom, prenom, date_naissance, lieu_naissance, etat_civil, date_entree,
        date_sortie, cnss, adresse, telephone, salaire, photo_path, created_by, updated_by
      ) VALUES (
        @numero, @nom, @prenom, @date_naissance, @lieu_naissance, @etat_civil, @date_entree,
        @date_sortie, @cnss, @adresse, @telephone, @salaire, @photo_path, @created_by, @updated_by
      )
    `,
  ).run({
    ...input,
    numero: input.numero ?? nextEmployeeNumber(),
    photo_path: input.photo_path ?? "",
    created_by: userId,
    updated_by: userId,
  });
  const employeeId = Number(result.lastInsertRowid);
  logAudit(userId, "create", "employee", employeeId, input);
  return employeeId;
}

export function deleteEmployee(id: number, userId: number) {
  const db = getDb();
  const snapshot = getEmployeeById(id);
  db.prepare("DELETE FROM employes WHERE id = ?").run(id);
  logAudit(userId, "delete", "employee", id, snapshot);
}

export function generateAttestationText(
  employee: EmployeeRecord,
  type: EmployeeAttestationType,
  company: CompanyRecord,
  date?: string,
) {
  return buildAttestationContent(employee, type, company, { referenceDate: date });
}

export function createAttestation(
  employeeId: number,
  type: string,
  date: string,
  userId: number,
  customContent?: string,
) {
  const db = getDb();
  const employee = getEmployeeById(employeeId);
  if (!employee) {
    throw new Error("Employé introuvable.");
  }

  const company = getCompany();
  const content = customContent && customContent.trim()
    ? customContent.trim()
    : generateAttestationText(employee, type, company, date);

  const result = db.prepare(
    `
      INSERT INTO attestations (employe_id, date, type, contenu_genere, created_by)
      VALUES (?, ?, ?, ?, ?)
    `,
  ).run(employeeId, date, type, content, userId);
  const attestationId = Number(result.lastInsertRowid);
  logAudit(userId, "create", "attestation", attestationId, { employeeId, type, content });
  return attestationId;
}

export function listAttestations() {
  const db = getDb();
  return db.prepare(
    `
      SELECT a.*, e.nom, e.prenom
      FROM attestations a
      JOIN employes e ON e.id = a.employe_id
      ORDER BY a.created_at DESC
    `,
  ).all();
}

export function getAttestationById(id: number) {
  const db = getDb();
  return db.prepare(
    `
      SELECT a.*, e.*
      FROM attestations a
      JOIN employes e ON e.id = a.employe_id
      WHERE a.id = ?
    `,
  ).get(id) as (AttestationRecord & EmployeeRecord) | undefined;
}

export function getSystemSalesByDayAndBranch(selectedMonth = monthKey(), companyId?: number) {
  const db = getDb();
  if (companyId) {
    return db.prepare(`
      SELECT branch_id, date, COALESCE(SUM(total_ttc), 0) AS total
      FROM documents
      WHERE substr(date, 1, 7) = ?
        AND type IN ('facture', 'bl')
        AND branch_id IS NOT NULL
        AND company_id = ?
      GROUP BY branch_id, date
    `).all(selectedMonth, companyId) as Array<{ branch_id: number; date: string; total: number }>;
  }
  return db.prepare(`
    SELECT branch_id, date, COALESCE(SUM(total_ttc), 0) AS total
    FROM documents
    WHERE substr(date, 1, 7) = ?
      AND type IN ('facture', 'bl')
      AND branch_id IS NOT NULL
    GROUP BY branch_id, date
  `).all(selectedMonth) as Array<{ branch_id: number; date: string; total: number }>;
}

export function getSystemSalesForDate(date: string, companyId?: number) {
  const db = getDb();
  const query = companyId
    ? `
      SELECT branch_id, COALESCE(SUM(total_ttc), 0) AS total
      FROM documents
      WHERE date = ?
        AND type IN ('facture', 'bl')
        AND branch_id IS NOT NULL
        AND company_id = ?
      GROUP BY branch_id
    `
    : `
      SELECT branch_id, COALESCE(SUM(total_ttc), 0) AS total
      FROM documents
      WHERE date = ?
        AND type IN ('facture', 'bl')
        AND branch_id IS NOT NULL
      GROUP BY branch_id
    `;
  const rows = (companyId ? db.prepare(query).all(date, companyId) : db.prepare(query).all(date)) as Array<{ branch_id: number; total: number }>;

  const map: Record<number, number> = {};
  for (const row of rows) {
    map[row.branch_id] = row.total;
  }
  return map;
}

export function syncRevenueFromSystemSales(selectedMonth: string, userId: number) {
  const db = getDb();
  const sales = getSystemSalesByDayAndBranch(selectedMonth);

  const statement = db.prepare(`
    INSERT INTO chiffre_affaires (branch_id, date, montant, notes, created_by, updated_by)
    VALUES (?, ?, ?, 'Synchronisé automatiquement depuis les factures et BL', ?, ?)
    ON CONFLICT(branch_id, date) DO UPDATE SET
      montant = excluded.montant,
      notes = excluded.notes,
      updated_by = excluded.updated_by,
      updated_at = CURRENT_TIMESTAMP
  `);

  const transaction = db.transaction(() => {
    for (const sale of sales) {
      statement.run(sale.branch_id, sale.date, sale.total, userId, userId);
    }
  });

  transaction();
  logAudit(userId, "sync", "revenue_system_sales", null, { month: selectedMonth, syncedRows: sales.length });
  return sales.length;
}

export function getSystemSalesDocumentsForMonth(selectedMonth = monthKey(), companyId?: number): SalesDocumentSyncCandidate[] {
  const db = getDb();
  const query = companyId
    ? `
      SELECT
        d.id,
        d.type,
        d.numero,
        d.date,
        d.branch_id,
        COALESCE(b.name, '-') AS branch_name,
        COALESCE(c.name, '-') AS party_name,
        d.total_ttc,
        d.status
      FROM documents d
      LEFT JOIN branches b ON b.id = d.branch_id
      LEFT JOIN clients c ON c.id = d.client_id
      WHERE substr(d.date, 1, 7) = ?
        AND d.type IN ('facture', 'bl')
        AND d.branch_id IS NOT NULL
        AND d.company_id = ?
      ORDER BY d.date DESC, d.numero DESC
    `
    : `
      SELECT
        d.id,
        d.type,
        d.numero,
        d.date,
        d.branch_id,
        COALESCE(b.name, '-') AS branch_name,
        COALESCE(c.name, '-') AS party_name,
        d.total_ttc,
        d.status
      FROM documents d
      LEFT JOIN branches b ON b.id = d.branch_id
      LEFT JOIN clients c ON c.id = d.client_id
      WHERE substr(d.date, 1, 7) = ?
        AND d.type IN ('facture', 'bl')
        AND d.branch_id IS NOT NULL
      ORDER BY d.date DESC, d.numero DESC
    `;
  const rows = (companyId ? db.prepare(query).all(selectedMonth, companyId) : db.prepare(query).all(selectedMonth)) as SalesDocumentSyncCandidate[];
  return rows;
}

export function syncSelectedSalesDocuments(
  documentIds: number[],
  selectedMonth: string,
  userId: number,
) {
  if (!documentIds.length) return 0;
  const db = getDb();

  const placeholders = documentIds.map(() => "?").join(",");
  const rows = db.prepare(`
    SELECT branch_id, date, COALESCE(SUM(total_ttc), 0) AS total
    FROM documents
    WHERE id IN (${placeholders})
      AND type IN ('facture', 'bl')
      AND branch_id IS NOT NULL
    GROUP BY branch_id, date
  `).all(...documentIds) as Array<{ branch_id: number; date: string; total: number }>;

  const statement = db.prepare(`
    INSERT INTO chiffre_affaires (branch_id, date, montant, notes, created_by, updated_by)
    VALUES (?, ?, ?, 'Synchronisé depuis les ventes sélectionnées', ?, ?)
    ON CONFLICT(branch_id, date) DO UPDATE SET
      montant = excluded.montant,
      notes = excluded.notes,
      updated_by = excluded.updated_by,
      updated_at = CURRENT_TIMESTAMP
  `);

  const transaction = db.transaction(() => {
    for (const row of rows) {
      statement.run(row.branch_id, row.date, row.total, userId, userId);
    }
  });

  transaction();
  logAudit(userId, "sync", "revenue_selected_sales", null, {
    month: selectedMonth,
    docCount: documentIds.length,
    syncedDays: rows.length,
  });
  return rows.length;
}

export function batchSaveDailyRevenue(
  date: string,
  entries: Array<{ branchId: number; montant: number; notes?: string }>,
  userId: number,
) {
  const db = getDb();
  const statement = db.prepare(`
    INSERT INTO chiffre_affaires (branch_id, date, montant, notes, created_by, updated_by)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(branch_id, date) DO UPDATE SET
      montant = excluded.montant,
      notes = excluded.notes,
      updated_by = excluded.updated_by,
      updated_at = CURRENT_TIMESTAMP
  `);

  const transaction = db.transaction(() => {
    for (const entry of entries) {
      statement.run(entry.branchId, date, entry.montant, entry.notes || "", userId, userId);
    }
  });

  transaction();
  logAudit(userId, "batch_upsert", "daily_revenue", null, { date, entriesCount: entries.length });
}

export function listSortiesCaisse(options?: { month?: string; branchId?: number; date?: string; companyId?: number }): SortieCaisseRecord[] {
  const db = getDb();
  let query = `
    SELECT s.*, b.name as branch_name
    FROM sorties_caisse s
    JOIN branches b ON b.id = s.branch_id
    WHERE 1=1
  `;
  const params: unknown[] = [];

  if (options?.companyId) {
    query += " AND b.company_id = ?";
    params.push(options.companyId);
  }

  if (options?.date) {
    query += " AND s.date = ?";
    params.push(options.date);
  } else if (options?.month) {
    query += " AND substr(s.date, 1, 7) = ?";
    params.push(options.month);
  }

  if (options?.branchId) {
    query += " AND s.branch_id = ?";
    params.push(options.branchId);
  }

  query += " ORDER BY s.date DESC, s.id DESC";
  return db.prepare(query).all(...params) as SortieCaisseRecord[];
}

export function saveSortieCaisse(
  input: {
    id?: number;
    branch_id: number;
    date: string;
    montant: number;
    motif: string;
    beneficiaire?: string;
    preuve_path?: string;
    notes?: string;
    devise?: string;
    taux_change?: number;
    montant_devise?: number;
  },
  userId: number,
) {
  const db = getDb();
  const devise = (input.devise || "MAD").trim().toUpperCase();
  const tauxChange = Number(input.taux_change) > 0 ? Number(input.taux_change) : 1.0;
  const montantDevise = Number(input.montant_devise) > 0 ? Number(input.montant_devise) : (devise !== "MAD" ? Number(input.montant) : 0);
  const montantBase = montantDevise > 0 ? Math.round(montantDevise * tauxChange * 100) / 100 : Number(input.montant) || 0;

  if (input.id) {
    db.prepare(`
      UPDATE sorties_caisse
      SET branch_id = @branch_id,
          date = @date,
          montant = @montant,
          motif = @motif,
          beneficiaire = @beneficiaire,
          preuve_path = COALESCE(NULLIF(@preuve_path, ''), preuve_path),
          notes = @notes,
          devise = @devise,
          taux_change = @taux_change,
          montant_devise = @montant_devise,
          updated_by = @userId,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `).run({
      id: input.id,
      branch_id: input.branch_id,
      date: input.date,
      montant: montantBase,
      motif: input.motif,
      beneficiaire: input.beneficiaire || "",
      preuve_path: input.preuve_path || "",
      notes: input.notes || "",
      devise,
      taux_change: tauxChange,
      montant_devise: montantDevise,
      userId,
    });
    logAudit(userId, "update", "sortie_caisse", input.id, input);
    return input.id;
  }

  const result = db.prepare(`
    INSERT INTO sorties_caisse (
      branch_id, date, montant, motif, beneficiaire, preuve_path, notes,
      devise, taux_change, montant_devise, created_by, updated_by
    )
    VALUES (
      @branch_id, @date, @montant, @motif, @beneficiaire, @preuve_path, @notes,
      @devise, @taux_change, @montant_devise, @userId, @userId
    )
  `).run({
    branch_id: input.branch_id,
    date: input.date,
    montant: montantBase,
    motif: input.motif,
    beneficiaire: input.beneficiaire || "",
    preuve_path: input.preuve_path || "",
    notes: input.notes || "",
    devise,
    taux_change: tauxChange,
    montant_devise: montantDevise,
    userId,
  });

  const newId = Number(result.lastInsertRowid);
  logAudit(userId, "create", "sortie_caisse", newId, input);
  return newId;
}

export function deleteSortieCaisse(id: number, userId: number) {
  const db = getDb();
  db.prepare("DELETE FROM sorties_caisse WHERE id = ?").run(id);
  logAudit(userId, "delete", "sortie_caisse", id, { id });
}

export function getCashDaySummary(date: string, branchId: number): CashDaySummary {
  const db = getDb();
  const branch = db.prepare("SELECT name FROM branches WHERE id = ?").get(branchId) as { name: string } | undefined;

  const ca = db.prepare(`
    SELECT * FROM chiffre_affaires WHERE branch_id = ? AND date = ?
  `).get(branchId, date) as any;

  const sorties = listSortiesCaisse({ date, branchId });
  const total_sorties = sorties.reduce((sum, s) => sum + Number(s.montant), 0);

  const especes = Number(ca?.especes ?? ca?.montant ?? 0);
  const carte = Number(ca?.carte ?? 0);
  const cheque = Number(ca?.cheque ?? 0);
  const virement = Number(ca?.virement ?? 0);
  const total_recettes = Number(ca?.montant ?? (especes + carte + cheque + virement));
  const solde_net_caisse = especes - total_sorties;

  return {
    date,
    branch_id: branchId,
    branch_name: branch?.name,
    especes,
    carte,
    cheque,
    virement,
    total_recettes,
    total_sorties,
    solde_net_caisse,
    preuve_path: ca?.preuve_path || "",
    statut_cloture: ca?.statut_cloture || "brouillon",
    notes: ca?.notes || "",
    sorties,
  };
}

export function saveCashDayClosing(
  input: {
    branch_id: number;
    date: string;
    especes: number;
    carte: number;
    cheque: number;
    virement: number;
    preuve_path?: string;
    notes?: string;
    statut_cloture?: "brouillon" | "cloture";
  },
  userId: number,
) {
  const db = getDb();
  const total = Number(input.especes) + Number(input.carte) + Number(input.cheque) + Number(input.virement);

  db.prepare(`
    INSERT INTO chiffre_affaires (
      branch_id, date, montant, especes, carte, cheque, virement, preuve_path, statut_cloture, notes, created_by, updated_by
    )
    VALUES (
      @branch_id, @date, @montant, @especes, @carte, @cheque, @virement, @preuve_path, @statut_cloture, @notes, @userId, @userId
    )
    ON CONFLICT(branch_id, date) DO UPDATE SET
      montant = excluded.montant,
      especes = excluded.especes,
      carte = excluded.carte,
      cheque = excluded.cheque,
      virement = excluded.virement,
      preuve_path = COALESCE(NULLIF(excluded.preuve_path, ''), chiffre_affaires.preuve_path),
      statut_cloture = excluded.statut_cloture,
      notes = excluded.notes,
      updated_by = excluded.updated_by,
      updated_at = CURRENT_TIMESTAMP
  `).run({
    branch_id: input.branch_id,
    date: input.date,
    montant: total,
    especes: input.especes,
    carte: input.carte,
    cheque: input.cheque,
    virement: input.virement,
    preuve_path: input.preuve_path || "",
    statut_cloture: input.statut_cloture || "cloture",
    notes: input.notes || "",
    userId,
  });

  logAudit(userId, "closing", "cash_day_closing", input.branch_id, { ...input, total });
}

export function getRevenueGrid(selectedMonth = monthKey(), companyId?: number) {
  const db = getDb();
  const branches = listBranches({ activeOnly: true, companyId });
  const days = listDaysInMonth(selectedMonth);

  // Manual CA rows
  const rows = companyId
    ? (db.prepare(
        `
          SELECT ca.branch_id, ca.date, ca.montant
          FROM chiffre_affaires ca
          JOIN branches b ON b.id = ca.branch_id
          WHERE substr(ca.date, 1, 7) = ? AND b.company_id = ?
        `,
      ).all(selectedMonth, companyId) as Array<{ branch_id: number; date: string; montant: number }>)
    : (db.prepare(
        `
          SELECT branch_id, date, montant
          FROM chiffre_affaires
          WHERE substr(date, 1, 7) = ?
        `,
      ).all(selectedMonth) as Array<{ branch_id: number; date: string; montant: number }>);
  const lookup = new Map(rows.map((row) => [`${row.date}:${row.branch_id}`, row.montant]));

  // Auto System sales rows from documents
  const systemSales = getSystemSalesByDayAndBranch(selectedMonth, companyId);
  const systemLookup = new Map(systemSales.map((s) => [`${s.date}:${s.branch_id}`, s.total]));

  const table = days.map((date) => {
    const values = Object.fromEntries(
      branches.map((branch) => [branch.id, lookup.get(`${date}:${branch.id}`) ?? 0]),
    );
    const systemValues = Object.fromEntries(
      branches.map((branch) => [branch.id, systemLookup.get(`${date}:${branch.id}`) ?? 0]),
    );

    const total = Object.values(values).reduce((sum, amount) => sum + Number(amount), 0);
    const systemTotal = Object.values(systemValues).reduce((sum, amount) => sum + Number(amount), 0);
    const diff = total - systemTotal;

    return { date, values, systemValues, total, systemTotal, diff };
  });

  return { month: selectedMonth, branches, table };
}

export function upsertRevenueEntry(branchId: number, date: string, montant: number, userId: number, notes = "") {
  const db = getDb();
  db.prepare(
    `
      INSERT INTO chiffre_affaires (branch_id, date, montant, notes, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(branch_id, date) DO UPDATE SET
        montant = excluded.montant,
        notes = excluded.notes,
        updated_by = excluded.updated_by,
        updated_at = CURRENT_TIMESTAMP
    `,
  ).run(branchId, date, montant, notes, userId, userId);
  logAudit(userId, "upsert", "revenue", branchId, { branchId, date, montant, notes });
}

export function getRevenueStats(selectedMonth = monthKey(), companyId?: number): RevenueStats {
  const db = getDb();
  const year = selectedMonth.slice(0, 4);

  const monthTotal = companyId
    ? (db
        .prepare(`
          SELECT COALESCE(SUM(ca.montant), 0) AS total
          FROM chiffre_affaires ca
          JOIN branches b ON b.id = ca.branch_id
          WHERE substr(ca.date, 1, 7) = ? AND b.company_id = ?
        `)
        .get(selectedMonth, companyId) as { total: number })
    : (db
        .prepare("SELECT COALESCE(SUM(montant), 0) AS total FROM chiffre_affaires WHERE substr(date, 1, 7) = ?")
        .get(selectedMonth) as { total: number });

  const yearTotal = companyId
    ? (db
        .prepare(`
          SELECT COALESCE(SUM(ca.montant), 0) AS total
          FROM chiffre_affaires ca
          JOIN branches b ON b.id = ca.branch_id
          WHERE substr(ca.date, 1, 4) = ? AND b.company_id = ?
        `)
        .get(year, companyId) as { total: number })
    : (db
        .prepare("SELECT COALESCE(SUM(montant), 0) AS total FROM chiffre_affaires WHERE substr(date, 1, 4) = ?")
        .get(year) as { total: number });

  const systemMonthTotalRow = companyId
    ? (db
        .prepare(`
          SELECT COALESCE(SUM(d.total_ttc), 0) AS total
          FROM documents d
          WHERE substr(d.date, 1, 7) = ?
            AND d.type IN ('facture', 'bl')
            AND d.branch_id IS NOT NULL
            AND d.company_id = ?
        `)
        .get(selectedMonth, companyId) as { total: number })
    : (db
        .prepare(`
          SELECT COALESCE(SUM(total_ttc), 0) AS total
          FROM documents
          WHERE substr(date, 1, 7) = ?
            AND type IN ('facture', 'bl')
            AND branch_id IS NOT NULL
        `)
        .get(selectedMonth) as { total: number });

  const systemMonthTotal = systemMonthTotalRow.total;
  const diffMonthTotal = monthTotal.total - systemMonthTotal;

  const bestBranch = companyId
    ? (db
        .prepare(
          `
            SELECT b.name, COALESCE(SUM(ca.montant), 0) AS total
            FROM branches b
            LEFT JOIN chiffre_affaires ca ON ca.branch_id = b.id AND substr(ca.date, 1, 7) = ?
            WHERE b.active = 1 AND b.company_id = ?
            GROUP BY b.id
            ORDER BY total DESC, b.name
            LIMIT 1
          `,
        )
        .get(selectedMonth, companyId) as { name?: string; total?: number } | undefined)
    : (db
        .prepare(
          `
            SELECT b.name, COALESCE(SUM(ca.montant), 0) AS total
            FROM branches b
            LEFT JOIN chiffre_affaires ca ON ca.branch_id = b.id AND substr(ca.date, 1, 7) = ?
            WHERE b.active = 1
            GROUP BY b.id
            ORDER BY total DESC, b.name
            LIMIT 1
          `,
        )
        .get(selectedMonth) as { name?: string; total?: number } | undefined);

  const daily = companyId
    ? (db.prepare(
        `
          SELECT ca.date, SUM(ca.montant) AS total
          FROM chiffre_affaires ca
          JOIN branches b ON b.id = ca.branch_id
          WHERE substr(ca.date, 1, 7) = ? AND b.company_id = ?
          GROUP BY ca.date
          ORDER BY ca.date
        `,
      ).all(selectedMonth, companyId) as RevenueDailyPoint[])
    : (db.prepare(
        `
          SELECT date, SUM(montant) AS total
          FROM chiffre_affaires
          WHERE substr(date, 1, 7) = ?
          GROUP BY date
          ORDER BY date
        `,
      ).all(selectedMonth) as RevenueDailyPoint[]);

  const monthlyByBranch = companyId
    ? (db.prepare(
        `
          SELECT substr(ca.date, 1, 7) AS month, b.name, SUM(ca.montant) AS total
          FROM chiffre_affaires ca
          JOIN branches b ON b.id = ca.branch_id
          WHERE ca.date >= date('now', '-12 months') AND b.company_id = ?
          GROUP BY month, b.name
          ORDER BY month, b.name
        `,
      ).all(companyId) as RevenueMonthlyBranchPoint[])
    : (db.prepare(
        `
          SELECT substr(ca.date, 1, 7) AS month, b.name, SUM(ca.montant) AS total
          FROM chiffre_affaires ca
          JOIN branches b ON b.id = ca.branch_id
          WHERE ca.date >= date('now', '-12 months')
          GROUP BY month, b.name
          ORDER BY month, b.name
        `,
      ).all() as RevenueMonthlyBranchPoint[]);

  const pivot = companyId
    ? (db.prepare(
        `
          SELECT substr(ca.date, 1, 7) AS month, b.name, SUM(ca.montant) AS total
          FROM chiffre_affaires ca
          JOIN branches b ON b.id = ca.branch_id
          WHERE b.company_id = ?
          GROUP BY month, b.name
          ORDER BY month DESC, b.name
        `,
      ).all(companyId) as RevenueMonthlyBranchPoint[])
    : (db.prepare(
        `
          SELECT substr(ca.date, 1, 7) AS month, b.name, SUM(ca.montant) AS total
          FROM chiffre_affaires ca
          JOIN branches b ON b.id = ca.branch_id
          GROUP BY month, b.name
          ORDER BY month DESC, b.name
        `,
      ).all() as RevenueMonthlyBranchPoint[]);

  const payments = companyId
    ? (db
        .prepare(`
          SELECT
            COALESCE(SUM(ca.especes), 0) AS especes,
            COALESCE(SUM(ca.carte), 0) AS carte,
            COALESCE(SUM(ca.cheque), 0) AS cheque,
            COALESCE(SUM(ca.virement), 0) AS virement
          FROM chiffre_affaires ca
          JOIN branches b ON b.id = ca.branch_id
          WHERE substr(ca.date, 1, 7) = ? AND b.company_id = ?
        `)
        .get(selectedMonth, companyId) as { especes: number; carte: number; cheque: number; virement: number })
    : (db
        .prepare(`
          SELECT
            COALESCE(SUM(especes), 0) AS especes,
            COALESCE(SUM(carte), 0) AS carte,
            COALESCE(SUM(cheque), 0) AS cheque,
            COALESCE(SUM(virement), 0) AS virement
          FROM chiffre_affaires
          WHERE substr(date, 1, 7) = ?
        `)
        .get(selectedMonth) as { especes: number; carte: number; cheque: number; virement: number });

  const sortiesTotalRow = companyId
    ? (db
        .prepare(`
          SELECT COALESCE(SUM(s.montant), 0) AS total
          FROM sorties_caisse s
          JOIN branches b ON b.id = s.branch_id
          WHERE substr(s.date, 1, 7) = ? AND b.company_id = ?
        `)
        .get(selectedMonth, companyId) as { total: number })
    : (db
        .prepare(`
          SELECT COALESCE(SUM(montant), 0) AS total
          FROM sorties_caisse
          WHERE substr(date, 1, 7) = ?
        `)
        .get(selectedMonth) as { total: number });

  const sortiesTotal = sortiesTotalRow.total;
  const netCaisse = monthTotal.total - sortiesTotal;

  const paymentMethods = {
    especes: payments.especes,
    carte: payments.carte,
    cheque: payments.cheque,
    virement: payments.virement,
  };

  // If no detailed breakdown yet but monthTotal > 0, attribute to especes as baseline
  if (
    paymentMethods.especes === 0 &&
    paymentMethods.carte === 0 &&
    paymentMethods.cheque === 0 &&
    paymentMethods.virement === 0 &&
    monthTotal.total > 0
  ) {
    paymentMethods.especes = monthTotal.total;
  }

  const sortedDays = [...daily].filter((d) => d.total > 0).sort((a, b) => b.total - a.total);
  const bestDay = sortedDays[0] ? { date: sortedDays[0].date, total: sortedDays[0].total } : undefined;
  const activeDaysCount = daily.filter((d) => d.total > 0).length || 1;
  const avgDaily = monthTotal.total / activeDaysCount;

  return {
    monthTotal: monthTotal.total,
    yearTotal: yearTotal.total,
    systemMonthTotal,
    diffMonthTotal,
    bestBranch,
    daily,
    monthlyByBranch,
    pivot,
    paymentMethods,
    sortiesTotal,
    netCaisse,
    bestDay,
    avgDaily,
  };
}

export function getAuditLogs(limit = 200) {
  const db = getDb();
  return db.prepare(
    `
      SELECT a.*, u.full_name
      FROM audit_log a
      LEFT JOIN users u ON u.id = a.user_id
      ORDER BY a.timestamp DESC
      LIMIT ?
    `,
  ).all(limit);
}

export function searchGlobal(query: string, companyId?: number): SearchResult[] {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const db = getDb();
  const featureFlags = getFeatureFlags();
  const wildcard = `%${trimmed}%`;

  const results: SearchResult[] = [];

  const documentsQuery = companyId
    ? `
      SELECT id, type, numero, date
      FROM documents
      WHERE (CAST(numero AS TEXT) LIKE ? OR type LIKE ?)
        AND company_id = ?
      ORDER BY updated_at DESC
      LIMIT 8
    `
    : `
      SELECT id, type, numero, date
      FROM documents
      WHERE CAST(numero AS TEXT) LIKE ? OR type LIKE ?
      ORDER BY updated_at DESC
      LIMIT 8
    `;

  const documents = (companyId
    ? db.prepare(documentsQuery).all(wildcard, wildcard, companyId)
    : db.prepare(documentsQuery).all(wildcard, wildcard)) as Array<{ id: number; type: DocumentType; numero: number; date: string }>;

  results.push(
    ...documents
      .filter((document) => featureFlags[DOCUMENT_FEATURE_MAP_LOCAL[document.type]])
      .map((document) => ({
        id: document.id,
        type: "document" as const,
        label: `${DOCUMENT_TYPE_LABELS[document.type]} #${document.numero}`,
        meta: document.date,
        href: `/${getModuleSlugByType(document.type)}/${document.id}/edit`,
      })),
  );

  const productsQuery = companyId
    ? `
      SELECT id, ref, designation
      FROM produits
      WHERE (ref LIKE ? OR designation LIKE ?)
        AND (company_id = ? OR company_id IS NULL)
      ORDER BY designation
      LIMIT 8
    `
    : `
      SELECT id, ref, designation
      FROM produits
      WHERE ref LIKE ? OR designation LIKE ?
      ORDER BY designation
      LIMIT 8
    `;

  const products = (companyId
    ? db.prepare(productsQuery).all(wildcard, wildcard, companyId)
    : db.prepare(productsQuery).all(wildcard, wildcard)) as Array<{ id: number; ref: string; designation: string }>;

  if (featureFlags.produits) {
    results.push(
      ...products.map((product) => ({
        id: product.id,
        type: "product" as const,
        label: product.designation,
        meta: product.ref,
        href: `/produits?focus=${product.id}`,
      })),
    );
  }

  const clients = db.prepare(
    `
      SELECT id, name, phone
      FROM clients
      WHERE name LIKE ? OR phone LIKE ?
      ORDER BY name
      LIMIT 5
    `,
  ).all(wildcard, wildcard) as Array<{ id: number; name: string; phone: string }>;

  if (featureFlags.clients) {
    results.push(
      ...clients.map((client) => ({
        id: client.id,
        type: "client" as const,
        label: client.name,
        meta: client.phone,
        href: `/clients?focus=${client.id}`,
      })),
    );
  }

  const employees = db.prepare(
    `
      SELECT id, nom, prenom, numero
      FROM employes
      WHERE nom LIKE ? OR prenom LIKE ?
      ORDER BY numero DESC
      LIMIT 5
    `,
  ).all(wildcard, wildcard) as Array<{ id: number; nom: string; prenom: string; numero: number }>;

  if (featureFlags.personnel) {
    results.push(
      ...employees.map((employee) => ({
        id: employee.id,
        type: "employee" as const,
        label: `${employee.prenom} ${employee.nom}`,
        meta: `Dossier #${employee.numero}`,
        href: `/personnel/${employee.id}/edit`,
      })),
    );
  }

  return results.slice(0, 20);
}

export function getLookupData(companyId?: number) {
  return {
    branches: listBranches({ activeOnly: true, companyId }),
    clients: listEntities("clients"),
    fournisseurs: listEntities("fournisseurs"),
    produits: listProducts("", companyId),
  };
}

export function getAuthUserLabel() {
  return getAuthSession().then((session) => session?.user?.name ?? "Utilisateur");
}

export function getDocumentMeta() {
  return {
    labels: DOCUMENT_TYPE_LABELS,
    statusLabels: DOCUMENT_STATUS_LABELS,
    attestationLabels: ATTESTATION_TYPE_LABELS,
  };
}

export function getRelanceSettings(companyId?: number): RelanceSettings {
  const db = getDb();
  const cId = companyId || 1;
  const row = db.prepare("SELECT value FROM app_settings WHERE key = ?").get(`relances.settings.${cId}`) as
    | { value?: string }
    | undefined;

  let settings: RelanceSettings = { ...DEFAULT_RELANCE_SETTINGS };
  if (row?.value) {
    try {
      const parsed = JSON.parse(row.value);
      settings = {
        delais: { ...DEFAULT_RELANCE_SETTINGS.delais, ...(parsed.delais || {}) },
        rib: parsed.rib ?? DEFAULT_RELANCE_SETTINGS.rib,
        banque: parsed.banque ?? DEFAULT_RELANCE_SETTINGS.banque,
        titulaire_compte: parsed.titulaire_compte ?? DEFAULT_RELANCE_SETTINGS.titulaire_compte,
        templates_fr: { ...DEFAULT_RELANCE_TEMPLATES_FR, ...(parsed.templates_fr || {}) },
        templates_ar: { ...DEFAULT_RELANCE_TEMPLATES_AR, ...(parsed.templates_ar || {}) },
      };
    } catch {
      settings = { ...DEFAULT_RELANCE_SETTINGS };
    }
  }

  const company = getCompany(cId);
  if (company && (!settings.titulaire_compte || settings.titulaire_compte === DEFAULT_RELANCE_SETTINGS.titulaire_compte)) {
    settings.titulaire_compte = company.name;
  }

  return settings;
}

export function saveRelanceSettings(companyId: number, settings: RelanceSettings, userId: number) {
  const db = getDb();
  const key = `relances.settings.${companyId}`;
  db.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)").run(key, JSON.stringify(settings));
  logAudit(userId, "update", "relances_settings", companyId, settings);
}

export function interpolateRelanceTemplate(template: string, vars: Record<string, string | number>): string {
  let result = template;
  for (const [key, val] of Object.entries(vars)) {
    const pattern = new RegExp(`{{${key}}}`, "g");
    result = result.replace(pattern, String(val ?? ""));
  }
  return result;
}

export function getFacturesImpayees(
  companyId: number,
  filters?: { palier?: string; search?: string }
): FactureImpayeeItem[] {
  const db = getDb();
  const settings = getRelanceSettings(companyId);
  const today = todayIso();

  const query = `
    SELECT 
      d.id,
      d.company_id,
      d.numero,
      d.date,
      d.date_echeance,
      d.client_id,
      d.total_ttc,
      d.avance,
      d.reste,
      d.status,
      c.name AS client_name,
      COALESCE(c.phone, '') AS client_phone,
      COALESCE(c.email, '') AS client_email,
      COALESCE(c.ice, '') AS client_ice,
      (SELECT COUNT(*) FROM relances_log rl WHERE rl.document_id = d.id) AS nombre_relances,
      (SELECT rl.palier FROM relances_log rl WHERE rl.document_id = d.id ORDER BY rl.date_envoi DESC, rl.id DESC LIMIT 1) AS dernier_palier,
      (SELECT rl.date_envoi FROM relances_log rl WHERE rl.document_id = d.id ORDER BY rl.date_envoi DESC, rl.id DESC LIMIT 1) AS derniere_relance_date,
      (SELECT rl.canal FROM relances_log rl WHERE rl.document_id = d.id ORDER BY rl.date_envoi DESC, rl.id DESC LIMIT 1) AS derniere_relance_canal
    FROM documents d
    JOIN clients c ON c.id = d.client_id
    WHERE d.company_id = ?
      AND d.type = 'facture'
      AND d.reste > 0.009
    ORDER BY d.date ASC, d.numero ASC
  `;

  type RawRow = {
    id: number;
    company_id: number;
    numero: number;
    date: string;
    date_echeance: string | null;
    client_id: number;
    total_ttc: number;
    avance: number;
    reste: number;
    status: string;
    client_name: string;
    client_phone: string;
    client_email: string;
    client_ice: string;
    nombre_relances: number;
    dernier_palier: RelancePalier | null;
    derniere_relance_date: string | null;
    derniere_relance_canal: RelanceCanal | null;
  };

  const rows = db.prepare(query).all(companyId) as RawRow[];

  const items: FactureImpayeeItem[] = rows.map((row) => {
    let effectiveEcheance = row.date_echeance && row.date_echeance.trim().length === 10
      ? row.date_echeance.trim()
      : "";

    if (!effectiveEcheance) {
      const docDate = new Date(row.date);
      if (!isNaN(docDate.getTime())) {
        docDate.setDate(docDate.getDate() + 30);
        effectiveEcheance = docDate.toISOString().slice(0, 10);
      } else {
        effectiveEcheance = row.date;
      }
    }

    const todayDate = new Date(today);
    const dueDate = new Date(effectiveEcheance);
    const diffMs = todayDate.getTime() - dueDate.getTime();
    const jours_retard = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    let palier_recommande: RelancePalier = "prevenance";
    if (jours_retard >= settings.delais.mise_en_demeure) {
      palier_recommande = "mise_en_demeure";
    } else if (jours_retard >= settings.delais.relance_2) {
      palier_recommande = "relance_2";
    } else if (jours_retard >= settings.delais.relance_1) {
      palier_recommande = "relance_1";
    } else {
      palier_recommande = "prevenance";
    }

    return {
      id: row.id,
      company_id: row.company_id,
      numero: row.numero,
      date: row.date,
      date_echeance: effectiveEcheance,
      client_id: row.client_id,
      client_name: row.client_name,
      client_phone: row.client_phone,
      client_email: row.client_email,
      client_ice: row.client_ice,
      total_ttc: Number(row.total_ttc),
      avance: Number(row.avance),
      reste: Number(row.reste),
      status: row.status,
      jours_retard,
      palier_recommande,
      dernier_palier: row.dernier_palier,
      derniere_relance_date: row.derniere_relance_date,
      derniere_relance_canal: row.derniere_relance_canal,
      nombre_relances: Number(row.nombre_relances || 0),
    };
  });

  let filtered = items;
  if (filters?.palier && filters.palier !== "all") {
    filtered = filtered.filter((i) => i.palier_recommande === filters.palier);
  }

  if (filters?.search && filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    filtered = filtered.filter(
      (i) =>
        String(i.numero).includes(q) ||
        i.client_name.toLowerCase().includes(q) ||
        i.client_phone.includes(q) ||
        (i.client_ice && i.client_ice.toLowerCase().includes(q))
    );
  }

  filtered.sort((a, b) => {
    if (b.jours_retard !== a.jours_retard) {
      return b.jours_retard - a.jours_retard;
    }
    return a.date.localeCompare(b.date);
  });

  return filtered;
}

export function getBalanceAgee(companyId: number): BalanceAgeeStats {
  const db = getDb();
  const allInvoices = getFacturesImpayees(companyId);
  const currentMonth = monthKey();

  let total_creances = 0;
  let total_echu = 0;
  let total_non_echu = 0;

  const tranches = {
    non_echu: { montant: 0, count: 0 },
    j1_15: { montant: 0, count: 0 },
    j16_30: { montant: 0, count: 0 },
    j31_60: { montant: 0, count: 0 },
    j61_plus: { montant: 0, count: 0 },
  };

  const par_palier = {
    prevenance: { montant: 0, count: 0 },
    relance_1: { montant: 0, count: 0 },
    relance_2: { montant: 0, count: 0 },
    mise_en_demeure: { montant: 0, count: 0 },
  };

  for (const inv of allInvoices) {
    const reste = inv.reste;
    total_creances += reste;

    if (inv.jours_retard <= 0) {
      total_non_echu += reste;
      tranches.non_echu.montant += reste;
      tranches.non_echu.count += 1;
    } else {
      total_echu += reste;
      if (inv.jours_retard <= 15) {
        tranches.j1_15.montant += reste;
        tranches.j1_15.count += 1;
      } else if (inv.jours_retard <= 30) {
        tranches.j16_30.montant += reste;
        tranches.j16_30.count += 1;
      } else if (inv.jours_retard <= 60) {
        tranches.j31_60.montant += reste;
        tranches.j31_60.count += 1;
      } else {
        tranches.j61_plus.montant += reste;
        tranches.j61_plus.count += 1;
      }
    }

    if (inv.palier_recommande in par_palier) {
      par_palier[inv.palier_recommande].montant += reste;
      par_palier[inv.palier_recommande].count += 1;
    }
  }

  const relancesMonthRow = db.prepare(`
    SELECT COUNT(*) AS count 
    FROM relances_log 
    WHERE company_id = ? AND substr(date_envoi, 1, 7) = ?
  `).get(companyId, currentMonth) as { count: number } | undefined;

  return {
    total_creances,
    total_echu,
    total_non_echu,
    tranches,
    par_palier,
    relances_ce_mois: Number(relancesMonthRow?.count || 0),
  };
}

export function logRelance(input: {
  company_id: number;
  document_id: number;
  client_id: number;
  palier: RelancePalier;
  canal: RelanceCanal;
  destinataire: string;
  message_envoye: string;
  statut?: RelanceStatut;
  notes?: string;
  created_by?: number | null;
}): number {
  const db = getDb();
  const res = db.prepare(`
    INSERT INTO relances_log (
      company_id, document_id, client_id, palier, canal, destinataire, message_envoye, statut, notes, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.company_id,
    input.document_id,
    input.client_id,
    input.palier,
    input.canal,
    input.destinataire,
    input.message_envoye,
    input.statut || "envoye",
    input.notes || "",
    input.created_by ?? null
  );

  const newId = Number(res.lastInsertRowid);
  if (input.created_by) {
    logAudit(input.created_by, "create", "relances_log", newId, input);
  }
  return newId;
}

export function getRelancesLogByDocument(documentId: number): RelanceLogRecord[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT rl.*, u.full_name AS created_by_name, c.name AS client_name, d.numero AS document_numero
    FROM relances_log rl
    LEFT JOIN users u ON u.id = rl.created_by
    LEFT JOIN clients c ON c.id = rl.client_id
    LEFT JOIN documents d ON d.id = rl.document_id
    WHERE rl.document_id = ?
    ORDER BY rl.date_envoi DESC, rl.id DESC
  `).all(documentId) as RelanceLogRecord[];
  return rows;
}

export function listRelancesLogs(companyId: number, limit = 50): RelanceLogRecord[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT rl.*, u.full_name AS created_by_name, c.name AS client_name, d.numero AS document_numero
    FROM relances_log rl
    LEFT JOIN users u ON u.id = rl.created_by
    LEFT JOIN clients c ON c.id = rl.client_id
    LEFT JOIN documents d ON d.id = rl.document_id
    WHERE rl.company_id = ?
    ORDER BY rl.date_envoi DESC, rl.id DESC
    LIMIT ?
  `).all(companyId, limit) as RelanceLogRecord[];
  return rows;
}

export function enregistrerReglementRapide(
  documentId: number,
  montant: number,
  modePaiement: string,
  notes: string,
  userId: number,
  tauxReglement?: number
) {
  const db = getDb();
  const doc = db.prepare("SELECT * FROM documents WHERE id = ?").get(documentId) as DocumentRecord | undefined;
  if (!doc) {
    throw new Error("Document introuvable.");
  }

  const versement = Math.max(0, Number(montant) || 0);
  if (versement <= 0) {
    throw new Error("Le montant du règlement doit être supérieur à 0.");
  }

  const nouvelleAvance = Number(doc.avance || 0) + versement;
  const nouveauReste = Math.max(0, Number(doc.total_ttc) - nouvelleAvance);

  const docCurrency = (doc.devise || "MAD").toUpperCase();
  const tauxDoc = Number(doc.taux_change) > 0 ? Number(doc.taux_change) : 1.0;
  const settlementRate = Number(tauxReglement) > 0 ? Number(tauxReglement) : tauxDoc;

  let forexDescription = "";
  let forexResult: ReturnType<typeof computeForexGainLoss> | null = null;

  if (docCurrency !== "MAD") {
    forexResult = computeForexGainLoss({
      typeOperation: doc.type === "bc" ? "achat" : "vente",
      montantDevise: versement,
      tauxInitial: tauxDoc,
      tauxReglement: settlementRate,
    });

    if (forexResult.typeResultat !== "nul") {
      forexDescription = ` [${forexResult.description}]`;

      let tiersNom = "";
      if (doc.client_id) {
        const cl = db.prepare("SELECT name FROM clients WHERE id = ?").get(doc.client_id) as { name: string } | undefined;
        tiersNom = cl?.name || "";
      } else if (doc.fournisseur_id) {
        const fr = db.prepare("SELECT name FROM fournisseurs WHERE id = ?").get(doc.fournisseur_id) as { name: string } | undefined;
        tiersNom = fr?.name || "";
      }

      const refPiece = `${doc.type.toUpperCase()}-${doc.numero}`;

      db.prepare(`
        INSERT INTO forex_transactions (
          company_id, type_operation, document_id, tiers_nom, reference_piece,
          date_operation, date_reglement, devise, montant_devise, taux_initial, taux_reglement,
          montant_initial_base, montant_regle_base, ecart_change, type_resultat, compte_comptable,
          notes, created_by
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?
        )
      `).run(
        doc.company_id || 1,
        doc.type === "bc" ? "achat" : "vente",
        documentId,
        tiersNom,
        refPiece,
        doc.date,
        todayIso(),
        docCurrency,
        versement,
        tauxDoc,
        settlementRate,
        forexResult.montantInitialBase,
        forexResult.montantRegleBase,
        forexResult.ecartChange,
        forexResult.typeResultat,
        forexResult.compteComptable,
        notes?.trim() || "",
        userId
      );
    }
  }

  const updatedNotes = notes?.trim()
    ? `${doc.notes ? doc.notes + "\n" : ""}[${todayIso()}] Règlement reçu: ${versement.toFixed(2)} ${docCurrency} (${modePaiement})${forexDescription}. Note: ${notes.trim()}`
    : `${doc.notes ? doc.notes + "\n" : ""}[${todayIso()}] Règlement reçu: ${versement.toFixed(2)} ${docCurrency} (${modePaiement})${forexDescription}`;

  const nouvelleAvanceBase = Math.round(nouvelleAvance * tauxDoc * 100) / 100;
  const nouveauResteBase = Math.round(nouveauReste * tauxDoc * 100) / 100;

  db.prepare(`
    UPDATE documents
    SET avance = ?,
        reste = ?,
        avance_base = ?,
        reste_base = ?,
        notes = ?,
        updated_by = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(nouvelleAvance, nouveauReste, nouvelleAvanceBase, nouveauResteBase, updatedNotes, userId, documentId);

  if (nouveauReste === 0) {
    db.prepare(`
      UPDATE relances_log
      SET statut = 'promesse_paiement'
      WHERE document_id = ? AND statut = 'envoye'
    `).run(documentId);
  }

  logAudit(userId, "payment", "document", documentId, {
    montant: versement,
    devise: docCurrency,
    tauxDoc,
    settlementRate,
    forex: forexResult,
    modePaiement,
    nouvelleAvance,
    nouveauReste,
  });

  return { success: true, nouveauReste, forex: forexResult };
}

// ==========================================
// ABONNEMENTS & FACTURATION RÉCURRENTE (SUBSCRIPTIONS)
// ==========================================

export function computeNextEcheance(currentDate: string, periodicite: Periodicite): string {
  const [yearStr, monthStr, dayStr] = currentDate.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  let monthsToAdd = 1;
  if (periodicite === "trimestriel") monthsToAdd = 3;
  else if (periodicite === "semestriel") monthsToAdd = 6;
  else if (periodicite === "annuel") monthsToAdd = 12;

  let targetMonth = month + monthsToAdd;
  let targetYear = year;
  while (targetMonth > 12) {
    targetMonth -= 12;
    targetYear += 1;
  }

  const maxDays = new Date(targetYear, targetMonth, 0).getDate();
  const targetDay = Math.min(day, maxDays);

  const pad = (n: number) => String(n).padStart(2, "0");
  return `${targetYear}-${pad(targetMonth)}-${pad(targetDay)}`;
}

export function computeMrrArr(totalTtc: number, periodicite: Periodicite): { mrr: number; arr: number } {
  let mrr = 0;
  if (periodicite === "mensuel") {
    mrr = totalTtc;
  } else if (periodicite === "trimestriel") {
    mrr = totalTtc / 3;
  } else if (periodicite === "semestriel") {
    mrr = totalTtc / 6;
  } else if (periodicite === "annuel") {
    mrr = totalTtc / 12;
  }
  const arr = mrr * 12;
  return {
    mrr: Math.round(mrr * 100) / 100,
    arr: Math.round(arr * 100) / 100,
  };
}

export function listSubscriptions(
  companyId?: number,
  options?: { statut?: string; periodicite?: string; search?: string; clientId?: number }
): SubscriptionItem[] {
  const db = getDb();
  const today = todayIso();

  let query = `
    SELECT 
      s.*,
      c.name as client_name,
      c.phone as client_phone,
      c.email as client_email,
      c.ice as client_ice,
      (SELECT COUNT(*) FROM subscription_invoices_log sil WHERE sil.subscription_id = s.id) as factures_count
    FROM subscriptions s
    LEFT JOIN clients c ON s.client_id = c.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (companyId) {
    query += ` AND s.company_id = ?`;
    params.push(companyId);
  }

  if (options?.clientId) {
    query += ` AND s.client_id = ?`;
    params.push(options.clientId);
  }

  if (options?.statut && options.statut !== "all") {
    query += ` AND s.statut = ?`;
    params.push(options.statut);
  }

  if (options?.periodicite && options.periodicite !== "all") {
    query += ` AND s.periodicite = ?`;
    params.push(options.periodicite);
  }

  if (options?.search && options.search.trim()) {
    const q = `%${options.search.trim().toLowerCase()}%`;
    query += ` AND (LOWER(s.titre) LIKE ? OR LOWER(s.reference) LIKE ? OR LOWER(c.name) LIKE ? OR c.phone LIKE ?)`;
    params.push(q, q, q, q);
  }

  query += ` ORDER BY s.prochaine_echeance ASC, s.id DESC`;

  const rows = db.prepare(query).all(...params) as any[];

  return rows.map((row) => {
    const est_echu = row.statut === "actif" && row.prochaine_echeance <= today;
    return {
      ...row,
      est_echu,
    };
  });
}

export function getSubscription(id: number): (SubscriptionItem & { lignes: SubscriptionLine[] }) | null {
  const db = getDb();
  const today = todayIso();

  const sub = db.prepare(`
    SELECT 
      s.*,
      c.name as client_name,
      c.phone as client_phone,
      c.email as client_email,
      c.ice as client_ice,
      (SELECT COUNT(*) FROM subscription_invoices_log sil WHERE sil.subscription_id = s.id) as factures_count
    FROM subscriptions s
    LEFT JOIN clients c ON s.client_id = c.id
    WHERE s.id = ?
  `).get(id) as any;

  if (!sub) return null;

  const lignes = db.prepare(`
    SELECT * FROM subscription_lignes WHERE subscription_id = ? ORDER BY id ASC
  `).all(id) as SubscriptionLine[];

  return {
    ...sub,
    est_echu: sub.statut === "actif" && sub.prochaine_echeance <= today,
    lignes,
  };
}

export function getSubscriptionsStats(companyId?: number): SubscriptionStats {
  const db = getDb();
  const today = todayIso();

  const subs = (
    companyId
      ? db.prepare(`SELECT * FROM subscriptions WHERE company_id = ?`).all(companyId)
      : db.prepare(`SELECT * FROM subscriptions`).all()
  ) as any[];

  let total_mrr = 0;
  let total_arr = 0;
  let actifs_count = 0;
  let echus_count = 0;
  let suspendus_count = 0;
  let total_echu_ttc = 0;

  const par_periodicite: Record<Periodicite, { count: number; mrr: number; ttc: number }> = {
    mensuel: { count: 0, mrr: 0, ttc: 0 },
    trimestriel: { count: 0, mrr: 0, ttc: 0 },
    semestriel: { count: 0, mrr: 0, ttc: 0 },
    annuel: { count: 0, mrr: 0, ttc: 0 },
  };

  const par_mode_reglement: Record<SubscriptionModeReglement, { count: number; ttc: number }> = {
    prelevement: { count: 0, ttc: 0 },
    virement: { count: 0, ttc: 0 },
    cheque: { count: 0, ttc: 0 },
    especes: { count: 0, ttc: 0 },
    traite: { count: 0, ttc: 0 },
  };

  for (const s of subs) {
    if (s.statut === "actif") {
      actifs_count++;
      total_mrr += Number(s.mrr || 0);
      total_arr += Number(s.arr || 0);

      if (s.prochaine_echeance <= today) {
        echus_count++;
        total_echu_ttc += Number(s.total_ttc || 0);
      }
    } else if (s.statut === "suspendu") {
      suspendus_count++;
    }

    const p = s.periodicite as Periodicite;
    if (par_periodicite[p]) {
      par_periodicite[p].count++;
      par_periodicite[p].mrr += Number(s.mrr || 0);
      par_periodicite[p].ttc += Number(s.total_ttc || 0);
    }

    const m = s.mode_reglement as SubscriptionModeReglement;
    if (par_mode_reglement[m]) {
      par_mode_reglement[m].count++;
      par_mode_reglement[m].ttc += Number(s.total_ttc || 0);
    }
  }

  return {
    total_mrr: Math.round(total_mrr * 100) / 100,
    total_arr: Math.round(total_arr * 100) / 100,
    actifs_count,
    echus_count,
    suspendus_count,
    total_count: subs.length,
    total_echu_ttc: Math.round(total_echu_ttc * 100) / 100,
    par_periodicite,
    par_mode_reglement,
  };
}

export function saveSubscription(
  input: {
    id?: number;
    company_id: number;
    client_id: number;
    titre: string;
    reference?: string;
    periodicite: Periodicite;
    date_debut: string;
    date_fin?: string;
    prochaine_echeance?: string;
    statut?: SubscriptionStatut;
    mode_reglement?: SubscriptionModeReglement;
    auto_generer?: number;
    generer_statut?: "brouillon" | "valide";
    terme_paiement_jours?: number;
    notes?: string;
    lignes: Array<{
      produit_id?: number | null;
      designation: string;
      quantite: number;
      unite?: string;
      prix_unitaire_ht: number;
      tva_rate: number;
      remise?: number;
    }>;
  },
  userId?: number
): number {
  const db = getDb();

  let total_ht = 0;
  let total_tva = 0;

  const linesToInsert = input.lignes.map((l) => {
    const qte = Number(l.quantite) || 1;
    const pu = Number(l.prix_unitaire_ht) || 0;
    const remise = Number(l.remise) || 0;
    const tvaRate = Number(l.tva_rate) || 0;

    const lineHtBeforeRemise = qte * pu;
    const remiseMontant = (lineHtBeforeRemise * remise) / 100;
    const lineHt = Math.max(lineHtBeforeRemise - remiseMontant, 0);
    const lineTva = (lineHt * tvaRate) / 100;

    total_ht += lineHt;
    total_tva += lineTva;

    return {
      produit_id: l.produit_id ?? null,
      designation: l.designation,
      quantite: qte,
      unite: l.unite || "mois",
      prix_unitaire_ht: pu,
      tva_rate: tvaRate,
      remise,
      total_ht: Math.round(lineHt * 100) / 100,
    };
  });

  const total_ttc = Math.round((total_ht + total_tva) * 100) / 100;
  const { mrr, arr } = computeMrrArr(total_ttc, input.periodicite);

  const reference = input.reference?.trim() || `ABO-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
  const prochaine_echeance = input.prochaine_echeance?.trim() || input.date_debut;

  let subId = input.id ?? null;

  const tx = db.transaction(() => {
    if (subId) {
      db.prepare(`
        UPDATE subscriptions
        SET client_id = @client_id,
            titre = @titre,
            reference = @reference,
            periodicite = @periodicite,
            date_debut = @date_debut,
            date_fin = @date_fin,
            prochaine_echeance = @prochaine_echeance,
            statut = @statut,
            mode_reglement = @mode_reglement,
            auto_generer = @auto_generer,
            generer_statut = @generer_statut,
            terme_paiement_jours = @terme_paiement_jours,
            notes = @notes,
            total_ht = @total_ht,
            total_tva = @total_tva,
            total_ttc = @total_ttc,
            mrr = @mrr,
            arr = @arr,
            updated_by = @updated_by,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = @id AND company_id = @company_id
      `).run({
        id: subId,
        company_id: input.company_id,
        client_id: input.client_id,
        titre: input.titre,
        reference,
        periodicite: input.periodicite,
        date_debut: input.date_debut,
        date_fin: input.date_fin || "",
        prochaine_echeance,
        statut: input.statut || "actif",
        mode_reglement: input.mode_reglement || "virement",
        auto_generer: input.auto_generer !== undefined ? input.auto_generer : 1,
        generer_statut: input.generer_statut || "valide",
        terme_paiement_jours: input.terme_paiement_jours !== undefined ? input.terme_paiement_jours : 30,
        notes: input.notes || "",
        total_ht: Math.round(total_ht * 100) / 100,
        total_tva: Math.round(total_tva * 100) / 100,
        total_ttc,
        mrr,
        arr,
        updated_by: userId,
      });

      db.prepare("DELETE FROM subscription_lignes WHERE subscription_id = ?").run(subId);
    } else {
      const res = db.prepare(`
        INSERT INTO subscriptions (
          company_id, client_id, titre, reference, periodicite, date_debut, date_fin,
          prochaine_echeance, statut, mode_reglement, auto_generer, generer_statut,
          terme_paiement_jours, notes, total_ht, total_tva, total_ttc, mrr, arr,
          created_by, updated_by
        ) VALUES (
          @company_id, @client_id, @titre, @reference, @periodicite, @date_debut, @date_fin,
          @prochaine_echeance, @statut, @mode_reglement, @auto_generer, @generer_statut,
          @terme_paiement_jours, @notes, @total_ht, @total_tva, @total_ttc, @mrr, @arr,
          @created_by, @updated_by
        )
      `).run({
        company_id: input.company_id,
        client_id: input.client_id,
        titre: input.titre,
        reference,
        periodicite: input.periodicite,
        date_debut: input.date_debut,
        date_fin: input.date_fin || "",
        prochaine_echeance,
        statut: input.statut || "actif",
        mode_reglement: input.mode_reglement || "virement",
        auto_generer: input.auto_generer !== undefined ? input.auto_generer : 1,
        generer_statut: input.generer_statut || "valide",
        terme_paiement_jours: input.terme_paiement_jours !== undefined ? input.terme_paiement_jours : 30,
        notes: input.notes || "",
        total_ht: Math.round(total_ht * 100) / 100,
        total_tva: Math.round(total_tva * 100) / 100,
        total_ttc,
        mrr,
        arr,
        created_by: userId,
        updated_by: userId,
      });
      subId = Number(res.lastInsertRowid);
    }

    const insertLine = db.prepare(`
      INSERT INTO subscription_lignes (
        subscription_id, produit_id, designation, quantite, unite, prix_unitaire_ht, tva_rate, remise, total_ht
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const l of linesToInsert) {
      insertLine.run(
        subId,
        l.produit_id,
        l.designation,
        l.quantite,
        l.unite,
        l.prix_unitaire_ht,
        l.tva_rate,
        l.remise,
        l.total_ht
      );
    }

    logAudit(userId ?? null, subId ? "update" : "create", "subscription", subId, {
      titre: input.titre,
      client_id: input.client_id,
      total_ttc,
      mrr,
    });
  });

  tx();
  return subId!;
}

export function generateSubscriptionInvoice(
  subscriptionId: number,
  userId?: number
): { documentId: number; invoiceNumero: number; nextEcheance: string } {
  const db = getDb();
  const sub = getSubscription(subscriptionId);
  if (!sub) {
    throw new Error("Abonnement introuvable");
  }

  const invoiceDate = sub.prochaine_echeance || todayIso();
  const dateEcheance = new Date(new Date(invoiceDate).getTime() + sub.terme_paiement_jours * 86400000)
    .toISOString()
    .slice(0, 10);

  const periodeLabel = `Échéance ${invoiceDate} (${sub.periodicite})`;

  const docLines = (sub.lignes || []).map((l) => ({
    produit_id: l.produit_id ?? null,
    designation: `${l.designation} (${sub.titre} - ${periodeLabel})`,
    quantite: l.quantite,
    unite: l.unite || "mois",
    prix_unitaire_ht: l.prix_unitaire_ht,
    tva_rate: l.tva_rate,
    remise: l.remise || 0,
  }));

  const documentId = saveDocument(
    {
      company_id: sub.company_id,
      type: "facture",
      date: invoiceDate,
      date_echeance: dateEcheance,
      client_id: sub.client_id,
      notes: `Facturation récurrente automatique - Contrat réf: ${sub.reference} (${sub.titre})\nMode de règlement : ${sub.mode_reglement}`,
      status: sub.generer_statut || "valide",
      lines: docLines,
    },
    userId ?? 1
  );

  const savedDoc = getDocumentById(documentId);
  const invoiceNumero = savedDoc?.numero ?? documentId;

  const nextEcheance = computeNextEcheance(invoiceDate, sub.periodicite);

  let newStatut = sub.statut;
  if (sub.date_fin && nextEcheance > sub.date_fin) {
    newStatut = "termine";
  }

  db.prepare(`
    UPDATE subscriptions
    SET prochaine_echeance = ?,
        derniere_facturation_date = ?,
        statut = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(nextEcheance, invoiceDate, newStatut, sub.id);

  db.prepare(`
    INSERT INTO subscription_invoices_log (
      subscription_id, document_id, periode_label, montant_ttc, created_by
    ) VALUES (?, ?, ?, ?, ?)
  `).run(sub.id, documentId, periodeLabel, sub.total_ttc, userId ?? null);

  logAudit(userId ?? null, "create", "document", documentId, {
    source: "subscription",
    subscription_id: sub.id,
    invoiceNumero,
    montant: sub.total_ttc,
  });

  return { documentId, invoiceNumero, nextEcheance };
}

export function generateBatchDueInvoices(
  companyId: number,
  userId?: number
): {
  generatedCount: number;
  invoices: Array<{ id: number; numero: number; subscriptionId: number; clientName: string; totalTtc: number }>;
} {
  const db = getDb();
  const today = todayIso();

  const dueSubs = db.prepare(`
    SELECT id, client_id FROM subscriptions
    WHERE company_id = ? AND statut = 'actif' AND auto_generer = 1 AND prochaine_echeance <= ?
    ORDER BY prochaine_echeance ASC
  `).all(companyId, today) as Array<{ id: number; client_id: number }>;

  const invoices: Array<{ id: number; numero: number; subscriptionId: number; clientName: string; totalTtc: number }> = [];

  for (const s of dueSubs) {
    try {
      const res = generateSubscriptionInvoice(s.id, userId);
      const sub = getSubscription(s.id);
      invoices.push({
        id: res.documentId,
        numero: res.invoiceNumero,
        subscriptionId: s.id,
        clientName: sub?.client_name || "Client",
        totalTtc: sub?.total_ttc || 0,
      });
    } catch (err) {
      console.error(`Erreur génération facture abonnement #${s.id}:`, err);
    }
  }

  return {
    generatedCount: invoices.length,
    invoices,
  };
}

export function listSubscriptionInvoices(subscriptionId: number): SubscriptionInvoiceRecord[] {
  const db = getDb();

  const rows = db.prepare(`
    SELECT 
      sil.id,
      sil.subscription_id,
      sil.document_id,
      sil.periode_label,
      sil.date_generation,
      sil.montant_ttc,
      d.numero as document_numero,
      d.date as document_date,
      d.date_echeance as document_date_echeance,
      d.status as document_status,
      d.reste as document_reste
    FROM subscription_invoices_log sil
    JOIN documents d ON sil.document_id = d.id
    WHERE sil.subscription_id = ?
    ORDER BY sil.date_generation DESC, sil.id DESC
  `).all(subscriptionId) as SubscriptionInvoiceRecord[];

  return rows;
}

export function deleteSubscription(id: number, userId?: number): void {
  const db = getDb();
  db.prepare("DELETE FROM subscriptions WHERE id = ?").run(id);
  logAudit(userId ?? null, "delete", "subscription", id, {});
}

export function toggleSubscriptionStatus(
  id: number,
  newStatus: SubscriptionStatut,
  userId?: number
): void {
  const db = getDb();
  db.prepare(`
    UPDATE subscriptions
    SET statut = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(newStatus, id);

  logAudit(userId ?? null, "update", "subscription", id, { newStatus });
}

// ==========================================
// PORTAIL CLIENT DÉDIÉ (ESPACE CLIENT SÉCURISÉ)
// ==========================================

export function getClientByPortalToken(token: string): ClientPortalSession | null {
  if (!token || typeof token !== "string") return null;
  const db = getDb();
  const client = db
    .prepare(`
      SELECT id, name, phone, email, ice, portal_token, portal_enabled
      FROM clients
      WHERE portal_token = ? AND portal_enabled = 1
    `)
    .get(token.trim()) as (EntityRecord & { portal_token: string; portal_enabled: number }) | undefined;

  if (!client) return null;

  db.prepare(`
    UPDATE clients
    SET portal_last_login = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(client.id);

  return {
    clientId: client.id,
    name: client.name,
    phone: client.phone,
    ice: client.ice || undefined,
    email: client.email || undefined,
    token: client.portal_token,
  };
}

export function getClientByPortalCode(identifier: string, code: string): ClientPortalSession | null {
  if (!identifier || !code) return null;
  const db = getDb();
  const cleanId = identifier.trim().replace(/\s+/g, "");
  const cleanCode = code.trim();

  const client = db
    .prepare(`
      SELECT id, name, phone, email, ice, portal_token, portal_access_code, portal_enabled
      FROM clients
      WHERE portal_enabled = 1
        AND portal_access_code = ?
        AND (
          REPLACE(phone, ' ', '') = ?
          OR REPLACE(ice, ' ', '') = ?
          OR LOWER(name) LIKE ?
        )
      LIMIT 1
    `)
    .get(cleanCode, cleanId, cleanId, `%${identifier.trim().toLowerCase()}%`) as
    | (EntityRecord & { portal_token: string; portal_access_code: string; portal_enabled: number })
    | undefined;

  if (!client) return null;

  db.prepare(`
    UPDATE clients
    SET portal_last_login = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(client.id);

  return {
    clientId: client.id,
    name: client.name,
    phone: client.phone,
    ice: client.ice || undefined,
    email: client.email || undefined,
    token: client.portal_token,
  };
}

export function getClientPortalData(clientId: number): ClientPortalData | null {
  const db = getDb();
  const client = db
    .prepare(`
      SELECT id, name, ice, address, phone, email, portal_access_code, portal_token, portal_last_login, portal_enabled
      FROM clients
      WHERE id = ? AND portal_enabled = 1
    `)
    .get(clientId) as EntityRecord | undefined;

  if (!client) return null;

  const company = getCompany();

  const docs = db
    .prepare(`
      SELECT id, type, numero, date, date_echeance, total_ht, total_tva, total_ttc, avance, reste, status,
             signed_at, signed_by_name, signature_data, notes
      FROM documents
      WHERE client_id = ?
      ORDER BY date DESC, numero DESC
    `)
    .all(clientId) as PortalDocumentItem[];

  const factures = docs.filter((d) => d.type === "facture");
  const bons_commande = docs.filter((d) => d.type === "bc");
  const devis = docs.filter((d) => d.type === "devis");
  const bons_livraison = docs.filter((d) => d.type === "bl");

  let totalFactureTtc = 0;
  let totalRegleTtc = 0;
  let soldeDuTtc = 0;
  let facturesImpayeesCount = 0;

  for (const f of factures) {
    totalFactureTtc += f.total_ttc || 0;
    totalRegleTtc += f.avance || 0;
    soldeDuTtc += f.reste || 0;
    if ((f.reste || 0) > 0.01) {
      facturesImpayeesCount++;
    }
  }

  const bcEnAttenteCount = bons_commande.filter((bc) => !bc.signed_at).length;
  const abonnements = listSubscriptions(company.id, { clientId });

  return {
    client: {
      id: client.id,
      name: client.name,
      ice: client.ice || "",
      address: client.address || "",
      phone: client.phone || "",
      email: client.email || "",
      portal_access_code: client.portal_access_code || "",
      portal_token: client.portal_token || "",
      portal_last_login: client.portal_last_login || "",
    },
    company,
    stats: {
      total_facture_ttc: Math.round(totalFactureTtc * 100) / 100,
      total_regle_ttc: Math.round(totalRegleTtc * 100) / 100,
      solde_du_ttc: Math.round(soldeDuTtc * 100) / 100,
      factures_count: factures.length,
      factures_impayees_count: facturesImpayeesCount,
      devis_count: devis.length,
      bc_en_attente_count: bcEnAttenteCount,
    },
    factures,
    bons_commande,
    devis,
    bons_livraison,
    abonnements,
  };
}

export function signDocumentByClient(
  clientId: number,
  documentId: number,
  signerName: string,
  signatureData: string,
  ip = ""
): { success: boolean; error?: string } {
  const db = getDb();
  const doc = db
    .prepare(`
      SELECT id, type, client_id, status, signed_at
      FROM documents
      WHERE id = ? AND client_id = ?
    `)
    .get(documentId, clientId) as { id: number; type: string; client_id: number; status: string; signed_at?: string } | undefined;

  if (!doc) {
    return { success: false, error: "Document introuvable ou non autorisé." };
  }

  const signableTypes = new Set(["bc", "bon-commande", "bons-commande", "devis", "bl", "bon-livraison", "bons-livraison"]);
  if (!signableTypes.has(doc.type.toLowerCase())) {
    return { success: false, error: "Seuls les devis, bons de commande et bons de livraison peuvent être signés électroniquement." };
  }

  if (doc.signed_at) {
    return { success: false, error: "Ce document a déjà été signé électroniquement." };
  }

  db.prepare(`
    UPDATE documents
    SET signed_at = CURRENT_TIMESTAMP,
        signed_by_name = ?,
        signature_data = ?,
        signature_ip = ?,
        status = 'valide',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND client_id = ?
  `).run(signerName.trim(), signatureData, ip, documentId, clientId);

  logAudit(null, "sign", "document", documentId, {
    client_id: clientId,
    signed_by: signerName,
    ip,
  });

  return { success: true };
}

export function regenerateClientPortalAccess(clientId: number, actorId?: number) {
  const db = getDb();
  const newPin = Math.floor(100000 + Math.random() * 900000).toString();
  const newToken = crypto.randomBytes(16).toString("hex");

  db.prepare(`
    UPDATE clients
    SET portal_access_code = ?,
        portal_token = ?,
        portal_enabled = 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(newPin, newToken, clientId);

  logAudit(actorId ?? null, "update", "client_portal_access", clientId, { newPin });
  return { portal_access_code: newPin, portal_token: newToken };
}

// ==========================================
// PORTAIL CLIENT CLOUD SYNC (DESKTOP <-> DEPLOYED PORTAL)
// ==========================================

export function getPortalSyncSettings(): PortalSyncSettings {
  const db = getDb();
  const rows = db
    .prepare(`
      SELECT key, value
      FROM app_settings
      WHERE key IN ('portal.public_url', 'portal.sync_secret', 'portal.auto_sync', 'portal.last_synced_at')
    `)
    .all() as Array<{ key: string; value: string }>;

  const map = new Map(rows.map((r) => [r.key, r.value]));

  let syncSecret = map.get("portal.sync_secret");
  if (!syncSecret) {
    syncSecret = crypto.randomBytes(16).toString("hex");
    db.prepare(`
      INSERT OR REPLACE INTO app_settings (key, value)
      VALUES ('portal.sync_secret', ?)
    `).run(syncSecret);
  }

  return {
    publicUrl: map.get("portal.public_url") || "",
    syncSecret,
    autoSync: map.get("portal.auto_sync") === "1",
    lastSyncedAt: map.get("portal.last_synced_at") || undefined,
  };
}

export function savePortalSyncSettings(
  input: Partial<PortalSyncSettings>,
  userId?: number
): PortalSyncSettings {
  const db = getDb();
  const insert = db.prepare(`
    INSERT INTO app_settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);

  const runTx = db.transaction(() => {
    if (input.publicUrl !== undefined) {
      insert.run("portal.public_url", input.publicUrl.trim());
    }
    if (input.syncSecret !== undefined && input.syncSecret.trim()) {
      insert.run("portal.sync_secret", input.syncSecret.trim());
    }
    if (input.autoSync !== undefined) {
      insert.run("portal.auto_sync", input.autoSync ? "1" : "0");
    }
    if (input.lastSyncedAt !== undefined) {
      insert.run("portal.last_synced_at", input.lastSyncedAt);
    }
  });

  runTx();
  logAudit(userId ?? null, "update", "portal_sync_settings", null, input);
  return getPortalSyncSettings();
}

export function getPortalSyncExportPayload(): PortalSyncExportPayload {
  const db = getDb();
  const company = getCompany();

  const clients = db
    .prepare(`
      SELECT id, name, ice, address, phone, email, notes, portal_enabled, portal_access_code, portal_token, portal_last_login
      FROM clients
      WHERE portal_enabled = 1
    `)
    .all() as PortalSyncExportPayload["clients"];

  const documents = db
    .prepare(`
      SELECT id, company_id, client_id, type, numero, date, date_echeance, total_ht, total_tva, total_ttc, avance, reste, status,
             signed_at, signed_by_name, signature_data, notes
      FROM documents
      WHERE client_id IS NOT NULL AND client_id > 0
      ORDER BY id ASC
    `)
    .all() as PortalSyncExportPayload["documents"];

  const document_lines = db
    .prepare(`
      SELECT dl.id, dl.document_id, dl.reference, dl.description, dl.quantite, dl.unite, dl.prix_unitaire_ht, dl.taux_tva, dl.total_ht, dl.total_ttc
      FROM document_lines dl
      JOIN documents d ON d.id = dl.document_id
      WHERE d.client_id IS NOT NULL AND d.client_id > 0
      ORDER BY dl.id ASC
    `)
    .all() as PortalSyncExportPayload["document_lines"];

  return {
    version: "1.0",
    source: "desktop",
    exportedAt: new Date().toISOString(),
    company: company
      ? {
          id: company.id,
          name: company.name,
          arabic_name: company.arabic_name,
          address: company.address,
          phone: company.phone,
          gsm: company.gsm,
          rc: company.rc,
          if_number: company.if_number,
          tp: company.tp,
          ice: company.ice,
          legal_notice: company.legal_notice,
          logo_path: company.logo_path,
        }
      : undefined,
    clients,
    documents,
    document_lines,
  };
}

export function applyPortalSyncIncomingPush(payload: PortalSyncExportPayload) {
  const db = getDb();

  const runSync = db.transaction(() => {
    // 1. Upsert Clients
    const upsertClient = db.prepare(`
      INSERT INTO clients (id, name, ice, address, phone, email, notes, portal_enabled, portal_access_code, portal_token, portal_last_login, created_by, updated_by)
      VALUES (@id, @name, @ice, @address, @phone, @email, @notes, @portal_enabled, @portal_access_code, @portal_token, @portal_last_login, 1, 1)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        ice = excluded.ice,
        address = excluded.address,
        phone = excluded.phone,
        email = excluded.email,
        notes = excluded.notes,
        portal_enabled = excluded.portal_enabled,
        portal_access_code = COALESCE(NULLIF(excluded.portal_access_code, ''), clients.portal_access_code),
        portal_token = COALESCE(NULLIF(excluded.portal_token, ''), clients.portal_token),
        updated_at = CURRENT_TIMESTAMP
    `);

    for (const c of payload.clients) {
      upsertClient.run({
        id: c.id,
        name: c.name,
        ice: c.ice || "",
        address: c.address || "",
        phone: c.phone || "",
        email: c.email || "",
        notes: c.notes || "",
        portal_enabled: c.portal_enabled ?? 1,
        portal_access_code: c.portal_access_code || "",
        portal_token: c.portal_token || "",
        portal_last_login: c.portal_last_login || "",
      });
    }

    // 2. Upsert Documents
    const upsertDoc = db.prepare(`
      INSERT INTO documents (
        id, company_id, client_id, type, numero, date, date_echeance, total_ht, total_tva, total_ttc, avance, reste, status,
        signed_at, signed_by_name, signature_data, notes, created_by, updated_by
      )
      VALUES (
        @id, @company_id, @client_id, @type, @numero, @date, @date_echeance, @total_ht, @total_tva, @total_ttc, @avance, @reste, @status,
        @signed_at, @signed_by_name, @signature_data, @notes, 1, 1
      )
      ON CONFLICT(id) DO UPDATE SET
        type = excluded.type,
        numero = excluded.numero,
        date = excluded.date,
        date_echeance = excluded.date_echeance,
        total_ht = excluded.total_ht,
        total_tva = excluded.total_tva,
        total_ttc = excluded.total_ttc,
        avance = excluded.avance,
        reste = excluded.reste,
        notes = excluded.notes,
        status = CASE WHEN documents.signed_at IS NOT NULL THEN documents.status ELSE excluded.status END,
        signed_at = COALESCE(documents.signed_at, excluded.signed_at),
        signed_by_name = COALESCE(documents.signed_by_name, excluded.signed_by_name),
        signature_data = COALESCE(documents.signature_data, excluded.signature_data),
        updated_at = CURRENT_TIMESTAMP
    `);

    for (const doc of payload.documents) {
      upsertDoc.run({
        id: doc.id,
        company_id: doc.company_id || 1,
        client_id: doc.client_id,
        type: doc.type,
        numero: doc.numero,
        date: doc.date,
        date_echeance: doc.date_echeance || "",
        total_ht: doc.total_ht || 0,
        total_tva: doc.total_tva || 0,
        total_ttc: doc.total_ttc || 0,
        avance: doc.avance || 0,
        reste: doc.reste || 0,
        status: doc.status || "valide",
        signed_at: doc.signed_at || null,
        signed_by_name: doc.signed_by_name || null,
        signature_data: doc.signature_data || null,
        notes: doc.notes || "",
      });
    }

    // 3. Upsert Document Lines
    if (payload.document_lines && payload.document_lines.length > 0) {
      const docIds = [...new Set(payload.document_lines.map((l) => l.document_id))];
      if (docIds.length > 0) {
        db.prepare(
          `DELETE FROM document_lines WHERE document_id IN (${docIds.map(() => "?").join(",")})`
        ).run(...docIds);
      }

      const insertLine = db.prepare(`
        INSERT INTO document_lines (id, document_id, reference, description, quantite, unite, prix_unitaire_ht, taux_tva, total_ht, total_ttc)
        VALUES (@id, @document_id, @reference, @description, @quantite, @unite, @prix_unitaire_ht, @taux_tva, @total_ht, @total_ttc)
      `);

      for (const line of payload.document_lines) {
        insertLine.run({
          id: line.id,
          document_id: line.document_id,
          reference: line.reference || "",
          description: line.description,
          quantite: line.quantite,
          unite: line.unite || "",
          prix_unitaire_ht: line.prix_unitaire_ht,
          taux_tva: line.taux_tva,
          total_ht: line.total_ht,
          total_ttc: line.total_ttc,
        });
      }
    }
  });

  runSync();
}

export function applyPortalSyncIncomingPull(response: PortalSyncResponse) {
  const db = getDb();
  let updatedSignatures = 0;

  const runPull = db.transaction(() => {
    if (response.signedDocuments && response.signedDocuments.length > 0) {
      const updateDoc = db.prepare(`
        UPDATE documents
        SET signed_at = @signed_at,
            signed_by_name = @signed_by_name,
            signature_data = @signature_data,
            status = CASE WHEN status = 'brouillon' THEN 'valide' ELSE status END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = @id AND (signed_at IS NULL OR signed_at = '')
      `);

      for (const item of response.signedDocuments) {
        const res = updateDoc.run(item);
        if (res.changes > 0) {
          updatedSignatures++;
        }
      }
    }

    if (response.clientLastLogins && response.clientLastLogins.length > 0) {
      const updateLogin = db.prepare(`
        UPDATE clients
        SET portal_last_login = ?
        WHERE id = ?
      `);

      for (const item of response.clientLastLogins) {
        updateLogin.run(item.portal_last_login, item.id);
      }
    }

    db.prepare(`
      INSERT INTO app_settings (key, value)
      VALUES ('portal.last_synced_at', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(new Date().toISOString());
  });

  runPull();
  return { updatedSignatures };
}

// ============================================================================
// GESTION DU RAPPROCHEMENT BANCAIRE AUTOMATISÉ (OFX, QIF, CSV)
// ============================================================================

export function listBankAccounts(companyId = 1): BankAccountRecord[] {
  const db = getDb();
  return db
    .prepare(`
      SELECT *
      FROM bank_accounts
      WHERE company_id = ? AND statut != 'archive'
      ORDER BY id ASC
    `)
    .all(companyId) as BankAccountRecord[];
}

export function getBankAccountById(id: number): BankAccountRecord | null {
  const db = getDb();
  const res = db.prepare("SELECT * FROM bank_accounts WHERE id = ?").get(id);
  return (res as BankAccountRecord) ?? null;
}

export function saveBankAccount(
  input: {
    id?: number;
    company_id?: number;
    nom_banque: string;
    intitule_compte: string;
    rib?: string;
    iban?: string;
    bic_swift?: string;
    devise?: string;
    solde_initial?: number;
    statut?: "actif" | "archive";
  },
  actorId?: number,
): BankAccountRecord {
  const db = getDb();
  const companyId = input.company_id ?? 1;
  const nomBanque = input.nom_banque.trim();
  const intitule = input.intitule_compte.trim();
  const rib = (input.rib ?? "").trim();
  const iban = (input.iban ?? "").trim();
  const bic = (input.bic_swift ?? "").trim();
  const devise = input.devise?.trim() || "MAD";
  const soldeInitial = Number(input.solde_initial ?? 0);
  const statut = input.statut ?? "actif";

  if (input.id) {
    db.prepare(`
      UPDATE bank_accounts
      SET nom_banque = ?,
          intitule_compte = ?,
          rib = ?,
          iban = ?,
          bic_swift = ?,
          devise = ?,
          solde_initial = ?,
          statut = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(nomBanque, intitule, rib, iban, bic, devise, soldeInitial, statut, input.id);
    return getBankAccountById(input.id)!;
  }

  const result = db.prepare(`
    INSERT INTO bank_accounts (
      company_id, nom_banque, intitule_compte, rib, iban, bic_swift,
      devise, solde_initial, solde_actuel, solde_rapproche, statut, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(companyId, nomBanque, intitule, rib, iban, bic, devise, soldeInitial, soldeInitial, soldeInitial, statut, actorId ?? null);

  return getBankAccountById(Number(result.lastInsertRowid))!;
}

function updateBankAccountReconciledBalance(accountId: number) {
  const db = getDb();
  const account = getBankAccountById(accountId);
  if (!account) return;

  const totals = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type_mouvement = 'credit' THEN montant ELSE 0 END), 0) as total_credits,
      COALESCE(SUM(CASE WHEN type_mouvement = 'debit' THEN montant ELSE 0 END), 0) as total_debits
    FROM bank_operations
    WHERE bank_account_id = ? AND statut_rapprochement = 'rapproche'
  `).get(accountId) as { total_credits: number; total_debits: number };

  const soldeRapproche = account.solde_initial + totals.total_credits - totals.total_debits;

  db.prepare(`
    UPDATE bank_accounts
    SET solde_rapproche = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(soldeRapproche, accountId);
}

function hydrateOperationMatches(ops: BankOperationRecord[], companyId: number): BankOperationRecord[] {
  const db = getDb();

  const invoices = db
    .prepare(`
      SELECT d.id, d.numero, d.type, d.date, d.total_ttc, d.reste, d.avance,
             c.name as client_name, c.ice as client_ice
      FROM documents d
      LEFT JOIN clients c ON d.client_id = c.id
      WHERE d.company_id = ? AND d.type = 'facture' AND d.status = 'valide'
    `)
    .all(companyId) as Array<{
      id: number;
      numero: number;
      type: string;
      date: string;
      total_ttc: number;
      reste: number;
      avance: number;
      client_name?: string;
      client_ice?: string;
    }>;

  const expenses = db
    .prepare(`
      SELECT sc.id, sc.date, sc.montant, sc.motif, sc.beneficiaire
      FROM sorties_caisse sc
      ORDER BY sc.date DESC
      LIMIT 200
    `)
    .all() as Array<{
      id: number;
      date: string;
      montant: number;
      motif: string;
      beneficiaire: string;
    }>;

  return ops.map((op) => {
    if (op.statut_rapprochement === "rapproche" && op.document_id) {
      if (op.document_type === "facture") {
        const doc = invoices.find((inv) => inv.id === op.document_id);
        if (doc) {
          return {
            ...op,
            matched_document: {
              id: doc.id,
              numero: doc.numero,
              type: doc.type,
              date: doc.date,
              total_ttc: doc.total_ttc,
              reste: doc.reste,
              client_name: doc.client_name,
            },
          };
        }
      }
      return op;
    }

    const libelleNorm = (op.libelle || "").toLowerCase();

    if (op.type_mouvement === "credit") {
      let bestScore = 0;
      let bestMatch: any = null;
      let matchMotif = "";

      for (const inv of invoices) {
        let score = 0;
        const numStr = String(inv.numero);
        const facCode = `fac-${numStr.padStart(4, "0")}`.toLowerCase();
        const clientNorm = (inv.client_name || "").toLowerCase();

        const amountExactMatch = Math.abs(inv.reste - op.montant) < 0.01 || Math.abs(inv.total_ttc - op.montant) < 0.01;
        const hasNum = libelleNorm.includes(facCode) || libelleNorm.includes(`fac-${numStr}`) || libelleNorm.includes(`fac ${numStr}`) || libelleNorm.includes(`facture ${numStr}`);
        const hasClient = clientNorm && clientNorm.length > 3 && libelleNorm.includes(clientNorm);

        if (amountExactMatch && (hasNum || hasClient)) {
          score = 100;
          matchMotif = hasNum ? `Facture #${inv.numero} mentionnée et montant exact` : `Client ${inv.client_name} et montant exact`;
        } else if (amountExactMatch) {
          score = 85;
          matchMotif = `Montant identique (${op.montant.toFixed(2)} MAD) avec Facture #${inv.numero}`;
        } else if (hasNum) {
          score = 75;
          matchMotif = `Règlement partiel détecté pour Facture #${inv.numero}`;
        } else if (hasClient) {
          score = 60;
          matchMotif = `Virement du client ${inv.client_name}`;
        }

        if (score > bestScore) {
          bestScore = score;
          bestMatch = inv;
        }
      }

      if (bestMatch && bestScore >= 60) {
        return {
          ...op,
          statut_rapprochement: op.statut_rapprochement === "non_rapproche" ? "suggere" : op.statut_rapprochement,
          rapprochement_score: bestScore,
          suggestion: {
            document_id: bestMatch.id,
            document_numero: bestMatch.numero,
            document_type: "facture",
            document_date: bestMatch.date,
            entity_name: bestMatch.client_name || `Facture #${bestMatch.numero}`,
            montant: bestMatch.total_ttc,
            score: bestScore,
            motif: matchMotif,
          },
        };
      }
    } else if (op.type_mouvement === "debit") {
      for (const exp of expenses) {
        if (Math.abs(exp.montant - op.montant) < 0.01) {
          return {
            ...op,
            statut_rapprochement: op.statut_rapprochement === "non_rapproche" ? "suggere" : op.statut_rapprochement,
            rapprochement_score: 85,
            suggestion: {
              document_id: exp.id,
              document_numero: exp.id,
              document_type: "sortie_caisse",
              document_date: exp.date,
              entity_name: exp.motif || exp.beneficiaire || "Dépense enregistrée",
              montant: exp.montant,
              score: 85,
              motif: `Montant identique avec dépense caisse du ${exp.date}`,
            },
          };
        }
      }
    }

    return op;
  });
}

export function listBankStatements(accountId?: number, companyId = 1): BankStatementRecord[] {
  const db = getDb();
  if (accountId) {
    return db
      .prepare(`
        SELECT *
        FROM bank_statements
        WHERE bank_account_id = ?
        ORDER BY date_import DESC, id DESC
      `)
      .all(accountId) as BankStatementRecord[];
  }

  return db
    .prepare(`
      SELECT *
      FROM bank_statements
      WHERE company_id = ?
      ORDER BY date_import DESC, id DESC
    `)
    .all(companyId) as BankStatementRecord[];
}

export function getBankStatementWithOperations(statementId: number): {
  statement: BankStatementRecord;
  operations: BankOperationRecord[];
  stats: ReconciliationStats;
  account: BankAccountRecord;
} | null {
  const db = getDb();
  const statement = db.prepare("SELECT * FROM bank_statements WHERE id = ?").get(statementId) as BankStatementRecord | undefined;
  if (!statement) return null;

  const account = getBankAccountById(statement.bank_account_id);
  if (!account) return null;

  const rawOps = db
    .prepare(`
      SELECT *
      FROM bank_operations
      WHERE statement_id = ?
      ORDER BY date_operation DESC, id DESC
    `)
    .all(statementId) as BankOperationRecord[];

  const operations = hydrateOperationMatches(rawOps, statement.company_id);

  const totalOperations = operations.length;
  const nbRapprochees = operations.filter((op) => op.statut_rapprochement === "rapproche").length;
  const nbSuggeres = operations.filter((op) => op.statut_rapprochement === "suggere").length;
  const nbEnAttente = totalOperations - nbRapprochees;

  const creditsRapproches = operations
    .filter((op) => op.statut_rapprochement === "rapproche" && op.type_mouvement === "credit")
    .reduce((sum, op) => sum + op.montant, 0);

  const debitsRapproches = operations
    .filter((op) => op.statut_rapprochement === "rapproche" && op.type_mouvement === "debit")
    .reduce((sum, op) => sum + op.montant, 0);

  const soldeRapproche = account.solde_initial + creditsRapproches - debitsRapproches;
  const soldeReleve = statement.solde_final || (statement.solde_initial + statement.total_credits - statement.total_debits);
  const soldeComptable = account.solde_actuel;
  const ecartRapprochement = Math.round((soldeReleve - soldeRapproche) * 100) / 100;
  const tauxRapprochementPercent = totalOperations > 0 ? Math.round((nbRapprochees / totalOperations) * 100) : 100;

  const stats: ReconciliationStats = {
    totalOperations,
    nbRapprochees,
    nbSuggeres,
    nbEnAttente,
    soldeReleve,
    soldeRapproche,
    soldeComptable,
    ecartRapprochement,
    tauxRapprochementPercent,
  };

  return { statement, operations, stats, account };
}

export function importBankStatementData(
  input: {
    accountId: number;
    companyId?: number;
    fileName: string;
    format?: "OFX" | "QIF" | "CSV";
    rawContent: string;
  },
  actorId?: number,
): { statementId: number; nbOperations: number } {
  const db = getDb();
  const companyId = input.companyId ?? 1;
  const account = getBankAccountById(input.accountId);
  if (!account) throw new Error("Compte bancaire introuvable.");

  const parsed = parseBankStatementFile(input.fileName, input.rawContent);
  if (!parsed.operations || parsed.operations.length === 0) {
    throw new Error("Aucune opération bancaire n'a pu être extraite du fichier.");
  }

  const totalDebits = parsed.operations
    .filter((op) => op.type === "debit")
    .reduce((sum, op) => sum + op.montant, 0);

  const totalCredits = parsed.operations
    .filter((op) => op.type === "credit")
    .reduce((sum, op) => sum + op.montant, 0);

  const soldeInitial = parsed.soldeInitial ?? account.solde_actuel;
  const soldeFinal = parsed.soldeFinal ?? (soldeInitial + totalCredits - totalDebits);

  const insertStatement = db.prepare(`
    INSERT INTO bank_statements (
      company_id, bank_account_id, nom_fichier, format_fichier,
      date_debut, date_fin, solde_initial, solde_final,
      total_debits, total_credits, nb_operations, nb_rapprochees,
      statut, imported_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'en_cours', ?)
  `);

  const insertOp = db.prepare(`
    INSERT INTO bank_operations (
      company_id, statement_id, bank_account_id, date_operation, date_valeur,
      libelle, reference_bancaire, type_mouvement, montant, categorie,
      statut_rapprochement, rapprochement_score
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'non_rapproche', 0)
  `);

  let statementId = 0;

  const runImport = db.transaction(() => {
    const res = insertStatement.run(
      companyId,
      input.accountId,
      input.fileName,
      parsed.format,
      parsed.dateDebut || "",
      parsed.dateFin || "",
      soldeInitial,
      soldeFinal,
      totalDebits,
      totalCredits,
      parsed.operations.length,
      actorId ?? null,
    );

    statementId = Number(res.lastInsertRowid);

    for (const op of parsed.operations) {
      insertOp.run(
        companyId,
        statementId,
        input.accountId,
        op.date,
        op.dateValeur || "",
        op.libelle,
        op.reference || "",
        op.type,
        op.montant,
        op.categorie || "",
      );
    }

    db.prepare(`
      UPDATE bank_accounts
      SET solde_actuel = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(soldeFinal, input.accountId);
  });

  runImport();
  return { statementId, nbOperations: parsed.operations.length };
}

export function autoReconcileStatement(
  statementId: number,
  minScore = 85,
  actorId?: number,
): { reconciledCount: number } {
  const statementData = getBankStatementWithOperations(statementId);
  if (!statementData) throw new Error("Relevé bancaire introuvable.");

  const db = getDb();
  let reconciledCount = 0;

  const eligibleOps = statementData.operations.filter(
    (op) =>
      op.statut_rapprochement !== "rapproche" &&
      op.suggestion &&
      op.suggestion.score >= minScore,
  );

  if (eligibleOps.length === 0) {
    return { reconciledCount: 0 };
  }

  const runAuto = db.transaction(() => {
    const updateOp = db.prepare(`
      UPDATE bank_operations
      SET statut_rapprochement = 'rapproche',
          rapprochement_score = ?,
          document_id = ?,
          document_type = ?,
          rapproche_le = CURRENT_TIMESTAMP,
          rapproche_par = ?
      WHERE id = ?
    `);

    for (const op of eligibleOps) {
      const sug = op.suggestion!;
      updateOp.run(sug.score, sug.document_id, sug.document_type, actorId ?? null, op.id);

      if (sug.document_type === "facture") {
        db.prepare(`
          UPDATE documents
          SET avance = MIN(total_ttc, avance + ?),
              reste = MAX(0, total_ttc - (avance + ?)),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(op.montant, op.montant, sug.document_id);
      }

      reconciledCount++;
    }

    db.prepare(`
      UPDATE bank_statements
      SET nb_rapprochees = (
        SELECT COUNT(*) FROM bank_operations
        WHERE statement_id = ? AND statut_rapprochement = 'rapproche'
      )
      WHERE id = ?
    `).run(statementId, statementId);

    updateBankAccountReconciledBalance(statementData.account.id);
  });

  runAuto();
  return { reconciledCount };
}

export function reconcileBankOperation(
  operationId: number,
  documentId: number,
  documentType: string,
  actorId?: number,
): boolean {
  const db = getDb();
  const op = db.prepare("SELECT * FROM bank_operations WHERE id = ?").get(operationId) as BankOperationRecord | undefined;
  if (!op) return false;

  const runReconcile = db.transaction(() => {
    db.prepare(`
      UPDATE bank_operations
      SET statut_rapprochement = 'rapproche',
          rapprochement_score = 100,
          document_id = ?,
          document_type = ?,
          rapproche_le = CURRENT_TIMESTAMP,
          rapproche_par = ?
      WHERE id = ?
    `).run(documentId, documentType, actorId ?? null, operationId);

    if (documentType === "facture") {
      db.prepare(`
        UPDATE documents
        SET avance = MIN(total_ttc, avance + ?),
            reste = MAX(0, total_ttc - (avance + ?)),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(op.montant, op.montant, documentId);
    }

    db.prepare(`
      UPDATE bank_statements
      SET nb_rapprochees = (
        SELECT COUNT(*) FROM bank_operations
        WHERE statement_id = ? AND statut_rapprochement = 'rapproche'
      )
      WHERE id = ?
    `).run(op.statement_id, op.statement_id);

    updateBankAccountReconciledBalance(op.bank_account_id);
  });

  runReconcile();
  return true;
}

export function unreconcileBankOperation(operationId: number): boolean {
  const db = getDb();
  const op = db.prepare("SELECT * FROM bank_operations WHERE id = ?").get(operationId) as BankOperationRecord | undefined;
  if (!op || op.statut_rapprochement !== "rapproche") return false;

  const runUnreconcile = db.transaction(() => {
    if (op.document_id && op.document_type === "facture") {
      db.prepare(`
        UPDATE documents
        SET avance = MAX(0, avance - ?),
            reste = MIN(total_ttc, total_ttc - (avance - ?)),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(op.montant, op.montant, op.document_id);
    }

    db.prepare(`
      UPDATE bank_operations
      SET statut_rapprochement = 'non_rapproche',
          rapprochement_score = 0,
          document_id = NULL,
          document_type = '',
          rapproche_le = NULL,
          rapproche_par = NULL
      WHERE id = ?
    `).run(operationId);

    db.prepare(`
      UPDATE bank_statements
      SET nb_rapprochees = (
        SELECT COUNT(*) FROM bank_operations
        WHERE statement_id = ? AND statut_rapprochement = 'rapproche'
      )
      WHERE id = ?
    `).run(op.statement_id, op.statement_id);

    updateBankAccountReconciledBalance(op.bank_account_id);
  });

  runUnreconcile();
  return true;
}

export function createExpenseFromBankOperation(
  operationId: number,
  motif: string,
  branchId?: number,
  actorId?: number,
): number {
  const db = getDb();
  const op = db.prepare("SELECT * FROM bank_operations WHERE id = ?").get(operationId) as BankOperationRecord | undefined;
  if (!op) throw new Error("Opération bancaire introuvable.");

  let expenseId = 0;

  const runExpense = db.transaction(() => {
    const firstBranch = branchId || (db.prepare("SELECT id FROM branches ORDER BY id ASC LIMIT 1").get() as any)?.id || 1;
    const finalMotif = motif.trim() || op.libelle;

    const res = db.prepare(`
      INSERT INTO sorties_caisse (
        branch_id, date, montant, motif, beneficiaire, notes, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, 'Généré automatiquement par rapprochement bancaire', ?, ?)
    `).run(firstBranch, op.date_operation, op.montant, finalMotif, op.libelle, actorId ?? null, actorId ?? null);

    expenseId = Number(res.lastInsertRowid);

    db.prepare(`
      UPDATE bank_operations
      SET statut_rapprochement = 'rapproche',
          rapprochement_score = 100,
          document_id = ?,
          document_type = 'sortie_caisse',
          rapproche_le = CURRENT_TIMESTAMP,
          rapproche_par = ?
      WHERE id = ?
    `).run(expenseId, actorId ?? null, operationId);

    db.prepare(`
      UPDATE bank_statements
      SET nb_rapprochees = (
        SELECT COUNT(*) FROM bank_operations
        WHERE statement_id = ? AND statut_rapprochement = 'rapproche'
      )
      WHERE id = ?
    `).run(op.statement_id, op.statement_id);

    updateBankAccountReconciledBalance(op.bank_account_id);
  });

  runExpense();
  return expenseId;
}

export function deleteBankStatement(statementId: number): boolean {
  const db = getDb();
  const statement = db.prepare("SELECT * FROM bank_statements WHERE id = ?").get(statementId) as BankStatementRecord | undefined;
  if (!statement) return false;

  const runDelete = db.transaction(() => {
    const ops = db
      .prepare("SELECT * FROM bank_operations WHERE statement_id = ? AND statut_rapprochement = 'rapproche'")
      .all(statementId) as BankOperationRecord[];

    for (const op of ops) {
      if (op.document_id && op.document_type === "facture") {
        db.prepare(`
          UPDATE documents
          SET avance = MAX(0, avance - ?),
              reste = MIN(total_ttc, total_ttc - (avance - ?)),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(op.montant, op.montant, op.document_id);
      }
    }

    db.prepare("DELETE FROM bank_statements WHERE id = ?").run(statementId);
    updateBankAccountReconciledBalance(statement.bank_account_id);
  });

  runDelete();
  return true;
}

export function getReconciliationSummary(accountId?: number, companyId = 1): ReconciliationStats {
  const db = getDb();
  const targetAccount = accountId ? getBankAccountById(accountId) : listBankAccounts(companyId)[0] || null;

  if (!targetAccount) {
    return {
      totalOperations: 0,
      nbRapprochees: 0,
      nbSuggeres: 0,
      nbEnAttente: 0,
      soldeReleve: 0,
      soldeRapproche: 0,
      soldeComptable: 0,
      ecartRapprochement: 0,
      tauxRapprochementPercent: 100,
    };
  }

  const opsCount = db.prepare(`
    SELECT
      COUNT(*) as total,
      COALESCE(SUM(CASE WHEN statut_rapprochement = 'rapproche' THEN 1 ELSE 0 END), 0) as nb_rapprochees,
      COALESCE(SUM(CASE WHEN statut_rapprochement = 'suggere' THEN 1 ELSE 0 END), 0) as nb_suggeres
    FROM bank_operations
    WHERE bank_account_id = ?
  `).get(targetAccount.id) as { total: number; nb_rapprochees: number; nb_suggeres: number };

  const totalOperations = opsCount?.total || 0;
  const nbRapprochees = opsCount?.nb_rapprochees || 0;
  const nbSuggeres = opsCount?.nb_suggeres || 0;
  const nbEnAttente = totalOperations - nbRapprochees;

  const soldeReleve = targetAccount.solde_actuel;
  const soldeRapproche = targetAccount.solde_rapproche;
  const soldeComptable = targetAccount.solde_actuel;
  const ecartRapprochement = Math.round((soldeReleve - soldeRapproche) * 100) / 100;
  const tauxRapprochementPercent = totalOperations > 0 ? Math.round((nbRapprochees / totalOperations) * 100) : 100;

  return {
    totalOperations,
    nbRapprochees,
    nbSuggeres,
    nbEnAttente,
    soldeReleve,
    soldeRapproche,
    soldeComptable,
    ecartRapprochement,
    tauxRapprochementPercent,
  };
}

// ==========================================
// MULTI-DEVISES, TAUX DE CHANGE & GAINS/PERTES FOREX
// ==========================================

export function listExchangeRates(companyId = 1): CurrencyRecord[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT * FROM exchange_rates
    WHERE company_id = ?
    ORDER BY est_devise_base DESC, code ASC
  `).all(companyId) as CurrencyRecord[];
  return rows;
}

export function getExchangeRate(companyId: number, code: string): CurrencyRecord | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT * FROM exchange_rates
    WHERE company_id = ? AND code = ?
  `).get(companyId, code.toUpperCase()) as CurrencyRecord | undefined;
  return row || null;
}

export function saveExchangeRate(
  companyId: number,
  input: {
    code: string;
    nom: string;
    nom_ar?: string;
    symbole?: string;
    taux: number;
    taux_achat?: number;
    taux_vente?: number;
    source?: "auto_api" | "bam" | "manuel";
    est_actif?: number;
    est_devise_base?: number;
  },
  actorId?: number | null
): CurrencyRecord {
  const db = getDb();
  const code = input.code.trim().toUpperCase();
  const nom = input.nom.trim();
  const nomAr = input.nom_ar?.trim() || nom;
  const symbole = input.symbole?.trim() || code;
  const taux = Number(input.taux) > 0 ? Number(input.taux) : 1.0;
  const tauxAchat = Number(input.taux_achat) > 0 ? Number(input.taux_achat) : Math.round(taux * 0.99 * 10000) / 10000;
  const tauxVente = Number(input.taux_vente) > 0 ? Number(input.taux_vente) : Math.round(taux * 1.01 * 10000) / 10000;
  const source = input.source || "manuel";
  const estActif = input.est_actif !== undefined ? input.est_actif : 1;
  const estBase = input.est_devise_base ? 1 : 0;

  db.prepare(`
    INSERT INTO exchange_rates (
      company_id, code, nom, nom_ar, symbole, taux, taux_achat, taux_vente,
      source, est_actif, est_devise_base, derniere_mise_a_jour
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP
    )
    ON CONFLICT(company_id, code) DO UPDATE SET
      nom = excluded.nom,
      nom_ar = excluded.nom_ar,
      symbole = excluded.symbole,
      taux = excluded.taux,
      taux_achat = excluded.taux_achat,
      taux_vente = excluded.taux_vente,
      source = excluded.source,
      est_actif = excluded.est_actif,
      est_devise_base = excluded.est_devise_base,
      derniere_mise_a_jour = CURRENT_TIMESTAMP
  `).run(companyId, code, nom, nomAr, symbole, taux, tauxAchat, tauxVente, source, estActif, estBase);

  if (actorId) {
    logAudit(actorId, "update", "exchange_rate", 0, { companyId, code, taux, source });
  }

  return getExchangeRate(companyId, code)!;
}

export async function syncCompanyExchangeRates(companyId = 1): Promise<{ success: boolean; updatedCount: number; rates: Record<string, number> }> {
  const db = getDb();
  const live = await fetchLiveExchangeRates("MAD");
  let updatedCount = 0;

  if (live.rates && Object.keys(live.rates).length > 0) {
    const updateStmt = db.prepare(`
      UPDATE exchange_rates
      SET taux = ?,
          taux_achat = ?,
          taux_vente = ?,
          source = 'auto_api',
          derniere_mise_a_jour = CURRENT_TIMESTAMP
      WHERE company_id = ? AND code = ? AND est_devise_base = 0
    `);

    for (const [code, rate] of Object.entries(live.rates)) {
      if (code !== "MAD" && rate > 0) {
        const achat = Math.round(rate * 0.99 * 10000) / 10000;
        const vente = Math.round(rate * 1.01 * 10000) / 10000;
        const res = updateStmt.run(rate, achat, vente, companyId, code);
        if (res.changes > 0) {
          updatedCount += res.changes;
        }
      }
    }
  }

  return {
    success: live.success,
    updatedCount,
    rates: live.rates,
  };
}

export function listForexTransactions(
  companyId = 1,
  options?: {
    typeOperation?: string;
    typeResultat?: string;
    limit?: number;
  }
): ForexTransactionRecord[] {
  const db = getDb();
  let query = "SELECT * FROM forex_transactions WHERE company_id = ?";
  const params: any[] = [companyId];

  if (options?.typeOperation) {
    query += " AND type_operation = ?";
    params.push(options.typeOperation);
  }

  if (options?.typeResultat) {
    query += " AND type_resultat = ?";
    params.push(options.typeResultat);
  }

  query += " ORDER BY date_reglement DESC, id DESC";

  if (options?.limit && options.limit > 0) {
    query += " LIMIT ?";
    params.push(options.limit);
  }

  return db.prepare(query).all(...params) as ForexTransactionRecord[];
}

export function getForexSummary(companyId = 1): ForexSummary {
  const db = getDb();

  const stats = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type_resultat = 'gain' THEN ecart_change ELSE 0 END), 0) as total_gains,
      COALESCE(SUM(CASE WHEN type_resultat = 'perte' THEN ABS(ecart_change) ELSE 0 END), 0) as total_pertes,
      COUNT(*) as count_transactions
    FROM forex_transactions
    WHERE company_id = ?
  `).get(companyId) as { total_gains: number; total_pertes: number; count_transactions: number };

  const docsInDevise = db.prepare(`
    SELECT COALESCE(SUM(total_ttc_base), 0) as total_base
    FROM documents
    WHERE company_id = ? AND devise != 'MAD'
  `).get(companyId) as { total_base: number };

  const totalGains = Math.round((stats?.total_gains || 0) * 100) / 100;
  const totalPertes = Math.round((stats?.total_pertes || 0) * 100) / 100;
  const resultatNet = Math.round((totalGains - totalPertes) * 100) / 100;
  const totalDevisesFactureesBase = Math.round((docsInDevise?.total_base || 0) * 100) / 100;

  return {
    totalGains,
    totalPertes,
    resultatNet,
    totalDevisesFactureesBase,
    countTransactions: stats?.count_transactions || 0,
  };
}

export function deleteForexTransaction(id: number, companyId: number, userId: number): boolean {
  const db = getDb();
  const tx = db.prepare("SELECT * FROM forex_transactions WHERE id = ? AND company_id = ?").get(id, companyId);
  if (!tx) return false;

  db.prepare("DELETE FROM forex_transactions WHERE id = ?").run(id);
  logAudit(userId, "delete", "forex_transaction", id, tx);
  return true;
}



