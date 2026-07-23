import Image from "next/image";
import { redirect } from "next/navigation";
import { Center, Paper, Stack, Text, Title } from "@mantine/core";

import { getAuthSession } from "@/lib/auth";
import { getCompany } from "@/lib/data";

import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await getAuthSession();
  if (session?.user) {
    redirect("/dashboard");
  }

  const company = getCompany();

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-8">
      <Center mih="calc(100vh - 4rem)">
        <Paper
          radius={30}
          shadow="md"
          withBorder
          p="xl"
          w="100%"
          maw={460}
          style={{ background: "var(--card)", borderColor: "var(--border-strong)" }}
        >
          <Stack align="center" gap="lg">
            <div
              style={{
                width: 92,
                height: 92,
                borderRadius: 24,
                background: "var(--surface-soft)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Image
                src={company.logo_path || "/assets/logo-placeholder.svg"}
                alt={company.name}
                width={92}
                height={92}
                className="h-auto w-20 object-contain"
              />
            </div>

            <Stack gap={4} align="center">
              <Title order={1} ta="center" style={{ letterSpacing: "-0.04em" }}>
                {company.name}
              </Title>
              <Text c="dimmed" ta="center">
                Connexion a l&apos;espace de gestion
              </Text>
              <Text ta="center" style={{ fontFamily: "var(--font-arabic)" }} c="dimmed">
                {company.arabic_name}
              </Text>
            </Stack>

            <LoginForm />
          </Stack>
        </Paper>
      </Center>
    </main>
  );
}
