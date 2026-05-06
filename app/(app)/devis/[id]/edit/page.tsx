import { DocumentEditorPage } from "@/components/document-editor-page";

export default async function EditDevisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DocumentEditorPage slug="devis" type="devis" id={Number(id)} />;
}
