import crypto from "crypto";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import {
  type AttestationRecord,
  type BulletinPaieRecord,
  type CongeDemandeRecord,
  type EmployeeRecord,
  type NoteFraisRecord,
  type PointageRecord,
  type PretAvanceRecord,
} from "@/lib/types";

export const PORTAL_EMPLOYE_COOKIE = "haloui_portal_employe";
const SECRET_KEY = process.env.NEXTAUTH_SECRET || "haloui-portal-employe-key-2026";

export type EmployePortalSession = {
  employeId: number;
  nom: string;
  prenom: string;
  matricule: string;
  cin: string;
  loginAt: string;
};

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

export async function getEmployePortalSession(): Promise<EmployePortalSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(PORTAL_EMPLOYE_COOKIE)?.value;
  if (!raw) return null;

  try {
    const decoded = verifyAndDecodePayload(raw);
    if (!decoded) return null;

    const session = JSON.parse(decoded) as EmployePortalSession;
    if (!session || typeof session.employeId !== "number") {
      return null;
    }

    // Verify employee still active in database
    const db = getDb();
    const emp = db
      .prepare("SELECT id FROM employes WHERE id = ? AND (date_sortie IS NULL OR date_sortie = '')")
      .get(session.employeId);

    if (!emp) return null;

    return session;
  } catch {
    return null;
  }
}

export async function setEmployePortalSession(session: EmployePortalSession): Promise<void> {
  const cookieStore = await cookies();
  const serialized = JSON.stringify(session);
  const token = signPayload(serialized);

  cookieStore.set(PORTAL_EMPLOYE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function clearEmployePortalSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(PORTAL_EMPLOYE_COOKIE);
}

export function authentifierEmployePortal(identifiant: string, pin: string): {
  success: boolean;
  employe?: EmployeeRecord;
  error?: string;
} {
  const db = getDb();
  const cleanId = (identifiant || "").trim().toLowerCase();
  const cleanPin = (pin || "").trim();

  if (!cleanId || !cleanPin) {
    return { success: false, error: "Identifiant et code PIN requis." };
  }

  // Find employee by CIN, Matricule, or Phone
  const emp = db
    .prepare(
      `
    SELECT * FROM employes 
    WHERE (LOWER(cnss) = ? OR LOWER(CAST(numero AS TEXT)) = ? OR telephone = ? OR CAST(id AS TEXT) = ?)
      AND (date_sortie IS NULL OR date_sortie = '')
    LIMIT 1
  `
    )
    .get(cleanId, cleanId, cleanId, cleanId) as EmployeeRecord | undefined;

  if (!emp) {
    return { success: false, error: "Aucun collaborateur trouvé avec cet identifiant." };
  }

  const empPin = (emp.code_pin || "1234").trim();
  if (empPin !== cleanPin) {
    return { success: false, error: "Code PIN incorrect." };
  }

  return { success: true, employe: emp };
}

export type EmployePortalData = {
  employe: EmployeeRecord;
  bulletins: BulletinPaieRecord[];
  attestations: AttestationRecord[];
  conges: CongeDemandeRecord[];
  notesFrais: NoteFraisRecord[];
  prets: PretAvanceRecord[];
  pointagesRecents: PointageRecord[];
  soldeConges: {
    payesAcquis: number;
    payesPris: number;
    payesRestants: number;
  };
};

export function getEmployePortalData(employeId: number): EmployePortalData | null {
  const db = getDb();

  const employe = db
    .prepare("SELECT * FROM employes WHERE id = ? AND (date_sortie IS NULL OR date_sortie = '')")
    .get(employeId) as EmployeeRecord | undefined;

  if (!employe) return null;

  // 1. Bulletins de paie (validés ou payés)
  const bulletins = db
    .prepare(
      `
    SELECT * FROM bulletins_paie 
    WHERE employe_id = ? AND statut IN ('valide', 'paye')
    ORDER BY periode_mois DESC
  `
    )
    .all(employeId) as BulletinPaieRecord[];

  // 2. Attestations
  const attestations = db
    .prepare(
      `
    SELECT * FROM attestations 
    WHERE employe_id = ?
    ORDER BY date DESC, id DESC
  `
    )
    .all(employeId) as AttestationRecord[];

  // 3. Demandes de congés
  const conges = db
    .prepare(
      `
    SELECT * FROM conges_demandes 
    WHERE employe_id = ?
    ORDER BY date_debut DESC, id DESC
  `
    )
    .all(employeId) as CongeDemandeRecord[];

  // 4. Notes de frais personnelles
  const notesFrais = db
    .prepare(
      `
    SELECT * FROM notes_frais 
    WHERE employe_id = ?
    ORDER BY date_depense DESC, id DESC
  `
    )
    .all(employeId) as NoteFraisRecord[];

  // 5. Prêts & Avances
  const prets = db
    .prepare(
      `
    SELECT * FROM prets_avances 
    WHERE employe_id = ?
    ORDER BY date_octroi DESC, id DESC
  `
    )
    .all(employeId) as PretAvanceRecord[];

  // Attach echeances to each loan
  for (const p of prets) {
    p.echeances = db
      .prepare(
        `SELECT * FROM prets_echeancier WHERE pret_id = ? ORDER BY numero_mensualite ASC`
      )
      .all(p.id) as any[];
  }

  // 6. Pointages récents (derniers 15 jours)
  const pointagesRecents = db
    .prepare(
      `
    SELECT * FROM pointages 
    WHERE employe_id = ?
    ORDER BY date_pointage DESC, id DESC
    LIMIT 20
  `
    )
    .all(employeId) as PointageRecord[];

  // 7. Calcul du solde de congés
  const payesAcquis = Number(employe.solde_conges_payes) || 18;
  const payesPris = Number(employe.solde_conges_pris) || 0;
  const payesRestants = Math.max(0, payesAcquis - payesPris);

  return {
    employe,
    bulletins,
    attestations,
    conges,
    notesFrais,
    prets,
    pointagesRecents,
    soldeConges: {
      payesAcquis,
      payesPris,
      payesRestants,
    },
  };
}
