import fs from "node:fs";

import * as XLSX from "xlsx";

import { getDb } from "@/lib/db";
import { DB_PATH } from "@/lib/runtime-paths";

export const EXPORT_DATASETS = [
  { key: "branches", label: "Magasins" },
  { key: "clients", label: "Clients" },
  { key: "fournisseurs", label: "Fournisseurs" },
  { key: "produits", label: "Produits" },
  { key: "documents", label: "Documents" },
  { key: "document_lignes", label: "Lignes documents" },
  { key: "employes", label: "Personnel" },
  { key: "attestations", label: "Attestations" },
  { key: "chiffre_affaires", label: "Chiffre d'affaires" },
  { key: "users", label: "Utilisateurs" },
  { key: "app_settings", label: "Parametres app" },
] as const;

export type ExportDatasetKey = (typeof EXPORT_DATASETS)[number]["key"];

function getSheetName(label: string) {
  return label.slice(0, 31);
}

function quoteCsv(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);
  if (!/[",\n]/.test(text)) {
    return text;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

function sqlLiteral(value: unknown) {
  if (value === null || value === undefined) {
    return "NULL";
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "NULL";
  }

  if (typeof value === "boolean") {
    return value ? "1" : "0";
  }

  return `'${String(value).replace(/'/g, "''")}'`;
}

export function getDatasetRows(dataset: ExportDatasetKey) {
  const db = getDb();

  if (dataset === "users") {
    return db.prepare(`
      SELECT id, username, full_name, role, active, is_superadmin, hidden_from_admin, created_at, updated_at
      FROM users
      ORDER BY id
    `).all() as Array<Record<string, unknown>>;
  }

  return db.prepare(`SELECT * FROM ${dataset}`).all() as Array<Record<string, unknown>>;
}

export function buildCsv(dataset: ExportDatasetKey) {
  const rows = getDatasetRows(dataset);
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  const header = columns.join(",");
  const body = rows.map((row) => columns.map((column) => quoteCsv(row[column])).join(","));

  return [header, ...body].join("\n");
}

export function buildWorkbook() {
  const workbook = XLSX.utils.book_new();

  for (const dataset of EXPORT_DATASETS) {
    const rows = getDatasetRows(dataset.key);
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, getSheetName(dataset.label));
  }

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

export function buildSqlDump() {
  const db = getDb();
  const tables = db.prepare(`
    SELECT name, sql
    FROM sqlite_master
    WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all() as Array<{ name: string; sql: string }>;

  const lines = [
    "PRAGMA foreign_keys = OFF;",
    "BEGIN TRANSACTION;",
  ];

  for (const table of tables) {
    lines.push(`${table.sql};`);
  }

  for (const table of tables) {
    const rows = db.prepare(`SELECT * FROM ${table.name}`).all() as Array<Record<string, unknown>>;
    for (const row of rows) {
      const columns = Object.keys(row);
      const values = columns.map((column) => sqlLiteral(row[column]));
      lines.push(
        `INSERT INTO ${table.name} (${columns.join(", ")}) VALUES (${values.join(", ")});`,
      );
    }
  }

  lines.push("COMMIT;");
  lines.push("");

  return lines.join("\n");
}

export function readDatabaseFile() {
  return fs.readFileSync(DB_PATH);
}
