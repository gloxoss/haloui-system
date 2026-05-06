import path from "node:path";

function resolvePath(value: string) {
  return path.resolve(value);
}

function resolvePathFromEnv(name: string, fallback: string) {
  const envValue = process.env[name];
  return resolvePath(envValue && envValue.trim() ? envValue : fallback);
}

const APP_ROOT = resolvePath(process.cwd());
const PUBLIC_DIR = path.join(APP_ROOT, "public");

export const DATA_DIR = resolvePathFromEnv("HALOUI_DATA_DIR", path.join(APP_ROOT, "data"));
export const DB_PATH = path.join(DATA_DIR, "haloui.db");
export const BACKUP_DIR = path.join(DATA_DIR, "backups");
export const UPLOADS_DIR = resolvePathFromEnv("HALOUI_UPLOADS_DIR", path.join(PUBLIC_DIR, "uploads"));
export const LEGACY_UPLOADS_DIR = path.join(PUBLIC_DIR, "uploads");
export const SCHEMA_PATH = resolvePathFromEnv("HALOUI_SCHEMA_PATH", path.join(APP_ROOT, "db", "schema.sql"));

export function getAppRoot() {
  return APP_ROOT;
}

export function getPublicAssetPath(...segments: string[]) {
  return path.join(PUBLIC_DIR, ...segments);
}
