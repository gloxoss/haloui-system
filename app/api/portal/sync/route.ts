import { NextResponse } from "next/server";
import {
  applyPortalSyncIncomingPush,
  getPortalSyncSettings,
} from "@/lib/data";
import { getDb } from "@/lib/db";
import { type PortalSyncExportPayload } from "@/lib/types";

export const dynamic = "force-dynamic";

function verifySyncAuthorization(request: Request): boolean {
  const authHeader = request.headers.get("authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;

  const providedToken = match[1].trim();
  const settings = getPortalSyncSettings();
  return Boolean(settings.syncSecret && providedToken === settings.syncSecret.trim());
}

export async function GET(request: Request) {
  if (!verifySyncAuthorization(request)) {
    return NextResponse.json(
      { success: false, error: "Jeton de synchronisation non autorisé ou invalide." },
      { status: 401 }
    );
  }

  return NextResponse.json({
    status: "ok",
    service: "Haloui Portal Cloud Sync",
    version: "1.0",
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  if (!verifySyncAuthorization(request)) {
    return NextResponse.json(
      { success: false, error: "Jeton de synchronisation non autorisé ou invalide." },
      { status: 401 }
    );
  }

  try {
    const payload = (await request.json()) as PortalSyncExportPayload;

    if (payload && Array.isArray(payload.clients) && Array.isArray(payload.documents)) {
      applyPortalSyncIncomingPush(payload);
    }

    // Return any signed documents and login timestamps to sync back to the caller
    const db = getDb();
    const signedDocuments = db
      .prepare(`
        SELECT id, signed_at, signed_by_name, signature_data, status
        FROM documents
        WHERE signed_at IS NOT NULL AND signed_at != ''
      `)
      .all() as Array<{
        id: number;
        signed_at: string;
        signed_by_name: string;
        signature_data: string;
        status: string;
      }>;

    const clientLastLogins = db
      .prepare(`
        SELECT id, portal_last_login
        FROM clients
        WHERE portal_last_login IS NOT NULL AND portal_last_login != ''
      `)
      .all() as Array<{
        id: number;
        portal_last_login: string;
      }>;

    return NextResponse.json({
      success: true,
      message: "Données synchronisées avec succès.",
      timestamp: new Date().toISOString(),
      signedDocuments,
      clientLastLogins,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur interne lors de la synchronisation";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
