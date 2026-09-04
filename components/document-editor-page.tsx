import { DocumentForm } from "@/components/forms/document-form";
import { getActiveCompanyId } from "@/lib/company";
import { getDocumentById, getFeatureFlags, getLookupData, getProductUnits } from "@/lib/data";
import { requireDocumentFeature } from "@/lib/features";
import { type DocumentType } from "@/lib/types";

export async function DocumentEditorPage({
  slug,
  type,
  id,
}: {
  slug: string;
  type: DocumentType;
  id?: number;
}) {
  await requireDocumentFeature(type);
  const activeCompanyId = await getActiveCompanyId();
  const flags = getFeatureFlags();
  const lookup = getLookupData(activeCompanyId);
  const document = id ? getDocumentById(id) : null;
  const unitOptions = getProductUnits();

  return (
    <DocumentForm
      slug={slug}
      type={type}
      document={document}
      branches={flags.multi_branches ? lookup.branches : lookup.branches.slice(0, 1)}
      clients={lookup.clients}
      fournisseurs={lookup.fournisseurs}
      products={lookup.produits}
      unitOptions={unitOptions}
      multiBranchesEnabled={flags.multi_branches}
      tvaEnabled={flags.gestion_tva ?? true}
    />
  );
}
