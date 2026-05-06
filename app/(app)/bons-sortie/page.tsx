import { DocumentModulePage } from "@/components/document-module-page";

export default async function BonsSortiePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; branchId?: string; status?: string; partyId?: string }>;
}) {
  return <DocumentModulePage slug="bons-sortie" type="bs" filters={await searchParams} />;
}
