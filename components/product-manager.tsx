import { bulkSaveProductsAction, deleteProductAction, saveProductAction } from "@/app/actions";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Table, TD, TH, THead } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { listProducts } from "@/lib/data";
import { requireFeature } from "@/lib/features";
import { formatCurrency } from "@/lib/utils";

const UNIT_OPTIONS = ["u", "kg", "g", "boîte", "pièce", "plateau"];

const BULK_PLACEHOLDER = `# Une ligne par produit. Colonnes separees par | (ou tab, ou ;).
# Format : DESIGNATION | PRIX
# Ou     : REFERENCE | DESIGNATION | PRIX
# Ou     : REFERENCE | DESIGNATION | PRIX | UNITE
# Les lignes commencant par # sont ignorees.

SALE-100 | LES NAIMES POISSON | 8
STIKS-100 | MACARON SPECIAL | 12 | pièce
MADELAINE | 7`;

type FeedbackProps = {
  imported?: string;
  skipped?: string;
  importState?: string;
};

function ImportFeedback({ imported, skipped, importState }: FeedbackProps) {
  if (importState === "empty") {
    return (
      <p className="rounded-xl border border-[var(--warning)]/40 bg-[var(--warning)]/10 px-3 py-2 text-[13px] font-semibold text-[var(--warning)]">
        Aucune ligne a importer. Collez vos lignes dans le champ ci-dessous.
      </p>
    );
  }

  const importedNum = Number(imported ?? "");
  const skippedNum = Number(skipped ?? "");

  if (!Number.isFinite(importedNum) || (importedNum === 0 && skippedNum === 0)) {
    return null;
  }

  return (
    <p className="rounded-xl border border-[var(--success)]/40 bg-[var(--success)]/10 px-3 py-2 text-[13px] font-semibold text-[var(--success)]">
      {importedNum} produit{importedNum > 1 ? "s" : ""} importe{importedNum > 1 ? "s" : ""}
      {skippedNum > 0 ? `, ${skippedNum} ligne${skippedNum > 1 ? "s" : ""} ignoree${skippedNum > 1 ? "s" : ""}.` : "."}
    </p>
  );
}

export async function ProductManager({
  search = "",
  imported,
  skipped,
  importState,
}: {
  search?: string;
  imported?: string;
  skipped?: string;
  importState?: string;
}) {
  await requireFeature("produits");
  const items = listProducts(search);

  return (
    <div className="grid gap-4">
      <PageHeading
        eyebrow="Catalogue produits"
        title="Produits"
        description="Ajoutez les produits utilises dans vos documents. Ajout en masse possible via le champ d'import."
      />

      <ImportFeedback imported={imported} skipped={skipped} importState={importState} />

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="grid gap-4">
          <Card>
            <h3 className="text-lg font-black">Nouveau produit</h3>
            <form action={saveProductAction} className="mt-4 grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Référence"><Input name="ref" required /></Field>
                <Field label="Unité">
                  <Select name="unite" defaultValue="u">
                    <SelectTrigger>
                      <SelectValue placeholder="Unite" />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIT_OPTIONS.map((unit) => (
                        <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label="Désignation"><Input name="designation" required /></Field>
              <Field label="Prix HT"><Input name="prix_ht" type="number" step="0.01" required /></Field>
              <input type="hidden" name="tva_rate" value="0" />
              <SubmitButton>Enregistrer</SubmitButton>
            </form>
          </Card>

          <Card>
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-black">Import en masse</h3>
              <p className="text-[13px] text-[var(--muted)]">
                Collez plusieurs produits a la fois. Une ligne = un produit. Colonnes separees par <code className="rounded bg-[var(--background)] px-1">|</code>, tabulation ou <code className="rounded bg-[var(--background)] px-1">;</code>.
              </p>
            </div>
            <form action={bulkSaveProductsAction} className="mt-4 grid gap-3">
              <Textarea
                name="rows"
                rows={10}
                placeholder={BULK_PLACEHOLDER}
                className="font-mono text-[12px]"
                required
              />
              <p className="text-[12px] text-[var(--muted)]">
                Format accepte : <code>DESIGNATION | PRIX</code>, <code>REF | DESIGNATION | PRIX</code> ou <code>REF | DESIGNATION | PRIX | UNITE</code>. Les references manquantes sont generees automatiquement, les doublons sont reindexes.
              </p>
              <SubmitButton variant="primary">Importer</SubmitButton>
            </form>
          </Card>
        </div>

        <Card>
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-black">Catalogue</h3>
              <p className="text-[13px] text-[var(--muted)]">{items.length} produits</p>
            </div>
            <form className="flex gap-2" action="">
              <Input name="q" defaultValue={search} placeholder="Réf ou désignation" />
              <Button type="submit" variant="secondary">Filtrer</Button>
            </form>
          </div>
          <Table>
            <THead>
              <tr>
                <TH>Réf</TH>
                <TH>Désignation</TH>
                <TH>Prix HT</TH>
              </tr>
            </THead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <TD colSpan={3} className="py-8 text-center text-[var(--muted)]">
                    Aucun produit pour l&apos;instant.
                  </TD>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    <TD className="font-semibold">{item.ref}</TD>
                    <TD className="w-full">
                      <details>
                        <summary className="cursor-pointer list-none font-semibold">{item.designation}</summary>
                        <form action={saveProductAction} className="mt-3.5 grid gap-3 rounded-xl border bg-[var(--background)] p-3">
                          <input type="hidden" name="id" value={item.id} />
                          <div className="grid gap-3 md:grid-cols-2">
                            <Field label="Référence"><Input name="ref" defaultValue={item.ref} required /></Field>
                            <Field label="Unité">
                              <Select name="unite" defaultValue={item.unite}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Unite" />
                                </SelectTrigger>
                                <SelectContent>
                                  {UNIT_OPTIONS.map((unit) => (
                                    <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </Field>
                          </div>
                          <Field label="Désignation"><Input name="designation" defaultValue={item.designation} required /></Field>
                          <Field label="Prix HT"><Input name="prix_ht" type="number" step="0.01" defaultValue={item.prix_ht} required /></Field>
                          <input type="hidden" name="tva_rate" value="0" />
                          <input type="hidden" name="active" value={item.active} />
                          <div className="flex flex-wrap gap-2">
                            <SubmitButton variant="secondary">Mettre à jour</SubmitButton>
                            <ConfirmSubmitButton
                              type="submit"
                              variant="danger"
                              formAction={deleteProductAction}
                              name="id"
                              value={item.id}
                              message={`Supprimer le produit "${item.designation}" ? Cette action est définitive.`}
                            >
                              Supprimer
                            </ConfirmSubmitButton>
                          </div>
                        </form>
                      </details>
                    </TD>
                    <TD>{formatCurrency(item.prix_ht)}</TD>
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
