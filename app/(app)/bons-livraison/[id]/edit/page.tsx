import { DocumentEditorPage } from "@/components/document-editor-page";

export default async function EditBonLivraisonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DocumentEditorPage slug="bons-livraison" type="bl" id={Number(id)} />;
}
