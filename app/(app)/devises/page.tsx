import { requireAuth } from "@/lib/auth";
import { getActiveCompanyId, getActiveCompany } from "@/lib/company";
import {
  listExchangeRates,
  listForexTransactions,
  getForexSummary,
} from "@/lib/data";
import { requireFeature } from "@/lib/features";
import { ForexDashboard } from "@/components/forex/forex-dashboard";

export default async function DevisesPage() {
  await requireFeature("multi_devises");
  await requireAuth();
  const companyId = await getActiveCompanyId();
  const company = await getActiveCompany();

  const rates = listExchangeRates(companyId);
  const transactions = listForexTransactions(companyId);
  const summary = getForexSummary(companyId);

  return (
    <ForexDashboard
      company={company}
      rates={rates}
      transactions={transactions}
      summary={summary}
    />
  );
}
