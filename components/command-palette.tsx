"use client";

import Link from "next/link";
import { startTransition, useDeferredValue, useEffect, useState } from "react";
import { ActionIcon, Button, Kbd, Modal, Stack, Text, TextInput, UnstyledButton } from "@mantine/core";
import { Search } from "lucide-react";

import { useTranslation } from "@/lib/i18n";
import { type SearchResult } from "@/lib/types";

export function CommandPalette() {
  const { t, locale } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        startTransition(() => setOpen((current) => !current));
      }

      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open || !deferredQuery.trim()) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const response = await fetch(`/api/search?q=${encodeURIComponent(deferredQuery)}`, {
        signal: controller.signal,
      });
      const payload = (await response.json()) as { results: SearchResult[] };
      startTransition(() => setResults(payload.results));
    }, 150);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [deferredQuery, open]);

  return (
    <>
      <Button
        type="button"
        variant="default"
        radius="xl"
        size="xs"
        visibleFrom="md"
        leftSection={<Search size={14} />}
        rightSection={<Kbd size="xs">Ctrl+K</Kbd>}
        onClick={() => setOpen(true)}
        style={{
          border: "1px solid var(--border)",
          background: "var(--card)",
          fontWeight: 600,
        }}
      >
        {t.commandPalette.triggerButton}
      </Button>

      <ActionIcon
        type="button"
        variant="default"
        radius="xl"
        size="md"
        hiddenFrom="md"
        onClick={() => setOpen(true)}
        aria-label={t.commandPalette.triggerButton}
        style={{
          border: "1px solid var(--border)",
          background: "var(--card)",
        }}
      >
        <Search size={16} />
      </ActionIcon>

      <Modal
        opened={open}
        onClose={() => setOpen(false)}
        title={t.commandPalette.modalTitle}
        centered
        radius="xl"
        size="lg"
      >
        <Stack gap="md">
          <TextInput
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder={t.commandPalette.placeholder}
            leftSection={<Search size={16} />}
            radius="md"
            dir={locale === "ar" ? "rtl" : "ltr"}
          />

          <Stack gap="xs">
            {results.length === 0 ? (
              <Text c="dimmed" size="sm" ta={locale === "ar" ? "right" : "left"}>
                {query.trim() ? t.commandPalette.noResults : t.commandPalette.startTyping}
              </Text>
            ) : (
              results.map((result) => (
                <UnstyledButton
                  key={`${result.type}-${result.id}`}
                  component={Link}
                  href={result.href}
                  onClick={() => setOpen(false)}
                  style={{
                    border: "1px solid var(--border)",
                    background: "var(--surface-soft)",
                    borderRadius: 16,
                    padding: "12px 14px",
                    textAlign: locale === "ar" ? "right" : "left",
                  }}
                >
                  <Text fw={700}>{result.label}</Text>
                  <Text size="xs" c="dimmed">
                    {result.meta}
                  </Text>
                </UnstyledButton>
              ))
            )}
          </Stack>
        </Stack>
      </Modal>
    </>
  );
}
