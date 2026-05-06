import { DocumentModulePage } from "@/components/document-module-page";

export default async function FacturesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; branchId?: string; status?: string; partyId?: string }>;
}) {
  return <DocumentModulePage slug="factures" type="facture" filters={await searchParams} />;
}
