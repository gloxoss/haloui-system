import { getDb } from "../lib/db";
import {
  attribuerPointsVente,
  calculerPalierClient,
  convertirPointsEnBonAchat,
  getFideliteStats,
} from "../lib/fidelite";
import {
  calculerPrixArticleClient,
  creerGrilleTarifaire,
  getGrillesTarifaires,
} from "../lib/tarification";
import {
  creerCommissionRegle,
  getCommissionRegles,
  genererFicheCommissionMensuelle,
  changerStatutFicheCommission,
  getCommerciaux,
} from "../lib/commissions";
import {
  creerCRMOpportunite,
  deplacerEtapeOpportunite,
  convertirOpportuniteEnDevis,
  getCRMPipelineKPIs,
  getCRMOpportunites,
} from "../lib/crm";
import { validerBonAchat } from "../lib/pos";

async function runTests() {
  console.log("=== DÉBUT DES TESTS INTÉGRATION COMMERCIALE (4 MODULES) ===");
  const db = getDb();
  const companyId = 1;

  // Find or create test client
  let client = db.prepare("SELECT * FROM clients LIMIT 1").get() as any;
  if (!client) {
    const res = db.prepare(`
      INSERT INTO clients (name, phone, email)
      VALUES ('Client Test ERP', '0600112233', 'test@erp.ma')
    `).run();
    client = db.prepare("SELECT * FROM clients WHERE id = ?").get(res.lastInsertRowid) as any;
  }
  console.log(`[INIT] Client de test : ID ${client.id} - ${client.name}`);

  // Find or create test product
  let product = db.prepare("SELECT * FROM produits WHERE company_id = ? LIMIT 1").get(companyId) as any;
  if (!product) {
    const res = db.prepare(`
      INSERT INTO produits (company_id, ref, designation, prix_ht, tva_rate, active)
      VALUES (?, 'PRD-TEST-1', 'Huile Moteur Synthétique 5W40', 100, 20, 1)
    `).run(companyId);
    product = db.prepare("SELECT * FROM produits WHERE id = ?").get(res.lastInsertRowid) as any;
  }
  console.log(`[INIT] Produit de test : ID ${product.id} - ${product.designation} (${product.prix_ht} DH HT)`);

  // Find test commercial / admin user
  const adminUser = db.prepare("SELECT * FROM users LIMIT 1").get() as any;
  console.log(`[INIT] Utilisateur responsable : ID ${adminUser.id} - ${adminUser.full_name}`);

  // -------------------------------------------------------------
  // TEST 1 : PROGRAMME DE FIDÉLITÉ CLIENT AVANCÉ
  // -------------------------------------------------------------
  console.log("\n--- [TEST 1] Programme de Fidélité Client Avancé ---");
  const attribution = attribuerPointsVente({
    companyId,
    clientId: client.id,
    montantTTC: 3500,
    motif: "Achat test intégration",
  });
  console.log(`Points attribués pour un achat de 3500 DH : ${attribution.pointsGagnes} pts (Nouveau solde: ${attribution.nouveauSolde})`);
  if (attribution.pointsGagnes !== 3500) throw new Error("Échec calcul points fidélité");

  const palierCalc = calculerPalierClient(6000);
  console.log(`Palier attribué pour 6000 DH dépensés : ${palierCalc.palier} (Remise: ${palierCalc.remiseAuto}%)`);
  if (palierCalc.palier !== "Gold") throw new Error("Échec évaluation palier Gold");

  // Credit test points to client for conversion
  db.prepare("UPDATE clients SET fidelite_points = 2000, fidelite_total_depense = 6000 WHERE id = ?").run(client.id);

  const branch = db.prepare("SELECT id FROM branches LIMIT 1").get() as any;
  const branchId = branch ? branch.id : 18;

  const conversion = convertirPointsEnBonAchat({
    companyId,
    branchId,
    clientId: client.id,
    userId: adminUser.id,
    pointsAConvertir: 1000,
    validiteMois: 3,
  });
  console.log(`Conversion de 1000 pts en bon d'achat : Code ${conversion.bonAchat.code}, Montant : ${conversion.montantCashbackDH} DH`);
  if (conversion.montantCashbackDH !== 50) throw new Error("Échec calcul montant bon d'achat (100 pts = 5 DH -> 1000 pts = 50 DH)");

  const checkBon = validerBonAchat(conversion.bonAchat.code, companyId);
  console.log(`Vérification caisse du bon ${conversion.bonAchat.code} : Valide = ${checkBon.valide}, Solde restant = ${checkBon.bon?.montant_restant} DH`);
  if (!checkBon.valide || checkBon.bon?.montant_restant !== 50) throw new Error("Échec validation bon d'achat en caisse");
  console.log("✓ TEST 1 (Fidélité, Paliers, Cashback) VALIDÉ !");

  // -------------------------------------------------------------
  // TEST 2 : TARIFICATION PERSONNALISÉE & GRILLES
  // -------------------------------------------------------------
  console.log("\n--- [TEST 2] Tarification Personnalisée & Grilles Tarifaires ---");
  const testCodeGrille = `GRI-TEST-${Date.now().toString().slice(-4)}`;
  const grilleCree = creerGrilleTarifaire({
    companyId,
    code: testCodeGrille,
    nom: "Grille Test Grossistes",
    typeGrille: "categorie",
    categorieCible: "grossiste",
    remiseGlobalePourcent: 0,
    lignes: [
      {
        produitId: product.id,
        prixSpecifiqueHt: 75.0, // Override: 75 DH instead of 100 DH
      },
    ],
  });
  console.log(`Grille créée : ${grilleCree.nom} (Code: ${grilleCree.code}) avec prix spécifique ${75.0} DH`);

  // Assign client to grossiste
  db.prepare("UPDATE clients SET categorie_tarifaire = 'grossiste' WHERE id = ?").run(client.id);

  const resolvedPrice = calculerPrixArticleClient({
    companyId,
    produitId: product.id,
    clientId: client.id,
  });
  console.log(`Prix résolu pour le client grossiste : ${resolvedPrice.prix_applique_ht} DH HT (Source: ${resolvedPrice.source}, Nom: ${resolvedPrice.source_nom})`);
  if (resolvedPrice.prix_applique_ht !== 75.0) throw new Error(`Échec résolution tarif : attendu 75, obtenu ${resolvedPrice.prix_applique_ht}`);
  console.log("✓ TEST 2 (Grilles Tarifaires & Moteur de Prix) VALIDÉ !");

  // -------------------------------------------------------------
  // TEST 3 : COMMISSIONNEMENT DES COMMERCIAUX & VENDEURS
  // -------------------------------------------------------------
  console.log("\n--- [TEST 3] Commissionnement des Commerciaux & Vendeurs ---");
  const commerciaux = getCommerciaux();
  console.log(`Commerciaux détectés : ${commerciaux.length}`);

  const regleCommission = creerCommissionRegle({
    companyId,
    nom: "Règle Test 10% CA",
    userId: adminUser.id,
    baseCalcul: "ca_ht",
    tauxPourcent: 10.0,
  });
  console.log(`Règle créée : ${regleCommission.nom} (${regleCommission.taux_pourcent}% sur ${regleCommission.base_calcul})`);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const ficheGeneree = genererFicheCommissionMensuelle({
    companyId,
    commercialId: adminUser.id,
    periodeMois: currentMonth,
    notes: "Test automatique fiche commission",
  });
  console.log(`Fiche générée : N° ${ficheGeneree.fiche.numero_fiche} (Statut: ${ficheGeneree.fiche.statut}, Commission: ${ficheGeneree.fiche.total_commission_nette} DH)`);

  const ficheValidee = changerStatutFicheCommission(ficheGeneree.fiche.id, "validee");
  console.log(`Statut après validation : ${ficheValidee.statut}`);
  if (ficheValidee.statut !== "validee") throw new Error("Échec transition statut fiche validée");

  const fichePayee = changerStatutFicheCommission(ficheGeneree.fiche.id, "payee", {
    datePaiement: new Date().toISOString().slice(0, 10),
  });
  console.log(`Statut après paiement : ${fichePayee.statut} (Date: ${fichePayee.date_paiement})`);
  if (fichePayee.statut !== "payee") throw new Error("Échec transition statut fiche payée");
  console.log("✓ TEST 3 (Commissions, Fiches Mensuelles, Paiement) VALIDÉ !");

  // -------------------------------------------------------------
  // TEST 4 : PIPELINE CRM KANBAN & OPPORTUNITÉS
  // -------------------------------------------------------------
  console.log("\n--- [TEST 4] Pipeline CRM Kanban & Opportunités Commerciales ---");
  const oppCree = creerCRMOpportunite({
    companyId,
    titre: "Opportunité Test Flotte 50 Camions",
    clientId: client.id,
    clientNom: client.name,
    contactNom: "Directeur Technique",
    contactTelephone: "06 11 22 33 44",
    commercialId: adminUser.id,
    etape: "nouveau_contact",
    montantEstimeHt: 100000,
    probabilitePourcent: 10,
    notes: "Piste test CRM automatisée",
    userId: adminUser.id,
  });
  console.log(`Opportunité créée : ID ${oppCree.id} - ${oppCree.titre} (${oppCree.montant_estime_ht} DH HT, Étape: ${oppCree.etape}, Proba: ${oppCree.probabilite_pourcent}%)`);

  // Move stage
  const oppAvancee = deplacerEtapeOpportunite(oppCree.id, "qualification", {
    userId: adminUser.id,
    notes: "Qualification technique réussie",
  });
  console.log(`Étape après progression : ${oppAvancee.etape} (Probabilité: ${oppAvancee.probabilite_pourcent}%, Pondéré: ${oppAvancee.montant_pondere_ht} DH HT)`);
  if (oppAvancee.etape !== "qualification" || oppAvancee.probabilite_pourcent !== 30) {
    throw new Error("Échec déplacement étape CRM");
  }

  // Convert to quote
  const conversionDevis = convertirOpportuniteEnDevis(oppCree.id, adminUser.id);
  console.log(`Conversion en devis : Document ID #${conversionDevis.documentId}, N° DEVIS-${conversionDevis.numeroDevis}`);
  console.log(`Opportunité liée après conversion : Étape = ${conversionDevis.opportunite.etape}, Devis ID = ${conversionDevis.opportunite.devis_document_id}`);
  if (!conversionDevis.documentId || conversionDevis.opportunite.etape !== "devis_envoye") {
    throw new Error("Échec conversion opportunité CRM en Devis");
  }

  // Pipeline KPIs check
  const kpis = getCRMPipelineKPIs(companyId);
  console.log(`KPIs Pipeline CRM : Total = ${kpis.totalOpportunites}, Actives = ${kpis.opportunitesActives}, Pipeline Pondéré = ${kpis.montantPonderePipelineHT} DH HT`);
  if (kpis.totalOpportunites < 1) throw new Error("Échec KPIs Pipeline CRM");
  console.log("✓ TEST 4 (CRM Kanban, Probabilités, Conversion Devis) VALIDÉ !");

  console.log("\n=======================================================");
  console.log(" TOUS LES 4 MODULES COMMERCIAUX SONT 100% OPÉRATIONNELS !");
  console.log("=======================================================");
}

runTests().catch((err) => {
  console.error("❌ ERREUR LORS DES TESTS :", err);
  process.exit(1);
});
