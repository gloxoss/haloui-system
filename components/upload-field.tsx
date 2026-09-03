"use client";

import Image from "next/image";
import { startTransition, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function UploadField({
  name,
  folder,
  initialValue,
  label,
}: {
  name: string;
  folder: "logos" | "employees" | "caisse";
  initialValue?: string;
  label: string;
}) {
  const [value, setValue] = useState(initialValue ?? "");
  const [busy, setBusy] = useState(false);

  return (
    <div className="grid gap-2.5">
      <div className="text-[13px] font-semibold">{label}</div>
      <div className="flex flex-wrap items-center gap-3 rounded-[20px] border bg-[var(--background-alt)] p-3">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl bg-[var(--card)]">
          {value ? (
            <Image src={value} alt={label} width={80} height={80} className="h-full w-full object-contain" />
          ) : (
            <span className="px-3 text-center text-xs text-[var(--muted)]">Aucun visuel</span>
          )}
        </div>
        <div className="grid gap-2.5">
          <Input type="hidden" name={name} value={value} readOnly />
          <Input
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) {
                return;
              }

              startTransition(async () => {
                setBusy(true);
                const payload = new FormData();
                payload.append("folder", folder);
                payload.append("file", file);

                const response = await fetch("/api/upload", {
                  method: "POST",
                  body: payload,
                });

                const result = (await response.json()) as { path?: string };
                if (result.path) {
                  setValue(result.path);
                }
                setBusy(false);
              });
            }}
          />
          <div className="flex gap-2">
            <Button type="button" variant="secondary" disabled={busy} onClick={() => setValue("")}>
              Retirer
            </Button>
            {busy ? <span className="self-center text-xs text-[var(--muted)]">Téléversement...</span> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
