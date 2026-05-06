import { DocumentModulePage } from "@/components/document-module-page";

export default async function DevisPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; branchId?: string; status?: string; partyId?: string }>;
}) {
  return <DocumentModulePage slug="devis" type="devis" filters={await searchParams} />;
}
