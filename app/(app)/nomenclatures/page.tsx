import { requireAuth } from "@/lib/auth";
import { getActiveCompanyId } from "@/lib/company";
import { listBranches, listProducts } from "@/lib/data";
import {
  getNomenclaturesKPIs,
  listKits,
  listOrdresFabrication,
} from "@/lib/nomenclatures";
import { NomenclaturesManager } from "@/components/nomenclatures/nomenclatures-manager";

export const dynamic = "force-dynamic";

export default async function NomenclaturesPage() {
  const session = await requireAuth();
  const companyId = await getActiveCompanyId();

  const branches = listBranches({ activeOnly: true, companyId });
  const defaultBranchId = (session.user as any).branch_id || branches[0]?.id || 1;

  const kits = listKits(companyId, defaultBranchId);
  const ordres = listOrdresFabrication(companyId, defaultBranchId);
  const kpis = getNomenclaturesKPIs(companyId);
  const allProducts = listProducts("", companyId);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto">
      <NomenclaturesManager
        initialKits={kits}
        initialOrdres={ordres}
        initialKpis={kpis}
        branches={branches}
        allProducts={allProducts}
      />
    </div>
  );
}
