import { requireAuth } from "@/lib/auth";
import { getActiveCompanyId } from "@/lib/company";
import { getDb } from "@/lib/db";
import { listBranches, listProducts } from "@/lib/data";
import {
  getWmsKPIs,
  listEmplacements,
  listProduitsEmplacements,
} from "@/lib/wms";
import { EmplacementsManager } from "@/components/wms/emplacements-manager";

export const dynamic = "force-dynamic";

export default async function EmplacementsPage() {
  const session = await requireAuth();
  const companyId = await getActiveCompanyId();
  const db = getDb();

  const branches = listBranches({ activeOnly: true, companyId });
  const products = listProducts("", companyId);
  const currentBranchId = (session.user as any).branch_id || branches[0]?.id;

  const emplacements = listEmplacements({ companyId });
  const produitsEmplacements = listProduitsEmplacements({ companyId });
  const kpis = getWmsKPIs({ companyId });

  const recentDocuments = db.prepare(`
    SELECT 
      d.id,
      d.type,
      d.numero,
      d.date,
      c.name as client_nom,
      f.name as fournisseur_nom,
      (SELECT COUNT(*) FROM document_lignes dl WHERE dl.document_id = d.id) as total_lignes
    FROM documents d
    LEFT JOIN clients c ON d.client_id = c.id
    LEFT JOIN fournisseurs f ON d.fournisseur_id = f.id
    WHERE d.company_id = ?
      AND d.type IN ('bl', 'bs', 'bc')
      AND d.status != 'annule'
    ORDER BY d.id DESC
    LIMIT 25
  `).all(companyId) as Array<{
    id: number;
    type: "bl" | "bs" | "bc" | "bt";
    numero: number;
    date: string;
    client_nom?: string;
    fournisseur_nom?: string;
    total_lignes: number;
  }>;

  return (
    <EmplacementsManager
      initialEmplacements={emplacements}
      initialProduitsEmplacements={produitsEmplacements}
      initialKPIs={kpis}
      products={products}
      branches={branches}
      currentBranchId={currentBranchId}
      recentDocuments={recentDocuments}
    />
  );
}
