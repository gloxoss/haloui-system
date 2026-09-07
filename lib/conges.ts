import { getDb } from "@/lib/db";
import {
  type CongeDemandeRecord,
  type CongeStatut,
  type CongeType,
} from "@/lib/types";

export function calculerJoursOuvrables(dateDebut: string, dateFin: string): number {
  const d1 = new Date(dateDebut);
  const d2 = new Date(dateFin);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 1;
  if (d2 < d1) return 1;

  let count = 0;
  const cur = new Date(d1);
  while (cur <= d2) {
    const day = cur.getDay();
    // Exclure le dimanche (0) comme jour de repos hebdomadaire standard
    if (day !== 0) {
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return Math.max(1, count);
}

export function creerDemandeConge(params: {
  companyId?: number;
  employeId: number;
  typeConge: CongeType;
  dateDebut: string;
  dateFin: string;
  nbJours?: number;
  motif?: string;
  justificatifPath?: string;
}): CongeDemandeRecord {
  const db = getDb();
  const companyId = params.companyId || 1;

  const emp = db.prepare("SELECT * FROM employes WHERE id = ?").get(params.employeId) as any;
  if (!emp) throw new Error("Employé introuvable");

  const nbJours = params.nbJours || calculerJoursOuvrables(params.dateDebut, params.dateFin);

  // Si congé payé, vérifier si solde suffisant
  if (params.typeConge === "conge_paye") {
    const soldeRestant = (emp.solde_conges_payes || 18) - (emp.solde_conges_pris || 0);
    if (nbJours > soldeRestant) {
      throw new Error(`Solde insuffisant : vous disposez de ${soldeRestant} jours, demande de ${nbJours} jours`);
    }
  }

  const res = db.prepare(`
    INSERT INTO conges_demandes (
      company_id, employe_id, type_conge, date_debut, date_fin,
      nb_jours, motif, justificatif_path, statut, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, 'en_attente', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
  `).run(
    companyId,
    params.employeId,
    params.typeConge,
    params.dateDebut,
    params.dateFin,
    nbJours,
    params.motif || "",
    params.justificatifPath || ""
  );

  return getDemandeCongeById(Number(res.lastInsertRowid));
}

export function validerDemandeConge(
  demandeId: number,
  params: {
    decision: "approuve" | "refuse";
    validePar: number;
    motifRefus?: string;
  }
): CongeDemandeRecord {
  const db = getDb();
  const demande = db.prepare("SELECT * FROM conges_demandes WHERE id = ?").get(demandeId) as any;
  if (!demande) throw new Error("Demande de congé introuvable");

  if (demande.statut !== "en_attente") {
    throw new Error(`La demande est déjà dans l'état : ${demande.statut}`);
  }

  const now = new Date().toISOString().slice(0, 19).replace("T", " ");

  db.transaction(() => {
    if (params.decision === "approuve") {
      db.prepare(`
        UPDATE conges_demandes
        SET statut = 'approuve',
            valide_par = ?,
            date_decision = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(params.validePar, now, demandeId);

      // Si congé payé, incrémenter les congés pris
      if (demande.type_conge === "conge_paye") {
        db.prepare(`
          UPDATE employes
          SET solde_conges_pris = COALESCE(solde_conges_pris, 0) + ?
          WHERE id = ?
        `).run(demande.nb_jours, demande.employe_id);

        db.prepare(`
          INSERT INTO conges_mouvements (
            company_id, employe_id, type_mouvement, nb_jours, date_mouvement,
            description, demande_id, created_by
          ) VALUES (
            ?, ?, 'prise', ?, ?,
            ?, ?, ?
          )
        `).run(
          demande.company_id,
          demande.employe_id,
          -demande.nb_jours,
          now,
          `Congé payé du ${demande.date_debut} au ${demande.date_fin}`,
          demande.id,
          params.validePar
        );
      }
    } else {
      db.prepare(`
        UPDATE conges_demandes
        SET statut = 'refuse',
            valide_par = ?,
            date_decision = ?,
            motif_refus = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(params.validePar, now, params.motifRefus || "Refus hiérarchique", demandeId);
    }
  })();

  return getDemandeCongeById(demandeId);
}

export function getDemandeCongeById(id: number): CongeDemandeRecord {
  const db = getDb();
  return db.prepare(`
    SELECT d.*, e.nom as employe_nom, e.prenom as employe_prenom, e.numero as employe_numero,
           u.full_name as valide_par_nom
    FROM conges_demandes d
    JOIN employes e ON d.employe_id = e.id
    LEFT JOIN users u ON d.valide_par = u.id
    WHERE d.id = ?
  `).get(id) as CongeDemandeRecord;
}

export function getCongesDemandes(
  companyId = 1,
  options?: { statut?: CongeStatut; employeId?: number }
): CongeDemandeRecord[] {
  const db = getDb();
  let query = `
    SELECT d.*, e.nom as employe_nom, e.prenom as employe_prenom, e.numero as employe_numero,
           u.full_name as valide_par_nom
    FROM conges_demandes d
    JOIN employes e ON d.employe_id = e.id
    LEFT JOIN users u ON d.valide_par = u.id
    WHERE d.company_id = ?
  `;
  const params: any[] = [companyId];

  if (options?.statut) {
    query += " AND d.statut = ?";
    params.push(options.statut);
  }

  if (options?.employeId) {
    query += " AND d.employe_id = ?";
    params.push(options.employeId);
  }

  query += " ORDER BY d.id DESC";
  return db.prepare(query).all(...params) as CongeDemandeRecord[];
}

export function getSoldesCongesEmployes(companyId = 1) {
  const db = getDb();
  const rows = db.prepare(`
    SELECT id, numero, nom, prenom,
           COALESCE(solde_conges_payes, 18.0) as solde_payes,
           COALESCE(solde_conges_pris, 0.0) as solde_pris
    FROM employes
    ORDER BY nom ASC, prenom ASC
  `).all() as Array<{ id: number; numero: any; nom: string; prenom: string; solde_payes: number; solde_pris: number }>;

  return rows.map((r) => ({
    ...r,
    solde_restant: Math.round((r.solde_payes - r.solde_pris) * 10) / 10,
  }));
}
