import { DocumentEditorPage } from "@/components/document-editor-page";

export default async function EditBonCommandePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DocumentEditorPage slug="bons-commande" type="bc" id={Number(id)} />;
}
