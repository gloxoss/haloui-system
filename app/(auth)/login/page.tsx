import Image from "next/image";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/card";
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
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] p-5">
      <Card className="w-full max-w-md p-6">
        <div className="mb-5 flex flex-col items-center text-center">
          <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-[20px] border bg-[var(--background)]">
            <Image
              src={company.logo_path || "/assets/logo-placeholder.svg"}
              alt={company.name}
              width={88}
              height={88}
              className="h-auto w-20 object-contain"
            />
          </div>
          <h1 className="text-xl font-black">{company.name}</h1>
          <p className="mt-1 font-[var(--font-arabic)] text-sm text-[var(--muted)]">
            {company.arabic_name}
          </p>
        </div>
        <LoginForm />
      </Card>
    </main>
  );
}
