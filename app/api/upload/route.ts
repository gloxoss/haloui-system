import fs from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { UPLOADS_DIR } from "@/lib/runtime-paths";
import { slugifyFilename } from "@/lib/utils";

const ALLOWED_FOLDERS = new Set(["logos", "employees"]);

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const folder = String(formData.get("folder") || "logos");

  if (!(file instanceof File) || !ALLOWED_FOLDERS.has(folder)) {
    return NextResponse.json({ error: "Fichier ou dossier invalide." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const extension = path.extname(file.name) || ".png";
  const filename = `${Date.now()}-${slugifyFilename(path.basename(file.name, extension))}${extension}`;
  const relativeDir = path.join("uploads", folder);
  const absoluteDir = path.join(UPLOADS_DIR, folder);

  await fs.mkdir(absoluteDir, { recursive: true });
  await fs.writeFile(path.join(absoluteDir, filename), bytes);

  return NextResponse.json({ path: `/${relativeDir.replace(/\\/g, "/")}/${filename}` });
}
