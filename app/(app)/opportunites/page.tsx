import { requireAuth } from "@/lib/auth";
import { getActiveCompanyId } from "@/lib/company";
import { listEntities } from "@/lib/data";
import { getCRMOpportunites, getCRMPipelineKPIs } from "@/lib/crm";
import { getCommerciaux } from "@/lib/commissions";
import { CRMPipelineKanban } from "@/components/crm/crm-pipeline-kanban";

export const dynamic = "force-dynamic";

export default async function OpportunitesPage() {
  await requireAuth();
  const companyId = await getActiveCompanyId();

  const initialOpportunites = getCRMOpportunites(companyId);
  const initialKPIs = getCRMPipelineKPIs(companyId);
  const rawClients = listEntities("clients");
  const commerciaux = getCommerciaux();

  return (
    <CRMPipelineKanban
      initialOpportunites={initialOpportunites}
      initialKPIs={initialKPIs}
      clients={rawClients}
      commerciaux={commerciaux}
    />
  );
}
