"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Alert, Button, PasswordInput, Stack, Text, TextInput } from "@mantine/core";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <form
      style={{ width: "100%" }}
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        startTransition(async () => {
          const result = await signIn("credentials", {
            username: String(formData.get("username") || ""),
            password: String(formData.get("password") || ""),
            redirect: false,
          });

          if (result?.error) {
            setError("Identifiants invalides ou utilisateur desactive.");
            return;
          }

          router.push("/dashboard");
          router.refresh();
        });
      }}
    >
      <Stack gap="md">
        <TextInput
          name="username"
          label="Nom d'utilisateur"
          defaultValue="admin"
          required
          radius="md"
          size="md"
        />

        <PasswordInput
          name="password"
          label="Mot de passe"
          defaultValue="admin123"
          required
          radius="md"
          size="md"
          description="Mot de passe temporaire initial: admin123"
        />

        {error ? (
          <Alert color="red" radius="md" variant="light">
            {error}
          </Alert>
        ) : null}

        <Text size="sm" c="dimmed">
          Mot de passe oublie ? Demandez a l&apos;administrateur.
        </Text>

        <Button type="submit" size="md" radius="md" loading={pending} fullWidth>
          Se connecter
        </Button>
      </Stack>
    </form>
  );
}
