import { requireAuth } from "@/lib/auth";
import { getActiveCompanyId } from "@/lib/company";
import { listBranches, listProducts } from "@/lib/data";
import { getLotsSeriesKPIs, listLots, listSeries } from "@/lib/lots-series";
import { LotsSeriesManager } from "@/components/lots-series/lots-series-manager";

export const dynamic = "force-dynamic";

export default async function LotsSeriesPage() {
  const session = await requireAuth();
  const companyId = await getActiveCompanyId();

  const branches = listBranches({ activeOnly: true, companyId });
  const products = listProducts("", companyId);
  const lots = listLots({ companyId });
  const series = listSeries({ companyId });
  const kpis = getLotsSeriesKPIs(companyId);

  return (
    <LotsSeriesManager
      lots={lots}
      series={series}
      kpis={kpis}
      branches={branches}
      products={products}
      currentBranchId={(session.user as any).branch_id || branches[0]?.id}
    />
  );
}
