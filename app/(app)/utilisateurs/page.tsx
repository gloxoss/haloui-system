import Link from "next/link";

import { saveUserAction } from "@/app/actions";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectDropdown } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Table, TD, TH, THead } from "@/components/ui/table";
import { requireSuperadmin } from "@/lib/auth";
import { getAuditLogs, listUsers } from "@/lib/data";
import { requireFeature } from "@/lib/features";
import { getServerDictionary, getServerLocale } from "@/lib/i18n/server";
import { formatDateLong } from "@/lib/utils";

export default async function UtilisateursPage() {
  await requireSuperadmin();
  await requireFeature("utilisateurs");

  const locale = await getServerLocale();
  const dict = getServerDictionary(locale);

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
        eyebrow={dict.users.title}
        title={dict.users.title}
        description={dict.users.subtitle}
      />

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <h3 className="text-lg font-black">{dict.users.newUser}</h3>
          <form action={saveUserAction} className="mt-4 grid gap-4">
            <Field label={dict.users.fullName}><Input name="full_name" required /></Field>
            <Field label={dict.users.username}><Input name="username" required /></Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={dict.users.role}>
                <SelectDropdown
                  name="role"
                  defaultValue="user"
                  options={[
                    { value: "user", label: dict.users.roleUser },
                    { value: "admin", label: dict.users.roleAdmin },
                  ]}
                />
              </Field>
              <Field label={dict.users.active}>
                <SelectDropdown
                  name="active"
                  defaultValue="1"
                  options={[
                    { value: "1", label: dict.users.activeYes },
                    { value: "0", label: dict.users.activeNo },
                  ]}
                />
              </Field>
            </div>
            <Field label={dict.users.tempPassword}><Input name="password" defaultValue="changeme123" required /></Field>
            <SubmitButton>{dict.users.createAccount}</SubmitButton>
          </form>
        </Card>

        <Card>
          <h3 className="text-lg font-black">{dict.users.existingAccounts}</h3>
          <div className="mt-5">
            <Table>
              <THead>
                <tr>
                  <TH>{dict.users.user}</TH>
                  <TH>{dict.users.role}</TH>
                  <TH>{dict.users.date}</TH>
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
                          <Field label={dict.users.fullName}><Input name="full_name" defaultValue={user.full_name} required /></Field>
                          <Field label={dict.users.username}><Input name="username" defaultValue={user.username} required /></Field>
                          <div className="grid gap-3 md:grid-cols-2">
                            <Field label={dict.users.role}>
                              <SelectDropdown
                                name="role"
                                defaultValue={user.role}
                                options={[
                                  { value: "user", label: dict.users.roleUser },
                                  { value: "admin", label: dict.users.roleAdmin },
                                ]}
                              />
                            </Field>
                            <Field label={dict.users.active}>
                              <SelectDropdown
                                name="active"
                                defaultValue={String(user.active)}
                                options={[
                                  { value: "1", label: dict.users.activeYes },
                                  { value: "0", label: dict.users.activeNo },
                                ]}
                              />
                            </Field>
                          </div>
                          <Field label={dict.users.newPasswordOptional}>
                            <Input name="password" type="password" placeholder="••••••••" />
                          </Field>
                          <SubmitButton variant="secondary">{dict.users.updateAccount}</SubmitButton>
                        </form>
                      </details>
                    </TD>
                    <TD>
                      <span className="inline-flex rounded-md bg-[var(--surface-soft)] px-2 py-0.5 text-xs font-bold">
                        {user.role === "admin" ? dict.users.roleAdmin : dict.users.roleUser}
                      </span>
                    </TD>
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
            <p className="text-xs font-semibold text-[var(--muted)]">{dict.users.traceability}</p>
            <h3 className="mt-1 text-lg font-black">{dict.users.auditHistory}</h3>
          </div>
          <Link href="/utilisateurs/audit">
            <Button variant="secondary">{dict.users.seeFullAudit}</Button>
          </Link>
        </div>
        <Table>
          <THead>
            <tr>
              <TH>{dict.users.date}</TH>
              <TH>{dict.users.user}</TH>
              <TH>{dict.users.action}</TH>
              <TH>{dict.users.entity}</TH>
            </tr>
          </THead>
          <tbody>
            {auditLogs.map((log) => (
              <tr key={log.id}>
                <TD>{formatDateLong(log.timestamp)}</TD>
                <TD>{String(log.full_name ?? dict.users.systemUser)}</TD>
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
