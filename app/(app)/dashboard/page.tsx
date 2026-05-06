import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TD, TH, THead } from "@/components/ui/table";
import {
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_TYPE_LABELS,
  getModuleSlugByType,
} from "@/lib/constants";
import { getCompany, getDashboardStats, getFeatureFlags, getRevenueGrid } from "@/lib/data";
import { DOCUMENT_FEATURE_MAP } from "@/lib/features";
import { formatCurrency, formatDate, formatDateLong, monthKey, todayIso } from "@/lib/utils";

export default function DashboardPage() {
  const company = getCompany();
  const featureFlags = getFeatureFlags();
  const stats = getDashboardStats();
  const latestDocuments = (stats.latestDocuments as Array<{
    id: number;
    type: "devis" | "facture" | "bl" | "bs" | "bc";
    numero: number;
    date: string;
    total_ttc: number;
    status: "brouillon" | "valide" | "imprime";
    party_name?: string | null;
    branch_name?: string | null;
  }>)
    .filter((document) => featureFlags[DOCUMENT_FEATURE_MAP[document.type]])
    .slice(0, 5);

  const today = todayIso();
  const revenue = featureFlags.chiffre_affaires ? getRevenueGrid(monthKey()) : null;
  const todayRow = revenue?.table.find((row) => row.date === today);

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 rounded-[20px] border bg-[var(--card)] px-4 py-4 shadow-[var(--shadow-md)] md:flex-row md:items-center md:justify-between">
        <h2 className="text-lg font-black">
          {company.name} - {formatDateLong(new Date())}
        </h2>
        <div className="flex flex-wrap gap-3">
          {featureFlags.devis ? (
            <Link href="/devis/new">
              <Button>Nouveau devis</Button>
            </Link>
          ) : null}
          {featureFlags.chiffre_affaires ? (
            <Link href="/chiffre-affaires">
              <Button variant="secondary">Entrer les recettes du jour</Button>
            </Link>
          ) : null}
        </div>
      </div>

      {featureFlags.chiffre_affaires && revenue ? (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--muted)]">Aujourd&apos;hui</p>
              <h3 className="text-lg font-black">Recettes par magasin</h3>
            </div>
            <div className="text-sm font-semibold">
              {formatCurrency(todayRow?.total ?? 0)}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {revenue.branches.map((branch) => (
              <div key={branch.id} className="rounded-[20px] border bg-[var(--background)] px-3.5 py-3.5">
                <p className="text-[13px] text-[var(--muted)]">{branch.name}</p>
                <p className="mt-1.5 text-xl font-black">
                  {formatCurrency(todayRow?.values[branch.id] ?? 0)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--muted)]">A suivre</p>
            <h3 className="text-lg font-black">5 derniers documents</h3>
          </div>
          <Link href={featureFlags.factures ? "/factures" : "/devis"}>
            <Button variant="secondary">Voir plus</Button>
          </Link>
        </div>

        <Table>
          <THead>
            <tr>
              <TH>Document</TH>
              <TH>Client</TH>
              <TH>Magasin</TH>
              <TH>Date</TH>
              <TH>Total</TH>
              <TH>Etat</TH>
            </tr>
          </THead>
          <tbody>
            {latestDocuments.length === 0 ? (
              <tr>
                <TD colSpan={6} className="py-8 text-center text-[var(--muted)]">
                  Aucun document pour l&apos;instant.{" "}
                  <Link
                    href={featureFlags.devis ? "/devis/new" : featureFlags.factures ? "/factures/new" : "/dashboard"}
                    className="font-semibold text-[var(--accent)] hover:underline"
                  >
                    Creer le premier
                  </Link>
                </TD>
              </tr>
            ) : (
              latestDocuments.map((document) => (
                <tr key={document.id}>
                  <TD>
                    <Link
                      href={`/${getModuleSlugByType(document.type)}/${document.id}/edit`}
                      className="font-semibold hover:underline"
                    >
                      {DOCUMENT_TYPE_LABELS[document.type]} #{document.numero}
                    </Link>
                  </TD>
                  <TD>{String(document.party_name ?? "-")}</TD>
                  <TD>{String(document.branch_name ?? "-")}</TD>
                  <TD>{formatDate(document.date)}</TD>
                  <TD>{formatCurrency(document.total_ttc)}</TD>
                  <TD>
                    <Badge
                      tone={
                        document.status === "imprime"
                          ? "success"
                          : document.status === "valide"
                            ? "accent"
                            : "warning"
                      }
                    >
                      {DOCUMENT_STATUS_LABELS[document.status]}
                    </Badge>
                  </TD>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
