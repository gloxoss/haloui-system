import { requireAuth } from "@/lib/auth";
import { getActiveCompanyId } from "@/lib/company";
import { getBalanceAgee, getFacturesImpayees, getRelanceSettings } from "@/lib/data";
import { requireFeature } from "@/lib/features";
import { RelancesManager } from "@/components/relances/relances-manager";

export default async function RelancesPage() {
  await requireFeature("relances");
  const session = await requireAuth();
  const companyId = await getActiveCompanyId();

  const invoices = getFacturesImpayees(companyId);
  const balanceAgee = getBalanceAgee(companyId);
  const settings = getRelanceSettings(companyId);

  return (
    <div className="space-y-6">
      <RelancesManager
        initialInvoices={invoices}
        balanceAgee={balanceAgee}
        settings={settings}
        userRole={session.user.role}
      />
    </div>
  );
}
