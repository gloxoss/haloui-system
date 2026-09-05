import { requireAuth } from "@/lib/auth";
import { getActiveCompanyId } from "@/lib/company";
import {
  getBankAccountById,
  getBankStatementWithOperations,
  getReconciliationSummary,
  listBankAccounts,
  listBankStatements,
  listBranches,
} from "@/lib/data";
import { getDb } from "@/lib/db";
import { requireFeature } from "@/lib/features";
import { ReconciliationDashboard } from "@/components/reconciliation/reconciliation-dashboard";

export default async function RapprochementBancairePage({
  searchParams,
}: {
  searchParams: Promise<{
    accountId?: string;
    statementId?: string;
  }>;
}) {
  await requireFeature("rapprochement_bancaire");
  await requireAuth();
  const companyId = await getActiveCompanyId();
  const params = await searchParams;

  const accounts = listBankAccounts(companyId);
  const requestedAccountId = params.accountId ? Number(params.accountId) : undefined;
  const activeAccount = requestedAccountId
    ? accounts.find((a) => a.id === requestedAccountId) || accounts[0] || null
    : accounts[0] || null;

  const statements = activeAccount ? listBankStatements(activeAccount.id, companyId) : [];
  const requestedStatementId = params.statementId ? Number(params.statementId) : undefined;
  const activeStatement = requestedStatementId
    ? statements.find((s) => s.id === requestedStatementId) || statements[0] || null
    : statements[0] || null;

  let operations: any[] = [];
  let stats = activeAccount
    ? getReconciliationSummary(activeAccount.id, companyId)
    : {
        totalOperations: 0,
        nbRapprochees: 0,
        nbSuggeres: 0,
        nbEnAttente: 0,
        soldeReleve: 0,
        soldeRapproche: 0,
        soldeComptable: 0,
        ecartRapprochement: 0,
        tauxRapprochementPercent: 100,
      };

  if (activeStatement) {
    const detailed = getBankStatementWithOperations(activeStatement.id);
    if (detailed) {
      operations = detailed.operations;
      stats = detailed.stats;
    }
  }

  // Active invoices
  const db = getDb();
  const invoices = db
    .prepare(`
      SELECT d.id, d.numero, d.date, d.total_ttc, d.reste, c.name as client_name
      FROM documents d
      LEFT JOIN clients c ON d.client_id = c.id
      WHERE d.company_id = ? AND d.type = 'facture' AND d.status = 'valide'
      ORDER BY d.date DESC, d.numero DESC
      LIMIT 150
    `)
    .all(companyId) as Array<{
      id: number;
      numero: number;
      date: string;
      total_ttc: number;
      reste: number;
      client_name?: string;
    }>;

  const branches = listBranches({ companyId });

  return (
    <ReconciliationDashboard
      accounts={accounts}
      activeAccount={activeAccount}
      statements={statements}
      activeStatement={activeStatement}
      operations={operations}
      stats={stats}
      invoices={invoices}
      branches={branches}
    />
  );
}
