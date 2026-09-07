import { getActiveCompanyId } from "@/lib/company";
import { listEmployees } from "@/lib/data";
import { requireFeature } from "@/lib/features";
import { getBulletinsPaie, getPretsAvances } from "@/lib/paie-prets";
import { type EmployeeRecord } from "@/lib/types";
import { PaieManager } from "@/components/paie/paie-manager";

export const dynamic = "force-dynamic";

export default async function PaiePage() {
  await requireFeature("paie");
  const companyId = await getActiveCompanyId();

  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const bulletins = getBulletinsPaie(companyId, { periodeMois: currentMonth });
  const prets = getPretsAvances(companyId);
  const employes = (listEmployees() as EmployeeRecord[]) || [];

  return (
    <div className="py-2">
      <PaieManager
        bulletins={bulletins}
        prets={prets}
        employes={employes}
        currentMonth={currentMonth}
      />
    </div>
  );
}
