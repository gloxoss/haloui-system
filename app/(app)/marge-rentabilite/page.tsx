import { getActiveCompanyId } from "@/lib/company";
import { listBranches } from "@/lib/data";
import { requireFeature } from "@/lib/features";
import {
  getMargeStatsGlobales,
  getMargeParProduit,
  getMargeParFamille,
  getMargeParClient,
  getMargeParBranch,
  getMargeEvolutionMensuelle,
} from "@/lib/marge";
import { MargeRentabiliteDashboard } from "@/components/marge/marge-rentabilite-dashboard";
import { type BranchRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MargeRentabilitePage() {
  await requireFeature("marge_rentabilite");
  const companyId = await getActiveCompanyId();

  const stats = getMargeStatsGlobales(companyId);
  const produits = getMargeParProduit(companyId, undefined, 40);
  const familles = getMargeParFamille(companyId);
  const clients = getMargeParClient(companyId);
  const branchesData = getMargeParBranch(companyId);
  const evolution = getMargeEvolutionMensuelle(companyId);
  const allBranches = (listBranches({ companyId }) as BranchRecord[]) || [];

  return (
    <div className="py-2">
      <MargeRentabiliteDashboard
        initialStats={stats}
        initialProduits={produits}
        initialFamilles={familles}
        initialClients={clients}
        initialBranches={branchesData}
        initialEvolution={evolution}
        branches={allBranches.map((b) => ({ id: b.id, name: b.name }))}
      />
    </div>
  );
}
