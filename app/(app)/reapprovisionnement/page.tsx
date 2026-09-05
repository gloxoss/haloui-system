import { requireAuth } from "@/lib/auth";
import { getActiveCompanyId } from "@/lib/company";
import { listBranches, listEntities } from "@/lib/data";
import { CATEGORIES_PRODUIT } from "@/lib/constants";
import {
  calculerBesoinsApprovisionnement,
  getReapproKPIs,
} from "@/lib/reapprovisionnement";
import { ReapprovisionnementManager } from "@/components/reapprovisionnement/reapprovisionnement-manager";

export const dynamic = "force-dynamic";

export default async function ReapprovisionnementPage() {
  const session = await requireAuth();
  const companyId = await getActiveCompanyId();

  const branches = listBranches({ activeOnly: true, companyId });
  const rawFournisseurs = listEntities("fournisseurs");
  const fournisseurs = rawFournisseurs.map((f) => ({ id: f.id, nom: f.name }));

  const currentBranchId = (session.user as any).branch_id || branches[0]?.id;

  const initialSuggestions = calculerBesoinsApprovisionnement({
    companyId,
    horizonJours: 30,
  });
  const initialKPIs = getReapproKPIs({
    companyId,
    horizonJours: 30,
  });

  return (
    <ReapprovisionnementManager
      initialSuggestions={initialSuggestions}
      initialKPIs={initialKPIs}
      categories={CATEGORIES_PRODUIT}
      fournisseurs={fournisseurs}
      branches={branches}
      currentBranchId={currentBranchId}
    />
  );
}
