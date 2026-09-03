import bcrypt from "bcryptjs";

import {
  ATTESTATION_TYPE_LABELS,
  DEFAULT_FEATURE_FLAGS,
  DEFAULT_THEME_SETTINGS,
  DEFAULT_TVA_RATE,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_TYPE_LABELS,
  FEATURE_TOGGLE_DEFINITIONS,
  SEED_BRANCHES,
  SEED_COMPANY,
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
  type BranchRecord,
  type CompanyRecord,
  type DocumentLineInput,
  type DocumentRecord,
  type DocumentStatus,
  type DocumentType,
  type EmployeeAttestationType,
  type EmployeeRecord,
  type EntityRecord,
  type FeatureFlags,
  type FeatureKey,
  type ManagedRole,
  type CashDaySummary,
  type PartyType,
  type ProductRecord,
  type RevenueDailyPoint,
  type RevenueMonthlyBranchPoint,
  type RevenueStats,
  type SalesDocumentSyncCandidate,
  type SearchResult,
  type SortieCaisseRecord,
  type ThemeSettings,
  type UserRecord,
} from "@/lib/types";

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
  type: DocumentType;
  date: string;
  branch_id?: number | null;
  source_branch_id?: number | null;
  destination_branch_id?: number | null;
  client_id?: number | null;
  fournisseur_id?: number | null;
  parent_document_id?: number | null;
  notes?: string;
  avance?: number;
  status?: DocumentStatus;
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

export function getCompany() {
  const db = getDb();
  return db.prepare("SELECT * FROM company WHERE id = 1").get() as CompanyRecord;
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
    WHERE key IN ('theme.preset', 'theme.density')
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
  });

  transaction();
  logAudit(userId, "update", "theme_settings", null, nextTheme);
}

export function resetBusinessData() {
  const db = getDb();
  const insertSetting = db.prepare(`
    INSERT INTO app_settings (key, value)
    VALUES (?, ?)
  `);
  const insertBranch = db.prepare(`
    INSERT INTO branches (name, address, phone, active, created_by, updated_by)
    VALUES (@name, @address, @phone, 1, NULL, NULL)
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

    db.prepare(`
      INSERT INTO company (
        id, name, arabic_name, address, phone, gsm, rc, if_number, tp, ice, logo_path, legal_notice,
        attestation_template_simple, attestation_template_salary, attestation_template_visa, attestation_template_bank
      ) VALUES (
        @id, @name, @arabic_name, @address, @phone, @gsm, @rc, @if_number, @tp, @ice, @logo_path, @legal_notice,
        @attestation_template_simple, @attestation_template_salary, @attestation_template_visa, @attestation_template_bank
      )
    `).run(SEED_COMPANY);

    for (const branch of SEED_BRANCHES) {
      insertBranch.run(branch);
    }

    for (const [key, enabled] of Object.entries(DEFAULT_FEATURE_FLAGS) as Array<[FeatureKey, boolean]>) {
      insertSetting.run(`feature.${key}`, enabled ? "1" : "0");
    }

    insertSetting.run("theme.preset", DEFAULT_THEME_SETTINGS.preset);
    insertSetting.run("theme.density", DEFAULT_THEME_SETTINGS.density);
  });

  transaction();
}

export function listBranches({ activeOnly = false } = {}) {
  const db = getDb();
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
        updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `,
  ).run(input);
  logAudit(userId, "update", "company", 1, input);
}

export function saveBranch(input: Partial<BranchRecord> & { id?: number }, userId: number) {
  const db = getDb();

  if (input.id) {
    db.prepare(
      `
        UPDATE branches
        SET name = @name,
            address = @address,
            phone = @phone,
            active = @active,
            updated_by = @updated_by,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = @id
      `,
    ).run({
      id: input.id,
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
      INSERT INTO branches (name, address, phone, active, created_by, updated_by)
      VALUES (@name, @address, @phone, @active, @created_by, @updated_by)
    `,
  ).run({
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

export function listEntities(type: PartyType, search = "") {
  const db = getDb();
  const table = PARTY_TABLES[type];
  const wildcard = `%${search.trim()}%`;
  return db.prepare(
    `
      SELECT id, name, ice, address, phone, email, notes
      FROM ${table}
      WHERE (? = '' OR name LIKE ? OR phone LIKE ? OR ice LIKE ?)
      ORDER BY name
    `,
  ).all(search.trim(), wildcard, wildcard, wildcard) as EntityRecord[];
}

export function getEntityById(type: PartyType, id: number) {
  const db = getDb();
  const table = PARTY_TABLES[type];
  return db
    .prepare(`SELECT id, name, ice, address, phone, email, notes FROM ${table} WHERE id = ?`)
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

export function listProducts(search = "") {
  const db = getDb();
  const wildcard = `%${search.trim()}%`;
  return db.prepare(
    `
      SELECT id, ref, designation, unite, prix_ht, tva_rate, active
      FROM produits
      WHERE (? = '' OR ref LIKE ? OR designation LIKE ?)
      ORDER BY active DESC, designation
    `,
  ).all(search.trim(), wildcard, wildcard) as ProductRecord[];
}

export function getProductById(id: number) {
  const db = getDb();
  return db
    .prepare("SELECT id, ref, designation, unite, prix_ht, tva_rate, active FROM produits WHERE id = ?")
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
        SET ref = @ref,
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
      active: input.active ?? 1,
      updated_by: userId,
    });
    logAudit(userId, "update", "product", input.id, normalizedInput);
    return input.id;
  }

  const result = db.prepare(
    `
      INSERT INTO produits (ref, designation, unite, prix_ht, tva_rate, active, created_by, updated_by)
      VALUES (@ref, @designation, @unite, @prix_ht, @tva_rate, @active, @created_by, @updated_by)
    `,
  ).run({
    ...normalizedInput,
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

export function getDashboardStats() {
  const db = getDb();
  const month = monthKey();
  const year = month.slice(0, 4);
  const monthRow = db
    .prepare("SELECT COALESCE(SUM(montant), 0) AS total FROM chiffre_affaires WHERE substr(date, 1, 7) = ?")
    .get(month) as { total: number };
  const yearRow = db
    .prepare("SELECT COALESCE(SUM(montant), 0) AS total FROM chiffre_affaires WHERE substr(date, 1, 4) = ?")
    .get(year) as { total: number };

  const counts = db
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
    };

  const latestDocuments = db
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

  const branchRanking = db
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
    .get(month) as { id?: number; name?: string; total?: number } | undefined;

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
  from?: string;
  to?: string;
  branchId?: number | null;
  status?: string;
  partyId?: number | null;
} = {}) {
  const db = getDb();
  const params = {
    type,
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
    amount_in_words: amountToFrenchWords(document.total_ttc),
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
  const documentPayload = {
    type: input.type,
    date: input.date || todayIso(),
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
    reste: Math.max(totals.total_ttc - avance, 0),
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
          SET date = @date,
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
            type, numero, date, branch_id, source_branch_id, destination_branch_id, client_id, fournisseur_id,
            parent_document_id, total_ht, total_tva, total_ttc, remise, avance, reste, notes, status, created_by, updated_by
          ) VALUES (
            @type, @numero, @date, @branch_id, @source_branch_id, @destination_branch_id, @client_id, @fournisseur_id,
            @parent_document_id, @total_ht, @total_tva, @total_ttc, @remise, @avance, @reste, @notes, @status, @created_by, @updated_by
          )
        `,
      ).run({
        ...documentPayload,
        numero: nextNumber(input.type),
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

  return transaction();
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

export function createAttestation(employeeId: number, type: EmployeeAttestationType, date: string, userId: number) {
  const db = getDb();
  const employee = getEmployeeById(employeeId);
  if (!employee) {
    throw new Error("Employé introuvable.");
  }

  const company = getCompany();
  const content = generateAttestationText(employee, type, company, date);
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

export function getSystemSalesByDayAndBranch(selectedMonth = monthKey()) {
  const db = getDb();
  const rows = db.prepare(`
    SELECT branch_id, date, COALESCE(SUM(total_ttc), 0) AS total
    FROM documents
    WHERE substr(date, 1, 7) = ?
      AND type IN ('facture', 'bl')
      AND branch_id IS NOT NULL
    GROUP BY branch_id, date
  `).all(selectedMonth) as Array<{ branch_id: number; date: string; total: number }>;

  return rows;
}

export function getSystemSalesForDate(date: string) {
  const db = getDb();
  const rows = db.prepare(`
    SELECT branch_id, COALESCE(SUM(total_ttc), 0) AS total
    FROM documents
    WHERE date = ?
      AND type IN ('facture', 'bl')
      AND branch_id IS NOT NULL
    GROUP BY branch_id
  `).all(date) as Array<{ branch_id: number; total: number }>;

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

export function getSystemSalesDocumentsForMonth(selectedMonth = monthKey()): SalesDocumentSyncCandidate[] {
  const db = getDb();
  const rows = db.prepare(`
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
  `).all(selectedMonth) as SalesDocumentSyncCandidate[];

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

export function listSortiesCaisse(options?: { month?: string; branchId?: number; date?: string }): SortieCaisseRecord[] {
  const db = getDb();
  let query = `
    SELECT s.*, b.name as branch_name
    FROM sorties_caisse s
    JOIN branches b ON b.id = s.branch_id
    WHERE 1=1
  `;
  const params: unknown[] = [];

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
  },
  userId: number,
) {
  const db = getDb();
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
          updated_by = @userId,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `).run({
      id: input.id,
      branch_id: input.branch_id,
      date: input.date,
      montant: input.montant,
      motif: input.motif,
      beneficiaire: input.beneficiaire || "",
      preuve_path: input.preuve_path || "",
      notes: input.notes || "",
      userId,
    });
    logAudit(userId, "update", "sortie_caisse", input.id, input);
    return input.id;
  }

  const result = db.prepare(`
    INSERT INTO sorties_caisse (branch_id, date, montant, motif, beneficiaire, preuve_path, notes, created_by, updated_by)
    VALUES (@branch_id, @date, @montant, @motif, @beneficiaire, @preuve_path, @notes, @userId, @userId)
  `).run({
    branch_id: input.branch_id,
    date: input.date,
    montant: input.montant,
    motif: input.motif,
    beneficiaire: input.beneficiaire || "",
    preuve_path: input.preuve_path || "",
    notes: input.notes || "",
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

export function getRevenueGrid(selectedMonth = monthKey()) {
  const db = getDb();
  const branches = listBranches({ activeOnly: true });
  const days = listDaysInMonth(selectedMonth);

  // Manual CA rows
  const rows = db.prepare(
    `
      SELECT branch_id, date, montant
      FROM chiffre_affaires
      WHERE substr(date, 1, 7) = ?
    `,
  ).all(selectedMonth) as Array<{ branch_id: number; date: string; montant: number }>;
  const lookup = new Map(rows.map((row) => [`${row.date}:${row.branch_id}`, row.montant]));

  // Auto System sales rows from documents
  const systemSales = getSystemSalesByDayAndBranch(selectedMonth);
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

export function getRevenueStats(selectedMonth = monthKey()): RevenueStats {
  const db = getDb();
  const year = selectedMonth.slice(0, 4);

  const monthTotal = db
    .prepare("SELECT COALESCE(SUM(montant), 0) AS total FROM chiffre_affaires WHERE substr(date, 1, 7) = ?")
    .get(selectedMonth) as { total: number };
  const yearTotal = db
    .prepare("SELECT COALESCE(SUM(montant), 0) AS total FROM chiffre_affaires WHERE substr(date, 1, 4) = ?")
    .get(year) as { total: number };

  const systemMonthTotalRow = db
    .prepare(`
      SELECT COALESCE(SUM(total_ttc), 0) AS total
      FROM documents
      WHERE substr(date, 1, 7) = ?
        AND type IN ('facture', 'bl')
        AND branch_id IS NOT NULL
    `)
    .get(selectedMonth) as { total: number };

  const systemMonthTotal = systemMonthTotalRow.total;
  const diffMonthTotal = monthTotal.total - systemMonthTotal;

  const bestBranch = db
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
    .get(selectedMonth) as { name?: string; total?: number } | undefined;

  const daily = db.prepare(
    `
      SELECT date, SUM(montant) AS total
      FROM chiffre_affaires
      WHERE substr(date, 1, 7) = ?
      GROUP BY date
      ORDER BY date
    `,
  ).all(selectedMonth) as RevenueDailyPoint[];

  const monthlyByBranch = db.prepare(
    `
      SELECT substr(ca.date, 1, 7) AS month, b.name, SUM(ca.montant) AS total
      FROM chiffre_affaires ca
      JOIN branches b ON b.id = ca.branch_id
      WHERE ca.date >= date('now', '-12 months')
      GROUP BY month, b.name
      ORDER BY month, b.name
    `,
  ).all() as RevenueMonthlyBranchPoint[];

  const pivot = db.prepare(
    `
      SELECT substr(ca.date, 1, 7) AS month, b.name, SUM(ca.montant) AS total
      FROM chiffre_affaires ca
      JOIN branches b ON b.id = ca.branch_id
      GROUP BY month, b.name
      ORDER BY month DESC, b.name
    `,
  ).all() as RevenueMonthlyBranchPoint[];

  const payments = db
    .prepare(`
      SELECT
        COALESCE(SUM(especes), 0) AS especes,
        COALESCE(SUM(carte), 0) AS carte,
        COALESCE(SUM(cheque), 0) AS cheque,
        COALESCE(SUM(virement), 0) AS virement
      FROM chiffre_affaires
      WHERE substr(date, 1, 7) = ?
    `)
    .get(selectedMonth) as { especes: number; carte: number; cheque: number; virement: number };

  const sortiesTotalRow = db
    .prepare(`
      SELECT COALESCE(SUM(montant), 0) AS total
      FROM sorties_caisse
      WHERE substr(date, 1, 7) = ?
    `)
    .get(selectedMonth) as { total: number };

  const sortiesTotal = sortiesTotalRow.total;
  const netCaisse = monthTotal.total - sortiesTotal;

  let paymentMethods = {
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

export function searchGlobal(query: string): SearchResult[] {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const db = getDb();
  const featureFlags = getFeatureFlags();
  const wildcard = `%${trimmed}%`;

  const results: SearchResult[] = [];

  const documents = db.prepare(
    `
      SELECT id, type, numero, date
      FROM documents
      WHERE CAST(numero AS TEXT) LIKE ? OR type LIKE ?
      ORDER BY updated_at DESC
      LIMIT 8
    `,
  ).all(wildcard, wildcard) as Array<{ id: number; type: DocumentType; numero: number; date: string }>;

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

  const products = db.prepare(
    `
      SELECT id, ref, designation
      FROM produits
      WHERE ref LIKE ? OR designation LIKE ?
      ORDER BY designation
      LIMIT 8
    `,
  ).all(wildcard, wildcard) as Array<{ id: number; ref: string; designation: string }>;

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

export function getLookupData() {
  return {
    branches: listBranches({ activeOnly: true }),
    clients: listEntities("clients"),
    fournisseurs: listEntities("fournisseurs"),
    produits: listProducts(),
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
