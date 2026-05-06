import fs from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import {
  LEGACY_UPLOADS_DIR,
  UPLOADS_DIR,
  getPublicAssetPath,
} from "@/lib/runtime-paths";

const MIME_TYPES: Record<string, string> = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function isSafeSegment(segment: string) {
  return Boolean(segment) && segment !== "." && segment !== ".." && !segment.includes("\\");
}

async function readUploadFile(rootDir: string, segments: string[]) {
  const filePath = path.resolve(rootDir, ...segments);
  const expectedRoot = path.resolve(rootDir);

  if (!filePath.startsWith(expectedRoot)) {
    return null;
  }

  try {
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) {
      return null;
    }

    return {
      bytes: await fs.readFile(filePath),
      extension: path.extname(filePath).toLowerCase(),
    };
  } catch {
    return null;
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ segments: string[] }> },
) {
  const { segments } = await context.params;

  if (!Array.isArray(segments) || segments.length === 0 || segments.some((segment) => !isSafeSegment(segment))) {
    return NextResponse.json({ error: "Fichier invalide." }, { status: 400 });
  }

  const runtimeFile = await readUploadFile(UPLOADS_DIR, segments);
  const legacyRoot = getPublicAssetPath("uploads");
  const legacyFile =
    legacyRoot !== path.resolve(UPLOADS_DIR) ? await readUploadFile(LEGACY_UPLOADS_DIR, segments) : null;
  const file = runtimeFile ?? legacyFile;

  if (!file) {
    return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  }

  return new NextResponse(file.bytes, {
    headers: {
      "Content-Type": MIME_TYPES[file.extension] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
