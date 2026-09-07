import { getActiveCompanyId } from "@/lib/company";
import { listEntities } from "@/lib/data";
import { requireFeature } from "@/lib/features";
import { getMessagerieConfig, getMessagerieLogs } from "@/lib/messagerie";
import { type EntityRecord } from "@/lib/types";
import { MessagerieHub } from "@/components/messagerie/messagerie-hub";

export const dynamic = "force-dynamic";

export default async function MessageriePage() {
  await requireFeature("messagerie");
  const companyId = await getActiveCompanyId();

  const config = getMessagerieConfig(companyId);
  const logs = getMessagerieLogs(companyId, { limit: 100 });
  const clients = (listEntities("clients") as EntityRecord[]) || [];

  return (
    <div className="py-2">
      <MessagerieHub config={config} logs={logs} clients={clients} />
    </div>
  );
}
