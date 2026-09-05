"use client";

import React, { useState } from "react";
import {
  Button,
  Divider,
  FileInput,
  Group,
  Modal,
  Select,
  Stack,
  Table,
  Tabs,
  Text,
  Textarea,
  Badge,
} from "@mantine/core";
import { FileUp, Landmark, Sparkles, UploadCloud } from "lucide-react";
import { parseBankStatementFile } from "@/lib/bank-parsers";
import { importBankStatementAction } from "@/app/actions";
import { type BankAccountRecord, type ParsedBankStatement } from "@/lib/types";

interface BankImportModalProps {
  opened: boolean;
  onClose: () => void;
  accounts: BankAccountRecord[];
  selectedAccountId?: number;
  onImportSuccess?: (statementId: number) => void;
  isRtl?: boolean;
}

export function BankImportModal({
  opened,
  onClose,
  accounts,
  selectedAccountId,
  onImportSuccess,
  isRtl,
}: BankImportModalProps) {
  const [activeTab, setActiveTab] = useState<string | null>("file");
  const [accountId, setAccountId] = useState<string>(
    selectedAccountId ? String(selectedAccountId) : accounts[0] ? String(accounts[0].id) : "",
  );
  const [file, setFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState("");
  const [parsedPreview, setParsedPreview] = useState<ParsedBankStatement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetState = () => {
    setFile(null);
    setRawText("");
    setParsedPreview(null);
    setError(null);
    setLoading(false);
  };

  const handleFileChange = async (selected: File | null) => {
    setFile(selected);
    setError(null);
    if (!selected) {
      setParsedPreview(null);
      return;
    }

    try {
      const text = await selected.text();
      const parsed = parseBankStatementFile(selected.name, text);
      if (parsed.operations.length === 0) {
        setError("Aucune opération bancaire valide détectée dans ce fichier.");
        setParsedPreview(null);
      } else {
        setParsedPreview(parsed);
      }
    } catch {
      setError("Erreur lors de la lecture du fichier bancaire.");
      setParsedPreview(null);
    }
  };

  const handleRawTextChange = (text: string) => {
    setRawText(text);
    setError(null);
    if (!text.trim()) {
      setParsedPreview(null);
      return;
    }

    try {
      const parsed = parseBankStatementFile("import-texte.csv", text);
      if (parsed.operations.length > 0) {
        setParsedPreview(parsed);
      } else {
        setParsedPreview(null);
      }
    } catch {
      setParsedPreview(null);
    }
  };

  const handleSubmit = async () => {
    if (!accountId) {
      setError("Veuillez sélectionner un compte bancaire de destination.");
      return;
    }
    if (!file && !rawText.trim()) {
      setError("Veuillez choisir un fichier (OFX, QIF, CSV) ou coller vos données.");
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("bank_account_id", accountId);

    if (file) {
      formData.append("file", file);
    } else {
      formData.append("raw_content", rawText);
      formData.append("file_name", "releve-colle.csv");
    }

    const res = await importBankStatementAction(formData);
    setLoading(false);

    if (res.success) {
      const newId = res.statementId;
      resetState();
      onClose();
      if (onImportSuccess && newId) {
        onImportSuccess(newId);
      }
    } else {
      setError(res.error || "Une erreur est survenue lors de l'importation.");
    }
  };

  const accountOptions = accounts.map((acc) => ({
    value: String(acc.id),
    label: `${acc.nom_banque} - ${acc.intitule_compte} (${acc.solde_actuel.toLocaleString("fr-FR")} ${acc.devise})`,
  }));

  return (
    <Modal
      opened={opened}
      onClose={() => {
        resetState();
        onClose();
      }}
      title={
        <Group gap="xs">
          <UploadCloud size={20} className="text-neutral-700" />
          <Text fw={700} size="md">
            {isRtl ? "استيراد كشف الحساب البنكي" : "Importer un Relevé Bancaire"}
          </Text>
        </Group>
      }
      size="xl"
      radius="md"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {isRtl
            ? "يدعم النظام صيغ البنوك القياسية : OFX (Attijari, BCP, BMCE...), QIF و CSV مع المطابقة الذكية للمداخيل والمصاريف."
            : "Prend en charge les formats bancaires standards : OFX, QIF et CSV avec détection automatique des colonnes et montants."}
        </Text>

        {error && (
          <div className="p-3 rounded text-xs bg-red-50 text-red-700 border border-red-200">
            {error}
          </div>
        )}

        <Select
          label={isRtl ? "الحساب البنكي الوجهة" : "Compte bancaire de destination"}
          placeholder={isRtl ? "اختر الحساب البنكي..." : "Sélectionner le compte..."}
          data={accountOptions}
          value={accountId}
          onChange={(val) => setAccountId(val || "")}
          leftSection={<Landmark size={16} />}
          required
        />

        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="file" leftSection={<FileUp size={15} />}>
              {isRtl ? "ملف من الحاسوب (OFX, QIF, CSV)" : "Fichier (OFX, QIF, CSV)"}
            </Tabs.Tab>
            <Tabs.Tab value="paste" leftSection={<Sparkles size={15} />}>
              {isRtl ? "لصق مباشر للنص" : "Copier-Coller le contenu"}
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="file" pt="sm">
            <FileInput
              label={isRtl ? "اختر ملف الكشف البنكي" : "Sélectionner le fichier du relevé"}
              placeholder="Ex: releve_fevrier_2026.ofx ou .csv"
              accept=".ofx,.qif,.csv,.txt"
              value={file}
              onChange={handleFileChange}
              clearable
              description="Formats acceptés : .ofx (Standard XML/SGML), .qif (Quicken), .csv (Tableur bancaire)"
            />
          </Tabs.Panel>

          <Tabs.Panel value="paste" pt="sm">
            <Textarea
              label={isRtl ? "الصق نص الكشف البنكي هنا" : "Collez ici les lignes de votre relevé CSV ou texte"}
              placeholder={"Date;Libellé;Débit;Crédit\n15/02/2026;VIR SEPA CLIENT SKOURA FAC-0004;;15000.00\n16/02/2026;FRAIS DE TENUE DE COMPTE;45.00;"}
              minRows={5}
              maxRows={10}
              value={rawText}
              onChange={(e) => handleRawTextChange(e.target.value)}
            />
          </Tabs.Panel>
        </Tabs>

        {parsedPreview && (
          <div className="p-3.5 rounded-lg border border-neutral-200 bg-neutral-50/70 space-y-2">
            <Group justify="space-between" align="center">
              <Group gap="xs">
                <Badge variant="light" color="teal">
                  Format : {parsedPreview.format}
                </Badge>
                <Text size="xs" fw={600} className="text-neutral-700">
                  {parsedPreview.operations.length} {isRtl ? "عملية بنكية مكتشفة" : "opération(s) détectée(s)"}
                </Text>
              </Group>
              {parsedPreview.dateDebut && parsedPreview.dateFin && (
                <Text size="xs" c="dimmed">
                  Période : {parsedPreview.dateDebut} au {parsedPreview.dateFin}
                </Text>
              )}
            </Group>

            <div className="max-h-48 overflow-y-auto rounded border border-neutral-200 bg-white">
              <Table striped verticalSpacing="xs">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{ fontSize: 11 }}>Date</Table.Th>
                    <Table.Th style={{ fontSize: 11 }}>Libellé</Table.Th>
                    <Table.Th style={{ fontSize: 11 }}>Type</Table.Th>
                    <Table.Th style={{ fontSize: 11, textAlign: "right" }}>Montant</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {parsedPreview.operations.slice(0, 5).map((op, idx) => (
                    <Table.Tr key={idx}>
                      <Table.Td style={{ fontSize: 11 }}>{op.date}</Table.Td>
                      <Table.Td style={{ fontSize: 11 }}>
                        <span className="font-medium text-neutral-800">{op.libelle}</span>
                        {op.reference && (
                          <span className="text-neutral-400 text-[10px] ml-1.5">({op.reference})</span>
                        )}
                      </Table.Td>
                      <Table.Td style={{ fontSize: 11 }}>
                        <Badge
                          size="xs"
                          variant="light"
                          color={op.type === "credit" ? "teal" : "orange"}
                        >
                          {op.type === "credit" ? "Crédit" : "Débit"}
                        </Badge>
                      </Table.Td>
                      <Table.Td style={{ fontSize: 11, textAlign: "right", fontWeight: 600 }}>
                        {op.montant.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} MAD
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </div>
            {parsedPreview.operations.length > 5 && (
              <Text size="xs" c="dimmed" ta="center">
                + {parsedPreview.operations.length - 5} autre(s) opération(s)...
              </Text>
            )}
          </div>
        )}

        <Divider my="xs" />

        <Group justify="flex-end" gap="xs">
          <Button variant="default" size="sm" onClick={() => { resetState(); onClose(); }} disabled={loading}>
            {isRtl ? "إلغاء" : "Annuler"}
          </Button>
          <Button
            size="sm"
            loading={loading}
            onClick={handleSubmit}
            disabled={!parsedPreview || parsedPreview.operations.length === 0}
            leftSection={<UploadCloud size={16} />}
          >
            {isRtl ? "تأكيد واستيراد العمليات" : "Confirmer et Importer"}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
