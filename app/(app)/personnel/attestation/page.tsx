import { AttestationPreview } from "@/components/attestation-preview";
import { listEmployees } from "@/lib/data";
import { getActiveCompany } from "@/lib/company";
import { requireFeature } from "@/lib/features";

export default async function AttestationPage() {
  await requireFeature("attestations");
  const company = await getActiveCompany();
  return <AttestationPreview employees={listEmployees()} company={company} />;
}
