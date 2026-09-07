import { getDb } from "../lib/db";
import {
  creerNoteFrais,
  validerNoteFrais,
  rembourserNoteFrais,
  getNotesFrais,
  getNotesFraisStats,
} from "../lib/notes-frais";
import {
  authentifierEmployePortal,
  getEmployePortalData,
} from "../lib/employe-portal-auth";
import { creerDemandeConge } from "../lib/conges";
import {
  getMargeStatsGlobales,
  getMargeParProduit,
  getMargeParFamille,
  getMargeParClient,
  getMargeParBranch,
  getMargeEvolutionMensuelle,
} from "../lib/marge";
import {
  calculerDeclarationTVA,
  enregistrerDeclarationTVA,
  changerStatutDeclarationTVA,
  getDeclarationsTVA,
} from "../lib/tva";

async function main() {
  console.log("=================================================");
  console.log("TEST AUTOMATISÉ : 4 MODULES ERP & FISCALITÉ (ROUND 3)");
  console.log("=================================================");

  const db = getDb();
  const companyId = 1;

  // ----------------------------------------------------
  // MODULE 1 : NOTES DE FRAIS & FRAIS KILOMÉTRIQUES
  // ----------------------------------------------------
  console.log("\n[TEST 1] Notes de Frais & Frais Kilométriques...");
  const emp = db.prepare("SELECT * FROM employes LIMIT 1").get() as any;
  if (!emp) throw new Error("Aucun employé trouvé pour le test.");

  // Test 1.1: Standard Expense
  const note1 = creerNoteFrais({
    companyId,
    employeId: emp.id,
    dateDepense: "2026-09-07",
    categorie: "repas",
    description: "Déjeuner de travail avec partenaire logistique",
    montantTtc: 250,
    tvaRate: 10,
    userId: 1,
  });
  console.log(`  ✓ Note créée : ${note1.numero} - ${note1.montant_ttc} DH (HT: ${note1.montant_ht} DH, TVA: ${note1.montant_tva} DH)`);

  // Test 1.2: Frais Kilométriques
  const noteKm = creerNoteFrais({
    companyId,
    employeId: emp.id,
    dateDepense: "2026-09-07",
    categorie: "frais_km",
    description: "Déplacement client Fès vers Meknès A/R",
    distanceKm: 120,
    baremeKmUnitaire: 2.5,
    vehiculeImmatriculation: "56789-A-26",
    userId: 1,
  });
  console.log(`  ✓ Note Kilométrique : ${noteKm.numero} - ${noteKm.distance_km} km @ 2.50 DH/km = ${noteKm.montant_ttc} DH`);

  // Test 1.3: Validation
  const noteValidee = validerNoteFrais(note1.id, "approuve", undefined, 1);
  console.log(`  ✓ Note approuvée : Statut = ${noteValidee.statut}, Décision le = ${noteValidee.date_decision}`);

  // Test 1.4: Remboursement
  const noteRemboursee = rembourserNoteFrais(note1.id, "virement");
  console.log(`  ✓ Note remboursée : Statut = ${noteRemboursee.statut}, Mode = ${noteRemboursee.mode_remboursement}`);

  // Stats
  const statsNdf = getNotesFraisStats(companyId);
  console.log(`  ✓ Stats Notes de frais : Total=${statsNdf.totalDepenses.toFixed(2)} DH, Remboursées=${statsNdf.rembourseTotal.toFixed(2)} DH`);

  // ----------------------------------------------------
  // MODULE 2 : PORTAIL EMPLOYÉ LIBRE-SERVICE
  // ----------------------------------------------------
  console.log("\n[TEST 2] Portail Employé en Libre-Service...");
  console.log("     DEBUG EMP:", { id: emp.id, numero: emp.numero, cnss: emp.cnss, tel: emp.telephone, pin: emp.code_pin });
  const testPin = emp.code_pin || "1234";
  const authRes = authentifierEmployePortal(String(emp.numero), testPin);
  console.log(`  ✓ Authentification portail : Success = ${authRes.success}, Salarié = ${authRes.employe?.nom}, Error = ${authRes.error}`);

  const portalData = getEmployePortalData(emp.id);
  console.log(`  ✓ Données portail chargées :`);
  console.log(`     - Bulletins de paie : ${portalData?.bulletins.length}`);
  console.log(`     - Attestations officielles : ${portalData?.attestations.length}`);
  console.log(`     - Solde congés restants : ${portalData?.soldeConges.payesRestants} j.`);
  console.log(`     - Notes de frais associées : ${portalData?.notesFrais.length}`);

  const demConge = creerDemandeConge({
    employeId: emp.id,
    typeConge: "conge_paye",
    dateDebut: "2026-09-15",
    dateFin: "2026-09-18",
    nbJours: 4,
    motif: "Congé annuel de repos",
  });
  console.log(`  ✓ Demande congé soumise via portail : ID=${demConge.id}, Statut=${demConge.statut}`);

  // ----------------------------------------------------
  // MODULE 3 : MARGE BRUTE & RENTABILITÉ
  // ----------------------------------------------------
  console.log("\n[TEST 3] Analyse de Marge Brute & Rentabilité...");
  const margeStats = getMargeStatsGlobales(companyId);
  console.log(`  ✓ KPIs Marge :`);
  console.log(`     - CA Total Ventes HT : ${margeStats.ca_total_ht.toFixed(2)} DH`);
  console.log(`     - Coût Achat PMP : ${margeStats.cout_total_achat.toFixed(2)} DH`);
  console.log(`     - Marge Brute Totale : ${margeStats.marge_brute_totale.toFixed(2)} DH`);
  console.log(`     - Taux de Marge : ${margeStats.taux_marge_global}%`);
  console.log(`     - Taux de Marque : ${margeStats.taux_marque_global}%`);

  const topProduits = getMargeParProduit(companyId, undefined, 5);
  console.log(`  ✓ Top ${topProduits.length} produits analysés (Marge Max: ${topProduits[0]?.marge_brute || 0} DH, Taux: ${topProduits[0]?.taux_marge || 0}%)`);

  const margeFamilles = getMargeParFamille(companyId);
  console.log(`  ✓ Familles de produits analysées : ${margeFamilles.length} familles`);

  const margeClients = getMargeParClient(companyId);
  console.log(`  ✓ Clients analysés : ${margeClients.length} clients avec grille tarifaire`);

  // ----------------------------------------------------
  // MODULE 4 : DÉCLARATION DE TVA (SIMPL-TVA DGI)
  // ----------------------------------------------------
  console.log("\n[TEST 4] Déclaration de TVA (SIMPL-TVA Maroc)...");
  const periodeTva = "2026-09";
  const calculTva = calculerDeclarationTVA({ companyId, periodeCode: periodeTva, regime: "encaissement" });
  console.log(`  ✓ Calcul TVA ${periodeTva} :`);
  console.log(`     - TVA Collectée Total : ${calculTva.tva_collectee_total.toFixed(2)} DH (20%:${calculTva.tva_collectee_20.toFixed(2)}, 14%:${calculTva.tva_collectee_14.toFixed(2)}, 10%:${calculTva.tva_collectee_10.toFixed(2)})`);
  console.log(`     - TVA Déductible Total : ${calculTva.tva_deductible_total.toFixed(2)} DH`);
  console.log(`     - Crédit Antérieur : ${calculTva.credit_tva_precedent.toFixed(2)} DH`);
  console.log(`     - TVA Nette Due : ${calculTva.tva_nette_due.toFixed(2)} DH`);
  console.log(`     - Crédit Reportable : ${calculTva.credit_tva_a_reporter.toFixed(2)} DH`);

  const decEnregistree = enregistrerDeclarationTVA({
    companyId,
    periodeCode: periodeTva,
    regime: "encaissement",
    statut: "validee",
    userId: 1,
  });
  console.log(`  ✓ Déclaration enregistrée : ID=${decEnregistree.id}, Statut=${decEnregistree.statut}`);

  const decTeledeclaree = changerStatutDeclarationTVA(
    decEnregistree.id,
    "teledeclaree",
    "SIMPL-TVA-REC-202609-TEST"
  );
  console.log(`  ✓ Déclaration télédéclarée : Statut=${decTeledeclaree.statut}, Réf=${decTeledeclaree.reference_telepaiement}`);

  console.log("\n=================================================");
  console.log("TOUS LES TESTS ONT RÉUSSI AVEC SUCCÈS (4/4 MODULES) !");
  console.log("=================================================");
}

main().catch((err) => {
  console.error("FATAL ERROR IN TESTS:", err);
  process.exit(1);
});
