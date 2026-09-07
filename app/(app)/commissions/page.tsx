import { requireAuth } from "@/lib/auth";
import { getActiveCompanyId } from "@/lib/company";
import { getCommissionFiches, getCommissionRegles, getCommerciaux } from "@/lib/commissions";
import { CommissionsManager } from "@/components/commissions/commissions-manager";

export const dynamic = "force-dynamic";

export default async function CommissionsPage() {
  await requireAuth();
  const companyId = await getActiveCompanyId();

  const initialRegles = getCommissionRegles(companyId);
  const initialFiches = getCommissionFiches(companyId);
  const commerciaux = getCommerciaux();

  return (
    <CommissionsManager
      initialRegles={initialRegles}
      initialFiches={initialFiches}
      commerciaux={commerciaux}
    />
  );
}
