import { requireAuth } from "@/lib/auth";
import { getActiveCompanyId } from "@/lib/company";
import { listEntities, listProducts } from "@/lib/data";
import { getGrillesTarifaires } from "@/lib/tarification";
import { GrillesManager } from "@/components/tarification/grilles-manager";

export const dynamic = "force-dynamic";

export default async function GrillesTarifairesPage() {
  await requireAuth();
  const companyId = await getActiveCompanyId();

  const initialGrilles = getGrillesTarifaires(companyId);
  const rawClients = listEntities("clients");
  const produits = listProducts("", companyId);

  return (
    <GrillesManager
      initialGrilles={initialGrilles}
      clients={rawClients}
      produits={produits}
    />
  );
}
