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
import { listEntities } from "@/lib/data";
import { requirePartyFeature } from "@/lib/features";
import { type PartyType } from "@/lib/types";

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
  const saveAction = saveEntityAction.bind(null, type);
  const deleteAction = deleteEntityAction.bind(null, type);
  const items = listEntities(type, search);

  return (
    <div className="grid gap-4">
      <PageHeading
        eyebrow={type === "clients" ? "Fichier clients" : "Fichier fournisseurs"}
        title={title}
        description={description}
      />

      <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <Card>
          <h3 className="text-lg font-black">Nouveau {type === "clients" ? "client" : "fournisseur"}</h3>
          <form action={saveAction} className="mt-4 grid gap-4">
            <Field label="Nom">
              <Input name="name" required />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="ICE">
                <Input name="ice" />
              </Field>
              <Field label="Téléphone">
                <Input name="phone" />
              </Field>
            </div>
            <Field label="Adresse">
              <Textarea name="address" className="min-h-24" />
            </Field>
            <Field label="Email">
              <Input name="email" type="email" />
            </Field>
            <Field label="Notes">
              <Textarea name="notes" className="min-h-24" />
            </Field>
            <SubmitButton>Enregistrer</SubmitButton>
          </form>
        </Card>

        <Card>
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-black">Répertoire</h3>
              <p className="text-sm text-[var(--muted)]">{items.length} enregistrements</p>
            </div>
            <form className="flex gap-2" action="">
              <Input name="q" defaultValue={search} placeholder="Rechercher..." />
              <Button type="submit" variant="secondary">Filtrer</Button>
            </form>
          </div>
          <Table>
            <THead>
              <tr>
                <TH>Nom</TH>
                <TH>Contact</TH>
                <TH>Adresse</TH>
              </tr>
            </THead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <TD colSpan={3} className="py-8 text-center text-[var(--muted)]">
                    Aucun {type === "clients" ? "client" : "fournisseur"} pour l&apos;instant.
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
                          <Field label="Nom"><Input name="name" defaultValue={item.name} required /></Field>
                          <div className="grid gap-3 md:grid-cols-2">
                            <Field label="ICE"><Input name="ice" defaultValue={item.ice} /></Field>
                            <Field label="Téléphone"><Input name="phone" defaultValue={item.phone} /></Field>
                          </div>
                          <Field label="Adresse"><Textarea name="address" defaultValue={item.address} className="min-h-20" /></Field>
                          <Field label="Email"><Input name="email" defaultValue={item.email} /></Field>
                          <Field label="Notes"><Textarea name="notes" defaultValue={item.notes ?? ""} className="min-h-20" /></Field>
                          <div className="flex flex-wrap gap-2">
                            <SubmitButton variant="secondary">Mettre à jour</SubmitButton>
                            <ConfirmSubmitButton
                              type="submit"
                              variant="danger"
                              formAction={deleteAction}
                              name="id"
                              value={item.id}
                              message={`Supprimer ${type === "clients" ? "le client" : "le fournisseur"} "${item.name}" ? Cette action est définitive.`}
                            >
                              Supprimer
                            </ConfirmSubmitButton>
                          </div>
                        </form>
                      </details>
                    </TD>
                    <TD>
                      <div className="font-medium">{item.phone || "—"}</div>
                      <div className="text-xs text-[var(--muted)]">{item.email || "—"}</div>
                    </TD>
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
