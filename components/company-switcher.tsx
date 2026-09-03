"use client";

import * as React from "react";
import { switchActiveCompanyAction } from "@/app/actions";
import { type CompanyRecord } from "@/lib/types";
import { Badge, Button, Group, Menu, Text, ThemeIcon } from "@mantine/core";
import { Building2, Check, ChevronDown, Fuel, Truck } from "lucide-react";

function getCompanyIcon(name: string) {
  const upper = (name || "").toUpperCase();
  if (upper.includes("STATION") || upper.includes("OURIDA")) {
    return <Fuel size={15} />;
  }
  if (upper.includes("TRANS") || upper.includes("ANANAS")) {
    return <Truck size={15} />;
  }
  return <Building2 size={15} />;
}

function getCompanyBadgeColor(name: string) {
  const upper = (name || "").toUpperCase();
  if (upper.includes("STATION") || upper.includes("OURIDA")) {
    return "blue";
  }
  if (upper.includes("TRANS") || upper.includes("ANANAS")) {
    return "teal";
  }
  return "indigo";
}

export function CompanySwitcher({
  companies,
  activeCompanyId,
}: {
  companies: CompanyRecord[];
  activeCompanyId: number;
}) {
  const [isPending, startTransition] = React.useTransition();
  const currentCompany = companies.find((c) => c.id === activeCompanyId) || companies[0];

  const handleSelect = (companyId: number) => {
    if (companyId === activeCompanyId) return;
    startTransition(async () => {
      await switchActiveCompanyAction(companyId);
    });
  };

  if (companies.length <= 1) {
    return (
      <Group gap="xs" px="xs" py={4} className="rounded-xl border bg-[var(--surface-soft)]">
        <ThemeIcon size={26} radius="md" color={getCompanyBadgeColor(currentCompany?.name || "")} variant="light">
          {getCompanyIcon(currentCompany?.name || "")}
        </ThemeIcon>
        <Text size="xs" fw={700} truncate style={{ maxWidth: 200 }}>
          {currentCompany?.name}
        </Text>
      </Group>
    );
  }

  return (
    <Menu shadow="md" width={280} radius="lg" position="bottom-start">
      <Menu.Target>
        <Button
          variant="default"
          size="xs"
          radius="xl"
          loading={isPending}
          leftSection={
            <ThemeIcon size={20} radius="sm" color={getCompanyBadgeColor(currentCompany?.name || "")} variant="light">
              {getCompanyIcon(currentCompany?.name || "")}
            </ThemeIcon>
          }
          rightSection={<ChevronDown size={14} className="text-gray-400" />}
          style={{
            fontWeight: 800,
            border: "1px solid var(--border)",
            background: "var(--card)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <span className="truncate max-w-[180px] text-[13px]">{currentCompany?.name}</span>
        </Button>
      </Menu.Target>

      <Menu.Dropdown p={6}>
        <Menu.Label>
          <Text size="10px" fw={800} tt="uppercase" c="dimmed">
            Changer de société
          </Text>
        </Menu.Label>

        {companies.map((comp) => {
          const isActive = comp.id === activeCompanyId;
          const isStation = (comp.name || "").toUpperCase().includes("STATION");

          return (
            <Menu.Item
              key={comp.id}
              onClick={() => handleSelect(comp.id)}
              style={{
                borderRadius: 8,
                background: isActive ? "var(--surface-soft)" : "transparent",
              }}
            >
              <Group justify="space-between" wrap="nowrap">
                <Group gap="xs" wrap="nowrap">
                  <ThemeIcon size={28} radius="md" color={getCompanyBadgeColor(comp.name)} variant={isActive ? "filled" : "light"}>
                    {getCompanyIcon(comp.name)}
                  </ThemeIcon>
                  <div>
                    <Text size="xs" fw={isActive ? 800 : 600} truncate style={{ maxWidth: 170 }}>
                      {comp.name}
                    </Text>
                    <Text size="10px" c="dimmed">
                      {isStation ? "Station-service & Carburant" : "Transport & Matériaux"}
                    </Text>
                  </div>
                </Group>
                {isActive ? <Check size={16} className="text-blue-600" /> : null}
              </Group>
            </Menu.Item>
          );
        })}
      </Menu.Dropdown>
    </Menu>
  );
}
