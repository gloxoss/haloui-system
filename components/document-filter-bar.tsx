"use client";

import * as React from "react";
import { Button, Group, Paper, Select } from "@mantine/core";
import { Filter, RotateCcw } from "lucide-react";

import { AppDateInput } from "@/components/ui/app-date-input";
import { useTranslation } from "@/lib/i18n";

interface BranchOption {
  id: number;
  name: string;
}

interface PartyOption {
  id: number;
  name: string;
}

export function DocumentFilterBar({
  type,
  branches,
  parties,
  filters,
}: {
  type: "devis" | "facture" | "bl" | "bs" | "bc";
  branches: BranchOption[];
  parties: PartyOption[];
  filters: {
    from?: string;
    to?: string;
    branchId?: string;
    partyId?: string;
    status?: string;
  };
}) {
  const { t, locale } = useTranslation();
  const [fromDate, setFromDate] = React.useState(filters.from || "");
  const [toDate, setToDate] = React.useState(filters.to || "");
  const [branchId, setBranchId] = React.useState(filters.branchId || "all");
  const [partyId, setPartyId] = React.useState(filters.partyId || "all");
  const [status, setStatus] = React.useState(filters.status || "all");

  const branchData = [
    { value: "all", label: locale === "ar" ? "جميع المحلات" : "Tous les magasins" },
    ...branches.map((b) => ({ value: String(b.id), label: b.name })),
  ];

  const partyData = [
    {
      value: "all",
      label:
        type === "bc"
          ? (locale === "ar" ? "جميع الموردين" : "Tous les fournisseurs")
          : (locale === "ar" ? "جميع الزبناء" : "Tous les clients"),
    },
    ...parties.map((p) => ({ value: String(p.id), label: p.name })),
  ];

  const statusData = [
    { value: "all", label: locale === "ar" ? "جميع الحالات" : "Tous les états" },
    { value: "brouillon", label: t.documents.statusBrouillon },
    { value: "valide", label: t.documents.statusValide },
    { value: "imprime", label: t.documents.statusImprime },
  ];

  return (
    <Paper
      radius={24}
      shadow="xs"
      withBorder
      p="lg"
      style={{ background: "var(--card)", borderColor: "var(--border-strong)" }}
    >
      <form method="GET" action="" className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-5 items-end">
        <AppDateInput
          name="from"
          label={t.common.from}
          value={fromDate}
          onChange={setFromDate}
          placeholder={locale === "ar" ? "تاريخ البداية" : "Date début"}
        />

        <AppDateInput
          name="to"
          label={t.common.to}
          value={toDate}
          onChange={setToDate}
          placeholder={locale === "ar" ? "تاريخ النهاية" : "Date fin"}
        />

        <div>
          <input type="hidden" name="branchId" value={branchId} />
          <Select
            label={t.documents.magasin}
            value={branchId}
            onChange={(val) => setBranchId(val || "all")}
            data={branchData}
            searchable
            radius="xl"
            styles={{
              input: {
                backgroundColor: "var(--card)",
                borderColor: "var(--border-strong)",
                color: "var(--foreground)",
                fontWeight: 500,
                fontSize: "13px",
                height: "42px",
                borderRadius: "14px",
              },
            }}
          />
        </div>

        <div>
          <input type="hidden" name="partyId" value={partyId} />
          <Select
            label={type === "bc" ? t.documents.fournisseur : t.documents.client}
            value={partyId}
            onChange={(val) => setPartyId(val || "all")}
            data={partyData}
            searchable
            radius="xl"
            styles={{
              input: {
                backgroundColor: "var(--card)",
                borderColor: "var(--border-strong)",
                color: "var(--foreground)",
                fontWeight: 500,
                fontSize: "13px",
                height: "42px",
                borderRadius: "14px",
              },
            }}
          />
        </div>

        <div>
          <input type="hidden" name="status" value={status} />
          <Group align="flex-end" gap="xs" wrap="nowrap">
            <Select
              label={t.common.status}
              value={status}
              onChange={(val) => setStatus(val || "all")}
              data={statusData}
              radius="xl"
              style={{ flex: 1 }}
              styles={{
                input: {
                  backgroundColor: "var(--card)",
                  borderColor: "var(--border-strong)",
                  color: "var(--foreground)",
                  fontWeight: 500,
                  fontSize: "13px",
                  height: "42px",
                  borderRadius: "14px",
                },
              }}
            />
            <Button
              type="submit"
              radius="xl"
              size="md"
              leftSection={<Filter size={15} strokeWidth={2} />}
              style={{
                backgroundColor: "var(--accent)",
                color: "var(--accent-foreground)",
                fontWeight: 700,
                height: "42px",
              }}
            >
              {t.common.filter}
            </Button>
          </Group>
        </div>
      </form>
    </Paper>
  );
}
