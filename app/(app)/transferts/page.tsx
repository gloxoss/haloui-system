import { requireAuth } from "@/lib/auth";
import { getActiveCompanyId } from "@/lib/company";
import { listBranches, listProducts } from "@/lib/data";
import {
  getAllStocksForCompany,
  getTransfertKPIs,
  listStockTransferts,
} from "@/lib/stock-transferts";
import { TransfertsManager } from "@/components/transferts/transferts-manager";

export const dynamic = "force-dynamic";

export default async function TransfertsPage() {
  const session = await requireAuth();
  const companyId = await getActiveCompanyId();

  const branches = listBranches({ activeOnly: true, companyId });
  const products = listProducts("", companyId);
  const transferts = listStockTransferts(companyId);
  const kpis = getTransfertKPIs(companyId);
  const allStocks = getAllStocksForCompany(companyId);

  return (
    <TransfertsManager
      transferts={transferts}
      kpis={kpis}
      branches={branches}
      products={products}
      allStocks={allStocks}
      currentBranchId={(session.user as any).branch_id || branches[0]?.id}
    />
  );
}
