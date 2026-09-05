import crypto from "crypto";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { type ClientPortalSession } from "@/lib/types";

export const PORTAL_CLIENT_COOKIE = "haloui_portal_client";
const SECRET_KEY = process.env.NEXTAUTH_SECRET || "haloui-portal-secure-key-2026";

function signPayload(payload: string): string {
  const hmac = crypto.createHmac("sha256", SECRET_KEY).update(payload).digest("base64url");
  const b64 = Buffer.from(payload, "utf-8").toString("base64url");
  return `${b64}.${hmac}`;
}

function verifyAndDecodePayload(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [b64, hmac] = parts;
  try {
    const payload = Buffer.from(b64, "base64url").toString("utf-8");
    const expectedHmac = crypto.createHmac("sha256", SECRET_KEY).update(payload).digest("base64url");
    if (
      hmac.length === expectedHmac.length &&
      crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHmac))
    ) {
      return payload;
    }
  } catch {
    return null;
  }
  return null;
}

export async function getPortalClientSession(): Promise<ClientPortalSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(PORTAL_CLIENT_COOKIE)?.value;
  if (!raw) return null;

  try {
    const decoded = verifyAndDecodePayload(raw);
    if (!decoded) return null;

    const session = JSON.parse(decoded) as ClientPortalSession;
    if (!session || typeof session.clientId !== "number" || !session.token) {
      return null;
    }

    // Direct database validation: verify that portal is still enabled and token hasn't been revoked/regenerated
    const db = getDb();
    const client = db
      .prepare(`
        SELECT id, name, phone, email, ice, portal_token, portal_enabled
        FROM clients
        WHERE id = ? AND portal_enabled = 1
        LIMIT 1
      `)
      .get(session.clientId) as { id: number; portal_token: string; portal_enabled: number } | undefined;

    if (!client || client.portal_token !== session.token) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export async function setPortalClientSession(session: ClientPortalSession): Promise<void> {
  const cookieStore = await cookies();
  const rawPayload = JSON.stringify(session);
  const signedToken = signPayload(rawPayload);

  cookieStore.set(PORTAL_CLIENT_COOKIE, signedToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function clearPortalClientSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(PORTAL_CLIENT_COOKIE);
}
