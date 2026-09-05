import { requireAuth } from "@/lib/auth";
import { getActiveCompanyId } from "@/lib/company";
import { getCompany, listBranches } from "@/lib/data";
import { getDb } from "@/lib/db";
import { EtiquettesManager, type EtiquetteProductItem } from "@/components/etiquettes/etiquettes-manager";

export const dynamic = "force-dynamic";

export default async function EtiquettesPage() {
  const session = await requireAuth();
  const companyId = await getActiveCompanyId();
  const company = getCompany(companyId);
  const db = getDb();

  const branches = listBranches({ activeOnly: true, companyId });
  const defaultBranchId = (session.user as any).branch_id || branches[0]?.id || 1;

  // Récupération des produits avec stock en dépôt et emplacement WMS
  const products = db
    .prepare(`
      SELECT
        p.id AS produit_id,
        p.ref,
        p.designation,
        COALESCE(p.code_barre, '') AS code_barre,
        p.prix_ht,
        ROUND(p.prix_ht * (1 + p.tva_rate / 100), 2) AS prix_ttc,
        p.tva_rate,
        COALESCE(p.unite, 'U') AS unite,
        COALESCE(p.categorie, '') AS categorie,
        p.emplacement_code,
        COALESCE(sd.quantite, 0) AS stock_actuel
      FROM produits p
      LEFT JOIN stock_depots sd ON sd.produit_id = p.id AND sd.branch_id = ?
      WHERE p.company_id = ? AND p.active = 1
      ORDER BY p.designation ASC
    `)
    .all(defaultBranchId, companyId) as EtiquetteProductItem[];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto">
      <EtiquettesManager
        initialProducts={products}
        branches={branches}
        companyName={company?.name || "HALOUI"}
        currentBranchId={defaultBranchId}
      />
    </div>
  );
}
