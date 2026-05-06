import fs from "node:fs";

import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import {
  EXPORT_DATASETS,
  type ExportDatasetKey,
  buildCsv,
  buildSqlDump,
  buildWorkbook,
} from "@/lib/export";
import { createDatabaseBackup } from "@/lib/db";

const datasetKeys = new Set<ExportDatasetKey>(EXPORT_DATASETS.map((item) => item.key));

export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session?.user) {
    return new NextResponse("Non autorise", { status: 401 });
  }

  if (session.user.role !== "superadmin") {
    return new NextResponse("Acces reserve au superadmin", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") || "sqlite";
  const dataset = searchParams.get("dataset") || "clients";

  if (format === "sqlite") {
    const backupPath = createDatabaseBackup("haloui-transfer");
    const buffer = fs.readFileSync(backupPath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/x-sqlite3",
        "Content-Disposition": 'attachment; filename="haloui-data.db"',
      },
    });
  }

  if (format === "sql") {
    return new NextResponse(buildSqlDump(), {
      headers: {
        "Content-Type": "application/sql; charset=utf-8",
        "Content-Disposition": 'attachment; filename="haloui-export.sql"',
      },
    });
  }

  if (format === "xlsx") {
    const buffer = buildWorkbook();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="haloui-export.xlsx"',
      },
    });
  }

  if (format === "csv") {
    if (!datasetKeys.has(dataset as ExportDatasetKey)) {
      return new NextResponse("Dataset inconnu", { status: 400 });
    }

    return new NextResponse(buildCsv(dataset as ExportDatasetKey), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="haloui-${dataset}.csv"`,
      },
    });
  }

  return new NextResponse("Format inconnu", { status: 400 });
}
