import { getDb } from "../lib/db";
import {
  getMessagerieConfig,
  updateMessagerieConfig,
  envoyerNotificationMessage,
  getMessagerieLogs,
  genererLienWhatsAppWeb,
} from "../lib/messagerie";
import {
  pointerHeure,
  getPointagesJour,
  verifierCodePinEmploye,
} from "../lib/pointeuse";
import {
  creerDemandeConge,
  validerDemandeConge,
  getCongesDemandes,
  getSoldesCongesEmployes,
} from "../lib/conges";
import {
  creerPretAvance,
  getPretsAvances,
  getPretById,
  genererBulletinsPaieMensuels,
  getBulletinsPaie,
  changerStatutBulletin,
} from "../lib/paie-prets";

async function runTests() {
  console.log("================================================================================");
  console.log("TESTING 4 NEW MODULES: Messagerie, Pointeuse, Conges, Paie & Prets");
  console.log("================================================================================");

  const db = getDb();

  // Pick an employee
  const emp = db.prepare("SELECT * FROM employes LIMIT 1").get() as any;
  if (!emp) {
    throw new Error("No employee found to run tests");
  }
  console.log(`[INIT] Testing with employee #${emp.id}: ${emp.prenom} ${emp.nom}, PIN: ${emp.code_pin || '1001'}`);

  // --------------------------------------------------------------------------
  // 1. MESSAGERIE WHATSAPP & SMS
  // --------------------------------------------------------------------------
  console.log("\n--- 1. TEST MESSAGERIE ---");
  const config = getMessagerieConfig(1);
  console.log(`[CONFIG] WhatsApp Actif: ${config.whatsapp_actif}, SMS Actif: ${config.sms_actif}`);

  const waLink = genererLienWhatsAppWeb("0661234567", "Bonjour ceci est un test de notification Haloui");
  console.log(`[WHATSAPP LINK] Generated link: ${waLink}`);
  if (!waLink.includes("https://wa.me/212661234567")) {
    throw new Error(`Failed to format phone number in WA link: ${waLink}`);
  }

  const sendRes = await envoyerNotificationMessage({
    canal: "whatsapp",
    typeNotification: "commande",
    documentNumero: "BC-TEST-999",
    destinataireNom: "Client Test SKOURA",
    destinataireTelephone: "0661234567",
    message: "Votre commande #BC-TEST-999 est prête.",
    userId: 1,
  });
  console.log(`[SEND WA] Result: success=${sendRes.success}, logId=${sendRes.logId}`);
  if (!sendRes.success || !sendRes.logId) {
    throw new Error("Failed to log sent WhatsApp message");
  }

  const logs = getMessagerieLogs(1, { limit: 5 });
  console.log(`[LOGS] Total retrieved: ${logs.length}. Latest: ${logs[0]?.destinataire_nom} (${logs[0]?.canal})`);
  console.log("✅ Module Messagerie: PASS");

  // --------------------------------------------------------------------------
  // 2. POINTEUSE VIRTUELLE
  // --------------------------------------------------------------------------
  console.log("\n--- 2. TEST POINTEUSE VIRTUELLE ---");
  // Ensure PIN is set
  db.prepare("UPDATE employes SET code_pin = '7788' WHERE id = ?").run(emp.id);
  const verified = verifierCodePinEmploye("7788");
  if (!verified || verified.id !== emp.id) {
    throw new Error("PIN verification failed");
  }
  console.log(`[PIN VERIF] Correctly verified PIN 7788 for employee ${verified.nom}`);

  // Pointage arrivée
  const punchArr = pointerHeure({
    employeId: emp.id,
    typePointage: "arrivee",
    methode: "pin",
  });
  console.log(`[POINTEUSE ARRIVEE] ${punchArr.message}, statut: ${punchArr.pointage.statut}`);

  // Pointage départ
  const punchDep = pointerHeure({
    employeId: emp.id,
    typePointage: "depart",
    methode: "pin",
  });
  console.log(`[POINTEUSE DEPART] ${punchDep.message}, total_heures: ${punchDep.pointage.total_heures}h, sup: ${punchDep.pointage.heures_sup}h`);

  const jourPunches = getPointagesJour(1);
  console.log(`[JOURNAL DU JOUR] Found ${jourPunches.length} punches today.`);
  console.log("✅ Module Pointeuse Virtuelle: PASS");

  // --------------------------------------------------------------------------
  // 3. CONGÉS & ABSENCES
  // --------------------------------------------------------------------------
  console.log("\n--- 3. TEST CONGÉS & ABSENCES ---");
  // Reset balances for test
  db.prepare("UPDATE employes SET solde_conges_payes = 18.0, solde_conges_pris = 0.0 WHERE id = ?").run(emp.id);

  const demande = creerDemandeConge({
    employeId: emp.id,
    typeConge: "conge_paye",
    dateDebut: "2026-09-14",
    dateFin: "2026-09-18",
    nbJours: 5,
    motif: "Congés annuels d'automne",
  });
  console.log(`[CONGE CREE] ID: ${demande.id}, Type: ${demande.type_conge}, Jours: ${demande.nb_jours}, Statut: ${demande.statut}`);

  // Valider la demande
  const valideDemande = validerDemandeConge(demande.id, {
    decision: "approuve",
    validePar: 1,
  });
  console.log(`[CONGE VALIDE] Statut: ${valideDemande.statut}, Décision par: ${valideDemande.valide_par}`);

  const soldes = getSoldesCongesEmployes(1);
  const empSolde = soldes.find((s) => s.id === emp.id);
  console.log(`[SOLDES EMPLOYE] Acquis: ${empSolde?.solde_payes}, Pris: ${empSolde?.solde_pris}, Restant: ${empSolde?.solde_restant}`);
  if (empSolde?.solde_pris !== 5 || empSolde?.solde_restant !== 13) {
    throw new Error(`Expected solde_pris=5 and solde_restant=13, got ${empSolde?.solde_pris} and ${empSolde?.solde_restant}`);
  }
  console.log("✅ Module Congés & Absences: PASS");

  // --------------------------------------------------------------------------
  // 4. PRÊTS, AVANCES & BULLETINS DE PAIE
  // --------------------------------------------------------------------------
  console.log("\n--- 4. TEST PRÊTS, AVANCES & PAIE ---");
  const currentMonth = new Date().toISOString().slice(0, 7); // e.g. 2026-09
  const today = new Date().toISOString().slice(0, 10);

  // Accorder un prêt de 6000 DH sur 6 mois (1000 DH/mois)
  const pret = creerPretAvance({
    employeId: emp.id,
    type: "pret_personnel",
    montantTotal: 6000,
    dateOctroi: today,
    nbMensualites: 6,
    modePaiement: "virement",
    notes: "Test prêt équipement",
    userId: 1,
  });
  console.log(`[PRET CREE] ID: ${pret.id}, Montant: ${pret.montant_total} DH, Mensualité: ${pret.montant_mensualite} DH, Échéances: ${pret.echeances?.length}`);
  if (pret.echeances?.length !== 6 || pret.montant_mensualite !== 1000) {
    throw new Error("Pret amortization schedule generation mismatch");
  }

  // Générer les bulletins de paie du mois en cours
  console.log(`[PAIE] Calcul des bulletins mensuels pour ${currentMonth}...`);
  const bulletins = genererBulletinsPaieMensuels({
    periodeMois: currentMonth,
    userId: 1,
  });
  console.log(`[BULLETINS CALCULES] Total bulletins générés: ${bulletins.length}`);

  const empBulletin = bulletins.find((b) => b.employe_id === emp.id);
  if (!empBulletin) {
    throw new Error(`Bulletin not generated for employee ${emp.id}`);
  }

  console.log(`[BULLETIN EMPLOYE] N°: ${empBulletin.numero_bulletin}`);
  console.log(` - Salaire Base: ${empBulletin.salaire_base} DH`);
  console.log(` - Heures Sup: ${empBulletin.heures_sup}h (${empBulletin.montant_heures_sup} DH)`);
  console.log(` - Salaire Brut: ${empBulletin.salaire_brut} DH`);
  console.log(` - Retenue CNSS: ${empBulletin.retenue_cnss} DH, AMO: ${empBulletin.retenue_amo} DH`);
  console.log(` - Retenue Prêt Automatique: ${empBulletin.retenue_prets_avances} DH`);
  console.log(` - Net à Payer: ${empBulletin.salaire_net} DH`);
  console.log(` - Statut: ${empBulletin.statut}`);

  if (empBulletin.retenue_prets_avances !== 1000) {
    throw new Error(`Expected loan deduction of 1000 DH, got ${empBulletin.retenue_prets_avances}`);
  }

  // Marquer le bulletin comme payé
  console.log(`[PAIE] Marquer le bulletin ${empBulletin.id} comme PAYE...`);
  const bulletinPaye = changerStatutBulletin(empBulletin.id, "paye");
  console.log(`[BULLETIN PAYE] Nouveau statut: ${bulletinPaye.statut}, Date: ${bulletinPaye.date_paiement}`);

  // Vérifier que l'échéance du prêt est passée à "preleve" et solde_restant décrémenté
  const pretApres = getPretById(pret.id);
  console.log(`[PRET APRES PAIEMENT PAIE] Remboursé: ${pretApres?.montant_rembourse} DH, Solde restant: ${pretApres?.solde_restant} DH`);
  if (pretApres?.montant_rembourse !== 1000 || pretApres?.solde_restant !== 5000) {
    throw new Error(`Loan deduction tracking failed. Remboursé: ${pretApres?.montant_rembourse}, Solde: ${pretApres?.solde_restant}`);
  }

  console.log("✅ Module Prêts, Avances & Bulletins de Paie: PASS");

  console.log("\n================================================================================");
  console.log("ALL 4 ERP/RH MODULES TESTED AND VALIDATED SUCCESSFULLY !");
  console.log("================================================================================");
}

runTests().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
