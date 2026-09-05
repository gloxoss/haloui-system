import { getDb } from "../lib/db";
import {
  getNomenclature,
  saveNomenclature,
  listKits,
  getNomenclaturesKPIs,
  lancerOrdreFabrication,
  listOrdresFabrication,
  traiterDestockageKitsDocument,
} from "../lib/nomenclatures";
import { generateBarcodeSvg } from "../lib/barcodes";

async function runTests() {
  console.log("==================================================");
  console.log("TEST AUTOMATISÉ : NOMENCLATURES, KITS & ÉTIQUETTES");
  console.log("==================================================\n");

  const db = getDb();
  const companyId = 1;
  const branchRow = db.prepare("SELECT id FROM branches WHERE active = 1 LIMIT 1").get() as { id: number };
  const branchId = branchRow ? branchRow.id : 18;

  // 1. Initialiser des produits de test : 2 composants et 1 kit
  const comp1Ref = `TEST-COMP-A-${Date.now()}`;
  const comp2Ref = `TEST-COMP-B-${Date.now()}`;
  const kitRef = `TEST-KIT-PACK-${Date.now()}`;

  const res1 = db
    .prepare(
      `INSERT INTO produits (company_id, ref, designation, prix_ht, tva_rate, unite, nature_produit, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`
    )
    .run(companyId, comp1Ref, "Composant Bois Brut", 30, 20, "U", "composant");
  const comp1Id = Number(res1.lastInsertRowid);

  const res2 = db
    .prepare(
      `INSERT INTO produits (company_id, ref, designation, prix_ht, tva_rate, unite, nature_produit, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`
    )
    .run(companyId, comp2Ref, "Composant Vis Inox (Lot)", 2, 20, "Lot", "composant");
  const comp2Id = Number(res2.lastInsertRowid);

  const resKit = db
    .prepare(
      `INSERT INTO produits (company_id, ref, designation, prix_ht, tva_rate, unite, nature_produit, mode_destockage_kit, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`
    )
    .run(companyId, kitRef, "Pack Bureau Ergonomique", 200, 20, "U", "kit", "composants");
  const kitId = Number(resKit.lastInsertRowid);

  // Alimenter le stock initial des composants dans le dépôt
  db.prepare(
    `INSERT INTO stock_depots (company_id, branch_id, produit_id, quantite, seuil_alerte)
     VALUES (?, ?, ?, ?, ?)`
  ).run(companyId, branchId, comp1Id, 20, 5); // 20 unités de bois

  db.prepare(
    `INSERT INTO stock_depots (company_id, branch_id, produit_id, quantite, seuil_alerte)
     VALUES (?, ?, ?, ?, ?)`
  ).run(companyId, branchId, comp2Id, 50, 10); // 50 lots de vis

  console.log(`[+] Produits créés :
  - Composant 1 (#${comp1Id}) : ${comp1Ref} (Stock: 20, P.Achat: 30 DH)
  - Composant 2 (#${comp2Id}) : ${comp2Ref} (Stock: 50, P.Achat: 2 DH)
  - Kit (#${kitId}) : ${kitRef} (Prix Vente: 200 DH)`);

  // 2. Créer la Nomenclature (BOM)
  // Formule pour 1 Kit : 2x Composant 1 (perte 5%) + 4x Composant 2 (perte 0%)
  console.log("\n--- TEST 1 : Enregistrement de la Nomenclature (BOM) ---");
  saveNomenclature({
    produitParentId: kitId,
    modeDestockageKit: "composants",
    composants: [
      { composantId: comp1Id, quantite: 2, unite: "U", tauxPertePourcent: 5 },
      { composantId: comp2Id, quantite: 4, unite: "Lot", tauxPertePourcent: 0 },
    ],
  });

  const nomenclature = getNomenclature(kitId, companyId, branchId);
  if (!nomenclature) {
    throw new Error("Échec de la récupération de la nomenclature");
  }

  console.log(`[✓] Nomenclature enregistrée : ${nomenclature.composants.length} composants`);
  console.log(`    Coût de revient calculé : ${nomenclature.cout_revient_ht.toFixed(2)} DH`);
  console.log(`    Marge brute estimée : ${nomenclature.marge_brute_ht.toFixed(2)} DH (${nomenclature.marge_pourcent.toFixed(1)}%)`);
  console.log(`    Stock virtuel possible : ${nomenclature.stock_virtuel_fabricable} unités`);

  // Vérification arithmétique :
  // Coût = (2 * 1.05 * 30) + (4 * 2) = 63 + 8 = 71 DH
  if (Math.abs(nomenclature.cout_revient_ht - 71) > 0.1) {
    throw new Error(`Coût calculé erroné : attendu 71 DH, obtenu ${nomenclature.cout_revient_ht}`);
  }

  // Stock virtuel :
  // Comp 1: floor(20 / 2.1) = 9
  // Comp 2: floor(50 / 4) = 12
  // Min = 9
  if (nomenclature.stock_virtuel_fabricable !== 9) {
    throw new Error(`Stock virtuel erroné : attendu 9, obtenu ${nomenclature.stock_virtuel_fabricable}`);
  }
  console.log("[✓] Calculs Coût de revient et Stock virtuel validés avec succès !");

  // 3. Ordre de Fabrication (OF) : Assemblage en atelier
  console.log("\n--- TEST 2 : Lancement d'un Ordre de Fabrication (Assemblage) ---");
  const ofResult = lancerOrdreFabrication({
    companyId,
    branchId,
    produitId: kitId,
    typeOperation: "assemblage",
    quantite: 3,
    responsableId: 1,
    notes: "Fabrication de 3 bureaux pour commande client",
  });

  console.log(`[✓] Ordre de Fabrication créé : N° ${ofResult.numero}, Statut: ${ofResult.statut}`);
  console.log(`    Quantité réalisée : ${ofResult.quantite_realisee}, Coût total OF: ${ofResult.cout_total_ht} DH`);

  // Vérifier déstockage des composants dans stock_depots
  const stockComp1 = db
    .prepare(`SELECT quantite FROM stock_depots WHERE branch_id = ? AND produit_id = ?`)
    .get(branchId, comp1Id) as { quantite: number };

  const stockComp2 = db
    .prepare(`SELECT quantite FROM stock_depots WHERE branch_id = ? AND produit_id = ?`)
    .get(branchId, comp2Id) as { quantite: number };

  const stockKit = db
    .prepare(`SELECT quantite FROM stock_depots WHERE branch_id = ? AND produit_id = ?`)
    .get(branchId, kitId) as { quantite: number };

  // Attendu pour 3 kits :
  // Comp 1 : 20 - (3 * 2 * 1.05) = 20 - 6.3 = 13.7
  // Comp 2 : 50 - (3 * 4) = 50 - 12 = 38
  // Kit : 0 + 3 = 3
  console.log(`    Stock résultant Composant 1 : ${stockComp1.quantite} (attendu 13.7)`);
  console.log(`    Stock résultant Composant 2 : ${stockComp2.quantite} (attendu 38)`);
  console.log(`    Stock résultant Kit produit fini : ${stockKit.quantite} (attendu 3)`);

  if (Math.abs(stockComp1.quantite - 13.7) > 0.01) {
    throw new Error(`Stock Composant 1 incorrect après OF : ${stockComp1.quantite}`);
  }
  if (stockComp2.quantite !== 38) {
    throw new Error(`Stock Composant 2 incorrect après OF : ${stockComp2.quantite}`);
  }
  if (stockKit.quantite !== 3) {
    throw new Error(`Stock Kit incorrect après OF : ${stockKit.quantite}`);
  }
  console.log("[✓] Déstockage composants et incrément produit fini vérifiés !");

  // 4. Test Déstockage Automatique lors de la vente d'un Kit
  console.log("\n--- TEST 3 : Déstockage Automatique sur Vente Document Facture/BL ---");
  const testDocNumero = Math.floor(Math.random() * 800000) + 100000;
  const docRes = db
    .prepare(
      `INSERT INTO documents (company_id, branch_id, type, numero, date, status, total_ht, total_ttc)
       VALUES (?, ?, 'bl', ?, '2026-09-05', 'valide', 400, 480)`
    )
    .run(companyId, branchId, testDocNumero);
  const docId = Number(docRes.lastInsertRowid);

  db.prepare(
    `INSERT INTO document_lignes (document_id, produit_id, designation, quantite, prix_unitaire_ht, tva_rate, total_ht)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(docId, kitId, "Pack Bureau Ergonomique", 2, 200, 20, 400);

  // Appeler le processeur de déstockage des kits
  traiterDestockageKitsDocument(docId, 1);

  // Vérifier à nouveau les stocks :
  // Comp 1 décrémenté de 2 * 2.1 = 4.2 -> 13.7 - 4.2 = 9.5
  // Comp 2 décrémenté de 2 * 4 = 8 -> 38 - 8 = 30
  const stockComp1AfterSale = db
    .prepare(`SELECT quantite FROM stock_depots WHERE branch_id = ? AND produit_id = ?`)
    .get(branchId, comp1Id) as { quantite: number };

  const stockComp2AfterSale = db
    .prepare(`SELECT quantite FROM stock_depots WHERE branch_id = ? AND produit_id = ?`)
    .get(branchId, comp2Id) as { quantite: number };

  console.log(`    Stock Composant 1 après vente BL : ${stockComp1AfterSale.quantite} (attendu 9.5)`);
  console.log(`    Stock Composant 2 après vente BL : ${stockComp2AfterSale.quantite} (attendu 30)`);

  if (Math.abs(stockComp1AfterSale.quantite - 9.5) > 0.01) {
    throw new Error(`Déstockage vente erroné sur comp 1 : ${stockComp1AfterSale.quantite}`);
  }
  if (stockComp2AfterSale.quantite !== 30) {
    throw new Error(`Déstockage vente erroné sur comp 2 : ${stockComp2AfterSale.quantite}`);
  }
  console.log("[✓] Vente de Kit décrémente automatiquement les composants en stock !");

  // 5. Test Génération Vectorielle des Codes-Barres
  console.log("\n--- TEST 4 : Génération Vectorielle EAN-13, Code 128, QR Code ---");
  const svgEan = await generateBarcodeSvg("ean13", "611123456789"); // 12 digits -> check digit calculé
  console.log(`[✓] EAN-13 SVG généré : ${svgEan.length} caractères, balise <svg présente: ${svgEan.includes("<svg")}`);

  const svg128 = await generateBarcodeSvg("code128", "HALOUI-PACK-2026", { includeText: true });
  console.log(`[✓] Code 128 SVG généré : ${svg128.length} caractères, balise <svg présente: ${svg128.includes("<svg")}`);

  const svgQr = await generateBarcodeSvg("qrcode", "https://haloui.system/produits/999", { width: 150 });
  console.log(`[✓] QR Code SVG généré : ${svgQr.length} caractères, balise <svg présente: ${svgQr.includes("<svg")}`);

  if (!svgEan.includes("<svg") || !svg128.includes("<svg") || !svgQr.includes("<svg")) {
    throw new Error("Échec de la génération vectorielle SVG");
  }

  // Nettoyage des données de test
  db.prepare(`DELETE FROM document_lignes WHERE document_id = ?`).run(docId);
  db.prepare(`DELETE FROM documents WHERE id = ?`).run(docId);
  db.prepare(`DELETE FROM ordre_fabrication_lignes WHERE ordre_id = ?`).run(ofResult.id);
  db.prepare(`DELETE FROM ordres_fabrication WHERE id = ?`).run(ofResult.id);
  db.prepare(`DELETE FROM produit_nomenclatures WHERE produit_parent_id = ?`).run(kitId);
  db.prepare(`DELETE FROM stock_depots WHERE produit_id IN (?, ?, ?)`).run(comp1Id, comp2Id, kitId);
  db.prepare(`DELETE FROM mouvements_stock WHERE produit_id IN (?, ?, ?)`).run(comp1Id, comp2Id, kitId);
  db.prepare(`DELETE FROM produits WHERE id IN (?, ?, ?)`).run(comp1Id, comp2Id, kitId);

  console.log("\n==================================================");
  console.log("TOUS LES TESTS AUTOMATISÉS SONT PASSÉS AVEC SUCCÈS !");
  console.log("==================================================");
}

runTests().catch((err) => {
  console.error("\n❌ ERREUR LORS DU TEST :", err);
  process.exit(1);
});
