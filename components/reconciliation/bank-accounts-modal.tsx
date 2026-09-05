"use client";

import React, { useState } from "react";
import {
  Button,
  Divider,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Badge,
} from "@mantine/core";
import { Building2, Check, Plus, Landmark } from "lucide-react";
import { BANQUES_MAROCAINES } from "@/lib/constants";
import { saveBankAccountAction } from "@/app/actions";
import { type BankAccountRecord } from "@/lib/types";

interface BankAccountsModalProps {
  opened: boolean;
  onClose: () => void;
  accounts: BankAccountRecord[];
  isRtl?: boolean;
}

export function BankAccountsModal({ opened, onClose, accounts, isRtl }: BankAccountsModalProps) {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [editingId, setEditingId] = useState<number | undefined>(undefined);
  const [nomBanque, setNomBanque] = useState<string>("");
  const [intituleCompte, setIntituleCompte] = useState<string>("");
  const [rib, setRib] = useState<string>("");
  const [iban, setIban] = useState<string>("");
  const [bicSwift, setBicSwift] = useState<string>("");
  const [devise, setDevise] = useState<string>("MAD");
  const [soldeInitial, setSoldeInitial] = useState<number>(0);

  const handleResetForm = () => {
    setEditingId(undefined);
    setNomBanque("");
    setIntituleCompte("");
    setRib("");
    setIban("");
    setBicSwift("");
    setDevise("MAD");
    setSoldeInitial(0);
    setError(null);
    setShowForm(false);
  };

  const handleEdit = (acc: BankAccountRecord) => {
    setEditingId(acc.id);
    setNomBanque(acc.nom_banque);
    setIntituleCompte(acc.intitule_compte);
    setRib(acc.rib);
    setIban(acc.iban || "");
    setBicSwift(acc.bic_swift || "");
    setDevise(acc.devise);
    setSoldeInitial(acc.solde_initial);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomBanque || !intituleCompte) {
      setError("Le nom de la banque et l'intitulé du compte sont obligatoires.");
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    if (editingId) formData.append("id", String(editingId));
    formData.append("nom_banque", nomBanque);
    formData.append("intitule_compte", intituleCompte);
    formData.append("rib", rib);
    formData.append("iban", iban);
    formData.append("bic_swift", bicSwift);
    formData.append("devise", devise);
    formData.append("solde_initial", String(soldeInitial));

    const res = await saveBankAccountAction(formData);
    setLoading(false);

    if (res.success) {
      handleResetForm();
    } else {
      setError(res.error || "Une erreur est survenue.");
    }
  };

  const bankOptions = BANQUES_MAROCAINES.map((b) => ({
    value: b.nom,
    label: isRtl ? `${b.nomAr} (${b.nom})` : `${b.nom} (${b.nomAr})`,
  }));

  return (
    <Modal
      opened={opened}
      onClose={() => {
        handleResetForm();
        onClose();
      }}
      title={
        <Group gap="xs">
          <Landmark size={20} className="text-neutral-700" />
          <Text fw={700} size="md">
            {isRtl ? "إدارة الحسابات البنكية" : "Gestion des Comptes Bancaires"}
          </Text>
        </Group>
      }
      size="lg"
      radius="md"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <Stack gap="md">
        {!showForm ? (
          <>
            <Group justify="space-between" align="center">
              <Text size="sm" c="dimmed">
                {isRtl
                  ? "قائمة الحسابات البنكية للشركة والـ RIB المعتمد"
                  : "Comptes bancaires professionnels enregistrés pour l'entreprise."}
              </Text>
              <Button
                size="xs"
                variant="light"
                leftSection={<Plus size={14} />}
                onClick={() => setShowForm(true)}
              >
                {isRtl ? "إضافة حساب بنكي" : "+ Nouveau compte"}
              </Button>
            </Group>

            {accounts.length === 0 ? (
              <div className="py-8 text-center text-neutral-500 text-sm">
                {isRtl ? "لا يوجد أي حساب بنكي مسجل بعد." : "Aucun compte bancaire enregistré."}
              </div>
            ) : (
              <Table striped highlightOnHover verticalSpacing="xs">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{isRtl ? "البنك والحساب" : "Banque & Intitulé"}</Table.Th>
                    <Table.Th>{isRtl ? "الـ RIB" : "RIB (24 chiffres)"}</Table.Th>
                    <Table.Th style={{ textAlign: "right" }}>{isRtl ? "الرصيد" : "Solde actuel"}</Table.Th>
                    <Table.Th style={{ textAlign: "right" }}>{isRtl ? "إجراء" : "Action"}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {accounts.map((acc) => (
                    <Table.Tr key={acc.id}>
                      <Table.Td>
                        <Text fw={600} size="sm">
                          {acc.nom_banque}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {acc.intitule_compte}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <span className="font-mono text-xs tracking-wider text-neutral-600">
                          {acc.rib || "—"}
                        </span>
                      </Table.Td>
                      <Table.Td style={{ textAlign: "right" }}>
                        <Badge variant="light" color={acc.solde_actuel >= 0 ? "teal" : "red"}>
                          {acc.solde_actuel.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}{" "}
                          {acc.devise}
                        </Badge>
                      </Table.Td>
                      <Table.Td style={{ textAlign: "right" }}>
                        <Button
                          size="compact-xs"
                          variant="subtle"
                          onClick={() => handleEdit(acc)}
                        >
                          {isRtl ? "تعديل" : "Modifier"}
                        </Button>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <Stack gap="sm">
              <Text fw={600} size="sm" c="dimmed">
                {editingId
                  ? isRtl
                    ? "تعديل بيانات الحساب"
                    : "Modifier le compte bancaire"
                  : isRtl
                  ? "إضافة حساب بنكي جديد"
                  : "Ajouter un nouveau compte bancaire"}
              </Text>

              {error && (
                <div className="p-2.5 rounded text-xs bg-red-50 text-red-700 border border-red-200">
                  {error}
                </div>
              )}

              <Select
                label={isRtl ? "اسم البنك" : "Établissement bancaire"}
                placeholder={isRtl ? "اختر البنك..." : "Sélectionner la banque..."}
                data={bankOptions}
                value={nomBanque}
                onChange={(val) => setNomBanque(val || "")}
                searchable
                required
              />

              <TextInput
                label={isRtl ? "اسم / تسمية الحساب" : "Intitulé du compte"}
                placeholder="Ex: Compte Courant Exploitation MAD"
                value={intituleCompte}
                onChange={(e) => setIntituleCompte(e.target.value)}
                required
              />

              <TextInput
                label={isRtl ? "رقم الـ RIB (24 رقماً)" : "Relevé d'Identité Bancaire (RIB)"}
                placeholder="Ex: 007 680 0001234567890123 45"
                value={rib}
                onChange={(e) => setRib(e.target.value)}
                description={
                  isRtl
                    ? "معيار الحسابات البنكية بالمغرب (24 رقماً)"
                    : "Format bancaire marocain standard (24 chiffres)"
                }
              />

              <Group grow>
                <TextInput
                  label="IBAN"
                  placeholder="Ex: MA64007680000123456789012345"
                  value={iban}
                  onChange={(e) => setIban(e.target.value)}
                />
                <TextInput
                  label="BIC / SWIFT"
                  placeholder="Ex: BCMA MAMC"
                  value={bicSwift}
                  onChange={(e) => setBicSwift(e.target.value)}
                />
              </Group>

              <Group grow>
                <NumberInput
                  label={isRtl ? "الرصيد الابتدائي" : "Solde de départ"}
                  placeholder="0.00"
                  value={soldeInitial}
                  onChange={(val) => setSoldeInitial(Number(val || 0))}
                  decimalScale={2}
                  fixedDecimalScale
                />
                <TextInput
                  label={isRtl ? "العملة" : "Devise"}
                  value={devise}
                  onChange={(e) => setDevise(e.target.value)}
                />
              </Group>

              <Divider my="xs" />

              <Group justify="flex-end" gap="xs">
                <Button variant="default" size="sm" onClick={handleResetForm} disabled={loading}>
                  {isRtl ? "إلغاء" : "Annuler"}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  loading={loading}
                  leftSection={<Check size={16} />}
                >
                  {isRtl ? "حفظ الحساب" : "Enregistrer"}
                </Button>
              </Group>
            </Stack>
          </form>
        )}
      </Stack>
    </Modal>
  );
}
