import { getActiveCompanyId } from "@/lib/company";
import { getCongesDemandes, getSoldesCongesEmployes } from "@/lib/conges";
import { listEmployees } from "@/lib/data";
import { requireFeature } from "@/lib/features";
import { type EmployeeRecord } from "@/lib/types";
import { CongesManager } from "@/components/conges/conges-manager";

export const dynamic = "force-dynamic";

export default async function CongesPage() {
  await requireFeature("conges");
  const companyId = await getActiveCompanyId();

  const demandes = getCongesDemandes(companyId);
  const soldes = getSoldesCongesEmployes(companyId);
  const employes = (listEmployees() as EmployeeRecord[]) || [];

  return (
    <div className="py-2">
      <CongesManager
        demandes={demandes}
        soldes={soldes}
        employes={employes}
      />
    </div>
  );
}
