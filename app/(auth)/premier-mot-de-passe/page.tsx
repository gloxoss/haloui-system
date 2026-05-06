import { redirect } from "next/navigation";

import { changeOwnPasswordAction } from "@/app/actions";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { getAuthSession, userNeedsPasswordReset } from "@/lib/auth";

export default async function FirstPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const session = await getAuthSession();

  if (!session?.user) {
    redirect("/login");
  }

  if (!userNeedsPasswordReset(session.user.id)) {
    redirect("/dashboard");
  }

  const hasError = params.error === "1";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] p-5">
      <Card className="w-full max-w-md p-6">
        <div className="mb-5">
          <p className="text-xs font-semibold text-[var(--muted)]">Première connexion</p>
          <h1 className="mt-1 text-xl font-black">Choisissez un nouveau mot de passe</h1>
          <p className="mt-2 text-[13px] text-[var(--muted)]">
            Pour continuer, remplacez le mot de passe par défaut.
          </p>
        </div>

        <form action={changeOwnPasswordAction} className="grid gap-4">
          <Field label="Nouveau mot de passe">
            <Input name="password" type="password" minLength={8} required />
          </Field>
          <Field label="Confirmer le mot de passe">
            <Input name="password_confirmation" type="password" minLength={8} required />
          </Field>
          {hasError ? (
            <p className="rounded-xl bg-[#f7e4e0] px-3 py-2.5 text-[13px]">
              Les mots de passe doivent être identiques et contenir 8 caractères minimum.
            </p>
          ) : null}
          <SubmitButton className="w-full">Enregistrer le nouveau mot de passe</SubmitButton>
        </form>
      </Card>
    </main>
  );
}
