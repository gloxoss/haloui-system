import { requireAuth } from "@/lib/auth";
import { getActiveCompanyId } from "@/lib/company";
import { listBranches } from "@/lib/data";
import { getInventaireKPIs, listInventaires } from "@/lib/inventaires";
import { InventairesManager } from "@/components/inventaires/inventaires-manager";

export const dynamic = "force-dynamic";

export default async function InventairesPage() {
  const session = await requireAuth();
  const companyId = await getActiveCompanyId();

  const branches = listBranches({ activeOnly: true, companyId });
  const inventaires = listInventaires({ companyId });
  const kpis = getInventaireKPIs(companyId);

  return (
    <InventairesManager
      inventaires={inventaires}
      kpis={kpis}
      branches={branches}
      currentBranchId={(session.user as any).branch_id || branches[0]?.id}
    />
  );
}
