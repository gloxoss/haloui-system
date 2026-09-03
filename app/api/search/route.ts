import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { getActiveCompanyId } from "@/lib/company";
import { searchGlobal } from "@/lib/data";

export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json({ results: [] }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";
  const activeCompanyId = await getActiveCompanyId();
  return NextResponse.json({ results: searchGlobal(query, activeCompanyId) });
}
