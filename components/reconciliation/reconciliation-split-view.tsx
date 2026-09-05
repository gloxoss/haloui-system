"use client";

import React, { useState, useMemo } from "react";
import {
  Badge,
  Button,
  Divider,
  Group,
  Modal,
  Pagination,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  CheckCircle2,
  FileSearch,
  Filter,
  Link as LinkIcon,
  PlusCircle,
  RotateCcw,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import {
  reconcileOperationAction,
  unreconcileOperationAction,
  createExpenseFromBankOpAction,
} from "@/app/actions";
import { type BankOperationRecord, type DocumentRecord, type BranchRecord } from "@/lib/types";

interface ReconciliationSplitViewProps {
  operations: BankOperationRecord[];
  availableInvoices: Array<{
    id: number;
    numero: number;
    date: string;
    total_ttc: number;
    reste: number;
    client_name?: string;
  }>;
  branches: BranchRecord[];
  isRtl?: boolean;
}

export function ReconciliationSplitView({
  operations,
  availableInvoices,
  branches,
  isRtl,
}: ReconciliationSplitViewProps) {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Action loading states
  const [loadingOpId, setLoadingOpId] = useState<number | null>(null);

  // Manual Match Modal
  const [manualModalOp, setManualModalOp] = useState<BankOperationRecord | null>(null);
  const [manualSearch, setManualSearch] = useState("");
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);

  // Express Expense Modal
  const [expenseModalOp, setExpenseModalOp] = useState<BankOperationRecord | null>(null);
  const [expenseMotif, setExpenseMotif] = useState("");
  const [expenseBranchId, setExpenseBranchId] = useState<string>(
    branches[0] ? String(branches[0].id) : "1",
  );

  // Filtered operations
  const filteredOps = useMemo(() => {
    return operations.filter((op) => {
      // Status filter
      if (filterStatus === "non_rapproche" && op.statut_rapprochement !== "non_rapproche") return false;
      if (filterStatus === "suggere" && op.statut_rapprochement !== "suggere") return false;
      if (filterStatus === "rapproche" && op.statut_rapprochement !== "rapproche") return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchLib = op.libelle.toLowerCase().includes(query);
        const matchRef = (op.reference_bancaire || "").toLowerCase().includes(query);
        const matchAmt = op.montant.toString().includes(query);
        const matchClient = (op.matched_document?.client_name || op.suggestion?.entity_name || "")
          .toLowerCase()
          .includes(query);
        return matchLib || matchRef || matchAmt || matchClient;
      }

      return true;
    });
  }, [operations, filterStatus, searchQuery]);

  const totalPages = Math.ceil(filteredOps.length / pageSize) || 1;
  const paginatedOps = filteredOps.slice((page - 1) * pageSize, page * pageSize);

  // Counts for pills
  const countAll = operations.length;
  const countNonRapproche = operations.filter((op) => op.statut_rapprochement === "non_rapproche").length;
  const countSuggere = operations.filter((op) => op.statut_rapprochement === "suggere").length;
  const countRapproche = operations.filter((op) => op.statut_rapprochement === "rapproche").length;

  // Handle Quick Validate of Suggestion
  const handleValidateSuggestion = async (op: BankOperationRecord) => {
    if (!op.suggestion) return;
    setLoadingOpId(op.id);
    await reconcileOperationAction(
      op.id,
      op.suggestion.document_id,
      op.suggestion.document_type,
    );
    setLoadingOpId(null);
  };

  // Handle Unreconcile
  const handleUnreconcile = async (op: BankOperationRecord) => {
    setLoadingOpId(op.id);
    await unreconcileOperationAction(op.id);
    setLoadingOpId(null);
  };

  // Handle Manual Match Submit
  const handleManualMatchSubmit = async () => {
    if (!manualModalOp || !selectedDocId) return;
    setLoadingOpId(manualModalOp.id);
    await reconcileOperationAction(manualModalOp.id, selectedDocId, "facture");
    setLoadingOpId(null);
    setManualModalOp(null);
    setSelectedDocId(null);
  };

  // Handle Express Expense Submit
  const handleExpressExpenseSubmit = async () => {
    if (!expenseModalOp) return;
    setLoadingOpId(expenseModalOp.id);
    const formData = new FormData();
    formData.append("operation_id", String(expenseModalOp.id));
    formData.append("motif", expenseMotif);
    formData.append("branch_id", expenseBranchId);
    await createExpenseFromBankOpAction(formData);
    setLoadingOpId(null);
    setExpenseModalOp(null);
  };

  // Filtered invoices in manual modal
  const modalInvoices = useMemo(() => {
    if (!manualModalOp) return [];
    return availableInvoices.filter((inv) => {
      if (!manualSearch.trim()) return true;
      const q = manualSearch.toLowerCase();
      return (
        inv.numero.toString().includes(q) ||
        (inv.client_name || "").toLowerCase().includes(q) ||
        inv.total_ttc.toString().includes(q) ||
        inv.reste.toString().includes(q)
      );
    });
  }, [availableInvoices, manualModalOp, manualSearch]);

  return (
    <div className="space-y-4" dir={isRtl ? "rtl" : "ltr"}>
      {/* Controls Bar: Filter Pills & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 bg-white rounded-xl border border-neutral-200/80 shadow-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            size="xs"
            variant={filterStatus === "all" ? "filled" : "subtle"}
            color="dark"
            onClick={() => { setFilterStatus("all"); setPage(1); }}
            className="rounded-lg"
          >
            {isRtl ? "الكل" : "Toutes"} ({countAll})
          </Button>
          <Button
            size="xs"
            variant={filterStatus === "non_rapproche" ? "filled" : "subtle"}
            color="gray"
            onClick={() => { setFilterStatus("non_rapproche"); setPage(1); }}
            className="rounded-lg"
          >
            {isRtl ? "غير مطابقة" : "Non réconciliées"} ({countNonRapproche})
          </Button>
          <Button
            size="xs"
            variant={filterStatus === "suggere" ? "filled" : "subtle"}
            color="orange"
            onClick={() => { setFilterStatus("suggere"); setPage(1); }}
            className="rounded-lg"
            leftSection={<Sparkles size={13} />}
          >
            {isRtl ? "مقترحة" : "Suggérées"} ({countSuggere})
          </Button>
          <Button
            size="xs"
            variant={filterStatus === "rapproche" ? "filled" : "subtle"}
            color="teal"
            onClick={() => { setFilterStatus("rapproche"); setPage(1); }}
            className="rounded-lg"
            leftSection={<Check size={13} />}
          >
            {isRtl ? "مطابقة" : "Rapprochées"} ({countRapproche})
          </Button>
        </div>

        <div className="w-full sm:w-72">
          <TextInput
            placeholder={isRtl ? "بحث في العمليات..." : "Rechercher une opération..."}
            size="xs"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            leftSection={<Search size={14} className="text-neutral-400" />}
          />
        </div>
      </div>

      {/* Operations Table */}
      <div className="overflow-x-auto rounded-xl border border-neutral-200/80 bg-white shadow-xs">
        <Table verticalSpacing="sm" highlightOnHover>
          <Table.Thead className="bg-neutral-50/70 border-b border-neutral-200 text-xs text-neutral-500 uppercase">
            <Table.Tr>
              <Table.Th style={{ width: 110 }}>{isRtl ? "التاريخ" : "Date"}</Table.Th>
              <Table.Th>{isRtl ? "البيان البنكي" : "Libellé de l'opération"}</Table.Th>
              <Table.Th style={{ textAlign: "right", width: 140 }}>{isRtl ? "المبلغ" : "Montant"}</Table.Th>
              <Table.Th style={{ width: 140 }}>{isRtl ? "الحالة" : "Statut"}</Table.Th>
              <Table.Th>{isRtl ? "المطابقة في النظام" : "Écriture / Contrepartie ERP"}</Table.Th>
              <Table.Th style={{ textAlign: "right", width: 160 }}>{isRtl ? "إجراء" : "Actions"}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {paginatedOps.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={6} className="py-12 text-center text-sm text-neutral-400">
                  {isRtl
                    ? "لا توجد أي عمليات بنكية تطابق معايير البحث."
                    : "Aucune opération bancaire ne correspond aux critères sélectionnés."}
                </Table.Td>
              </Table.Tr>
            ) : (
              paginatedOps.map((op) => {
                const isLoading = loadingOpId === op.id;
                const isCredit = op.type_mouvement === "credit";

                return (
                  <Table.Tr key={op.id} className="transition-colors">
                    {/* Date */}
                    <Table.Td>
                      <div className="font-mono text-xs font-medium text-neutral-600">
                        {op.date_operation}
                      </div>
                      {op.date_valeur && op.date_valeur !== op.date_operation && (
                        <div className="text-[10px] text-neutral-400">
                          Val: {op.date_valeur}
                        </div>
                      )}
                    </Table.Td>

                    {/* Libellé */}
                    <Table.Td>
                      <div className="text-sm font-medium text-neutral-900 leading-snug">
                        {op.libelle}
                      </div>
                      {op.reference_bancaire && (
                        <div className="font-mono text-[11px] text-neutral-400 mt-0.5">
                          Réf: {op.reference_bancaire}
                        </div>
                      )}
                    </Table.Td>

                    {/* Montant & Sens */}
                    <Table.Td style={{ textAlign: "right" }}>
                      <div className="inline-flex items-center gap-1.5 font-semibold text-sm">
                        {isCredit ? (
                          <span className="text-emerald-700 flex items-center gap-0.5">
                            <ArrowDownLeft size={14} />
                            +{op.montant.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-neutral-900 flex items-center gap-0.5">
                            <ArrowUpRight size={14} className="text-red-500" />
                            -{op.montant.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}
                          </span>
                        )}
                        <span className="text-[11px] text-neutral-400 font-normal">MAD</span>
                      </div>
                    </Table.Td>

                    {/* Statut Badge */}
                    <Table.Td>
                      {op.statut_rapprochement === "rapproche" ? (
                        <Badge
                          variant="light"
                          color="teal"
                          size="sm"
                          leftSection={<Check size={12} />}
                        >
                          {isRtl ? "مطابقة" : "Rapproché"}
                        </Badge>
                      ) : op.statut_rapprochement === "suggere" ? (
                        <Badge
                          variant="light"
                          color="orange"
                          size="sm"
                          leftSection={<Sparkles size={12} />}
                        >
                          {isRtl ? "مقترحة" : "Suggéré"} ({op.rapprochement_score}%)
                        </Badge>
                      ) : (
                        <Badge variant="subtle" color="gray" size="sm">
                          {isRtl ? "غير مطابقة" : "Non lettré"}
                        </Badge>
                      )}
                    </Table.Td>

                    {/* ERP Counterpart */}
                    <Table.Td>
                      {op.statut_rapprochement === "rapproche" ? (
                        <div className="text-xs space-y-0.5">
                          {op.document_type === "facture" && op.matched_document ? (
                            <div>
                              <span className="font-semibold text-neutral-800">
                                Facture #{op.matched_document.numero}
                              </span>
                              {op.matched_document.client_name && (
                                <span className="text-neutral-500 ml-1.5">
                                  — {op.matched_document.client_name}
                                </span>
                              )}
                              <div className="text-[11px] text-neutral-400">
                                Total: {op.matched_document.total_ttc.toLocaleString("fr-FR")} MAD
                              </div>
                            </div>
                          ) : op.document_type === "sortie_caisse" ? (
                            <div>
                              <span className="font-semibold text-neutral-800">
                                Dépense de caisse #{op.document_id}
                              </span>
                              <div className="text-[11px] text-neutral-400">
                                Décaissement bancaire comptabilisé
                              </div>
                            </div>
                          ) : (
                            <span className="text-neutral-600 italic">
                              Rapproché (Réf doc #{op.document_id})
                            </span>
                          )}
                        </div>
                      ) : op.suggestion ? (
                        <div className="p-1.5 rounded bg-orange-50/70 border border-orange-200/60 text-xs">
                          <div className="font-semibold text-orange-900">
                            {op.suggestion.document_type === "facture"
                              ? `Facture #${op.suggestion.document_numero}`
                              : `Dépense #${op.suggestion.document_numero}`}
                            <span className="font-normal text-orange-700 ml-1.5">
                              ({op.suggestion.entity_name})
                            </span>
                          </div>
                          <div className="text-[10px] text-orange-600 mt-0.5">
                            {op.suggestion.motif}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-neutral-400 italic">
                          {isCredit
                            ? isRtl ? "في انتظار إسناد فاتورة أو زبون" : "Aucune facture associée"
                            : isRtl ? "في انتظار إسناد مصروف" : "Dépense non lettrée"}
                        </span>
                      )}
                    </Table.Td>

                    {/* Actions */}
                    <Table.Td style={{ textAlign: "right" }}>
                      <Group gap={6} justify="flex-end">
                        {op.statut_rapprochement === "rapproche" ? (
                          <Tooltip label={isRtl ? "إلغاء المطابقة" : "Annuler le rapprochement"}>
                            <Button
                              size="compact-xs"
                              variant="subtle"
                              color="red"
                              loading={isLoading}
                              onClick={() => handleUnreconcile(op)}
                              leftSection={<RotateCcw size={12} />}
                            >
                              {isRtl ? "إلغاء" : "Annuler"}
                            </Button>
                          </Tooltip>
                        ) : op.suggestion ? (
                          <>
                            <Button
                              size="compact-xs"
                              variant="light"
                              color="teal"
                              loading={isLoading}
                              onClick={() => handleValidateSuggestion(op)}
                              leftSection={<Check size={12} />}
                            >
                              {isRtl ? "تأكيد" : "Valider"}
                            </Button>
                            <Button
                              size="compact-xs"
                              variant="subtle"
                              color="gray"
                              onClick={() => {
                                setManualModalOp(op);
                                setSelectedDocId(null);
                                setManualSearch("");
                              }}
                            >
                              {isRtl ? "تغيير" : "Autre"}
                            </Button>
                          </>
                        ) : isCredit ? (
                          <Button
                            size="compact-xs"
                            variant="light"
                            color="blue"
                            onClick={() => {
                              setManualModalOp(op);
                              setSelectedDocId(null);
                              setManualSearch("");
                            }}
                            leftSection={<LinkIcon size={12} />}
                          >
                            {isRtl ? "ربط بفاتورة" : "Lier facture"}
                          </Button>
                        ) : (
                          <Button
                            size="compact-xs"
                            variant="light"
                            color="indigo"
                            onClick={() => {
                              setExpenseModalOp(op);
                              setExpenseMotif(op.libelle);
                            }}
                            leftSection={<PlusCircle size={12} />}
                          >
                            {isRtl ? "إنشاء مصروف" : "Créer dépense"}
                          </Button>
                        )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })
            )}
          </Table.Tbody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Group justify="center" mt="xs">
          <Pagination value={page} onChange={setPage} total={totalPages} size="sm" />
        </Group>
      )}

      {/* Modal: Manual Invoice Match */}
      <Modal
        opened={!!manualModalOp}
        onClose={() => setManualModalOp(null)}
        title={
          <Group gap="xs">
            <FileSearch size={18} className="text-neutral-700" />
            <Text fw={700} size="sm">
              {isRtl ? "ربط يدوي بفاتورة مبيعات" : "Rapprochement manuel avec une facture"}
            </Text>
          </Group>
        }
        size="lg"
        radius="md"
        dir={isRtl ? "rtl" : "ltr"}
      >
        {manualModalOp && (
          <Stack gap="sm">
            <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200 text-xs space-y-1">
              <div className="font-semibold text-neutral-800">
                Opération bancaire : {manualModalOp.libelle}
              </div>
              <Group justify="space-between" c="dimmed">
                <span>Date : {manualModalOp.date_operation}</span>
                <span className="font-semibold text-emerald-700">
                  Montant : +{manualModalOp.montant.toLocaleString("fr-FR")} MAD
                </span>
              </Group>
            </div>

            <TextInput
              placeholder={isRtl ? "بحث برقم الفاتورة أو اسم الزبون..." : "Rechercher par n° de facture, client, montant..."}
              size="xs"
              value={manualSearch}
              onChange={(e) => setManualSearch(e.target.value)}
              leftSection={<Search size={14} className="text-neutral-400" />}
            />

            <div className="max-h-60 overflow-y-auto rounded-lg border border-neutral-200">
              <Table striped highlightOnHover verticalSpacing="xs">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{ width: 40 }}></Table.Th>
                    <Table.Th>Facture</Table.Th>
                    <Table.Th>Client</Table.Th>
                    <Table.Th style={{ textAlign: "right" }}>Total TTC</Table.Th>
                    <Table.Th style={{ textAlign: "right" }}>Reste Dû</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {modalInvoices.map((inv) => {
                    const isSelected = selectedDocId === inv.id;
                    const isExactMatch = Math.abs(inv.reste - manualModalOp.montant) < 0.01;

                    return (
                      <Table.Tr
                        key={inv.id}
                        className={`cursor-pointer ${isSelected ? "bg-blue-50/80" : ""}`}
                        onClick={() => setSelectedDocId(inv.id)}
                      >
                        <Table.Td>
                          <input
                            type="radio"
                            checked={isSelected}
                            onChange={() => setSelectedDocId(inv.id)}
                            className="cursor-pointer"
                          />
                        </Table.Td>
                        <Table.Td>
                          <span className="font-semibold text-xs">#{inv.numero}</span>
                          <span className="text-[10px] text-neutral-400 ml-1.5">({inv.date})</span>
                        </Table.Td>
                        <Table.Td>
                          <span className="text-xs">{inv.client_name || "—"}</span>
                        </Table.Td>
                        <Table.Td style={{ textAlign: "right", fontSize: 11 }}>
                          {inv.total_ttc.toLocaleString("fr-FR")} MAD
                        </Table.Td>
                        <Table.Td style={{ textAlign: "right", fontSize: 11, fontWeight: 600 }}>
                          <Badge
                            size="xs"
                            variant={isExactMatch ? "filled" : "light"}
                            color={isExactMatch ? "teal" : "gray"}
                          >
                            {inv.reste.toLocaleString("fr-FR")} MAD
                          </Badge>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </div>

            <Group justify="flex-end" gap="xs" mt="xs">
              <Button variant="default" size="xs" onClick={() => setManualModalOp(null)}>
                {isRtl ? "إلغاء" : "Annuler"}
              </Button>
              <Button
                size="xs"
                disabled={!selectedDocId}
                onClick={handleManualMatchSubmit}
                leftSection={<Check size={14} />}
              >
                {isRtl ? "تأكيد المطابقة" : "Confirmer le rapprochement"}
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Modal: Express Expense Creation */}
      <Modal
        opened={!!expenseModalOp}
        onClose={() => setExpenseModalOp(null)}
        title={
          <Group gap="xs">
            <PlusCircle size={18} className="text-neutral-700" />
            <Text fw={700} size="sm">
              {isRtl ? "تسجيل مصروف من عملية بنكية" : "Créer une sortie de caisse / dépense"}
            </Text>
          </Group>
        }
        size="md"
        radius="md"
        dir={isRtl ? "rtl" : "ltr"}
      >
        {expenseModalOp && (
          <Stack gap="sm">
            <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200 text-xs space-y-1">
              <Group justify="space-between" c="dimmed">
                <span>Date : {expenseModalOp.date_operation}</span>
                <span className="font-semibold text-neutral-900">
                  Montant : -{expenseModalOp.montant.toLocaleString("fr-FR")} MAD
                </span>
              </Group>
            </div>

            <TextInput
              label={isRtl ? "سبب / موضوع المصروف" : "Motif de la dépense"}
              value={expenseMotif}
              onChange={(e) => setExpenseMotif(e.target.value)}
              placeholder="Ex: Frais de tenue de compte, Agios, Virement CNSS..."
              required
            />

            <Select
              label={isRtl ? "نقطة البيع / المحل" : "Magasin / Point de vente"}
              data={branches.map((b) => ({ value: String(b.id), label: b.name }))}
              value={expenseBranchId}
              onChange={(val) => setExpenseBranchId(val || "1")}
              required
            />

            <Group justify="flex-end" gap="xs" mt="xs">
              <Button variant="default" size="xs" onClick={() => setExpenseModalOp(null)}>
                {isRtl ? "إلغاء" : "Annuler"}
              </Button>
              <Button
                size="xs"
                onClick={handleExpressExpenseSubmit}
                leftSection={<Check size={14} />}
              >
                {isRtl ? "حفظ ومطابقة" : "Créer et Réconcilier"}
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </div>
  );
}
