import { deleteProductAction, saveProductAction } from "@/app/actions";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Table, TD, TH, THead } from "@/components/ui/table";
import { listProducts } from "@/lib/data";
import { requireFeature } from "@/lib/features";
import { formatCurrency } from "@/lib/utils";

const UNIT_OPTIONS = ["u", "kg", "g", "boîte", "pièce", "plateau"];

export async function ProductManager({ search = "" }: { search?: string }) {
  await requireFeature("produits");
  const items = listProducts(search);

  return (
    <div className="grid gap-4">
      <PageHeading
        eyebrow="Catalogue produits"
        title="Produits"
        description="Ajoutez les produits utilisés dans vos documents."
      />

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
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
