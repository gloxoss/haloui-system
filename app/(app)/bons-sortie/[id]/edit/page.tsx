import { DocumentEditorPage } from "@/components/document-editor-page";

export default async function EditBonSortiePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DocumentEditorPage slug="bons-sortie" type="bs" id={Number(id)} />;
}
