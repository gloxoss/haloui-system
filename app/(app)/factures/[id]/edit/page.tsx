import { DocumentEditorPage } from "@/components/document-editor-page";

export default async function EditFacturePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DocumentEditorPage slug="factures" type="facture" id={Number(id)} />;
}
