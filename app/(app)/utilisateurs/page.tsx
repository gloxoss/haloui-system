import Link from "next/link";

import { saveUserAction } from "@/app/actions";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Table, TD, TH, THead } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { getAuditLogs, listUsers } from "@/lib/data";
import { requireFeature } from "@/lib/features";
import { formatDateLong } from "@/lib/utils";

export default async function UtilisateursPage() {
  await requireAdmin();
  await requireFeature("utilisateurs");
  const users = listUsers();
  const auditLogs = getAuditLogs(20) as Array<{
    id: number;
    timestamp: string;
    full_name?: string | null;
    action: string;
    entity_type: string;
    entity_id?: number | null;
  }>;

  return (
    <div className="grid gap-4">
      <PageHeading
        eyebrow="Administration"
        title="Utilisateurs"
        description="Gérez les accès et les changements."
      />

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <h3 className="text-lg font-black">Nouvel utilisateur</h3>
          <form action={saveUserAction} className="mt-4 grid gap-4">
            <Field label="Nom complet"><Input name="full_name" required /></Field>
            <Field label="Nom d'utilisateur"><Input name="username" required /></Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Rôle">
                <Select name="role" defaultValue="user">
                  <option value="user">Utilisateur</option>
                  <option value="admin">Administrateur</option>
                </Select>
              </Field>
              <Field label="Actif">
                <Select name="active" defaultValue="1">
                  <option value="1">Oui</option>
                  <option value="0">Non</option>
                </Select>
              </Field>
            </div>
            <Field label="Mot de passe temporaire"><Input name="password" defaultValue="changeme123" required /></Field>
            <SubmitButton>Créer le compte</SubmitButton>
          </form>
        </Card>

        <Card>
          <h3 className="text-lg font-black">Comptes existants</h3>
          <div className="mt-5">
            <Table>
              <THead>
                <tr>
                  <TH>Utilisateur</TH>
                  <TH>Rôle</TH>
                  <TH>Création</TH>
                </tr>
              </THead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <TD className="w-72">
                      <details>
                        <summary className="cursor-pointer list-none font-semibold">{user.full_name}</summary>
                        <form action={saveUserAction} className="mt-3.5 grid gap-3 rounded-xl border bg-[var(--background)] p-3">
                          <input type="hidden" name="id" value={user.id} />
                          <Field label="Nom complet"><Input name="full_name" defaultValue={user.full_name} required /></Field>
                          <Field label="Nom d'utilisateur"><Input name="username" defaultValue={user.username} required /></Field>
                          <div className="grid gap-3 md:grid-cols-2">
                            <Field label="Rôle">
                              <Select name="role" defaultValue={user.role}>
                                <option value="user">Utilisateur</option>
                                <option value="admin">Administrateur</option>
                              </Select>
                            </Field>
                            <Field label="Actif">
                              <Select name="active" defaultValue={String(user.active)}>
                                <option value="1">Oui</option>
                                <option value="0">Non</option>
                              </Select>
                            </Field>
                          </div>
                          <Field label="Nouveau mot de passe (optionnel)">
                            <Input name="password" placeholder="Laisser vide pour conserver" />
                          </Field>
                          <SubmitButton variant="secondary">Mettre à jour</SubmitButton>
                        </form>
                      </details>
                    </TD>
                    <TD>{user.role}</TD>
                    <TD>{formatDateLong(user.created_at)}</TD>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[var(--muted)]">Traçabilité</p>
            <h3 className="mt-1 text-lg font-black">Historique des modifications</h3>
          </div>
          <Link href="/utilisateurs/audit">
            <Button variant="secondary">Voir l'audit complet</Button>
          </Link>
        </div>
        <Table>
          <THead>
            <tr>
              <TH>Date</TH>
              <TH>Utilisateur</TH>
              <TH>Action</TH>
              <TH>Entité</TH>
            </tr>
          </THead>
          <tbody>
            {auditLogs.map((log) => (
              <tr key={log.id}>
                <TD>{formatDateLong(log.timestamp)}</TD>
                <TD>{String(log.full_name ?? "Système")}</TD>
                <TD>{String(log.action)}</TD>
                <TD>{String(log.entity_type)} #{String(log.entity_id ?? "—")}</TD>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
