import { NextResponse } from "next/server";
import { getClientByPortalToken } from "@/lib/data";
import { setPortalClientSession } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/espace-client/login", request.url));
  }

  const client = getClientByPortalToken(token);
  if (!client) {
    return NextResponse.redirect(new URL("/espace-client/login?error=invalid_token", request.url));
  }

  await setPortalClientSession(client);
  return NextResponse.redirect(new URL("/espace-client", request.url));
}
