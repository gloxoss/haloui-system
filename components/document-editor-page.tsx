import { DocumentForm } from "@/components/forms/document-form";
import { getDocumentById, getLookupData } from "@/lib/data";
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
  const lookup = getLookupData();
  const document = id ? getDocumentById(id) : null;

  return (
    <DocumentForm
      slug={slug}
      type={type}
      document={document}
      branches={lookup.branches}
      clients={lookup.clients}
      fournisseurs={lookup.fournisseurs}
      products={lookup.produits}
    />
  );
}
