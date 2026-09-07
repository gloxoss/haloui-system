import { getActiveCompanyId } from "@/lib/company";
import { listEmployees } from "@/lib/data";
import { requireFeature } from "@/lib/features";
import { getPointageStatsJournalieres, getPointagesJour } from "@/lib/pointeuse";
import { type EmployeeRecord } from "@/lib/types";
import { PointeuseKiosk } from "@/components/pointeuse/pointeuse-kiosk";

export const dynamic = "force-dynamic";

export default async function PointeusePage() {
  await requireFeature("pointeuse");
  const companyId = await getActiveCompanyId();

  const employes = (listEmployees() as EmployeeRecord[]) || [];
  const pointagesJour = getPointagesJour(companyId);
  const stats = getPointageStatsJournalieres(companyId);

  return (
    <div className="py-2">
      <PointeuseKiosk
        employes={employes}
        pointagesJour={pointagesJour}
        stats={stats}
      />
    </div>
  );
}
