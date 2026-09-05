import { deleteEntityAction, saveEntityAction } from "@/app/actions";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Table, TD, TH, THead } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { getAuthSession } from "@/lib/auth";
import { listEntities } from "@/lib/data";
import { requirePartyFeature } from "@/lib/features";
import { getServerDictionary, getServerLocale } from "@/lib/i18n/server";
import { type PartyType } from "@/lib/types";
import { ClientPortalAdminActions } from "@/components/portal/client-portal-admin-actions";

export async function EntityManager({
  type,
  title,
  description,
  search = "",
}: {
  type: PartyType;
  title: string;
  description: string;
  search?: string;
}) {
  await requirePartyFeature(type);
  const locale = await getServerLocale();
  const dict = getServerDictionary(locale);
  const session = await getAuthSession();
  const isSuperadmin = session?.user?.role === "superadmin";

  const saveAction = saveEntityAction.bind(null, type);
  const deleteAction = deleteEntityAction.bind(null, type);
  const rawItems = listEntities(type, search);

  // Strict RBAC: If not superadmin, strip portal credentials so they are never exposed in DOM or memory
  const items = rawItems.map((item) => {
    if (type === "clients" && !isSuperadmin) {
      return {
        ...item,
        portal_access_code: undefined,
        portal_token: undefined,
      };
    }
    return item;
  });

  const pageTitle = type === "clients" ? dict.entities.clientsTitle : dict.entities.fournisseursTitle;
  const newTitle = type === "clients" ? dict.entities.newClient : dict.entities.newFournisseur;
  const eyebrow = type === "clients"
    ? (locale === "ar" ? "سجل الكليان والزبناء" : "Fichier clients")
    : (locale === "ar" ? "سجل الفورنيسور والموردين" : "Fichier fournisseurs");

  return (
    <div className="grid gap-4">
      <PageHeading
        eyebrow={eyebrow}
        title={pageTitle}
        description={
          locale === "ar"
            ? (type === "clients"
                ? "إدارة حسابات الكليان، العناوين، أرقام الهواتف، وأرقام التعريف الموحد ICE."
                : "إدارة حسابات الموردين، معلومات الاتصال، والعناوين.")
            : description
        }
      />

      <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <Card>
          <h3 className="text-lg font-black">{newTitle}</h3>
          <form action={saveAction} className="mt-4 grid gap-4">
            <Field label={dict.entities.name}>
              <Input name="name" required />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={dict.entities.ice}>
                <Input name="ice" />
              </Field>
              <Field label={dict.entities.phone}>
                <Input name="phone" />
              </Field>
            </div>
            <Field label={dict.entities.address}>
              <Textarea name="address" className="min-h-24" />
            </Field>
            <Field label={dict.entities.email}>
              <Input name="email" type="email" />
            </Field>
            <Field label={dict.common.notes}>
              <Textarea name="notes" className="min-h-24" />
            </Field>
            <SubmitButton>{dict.common.save}</SubmitButton>
          </form>
        </Card>

        <Card>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-black">{locale === "ar" ? "الدليل المسجل" : "Répertoire"}</h3>
              <p className="text-sm text-[var(--muted)]">
                {items.length} {locale === "ar" ? "مسجل" : "enregistrements"}
              </p>
            </div>
            <form className="flex gap-2 w-full sm:w-auto" action="">
              <Input
                name="q"
                defaultValue={search}
                placeholder={dict.common.searchPlaceholder}
                className="flex-1 sm:w-[200px]"
              />
              <Button type="submit" variant="secondary" className="shrink-0">{dict.common.filter}</Button>
            </form>
          </div>
          <Table>
            <THead>
              <tr>
                <TH>{dict.entities.name}</TH>
                <TH>{dict.entities.phone}</TH>
                {type === "clients" && isSuperadmin && (
                  <TH>{locale === "ar" ? "فضاء الزبون (Superadmin)" : "Espace Client (Superadmin)"}</TH>
                )}
                <TH>{dict.entities.address}</TH>
              </tr>
            </THead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <TD colSpan={type === "clients" && isSuperadmin ? 4 : 3} className="py-8 text-center text-[var(--muted)]">
                    {locale === "ar" ? "ما كاين حتى تسجيل حالياً." : `Aucun ${type === "clients" ? "client" : "fournisseur"} pour l'instant.`}
                  </TD>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    <TD className="w-64">
                      <details className="group">
                        <summary className="cursor-pointer list-none font-semibold">{item.name}</summary>
                        <form action={saveAction} className="mt-3.5 grid gap-3 rounded-xl border bg-[var(--background)] p-3">
                          <input type="hidden" name="id" value={item.id} />
                          <Field label={dict.entities.name}>
                            <Input name="name" defaultValue={item.name} required />
                          </Field>
                          <div className="grid gap-3 md:grid-cols-2">
                            <Field label={dict.entities.ice}>
                              <Input name="ice" defaultValue={item.ice} />
                            </Field>
                            <Field label={dict.entities.phone}>
                              <Input name="phone" defaultValue={item.phone} />
                            </Field>
                          </div>
                          <Field label={dict.entities.address}>
                            <Textarea name="address" defaultValue={item.address} className="min-h-20" />
                          </Field>
                          <Field label={dict.entities.email}>
                            <Input name="email" type="email" defaultValue={item.email} />
                          </Field>
                          <Field label={dict.common.notes}>
                            <Textarea name="notes" defaultValue={item.notes} className="min-h-20" />
                          </Field>
                          <div className="flex flex-wrap gap-2">
                            <SubmitButton variant="secondary">{dict.common.edit}</SubmitButton>
                            <ConfirmSubmitButton
                              type="submit"
                              variant="danger"
                              formAction={deleteAction}
                              name="id"
                              value={item.id}
                              message={
                                locale === "ar"
                                  ? `واش متأكد باغي تحذف "${item.name}" ؟`
                                  : `Supprimer "${item.name}" ? Cette action est irréversible.`
                              }
                            >
                              {dict.common.delete}
                            </ConfirmSubmitButton>
                          </div>
                        </form>
                        {type === "clients" && isSuperadmin && (
                          <ClientPortalAdminActions client={item} locale={locale} />
                        )}
                      </details>
                    </TD>
                    <TD>{item.phone || item.ice || "—"}</TD>
                    {type === "clients" && isSuperadmin && (
                      <TD>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            PIN: {item.portal_access_code || "—"}
                          </span>
                          <a
                            href={`/espace-client?token=${item.portal_token}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
                            title="Ouvrir le portail client"
                          >
                            <span>Accès ↗</span>
                          </a>
                        </div>
                      </TD>
                    )}
                    <TD>{item.address || "—"}</TD>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
