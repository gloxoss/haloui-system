import { AttestationPreview } from "@/components/attestation-preview";
import { getCompany, listEmployees } from "@/lib/data";
import { requireFeature } from "@/lib/features";

export default async function AttestationPage() {
  await requireFeature("attestations");
  return <AttestationPreview employees={listEmployees()} company={getCompany()} />;
}
