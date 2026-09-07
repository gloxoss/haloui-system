import { getDb } from "@/lib/db";
import {
  type EmployeeRecord,
  type PointageMethode,
  type PointageRecord,
  type PointageStatsJournalieres,
} from "@/lib/types";

export function verifierCodePinEmploye(pin: string): (EmployeeRecord & { id: number }) | null {
  const db = getDb();
  const cleanedPin = pin.trim();
  const emp = db
    .prepare("SELECT * FROM employes WHERE code_pin = ? LIMIT 1")
    .get(cleanedPin) as EmployeeRecord | undefined;
  return emp || null;
}

export function verifierBadgeQrEmploye(token: string): (EmployeeRecord & { id: number }) | null {
  const db = getDb();
  const cleanedToken = token.trim();
  const emp = db
    .prepare("SELECT * FROM employes WHERE badge_qr_token = ? OR id = ? LIMIT 1")
    .get(cleanedToken, Number(cleanedToken) || -1) as EmployeeRecord | undefined;
  return emp || null;
}

export function pointerHeure(params: {
  companyId?: number;
  employeId?: number;
  pin?: string;
  qrToken?: string;
  typePointage?: "auto" | "arrivee" | "depart";
  methode?: PointageMethode;
  notes?: string;
}): {
  pointage: PointageRecord;
  action: "arrivee" | "depart";
  message: string;
  employeNom: string;
} {
  const db = getDb();
  const companyId = params.companyId || 1;
  const methode: PointageMethode = params.methode || "tactile";

  let employe: (EmployeeRecord & { id: number }) | null = null;

  if (params.employeId) {
    employe = db.prepare("SELECT * FROM employes WHERE id = ?").get(params.employeId) as any;
  } else if (params.pin) {
    employe = verifierCodePinEmploye(params.pin);
  } else if (params.qrToken) {
    employe = verifierBadgeQrEmploye(params.qrToken);
  }

  if (!employe) {
    throw new Error("Employé introuvable avec les identifiants fournis (Code PIN ou Badge erroné)");
  }

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const heureStr = now.toTimeString().slice(0, 8); // HH:MM:SS

  // Vérifier s'il y a déjà un pointage en cours aujourd'hui
  const pointageActuel = db
    .prepare(`
      SELECT * FROM pointages
      WHERE employe_id = ? AND date_pointage = ? AND statut = 'en_cours'
      ORDER BY id DESC LIMIT 1
    `)
    .get(employe.id, dateStr) as any;

  let action: "arrivee" | "depart" = "arrivee";
  let pointageId = 0;

  if (params.typePointage === "arrivee" || (!pointageActuel && params.typePointage !== "depart")) {
    // 1. Pointage Arrivée
    action = "arrivee";
    const res = db.prepare(`
      INSERT INTO pointages (
        company_id, employe_id, date_pointage, heure_arrivee,
        methode_pointage, statut, notes, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?,
        ?, 'en_cours', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
    `).run(
      companyId,
      employe.id,
      dateStr,
      heureStr,
      methode,
      params.notes || ""
    );
    pointageId = Number(res.lastInsertRowid);
  } else {
    // 2. Pointage Départ (Clôture de la journée / shift)
    action = "depart";
    const target = pointageActuel || db.prepare(`
      SELECT * FROM pointages
      WHERE employe_id = ? AND date_pointage = ?
      ORDER BY id DESC LIMIT 1
    `).get(employe.id, dateStr) as any;

    if (!target) {
      // Aucun pointage d'arrivée préalable : enregistre avec anomalie
      const res = db.prepare(`
        INSERT INTO pointages (
          company_id, employe_id, date_pointage, heure_arrivee, heure_depart,
          total_heures, heures_normales, heures_sup, methode_pointage, statut,
          motif_anomalie, notes, created_at, updated_at
        ) VALUES (
          ?, ?, ?, '08:00:00', ?,
          8.0, 8.0, 0, ?, 'anomalie',
          'Départ sans pointage d''arrivée préalable', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
      `).run(companyId, employe.id, dateStr, heureStr, methode, params.notes || "");
      pointageId = Number(res.lastInsertRowid);
    } else {
      // Calcul durée totale
      const arrParts = target.heure_arrivee.split(":").map(Number);
      const depParts = heureStr.split(":").map(Number);
      const diffMs = (depParts[0] * 3600 + depParts[1] * 60 + depParts[2]) - (arrParts[0] * 3600 + arrParts[1] * 60 + arrParts[2]);
      const diffMinutes = Math.max(0, Math.round(diffMs / 60) - (target.duree_pause_minutes || 0));
      const totalHeures = Math.round((diffMinutes / 60) * 100) / 100;

      // Base légale journalière : 8 heures normales, le reste en heures supplémentaires
      const heuresNormales = Math.min(8.0, totalHeures);
      const heuresSup = Math.max(0, Math.round((totalHeures - 8.0) * 100) / 100);

      db.prepare(`
        UPDATE pointages
        SET heure_depart = ?,
            total_heures = ?,
            heures_normales = ?,
            heures_sup = ?,
            statut = 'valide',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(heureStr, totalHeures, heuresNormales, heuresSup, target.id);
      pointageId = target.id;
    }
  }

  const pointageUpdated = db
    .prepare(`
      SELECT p.*, e.nom as employe_nom, e.prenom as employe_prenom, e.numero as employe_numero
      FROM pointages p
      JOIN employes e ON p.employe_id = e.id
      WHERE p.id = ?
    `)
    .get(pointageId) as PointageRecord;

  const employeNom = `${employe.prenom} ${employe.nom}`;
  const message = action === "arrivee"
    ? `Bonjour ${employeNom} ! Arrivée pointée à ${heureStr}. Bonne journée !`
    : `Au revoir ${employeNom} ! Départ pointé à ${heureStr}. Total : ${pointageUpdated.total_heures} h (Sup: ${pointageUpdated.heures_sup} h).`;

  return {
    pointage: pointageUpdated,
    action,
    message,
    employeNom,
  };
}

export function getPointagesJour(companyId = 1, date?: string): PointageRecord[] {
  const db = getDb();
  const d = date || new Date().toISOString().slice(0, 10);
  return db.prepare(`
    SELECT p.*, e.nom as employe_nom, e.prenom as employe_prenom, e.numero as employe_numero
    FROM pointages p
    JOIN employes e ON p.employe_id = e.id
    WHERE p.company_id = ? AND p.date_pointage = ?
    ORDER BY p.heure_arrivee DESC
  `).all(companyId, d) as PointageRecord[];
}

export function getPointagesPeriode(
  companyId = 1,
  dateDebut: string,
  dateFin: string,
  employeId?: number
): PointageRecord[] {
  const db = getDb();
  let query = `
    SELECT p.*, e.nom as employe_nom, e.prenom as employe_prenom, e.numero as employe_numero
    FROM pointages p
    JOIN employes e ON p.employe_id = e.id
    WHERE p.company_id = ? AND p.date_pointage >= ? AND p.date_pointage <= ?
  `;
  const params: any[] = [companyId, dateDebut, dateFin];

  if (employeId) {
    query += " AND p.employe_id = ?";
    params.push(employeId);
  }

  query += " ORDER BY p.date_pointage DESC, p.heure_arrivee DESC";
  return db.prepare(query).all(...params) as PointageRecord[];
}

export function getPointageStatsJournalieres(companyId = 1, date?: string): PointageStatsJournalieres {
  const db = getDb();
  const d = date || new Date().toISOString().slice(0, 10);
  const rows = db.prepare(`
    SELECT statut, total_heures, heures_sup
    FROM pointages
    WHERE company_id = ? AND date_pointage = ?
  `).all(companyId, d) as any[];

  let enCours = 0;
  let pointagesValides = 0;
  let totalHeuresJour = 0;
  let totalHeuresSupJour = 0;

  for (const r of rows) {
    if (r.statut === "en_cours") enCours++;
    if (r.statut === "valide") pointagesValides++;
    totalHeuresJour += r.total_heures || 0;
    totalHeuresSupJour += r.heures_sup || 0;
  }

  return {
    totalPresents: rows.length,
    enCours,
    pointagesValides,
    totalHeuresJour: Math.round(totalHeuresJour * 100) / 100,
    totalHeuresSupJour: Math.round(totalHeuresSupJour * 100) / 100,
  };
}

export function ajusterPointageManuel(
  pointageId: number,
  patch: Partial<PointageRecord>
): PointageRecord {
  const db = getDb();
  const current = db.prepare("SELECT * FROM pointages WHERE id = ?").get(pointageId) as any;
  if (!current) throw new Error("Pointage introuvable");

  const heureArr = patch.heure_arrivee ?? current.heure_arrivee;
  const heureDep = patch.heure_depart ?? current.heure_depart;
  const totalH = patch.total_heures !== undefined ? patch.total_heures : current.total_heures;
  const hNorm = patch.heures_normales !== undefined ? patch.heures_normales : current.heures_normales;
  const hSup = patch.heures_sup !== undefined ? patch.heures_sup : current.heures_sup;
  const statut = patch.statut ?? current.statut;
  const notes = patch.notes ?? current.notes;

  db.prepare(`
    UPDATE pointages
    SET heure_arrivee = ?,
        heure_depart = ?,
        total_heures = ?,
        heures_normales = ?,
        heures_sup = ?,
        statut = ?,
        notes = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(heureArr, heureDep, totalH, hNorm, hSup, statut, notes, pointageId);

  return db.prepare(`
    SELECT p.*, e.nom as employe_nom, e.prenom as employe_prenom, e.numero as employe_numero
    FROM pointages p
    JOIN employes e ON p.employe_id = e.id
    WHERE p.id = ?
  `).get(pointageId) as PointageRecord;
}
