import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { getAuthSession } from "@/lib/auth";
import { getActiveCompanyId } from "@/lib/company";
import { getFeatureFlags, getRevenueGrid } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session?.user) {
    return new NextResponse("Non autorise", { status: 401 });
  }

  if (session.user.role !== "superadmin" && !getFeatureFlags().chiffre_affaires) {
    return new NextResponse("Service desactive", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") || undefined;
  const activeCompanyId = await getActiveCompanyId();
  const grid = getRevenueGrid(month, activeCompanyId);

  const rows = grid.table.map((row) => ({
    Date: formatDate(row.date),
    ...Object.fromEntries(grid.branches.map((branch) => [branch.name, row.values[branch.id] || 0])),
    Total: row.total,
  }));

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, "CA");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="ca-${grid.month}.xlsx"`,
    },
  });
}
