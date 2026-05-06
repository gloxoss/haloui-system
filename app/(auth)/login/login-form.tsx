"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-4"
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
            setError("Identifiants invalides ou utilisateur désactivé.");
            return;
          }

          router.push("/dashboard");
          router.refresh();
        });
      }}
    >
      <Field label="Nom d'utilisateur">
        <Input name="username" defaultValue="admin" required />
      </Field>
      <Field label="Mot de passe" hint="Mot de passe temporaire initial: admin123">
        <Input name="password" type="password" defaultValue="admin123" required />
      </Field>
      {error ? <p className="rounded-xl bg-[#f7e4e0] px-3 py-2.5 text-[13px]">{error}</p> : null}
      <p className="text-[13px] text-[var(--muted)]">
        Mot de passe oublié ? Demandez à l&apos;administrateur.
      </p>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Connexion..." : "Se connecter"}
      </Button>
    </form>
  );
}
