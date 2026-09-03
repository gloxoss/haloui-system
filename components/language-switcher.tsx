"use client";

import * as React from "react";
import { useTranslation, type SupportedLocale } from "@/lib/i18n";
import { ActionIcon, Badge, Button, Group, Menu, Text, Tooltip } from "@mantine/core";
import { Check, Globe } from "lucide-react";

export function LanguageSwitcher({
  variant = "button",
  size = "sm",
}: {
  variant?: "button" | "icon" | "menu-item";
  size?: "xs" | "sm" | "md";
}) {
  const { locale, setLocale, isRtl } = useTranslation();
  const [isPending, startTransition] = React.useTransition();

  const handleSelect = (newLocale: SupportedLocale) => {
    if (newLocale === locale) return;
    startTransition(async () => {
      await setLocale(newLocale);
      // Fast refresh to re-evaluate server components
      window.location.reload();
    });
  };

  if (variant === "icon") {
    return (
      <Menu shadow="md" width={180} position={isRtl ? "bottom-start" : "bottom-end"} radius="md">
        <Menu.Target>
          <Tooltip label={locale === "ar" ? "اللغة (Français / الدارجة)" : "Changer de langue"}>
            <ActionIcon
              variant="default"
              size={size === "xs" ? 28 : 34}
              radius="md"
              loading={isPending}
              aria-label="Language"
            >
              <Globe size={18} />
            </ActionIcon>
          </Tooltip>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Label>{locale === "ar" ? "اختر اللغة" : "Choisir la langue"}</Menu.Label>
          <Menu.Item
            onClick={() => handleSelect("fr")}
            leftSection={<span className="text-base">🇫🇷</span>}
            rightSection={locale === "fr" ? <Check size={14} className="text-blue-600" /> : null}
            style={{ fontWeight: locale === "fr" ? 700 : 500 }}
          >
            Français
          </Menu.Item>
          <Menu.Item
            onClick={() => handleSelect("ar")}
            leftSection={<span className="text-base">🇲🇦</span>}
            rightSection={locale === "ar" ? <Check size={14} className="text-blue-600" /> : null}
            style={{ fontWeight: locale === "ar" ? 700 : 500, fontFamily: "var(--font-arabic)" }}
          >
            الدارجة المغربية / العربية
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    );
  }

  return (
    <Menu shadow="md" width={200} position={isRtl ? "bottom-start" : "bottom-end"} radius="md">
      <Menu.Target>
        <Button
          variant="default"
          size={size}
          radius="md"
          loading={isPending}
          leftSection={<Globe size={16} />}
          style={{ fontWeight: 600 }}
        >
          {locale === "ar" ? "🇲🇦 الدارجة المغربية" : "🇫🇷 Français"}
        </Button>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>{locale === "ar" ? "اختر اللغة" : "Choisir la langue"}</Menu.Label>
        <Menu.Item
          onClick={() => handleSelect("fr")}
          leftSection={<span className="text-base">🇫🇷</span>}
          rightSection={locale === "fr" ? <Check size={14} className="text-blue-600" /> : null}
          style={{ fontWeight: locale === "fr" ? 700 : 500 }}
        >
          Français
        </Menu.Item>
        <Menu.Item
          onClick={() => handleSelect("ar")}
          leftSection={<span className="text-base">🇲🇦</span>}
          rightSection={locale === "ar" ? <Check size={14} className="text-blue-600" /> : null}
          style={{ fontWeight: locale === "ar" ? 700 : 500, fontFamily: "var(--font-arabic)" }}
        >
          الدارجة المغربية / العربية
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
