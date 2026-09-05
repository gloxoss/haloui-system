import { cookies } from "next/headers";
import { type ClientPortalSession } from "@/lib/types";

export const PORTAL_CLIENT_COOKIE = "haloui_portal_client";

export async function getPortalClientSession(): Promise<ClientPortalSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(PORTAL_CLIENT_COOKIE)?.value;
  if (!raw) return null;

  try {
    const decoded = Buffer.from(raw, "base64").toString("utf-8");
    const session = JSON.parse(decoded) as ClientPortalSession;
    if (session && typeof session.clientId === "number" && session.token) {
      return session;
    }
  } catch {
    return null;
  }
  return null;
}

export async function setPortalClientSession(session: ClientPortalSession): Promise<void> {
  const cookieStore = await cookies();
  const encoded = Buffer.from(JSON.stringify(session)).toString("base64");
  cookieStore.set(PORTAL_CLIENT_COOKIE, encoded, {
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
