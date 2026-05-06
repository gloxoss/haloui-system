import { DocumentModulePage } from "@/components/document-module-page";

export default async function BonsCommandePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; branchId?: string; status?: string; partyId?: string }>;
}) {
  return <DocumentModulePage slug="bons-commande" type="bc" filters={await searchParams} />;
}
