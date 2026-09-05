"use client";

import React, { useState } from "react";
import {
  Badge,
  Button,
  Divider,
  Group,
  Menu,
  Paper,
  Progress,
  Select,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  Landmark,
  Plus,
  Printer,
  Scale,
  Sparkles,
  Trash2,
  UploadCloud,
  Zap,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { autoReconcileAction, deleteBankStatementAction } from "@/app/actions";
import { BankImportModal } from "./bank-import-modal";
import { BankAccountsModal } from "./bank-accounts-modal";
import { ReconciliationSplitView } from "./reconciliation-split-view";
import {
  type BankAccountRecord,
  type BankStatementRecord,
  type BankOperationRecord,
  type ReconciliationStats,
  type BranchRecord,
} from "@/lib/types";

interface ReconciliationDashboardProps {
  accounts: BankAccountRecord[];
  activeAccount: BankAccountRecord | null;
  statements: BankStatementRecord[];
  activeStatement: BankStatementRecord | null;
  operations: BankOperationRecord[];
  stats: ReconciliationStats;
  invoices: Array<{
    id: number;
    numero: number;
    date: string;
    total_ttc: number;
    reste: number;
    client_name?: string;
  }>;
  branches: BranchRecord[];
}

export function ReconciliationDashboard({
  accounts,
  activeAccount,
  statements,
  activeStatement,
  operations,
  stats,
  invoices,
  branches,
}: ReconciliationDashboardProps) {
  const { t, locale } = useTranslation();
  const isRtl = locale === "ar";

  // Modals
  const [importModalOpened, setImportModalOpened] = useState(false);
  const [accountsModalOpened, setAccountsModalOpened] = useState(false);
  const [autoReconcileLoading, setAutoReconcileLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Switch statement or account via navigation
  const handleAccountChange = (accId: string | null) => {
    if (!accId) return;
    window.location.href = `/rapprochement-bancaire?accountId=${accId}`;
  };

  const handleStatementChange = (stmtId: string | null) => {
    if (!stmtId) return;
    window.location.href = `/rapprochement-bancaire?accountId=${activeAccount?.id}&statementId=${stmtId}`;
  };

  // Run Auto Reconcile
  const handleRunAutoReconcile = async () => {
    if (!activeStatement) return;
    setAutoReconcileLoading(true);
    setNotification(null);

    const res = await autoReconcileAction(activeStatement.id, 85);
    setAutoReconcileLoading(false);

    if (res.success) {
      setNotification({ type: "success", message: res.message });
    } else {
      setNotification({ type: "error", message: res.error || "Erreur de rapprochement." });
    }
  };

  // Delete Statement
  const handleDeleteStatement = async () => {
    if (!activeStatement) return;
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce relevé bancaire ? Les écritures rapprochées seront rétablies.")) {
      return;
    }
    const res = await deleteBankStatementAction(activeStatement.id);
    if (res.success) {
      window.location.href = `/rapprochement-bancaire?accountId=${activeAccount?.id}`;
    }
  };

  // Print PV de rapprochement
  const handlePrintReport = () => {
    if (!activeStatement) return;
    window.open(`/print/rapprochement/${activeStatement.id}`, "_blank");
  };

  const isBalanced = Math.abs(stats.ecartRapprochement) < 0.01;

  return (
    <div className="space-y-6 pb-12" dir={isRtl ? "rtl" : "ltr"}>
      {/* Top Header & Account Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-lg bg-neutral-900 text-white shadow-xs">
              <Landmark size={20} />
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-neutral-900">
                {isRtl ? "المطابقة والتسوية البنكية" : "Rapprochement Bancaire Automatisé"}
              </h1>
              <p className="text-xs text-neutral-500">
                {isRtl
                  ? "مطابقة كشوفات الحسابات البنكية (OFX, QIF, CSV) مع الفواتير والمصاريف الداخلية"
                  : "Réconciliation continue entre les relevés bancaires (OFX, QIF, CSV) et les écritures commerciales"}
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="default"
            onClick={() => setAccountsModalOpened(true)}
            leftSection={<Building2 size={16} />}
            className="rounded-lg shadow-2xs"
          >
            {isRtl ? "الحسابات البنكية" : "Comptes bancaires"}
          </Button>

          <Button
            size="sm"
            variant="light"
            color="dark"
            onClick={() => setImportModalOpened(true)}
            leftSection={<UploadCloud size={16} />}
            className="rounded-lg"
          >
            {isRtl ? "استيراد كشف بنكي" : "+ Importer un relevé"}
          </Button>

          {activeStatement && (
            <>
              <Button
                size="sm"
                variant="filled"
                color="teal"
                loading={autoReconcileLoading}
                onClick={handleRunAutoReconcile}
                leftSection={<Zap size={16} />}
                className="rounded-lg shadow-xs"
              >
                {isRtl ? "مطابقة تلقائية (85%+)" : "⚡ Rapprochement auto"}
              </Button>

              <Button
                size="sm"
                variant="default"
                onClick={handlePrintReport}
                leftSection={<Printer size={16} />}
                className="rounded-lg shadow-2xs"
              >
                {isRtl ? "طباعة المحضر (PV)" : "🖨️ Imprimer l'état"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl border text-sm flex items-center justify-between shadow-xs ${
            notification.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-neutral-400 hover:text-neutral-600"
          >
            ×
          </button>
        </div>
      )}

      {/* Active Account Banner & Relevé Selector */}
      <Paper p="md" radius="lg" withBorder className="bg-neutral-50/70">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-neutral-200 flex items-center justify-center font-bold text-neutral-800 shadow-2xs">
              {activeAccount?.nom_banque.slice(0, 2).toUpperCase() || "BK"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Text fw={700} size="sm" className="text-neutral-900">
                  {activeAccount?.nom_banque} — {activeAccount?.intitule_compte}
                </Text>
                <Badge variant="light" color="blue" size="xs">
                  {activeAccount?.devise || "MAD"}
                </Badge>
              </div>
              <div className="font-mono text-xs text-neutral-500 mt-0.5">
                RIB: {activeAccount?.rib || "— Non configuré —"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Account Switcher Dropdown */}
            {accounts.length > 1 && (
              <Select
                size="xs"
                data={accounts.map((acc) => ({
                  value: String(acc.id),
                  label: `${acc.nom_banque} (${acc.intitule_compte})`,
                }))}
                value={activeAccount ? String(activeAccount.id) : null}
                onChange={handleAccountChange}
                placeholder="Changer de compte..."
                className="w-56"
              />
            )}

            {/* Statement Switcher Dropdown */}
            {statements.length > 0 ? (
              <Select
                size="xs"
                data={statements.map((s) => ({
                  value: String(s.id),
                  label: `${s.nom_fichier} (${s.nb_rapprochees}/${s.nb_operations} lettrées)`,
                }))}
                value={activeStatement ? String(activeStatement.id) : null}
                onChange={handleStatementChange}
                placeholder="Sélectionner un relevé..."
                className="w-64"
              />
            ) : (
              <Badge variant="outline" color="gray" size="md">
                Aucun relevé importé sur ce compte
              </Badge>
            )}

            {activeStatement && (
              <Button
                size="xs"
                variant="subtle"
                color="red"
                onClick={handleDeleteStatement}
                title="Supprimer ce relevé"
              >
                <Trash2 size={14} />
              </Button>
            )}
          </div>
        </div>
      </Paper>

      {/* 5 Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* 1. Solde Relevé Bancaire */}
        <Paper p="md" radius="lg" withBorder className="bg-white shadow-xs">
          <Text size="xs" c="dimmed" fw={600} tt="uppercase" className="tracking-wider">
            {isRtl ? "رصيد الكشف البنكي" : "Solde Relevé Bancaire"}
          </Text>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl font-bold text-neutral-900">
              {stats.soldeReleve.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-neutral-400 font-medium">MAD</span>
          </div>
          <Text size="xs" c="dimmed" mt={4}>
            {activeStatement
              ? `Au terme du relevé (${activeStatement.format_fichier})`
              : "Solde actuel en compte"}
          </Text>
        </Paper>

        {/* 2. Solde Rapproché */}
        <Paper p="md" radius="lg" withBorder className="bg-white shadow-xs">
          <Text size="xs" c="dimmed" fw={600} tt="uppercase" className="tracking-wider">
            {isRtl ? "الرصيد المطابق (Comptable)" : "Solde Rapproché"}
          </Text>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl font-bold text-emerald-800">
              {stats.soldeRapproche.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-neutral-400 font-medium">MAD</span>
          </div>
          <Text size="xs" c="dimmed" mt={4}>
            Écritures et factures confirmées
          </Text>
        </Paper>

        {/* 3. Écart de Rapprochement (Key Metric) */}
        <Paper
          p="md"
          radius="lg"
          withBorder
          className={`shadow-xs transition-colors ${
            isBalanced
              ? "bg-emerald-50/50 border-emerald-200"
              : "bg-amber-50/50 border-amber-200"
          }`}
        >
          <Group justify="space-between" align="center">
            <Text size="xs" fw={700} tt="uppercase" className={isBalanced ? "text-emerald-800" : "text-amber-800"}>
              {isRtl ? "فارق المطابقة" : "Écart de Rapprochement"}
            </Text>
            {isBalanced ? (
              <CheckCircle2 size={16} className="text-emerald-600" />
            ) : (
              <AlertCircle size={16} className="text-amber-600" />
            )}
          </Group>
          <div className="mt-2 flex items-baseline gap-1">
            <span className={`text-xl font-bold ${isBalanced ? "text-emerald-700" : "text-amber-700"}`}>
              {stats.ecartRapprochement.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-neutral-400 font-medium">MAD</span>
          </div>
          <Text size="xs" className={`mt-1 font-medium ${isBalanced ? "text-emerald-700" : "text-amber-700"}`}>
            {isBalanced
              ? isRtl ? "✓ متطابق تماماً بدون أي فارق" : "✓ Parfaitement Équilibré"
              : isRtl ? "يوجد فارق يحتاج إلى تسوية" : "Écart à réconcilier"}
          </Text>
        </Paper>

        {/* 4. Taux de Réconciliation */}
        <Paper p="md" radius="lg" withBorder className="bg-white shadow-xs">
          <Text size="xs" c="dimmed" fw={600} tt="uppercase" className="tracking-wider">
            {isRtl ? "نسبة المطابقة" : "Taux de Lettrage"}
          </Text>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-bold text-neutral-900">
              {stats.tauxRapprochementPercent}%
            </span>
            <Text size="xs" c="dimmed">
              {stats.nbRapprochees} / {stats.totalOperations}
            </Text>
          </div>
          <Progress
            value={stats.tauxRapprochementPercent}
            color={stats.tauxRapprochementPercent === 100 ? "teal" : "blue"}
            size="sm"
            radius="xl"
            mt="xs"
          />
        </Paper>

        {/* 5. Opérations en Attente */}
        <Paper p="md" radius="lg" withBorder className="bg-white shadow-xs">
          <Text size="xs" c="dimmed" fw={600} tt="uppercase" className="tracking-wider">
            {isRtl ? "عمليات قيد الانتظار" : "En Attente de Lettrage"}
          </Text>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold text-neutral-900">
              {stats.nbEnAttente}
            </span>
            {stats.nbSuggeres > 0 && (
              <Badge size="xs" variant="light" color="orange">
                {stats.nbSuggeres} {isRtl ? "مقترحة" : "suggérées"}
              </Badge>
            )}
          </div>
          <Text size="xs" c="dimmed" mt={4}>
            {stats.nbEnAttente === 0
              ? isRtl ? "جميع العمليات مطابقة بنجاح" : "Toutes les opérations sont lettrées"
              : isRtl ? "عمليات بحاجة للمراجعة أو الإسناد" : "Lignes à rapprocher ou affecter"}
          </Text>
        </Paper>
      </div>

      {/* Main Reconciliation Split View */}
      {activeStatement ? (
        <ReconciliationSplitView
          operations={operations}
          availableInvoices={invoices}
          branches={branches}
          isRtl={isRtl}
        />
      ) : (
        <Paper p="xl" radius="lg" withBorder className="text-center py-16 bg-white shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto mb-4">
            <UploadCloud size={32} />
          </div>
          <h3 className="text-base font-bold text-neutral-800 mb-1">
            {isRtl ? "لا يوجد أي كشف بنكي معروض" : "Aucun relevé bancaire actif"}
          </h3>
          <p className="text-xs text-neutral-500 max-w-md mx-auto mb-5 leading-relaxed">
            {isRtl
              ? "قم باستيراد كشف حساب بنكي بصيغة OFX أو QIF أو CSV لمطابقة العمليات تلقائياً مع الفواتير والمصاريف."
              : "Importez un relevé bancaire au format OFX, QIF ou CSV pour lancer le rapprochement automatique de vos règlements et dépenses."}
          </p>
          <Button
            variant="filled"
            color="dark"
            onClick={() => setImportModalOpened(true)}
            leftSection={<UploadCloud size={16} />}
            className="rounded-lg shadow-xs"
          >
            {isRtl ? "استيراد كشف بنكي الآن" : "Importer un premier relevé"}
          </Button>
        </Paper>
      )}

      {/* Modals */}
      <BankImportModal
        opened={importModalOpened}
        onClose={() => setImportModalOpened(false)}
        accounts={accounts}
        selectedAccountId={activeAccount?.id}
        onImportSuccess={(newStmtId) => {
          window.location.href = `/rapprochement-bancaire?accountId=${activeAccount?.id}&statementId=${newStmtId}`;
        }}
        isRtl={isRtl}
      />

      <BankAccountsModal
        opened={accountsModalOpened}
        onClose={() => setAccountsModalOpened(false)}
        accounts={accounts}
        isRtl={isRtl}
      />
    </div>
  );
}
