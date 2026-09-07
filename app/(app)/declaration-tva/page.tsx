import { getActiveCompanyId } from "@/lib/company";
import { requireFeature } from "@/lib/features";
import { calculerDeclarationTVA, getDeclarationsTVA } from "@/lib/tva";
import { DeclarationTVAManager } from "@/components/tva/declaration-tva-manager";

export const dynamic = "force-dynamic";

export default async function DeclarationTVAPage() {
  await requireFeature("declaration_tva");
  const companyId = await getActiveCompanyId();

  const currentPeriode = new Date().toISOString().slice(0, 7); // YYYY-MM
  const calcul = calculerDeclarationTVA({ companyId, periodeCode: currentPeriode });
  const declarations = getDeclarationsTVA(companyId);

  return (
    <div className="py-2">
      <DeclarationTVAManager
        initialCalcul={calcul}
        declarations={declarations}
        currentPeriode={currentPeriode}
      />
    </div>
  );
}
