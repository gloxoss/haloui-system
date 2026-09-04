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
      p={{ base: "md", sm: "lg" }}
      withBorder
      className={className}
      style={{
        background: "var(--card)",
        borderColor: "var(--border-strong)",
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <Stack gap={4} className="min-w-0">
          <Text size="10px" fw={800} tt="uppercase" c="dimmed" style={{ letterSpacing: "0.14em" }}>
            {eyebrow}
          </Text>
          <Title order={2} style={{ fontSize: "1.65rem", lineHeight: 1.1, letterSpacing: "-0.03em" }} className="break-words">
            {title}
          </Title>
          {description ? (
            <Text size="sm" c="dimmed" maw={700}>
              {description}
            </Text>
          ) : null}
        </Stack>
        {actions ? (
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
            {actions}
          </div>
        ) : null}
      </div>
    </Paper>
  );
}
