import { Group, Paper, Stack, Text, Title } from "@mantine/core";

export function PageHeading({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <Paper
      radius="xl"
      shadow="sm"
      p="lg"
      withBorder
      className={className}
      style={{
        background: "var(--card)",
        borderColor: "var(--border-strong)",
      }}
    >
      <Group justify="space-between" align="flex-end" gap="md">
        <Stack gap={4}>
          <Text size="10px" fw={800} tt="uppercase" c="dimmed" style={{ letterSpacing: "0.14em" }}>
            {eyebrow}
          </Text>
          <Title order={2} style={{ fontSize: "1.65rem", lineHeight: 1.1, letterSpacing: "-0.03em" }}>
            {title}
          </Title>
          {description ? (
            <Text size="sm" c="dimmed" maw={700}>
              {description}
            </Text>
          ) : null}
        </Stack>
        {actions ? <Group gap="sm">{actions}</Group> : null}
      </Group>
    </Paper>
  );
}
