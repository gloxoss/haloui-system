import { DocumentModulePage } from "@/components/document-module-page";

export default async function BonLivraisonPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; branchId?: string; status?: string; partyId?: string }>;
}) {
  return <DocumentModulePage slug="bons-livraison" type="bl" filters={await searchParams} />;
}
