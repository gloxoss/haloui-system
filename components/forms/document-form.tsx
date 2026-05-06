"use client";

import Link from "next/link";
import { startTransition, useState, useTransition } from "react";

import {
  convertDocumentAction,
  quickCreateEntityAction,
  saveDocumentAction,
  updateDocumentStatusAction,
} from "@/app/actions";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_TVA_RATE,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_TYPE_COMPACT_LABELS,
  DOCUMENT_TYPE_LABELS,
} from "@/lib/constants";
import { computeDocumentTotals } from "@/lib/totals";
import { type DocumentLineInput, type PartyType } from "@/lib/types";
import { cn, formatCurrency, formatDateLong, toInputDate } from "@/lib/utils";

type LookupItem = {
  id: number;
  name?: string;
  designation?: string;
  ref?: string;
  unite?: string;
  prix_ht?: number;
  tva_rate?: number;
};

type DocumentKind = "devis" | "facture" | "bl" | "bs" | "bc";
type WizardStep = 1 | 2 | 3;

const EMPTY_LINE = (): DocumentLineInput => ({
  designation: "",
  quantite: 1,
  unite: "u",
  prix_unitaire_ht: 0,
  tva_rate: DEFAULT_TVA_RATE,
  remise: 0,
  total_ht: 0,
  produit_id: null,
});

export function DocumentForm({
  slug,
  type,
  document,
  branches,
  clients,
  fournisseurs,
  products,
}: {
  slug: string;
  type: DocumentKind;
  document: Record<string, any> | null;
  branches: LookupItem[];
  clients: LookupItem[];
  fournisseurs: LookupItem[];
  products: LookupItem[];
}) {
  const initialLines = document?.lines?.length ? document.lines : [EMPTY_LINE()];
  const isWizard = !document;
  const locked = Boolean(document && document.status !== "brouillon");
  const partyOptions = type === "bc" ? fournisseurs : clients;
  const partyType: PartyType = type === "bc" ? "fournisseurs" : "clients";
  const partyLabel = type === "bc" ? "Fournisseur" : "Client";
  const wizardSteps = getWizardSteps(type);

  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [date, setDate] = useState(toInputDate(document?.date));
  const [notes, setNotes] = useState(document?.notes ?? "");
  const [advanceValue, setAdvanceValue] = useState<number>(Number(document?.avance ?? 0));
  const [branchId, setBranchId] = useState(stringValue(document?.branch_id));
  const [sourceBranchId, setSourceBranchId] = useState(stringValue(document?.source_branch_id));
  const [destinationBranchId, setDestinationBranchId] = useState(stringValue(document?.destination_branch_id));
  const [clientId, setClientId] = useState(stringValue(document?.client_id));
  const [fournisseurId, setFournisseurId] = useState(stringValue(document?.fournisseur_id));
  const [partyItems, setPartyItems] = useState<LookupItem[]>(partyOptions);
  const [lines, setLines] = useState<DocumentLineInput[]>(initialLines);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [productQuantities, setProductQuantities] = useState<Record<number, string>>({});
  const [catalogTargetLineIndex, setCatalogTargetLineIndex] = useState<number | null>(null);
  const [partySheetOpen, setPartySheetOpen] = useState(false);
  const [partyDraft, setPartyDraft] = useState({
    name: "",
    phone: "",
    address: "",
    ice: "",
    email: "",
    notes: "",
  });
  const [partyCreateError, setPartyCreateError] = useState("");
  const [isCreatingParty, startPartyTransition] = useTransition();

  const computed = computeDocumentTotals(
    lines.map((line) => ({
      designation: line.designation,
      quantite: Number(line.quantite) || 0,
      unite: line.unite || "u",
      prix_unitaire_ht: Number(line.prix_unitaire_ht) || 0,
      tva_rate: DEFAULT_TVA_RATE,
      remise: Number(line.remise) || 0,
      produit_id: line.produit_id ?? null,
    })),
  );
  const reste = Math.max(computed.totals.total_ttc - advanceValue, 0);
  const selectedBranch = branches.find((branch) => String(branch.id) === branchId);
  const selectedSourceBranch = branches.find((branch) => String(branch.id) === sourceBranchId);
  const selectedDestinationBranch = branches.find((branch) => String(branch.id) === destinationBranchId);
  const selectedParty = partyItems.find((party) =>
    String(party.id) === (type === "bc" ? fournisseurId : clientId),
  );
  const compactTypeLabel = DOCUMENT_TYPE_COMPACT_LABELS[type];
  const isPricingDocument = type !== "bs";
  const filteredProducts = products.filter((product) => {
    const haystack = `${product.ref ?? ""} ${product.designation ?? product.name ?? ""}`.toLowerCase();
    return haystack.includes(productSearch.trim().toLowerCase());
  });
  const stepOneReady =
    type === "bs"
      ? Boolean(sourceBranchId && destinationBranchId && sourceBranchId !== destinationBranchId)
      : Boolean(branchId && (type === "bc" ? fournisseurId : clientId));
  const hasFilledLine = lines.some(
    (line) => line.designation.trim().length > 0 && Number(line.quantite) > 0,
  );
  const stepHelp = document
    ? "Vérifiez, corrigez puis imprimez ce document."
    : currentStep === 1
      ? "Choisissez d'abord le magasin et la personne."
      : currentStep === 2
        ? "Ajoutez les articles et leurs quantités."
        : "Vérifiez puis enregistrez ce document.";

  const updateLine = (index: number, patch: Partial<DocumentLineInput>) => {
    setLines((current) =>
      current.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)),
    );
  };

  const addLine = () => {
    setLines((current) => [...current, EMPTY_LINE()]);
  };

  const removeLine = (index: number) => {
    setLines((current) => (current.length === 1 ? current : current.filter((_, lineIndex) => lineIndex !== index)));
  };

  const goNext = () => {
    if (currentStep === 1 && stepOneReady) {
      setCurrentStep(2);
      return;
    }

    if (currentStep === 2 && hasFilledLine) {
      setCurrentStep(3);
    }
  };

  const lineSnapshot = (line: DocumentLineInput) =>
    computeDocumentTotals([
      {
        designation: line.designation,
        quantite: Number(line.quantite) || 0,
        unite: line.unite || "u",
        prix_unitaire_ht: Number(line.prix_unitaire_ht) || 0,
        tva_rate: DEFAULT_TVA_RATE,
        remise: Number(line.remise) || 0,
        produit_id: line.produit_id ?? null,
      },
    ]).totals;

  const productLabelForLine = (line: DocumentLineInput) => {
    if (!line.produit_id) {
      return "Saisie libre";
    }

    const selected = products.find((item) => item.id === line.produit_id);
    if (!selected) {
      return line.designation || "Article";
    }

    return selected.ref ? `${selected.ref} - ${selected.designation ?? selected.name}` : (selected.designation ?? selected.name ?? "Article");
  };

  const setCatalogQuantity = (productId: number, nextValue: string) => {
    setProductQuantities((current) => ({ ...current, [productId]: nextValue }));
  };

  const adjustCatalogQuantity = (productId: number, delta: number) => {
    const currentValue = Number(productQuantities[productId] ?? 1) || 1;
    const nextValue = Math.max(1, currentValue + delta);
    setCatalogQuantity(productId, String(nextValue));
  };

  const openProductPicker = (lineIndex: number | null = null) => {
    setCatalogTargetLineIndex(lineIndex);
    setProductPickerOpen(true);
  };

  const closeProductPicker = () => {
    setProductPickerOpen(false);
    setCatalogTargetLineIndex(null);
    setProductSearch("");
  };

  const addProductFromCatalog = (product: LookupItem, quantityRaw: string | number) => {
    const quantity = Math.max(0.01, Number(quantityRaw) || 1);
    const nextLine: DocumentLineInput = {
      designation: product.designation ?? product.name ?? "",
      quantite: quantity,
      unite: product.unite || "u",
      prix_unitaire_ht: Number(product.prix_ht ?? 0),
      tva_rate: DEFAULT_TVA_RATE,
      remise: 0,
      total_ht: 0,
      produit_id: product.id ?? null,
    };

    setLines((current) => {
      if (catalogTargetLineIndex !== null) {
        return current.map((line, index) => (index === catalogTargetLineIndex ? nextLine : line));
      }

      const existingIndex = current.findIndex((line) => line.produit_id === product.id);
      if (existingIndex >= 0) {
        return current.map((line, index) =>
          index === existingIndex
            ? { ...line, quantite: (Number(line.quantite) || 0) + quantity }
            : line,
        );
      }

      if (
        current.length === 1 &&
        !current[0].designation.trim() &&
        !current[0].produit_id
      ) {
        return [nextLine];
      }

      return [...current, nextLine];
    });

    setProductQuantities((current) => ({ ...current, [product.id]: "1" }));

    if (catalogTargetLineIndex !== null) {
      closeProductPicker();
    }
  };

  const updatePartyDraft = (field: keyof typeof partyDraft, value: string) => {
    setPartyDraft((current) => ({ ...current, [field]: value }));
  };

  const closePartySheet = () => {
    setPartySheetOpen(false);
    setPartyCreateError("");
    setPartyDraft({
      name: "",
      phone: "",
      address: "",
      ice: "",
      email: "",
      notes: "",
    });
  };

  const submitQuickParty = () => {
    const trimmedName = partyDraft.name.trim();
    if (!trimmedName) {
      setPartyCreateError(`Ajoutez d'abord le nom du ${partyLabel.toLowerCase()}.`);
      return;
    }

    setPartyCreateError("");

    startPartyTransition(async () => {
      try {
        const created = await quickCreateEntityAction(partyType, {
          name: trimmedName,
          phone: partyDraft.phone.trim(),
          address: partyDraft.address.trim(),
          ice: partyDraft.ice.trim(),
          email: partyDraft.email.trim(),
          notes: partyDraft.notes.trim(),
        });

        startTransition(() => {
          setPartyItems((current) => [...current, created]);
          if (type === "bc") {
            setFournisseurId(String(created.id));
          } else {
            setClientId(String(created.id));
          }
          closePartySheet();
        });
      } catch {
        setPartyCreateError("Impossible d'enregistrer pour le moment. Reessayez.");
      }
    });
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const legacyRenderPartyField = () => (
    <Field label={partyLabel}>
      <Select
        name={isWizard ? undefined : type === "bc" ? "fournisseur_id" : "client_id"}
        value={type === "bc" ? (fournisseurId || "none") : (clientId || "none")}
        disabled={locked}
        onValueChange={(value) => {
          const val = value === "none" ? "" : value;
          if (type === "bc") {
            setFournisseurId(val);
            return;
          }

          setClientId(val);
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Selectionner" />
        </SelectTrigger>
        <SelectContent>
            <SelectItem value="none">Selectionner</SelectItem>
          {partyOptions.map((party) => (
            <SelectItem key={party.id} value={String(party.id)}>
              {party.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );

  const renderPartyField = () => (
    <div className="grid gap-2">
      <Field label={partyLabel}>
        <Select
          name={isWizard ? undefined : type === "bc" ? "fournisseur_id" : "client_id"}
          value={type === "bc" ? (fournisseurId || "none") : (clientId || "none")}
          disabled={locked}
          onValueChange={(value) => {
            const val = value === "none" ? "" : value;
            if (type === "bc") {
              setFournisseurId(val);
              return;
            }

            setClientId(val);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selectionner" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Selectionner</SelectItem>
            {partyItems.map((party) => (
              <SelectItem key={party.id} value={String(party.id)}>
                {party.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {!locked ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border bg-[var(--background-alt)] px-3 py-2.5 text-sm">
          <span className="text-[var(--muted)]">{partyLabel} introuvable ?</span>
          <Button type="button" variant="secondary" onClick={() => setPartySheetOpen(true)}>
            Creer {type === "bc" ? "le fournisseur" : "le client"}
          </Button>
        </div>
      ) : null}
    </div>
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const legacyRenderLineSection = () => (
    <Card className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-black">Articles</h3>
          <p className="mt-1 text-[13px] text-[var(--muted)]">
            Choisissez un article, puis ajustez la quantité et le prix si besoin.
          </p>
        </div>
        {!locked ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="secondary" onClick={() => setProductPickerOpen(true)}>
              Ajouter depuis le catalogue
            </Button>
            <Button type="button" variant="ghost" onClick={addLine}>
              Ligne libre
            </Button>
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 lg:hidden">
        {lines.map((line, index) => {
          const lineTotals = computeDocumentTotals([
            {
              designation: line.designation,
              quantite: Number(line.quantite) || 0,
              unite: line.unite || "u",
              prix_unitaire_ht: Number(line.prix_unitaire_ht) || 0,
              tva_rate: Number(line.tva_rate) || 0,
              remise: Number(line.remise) || 0,
              produit_id: line.produit_id ?? null,
            },
          ]).totals;

          return (
            <div key={`${index}-${line.produit_id ?? "mobile"}`} className="rounded-[20px] border p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold">Article {index + 1}</p>
                  <p className="text-xs text-[var(--muted)]">Version simple pour tablette et portable.</p>
                </div>
                {!locked ? (
                  <Button type="button" variant="ghost" onClick={() => removeLine(index)}>
                    Retirer
                  </Button>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Article">
                  <Select
                    disabled={locked}
                    value={String(line.produit_id || "none")}
                    onValueChange={(value) => {
                      const productId = value === "none" ? null : Number(value);
                      const selected = products.find((item) => item.id === productId);

                      updateLine(index, {
                        produit_id: productId,
                        designation: selected?.designation ?? line.designation,
                        unite: selected?.unite ?? line.unite,
                        prix_unitaire_ht: selected?.prix_ht ?? line.prix_unitaire_ht,
                        tva_rate: selected?.tva_rate ?? line.tva_rate,
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Saisie libre" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Saisie libre</SelectItem>
                      {products.map((item) => (
                        <SelectItem key={item.id} value={String(item.id)}>
                          {item.ref} - {item.designation}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Désignation" className="sm:col-span-2">
                  <Input
                    disabled={locked}
                    value={line.designation}
                    onChange={(event) => updateLine(index, { designation: event.target.value })}
                  />
                </Field>
                <Field label="Qté">
                  <Input
                    disabled={locked}
                    type="number"
                    step="0.01"
                    value={line.quantite}
                    onChange={(event) => updateLine(index, { quantite: Number(event.target.value) || 0 })}
                  />
                </Field>
                <Field label="Unité">
                  <Input
                    disabled={locked}
                    value={line.unite}
                    onChange={(event) => updateLine(index, { unite: event.target.value })}
                  />
                </Field>
                {type === "bs" ? null : (
                  <Field label="PU">
                    <Input
                      disabled={locked}
                      type="number"
                      step="0.01"
                      value={line.prix_unitaire_ht}
                      onChange={(event) =>
                        updateLine(index, { prix_unitaire_ht: Number(event.target.value) || 0 })
                      }
                    />
                  </Field>
                )}
              </div>

              <div className="mt-3 rounded-xl border bg-[var(--background-alt)] px-3 py-2.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  {type === "bs" ? "Résumé" : "Total HT"}
                </p>
                <p className="mt-1 text-sm font-bold">
                  {type === "bs"
                    ? `${Number(line.quantite) || 0} ${line.unite || "u"}`
                    : formatCurrency(lineTotals.total_ttc)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <table className="min-w-[980px] text-[13px]">
          <thead className="text-left text-xs uppercase tracking-wide text-[var(--muted)]">
            <tr>
              <th className="pb-2.5">Article</th>
              <th className="pb-2.5">Désignation</th>
              <th className="pb-2.5">Qté</th>
              <th className="pb-2.5">Unité</th>
              {type === "bs" ? null : (
                <>
                  <th className="pb-2.5">PU</th>
                  <th className="pb-2.5">PT</th>
                </>
              )}
              {type === "bs" ? <th className="pb-2.5">Résumé</th> : null}
              <th className="pb-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => {
              const lineTotals = computeDocumentTotals([
                {
                  designation: line.designation,
                  quantite: Number(line.quantite) || 0,
                  unite: line.unite || "u",
                  prix_unitaire_ht: Number(line.prix_unitaire_ht) || 0,
                  tva_rate: Number(line.tva_rate) || 0,
                  remise: Number(line.remise) || 0,
                  produit_id: line.produit_id ?? null,
                },
              ]).totals;

              return (
                <tr key={`${index}-${line.produit_id ?? "desktop"}`} className="border-t align-top">
                  <td className="py-2.5 pr-2.5">
                    <Select
                      disabled={locked}
                      value={String(line.produit_id || "none")}
                      onValueChange={(value) => {
                        const productId = value === "none" ? null : Number(value);
                        const selected = products.find((item) => item.id === productId);

                        updateLine(index, {
                          produit_id: productId,
                          designation: selected?.designation ?? line.designation,
                          unite: selected?.unite ?? line.unite,
                          prix_unitaire_ht: selected?.prix_ht ?? line.prix_unitaire_ht,
                          tva_rate: selected?.tva_rate ?? line.tva_rate,
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Saisie libre" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Saisie libre</SelectItem>
                        {products.map((item) => (
                          <SelectItem key={item.id} value={String(item.id)}>
                            {item.ref} - {item.designation}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="py-2.5 pr-2.5">
                    <Input
                      disabled={locked}
                      value={line.designation}
                      onChange={(event) => updateLine(index, { designation: event.target.value })}
                    />
                  </td>
                  <td className="py-2.5 pr-2.5">
                    <Input
                      disabled={locked}
                      type="number"
                      step="0.01"
                      value={line.quantite}
                      onChange={(event) => updateLine(index, { quantite: Number(event.target.value) || 0 })}
                    />
                  </td>
                  <td className="py-2.5 pr-2.5">
                    <Input
                      disabled={locked}
                      value={line.unite}
                      onChange={(event) => updateLine(index, { unite: event.target.value })}
                    />
                  </td>
                  {type === "bs" ? null : (
                    <>
                      <td className="py-2.5 pr-2.5">
                        <Input
                          disabled={locked}
                          type="number"
                          step="0.01"
                          value={line.prix_unitaire_ht}
                          onChange={(event) =>
                            updateLine(index, { prix_unitaire_ht: Number(event.target.value) || 0 })
                          }
                        />
                      </td>
                      <td className="py-2.5 pr-2.5">
                        <Input
                          disabled={locked}
                          type="number"
                          step="0.01"
                          value={line.tva_rate}
                          onChange={(event) => updateLine(index, { tva_rate: Number(event.target.value) || 0 })}
                        />
                      </td>
                      <td className="py-2.5 pr-2.5">
                        <Input
                          disabled={locked}
                          type="number"
                          step="0.01"
                          value={line.remise}
                          onChange={(event) => updateLine(index, { remise: Number(event.target.value) || 0 })}
                        />
                      </td>
                      <td className="py-2.5 pr-2.5 font-semibold">{formatCurrency(lineTotals.total_ht)}</td>
                    </>
                  )}
                  {type === "bs" ? (
                    <td className="py-2.5 pr-2.5 font-semibold">
                      {Number(line.quantite) || 0} {line.unite || "u"}
                    </td>
                  ) : null}
                  <td className="py-2.5">
                    {!locked ? (
                      <Button type="button" variant="ghost" onClick={() => removeLine(index)}>
                        Retirer
                      </Button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );

  const renderLineSection = () => (
    <Card className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-black">Articles</h3>
          <p className="mt-1 text-[13px] text-[var(--muted)]">
            Ajoutez depuis le catalogue, puis ajustez seulement la quantite et le prix.
          </p>
        </div>
        {!locked ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="secondary" onClick={() => openProductPicker()}>
              Ajouter un article
            </Button>
            <Button type="button" variant="ghost" onClick={addLine}>
              Ligne libre
            </Button>
          </div>
        ) : null}
      </div>

      <div className="rounded-[20px] border bg-[var(--background-alt)] px-4 py-3 text-sm text-[var(--muted)]">
        {type === "bs"
          ? "Choisissez un produit, indiquez la quantite puis verifiez les deux magasins."
          : "Le catalogue remplit l'article automatiquement. Vous gardez seulement le libelle, la quantite et le prix."}
      </div>

      <div className="grid gap-3 lg:hidden">
        {lines.map((line, index) => {
          const lineTotals = lineSnapshot(line);

          return (
            <div key={`${index}-${line.produit_id ?? "mobile-new"}`} className="rounded-[20px] border p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold">Article {index + 1}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {line.produit_id ? productLabelForLine(line) : "Saisie libre ou catalogue."}
                  </p>
                </div>
                {!locked ? (
                  <Button type="button" variant="ghost" onClick={() => removeLine(index)}>
                    Retirer
                  </Button>
                ) : null}
              </div>

              {!locked ? (
                <Button type="button" variant="secondary" className="mb-3 w-full" onClick={() => openProductPicker(index)}>
                  {line.produit_id ? "Changer depuis le catalogue" : "Choisir dans le catalogue"}
                </Button>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Libelle" className="sm:col-span-2">
                  <Input
                    disabled={locked}
                    value={line.designation}
                    onChange={(event) => updateLine(index, { designation: event.target.value })}
                  />
                </Field>
                <Field label="Quantite">
                  <Input
                    disabled={locked}
                    type="number"
                    step="0.01"
                    value={line.quantite}
                    onChange={(event) => updateLine(index, { quantite: Number(event.target.value) || 0 })}
                  />
                </Field>
                {type === "bs" ? (
                  <Field label="Unite">
                    <Input
                      disabled={locked}
                      value={line.unite}
                      onChange={(event) => updateLine(index, { unite: event.target.value })}
                    />
                  </Field>
                ) : (
                  <Field label="PU">
                    <Input
                      disabled={locked}
                      type="number"
                      step="0.01"
                      value={line.prix_unitaire_ht}
                      onChange={(event) =>
                        updateLine(index, { prix_unitaire_ht: Number(event.target.value) || 0 })
                      }
                    />
                  </Field>
                )}
              </div>

              <div className="mt-3 rounded-xl border bg-[var(--background-alt)] px-3 py-2.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  {type === "bs" ? "Resume" : "PT"}
                </p>
                <p className="mt-1 text-sm font-bold">
                  {type === "bs"
                    ? `${Number(line.quantite) || 0} ${line.unite || "u"}`
                    : formatCurrency(lineTotals.total_ttc)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <table className={cn("w-full text-[13px]", type === "bs" ? "min-w-[760px]" : "min-w-[920px]")}>
          <thead className="text-left text-xs uppercase tracking-wide text-[var(--muted)]">
            <tr>
              <th className="pb-2.5">Article</th>
              <th className="pb-2.5">{type === "bs" ? "Designation" : "Libelle"}</th>
              <th className="pb-2.5">Qte</th>
              {type === "bs" ? <th className="pb-2.5">Unite</th> : <th className="pb-2.5">PU</th>}
              <th className="pb-2.5">{type === "bs" ? "Resume" : "PT"}</th>
              <th className="pb-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => {
              const lineTotals = lineSnapshot(line);

              return (
                <tr key={`${index}-${line.produit_id ?? "desktop-new"}`} className="border-t align-top">
                  <td className="py-2.5 pr-2.5">
                    <div className="grid gap-2">
                      <div className="rounded-xl border bg-[var(--background-alt)] px-3 py-2.5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                          {line.produit_id ? "Catalogue" : "Ligne libre"}
                        </p>
                        <p className="mt-1 text-sm font-semibold">{productLabelForLine(line)}</p>
                      </div>
                      {!locked ? (
                        <Button type="button" variant="secondary" className="w-full" onClick={() => openProductPicker(index)}>
                          {line.produit_id ? "Changer" : "Choisir"}
                        </Button>
                      ) : null}
                    </div>
                  </td>
                  <td className="py-2.5 pr-2.5">
                    <Input
                      disabled={locked}
                      value={line.designation}
                      onChange={(event) => updateLine(index, { designation: event.target.value })}
                    />
                  </td>
                  <td className="py-2.5 pr-2.5">
                    <Input
                      disabled={locked}
                      type="number"
                      step="0.01"
                      value={line.quantite}
                      onChange={(event) => updateLine(index, { quantite: Number(event.target.value) || 0 })}
                    />
                  </td>
                  <td className="py-2.5 pr-2.5">
                    {type === "bs" ? (
                      <Input
                        disabled={locked}
                        value={line.unite}
                        onChange={(event) => updateLine(index, { unite: event.target.value })}
                      />
                    ) : (
                      <Input
                        disabled={locked}
                        type="number"
                        step="0.01"
                        value={line.prix_unitaire_ht}
                        onChange={(event) =>
                          updateLine(index, { prix_unitaire_ht: Number(event.target.value) || 0 })
                        }
                      />
                    )}
                  </td>
                  <td className="py-2.5 pr-2.5 font-semibold">
                    {type === "bs"
                      ? `${Number(line.quantite) || 0} ${line.unite || "u"}`
                      : formatCurrency(lineTotals.total_ttc)}
                  </td>
                  <td className="py-2.5">
                    {!locked ? (
                      <Button type="button" variant="ghost" onClick={() => removeLine(index)}>
                        Retirer
                      </Button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );

  const renderTotalsCard = () => (
    <Card>
      <h3 className="text-base font-black">Montants</h3>
      <div className="mt-3.5 grid gap-2.5 text-[13px]">
        <div className="flex items-center justify-between rounded-xl border bg-[var(--background-alt)] px-3 py-2.5">
          <span>Total HT</span>
          <strong>{formatCurrency(computed.totals.total_ht)}</strong>
        </div>
        {type === "bs" ? null : (
          <>
            <div className="flex items-center justify-between rounded-xl border bg-[var(--background-alt)] px-3 py-2.5">
              <span>Remise (réduction)</span>
              <strong>{formatCurrency(computed.totals.remise)}</strong>
            </div>
            <div className="flex items-center justify-between rounded-xl border bg-[var(--accent)] px-3 py-3 text-[var(--accent-foreground)]">
              <span className="font-semibold">Total</span>
              <strong className="text-lg">{formatCurrency(computed.totals.total_ttc)}</strong>
            </div>
          </>
        )}
      </div>
    </Card>
  );

  const renderPaymentCard = (submitLabel?: string) => (
    <Card>
      <h3 className="text-base font-black">Paiement</h3>
      <div className="mt-3.5 grid gap-3">
        <Field label="Avance">
          <Input
            name={isWizard ? undefined : "avance"}
            type="number"
            step="0.01"
            value={advanceValue}
            disabled={locked}
            onChange={(event) => setAdvanceValue(Number(event.target.value) || 0)}
          />
        </Field>
        <div className="rounded-xl border bg-[var(--background-alt)] px-3 py-2.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Reste</p>
          <p className="mt-1 text-base font-bold">{formatCurrency(reste)}</p>
        </div>
      </div>
      {submitLabel && !locked ? (
        <div className="mt-4">
          <SubmitButton className="w-full">{submitLabel}</SubmitButton>
        </div>
      ) : null}
      {locked ? (
        <p className="mt-4 text-[13px] text-[var(--muted)]">
          Document verrouillé après finalisation. Imprimez-le ou changez son statut.
        </p>
      ) : null}
    </Card>
  );

  const renderProductPicker = () => (
    <Sheet
      open={productPickerOpen}
      onOpenChange={(open) => {
        if (open) {
          setProductPickerOpen(true);
          return;
        }

        closeProductPicker();
      }}
    >
      <SheetContent
        side="right"
        className="left-auto right-0 w-full border-l p-0 sm:max-w-none md:w-[min(980px,calc(100vw-32px))]"
      >
        <div className="flex h-full flex-col">
          <div className="border-b px-4 py-4 sm:px-5">
            <div className="pr-10">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Catalogue produits
              </p>
              <h3 className="mt-1 text-lg font-black">Choisir un article</h3>
              <p className="mt-1 text-[13px] text-[var(--muted)]">
                Recherchez un produit, indiquez la quantite, puis ajoutez-le au document.
              </p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
              <Input
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
                placeholder="Rechercher par reference ou designation"
              />
              <Button type="button" variant="ghost" onClick={closeProductPicker}>
                Fermer
              </Button>
            </div>
            <div className="mt-3 rounded-xl border bg-[var(--background-alt)] px-3 py-2.5 text-sm text-[var(--muted)]">
              {catalogTargetLineIndex === null
                ? "Ajout rapide: chaque clic ajoute un nouvel article dans le devis."
                : `Remplacement de la ligne ${catalogTargetLineIndex + 1}.`}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
            {filteredProducts.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {filteredProducts.map((product) => {
                  const quantityValue = productQuantities[product.id] ?? "1";

                  return (
                    <div key={product.id} className="rounded-[20px] border bg-[var(--card)] p-4 shadow-[var(--shadow-md)]">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                            {product.ref || "Produit"}
                          </p>
                          <p className="mt-1 text-sm font-bold">{product.designation ?? product.name}</p>
                          <p className="mt-1 text-xs text-[var(--muted)]">
                            Unite: {product.unite || "u"} {isPricingDocument ? `â€¢ PU ${formatCurrency(Number(product.prix_ht ?? 0))}` : ""}
                          </p>
                        </div>
                        {isPricingDocument ? (
                          <div className="rounded-xl border bg-[var(--background-alt)] px-3 py-2 text-right">
                            <p className="text-[11px] uppercase tracking-wide text-[var(--muted)]">Prix</p>
                            <p className="mt-1 text-sm font-bold">{formatCurrency(Number(product.prix_ht ?? 0))}</p>
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <Field label="Quantite" className="sm:max-w-[188px]">
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              className="min-h-10 w-10 px-0"
                              onClick={() => adjustCatalogQuantity(product.id, -1)}
                            >
                              -
                            </Button>
                            <Input
                              type="number"
                              step="0.01"
                              min="1"
                              value={quantityValue}
                              onChange={(event) => setCatalogQuantity(product.id, event.target.value)}
                              className="text-center"
                            />
                            <Button
                              type="button"
                              variant="secondary"
                              className="min-h-10 w-10 px-0"
                              onClick={() => adjustCatalogQuantity(product.id, 1)}
                            >
                              +
                            </Button>
                          </div>
                        </Field>

                        <Button type="button" className="w-full sm:w-auto" onClick={() => addProductFromCatalog(product, quantityValue)}>
                          Ajouter au document
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[20px] border border-dashed px-4 py-8 text-center text-sm text-[var(--muted)]">
                Aucun produit ne correspond a votre recherche.
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );

  const renderPartySheet = () => (
    <Sheet
      open={partySheetOpen}
      onOpenChange={(open) => {
        if (open) {
          setPartySheetOpen(true);
          return;
        }

        closePartySheet();
      }}
    >
      <SheetContent
        side="right"
        className="left-auto right-0 w-full border-l p-0 sm:max-w-none md:w-[min(560px,calc(100vw-32px))]"
      >
        <div className="flex h-full flex-col">
          <div className="border-b px-4 py-4 sm:px-5">
            <div className="pr-10">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Ajout rapide
              </p>
              <h3 className="mt-1 text-lg font-black">
                {type === "bc" ? "Nouveau fournisseur" : "Nouveau client"}
              </h3>
              <p className="mt-1 text-[13px] text-[var(--muted)]">
                Ajoutez-le ici, il sera choisi automatiquement dans le document.
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
            <div className="grid gap-3">
              <Field label="Nom">
                <Input
                  value={partyDraft.name}
                  onChange={(event) => updatePartyDraft("name", event.target.value)}
                  placeholder={type === "bc" ? "Nom du fournisseur" : "Nom du client"}
                />
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Telephone">
                  <Input
                    value={partyDraft.phone}
                    onChange={(event) => updatePartyDraft("phone", event.target.value)}
                  />
                </Field>
                <Field label="ICE">
                  <Input
                    value={partyDraft.ice}
                    onChange={(event) => updatePartyDraft("ice", event.target.value)}
                  />
                </Field>
              </div>

              <Field label="Adresse">
                <Textarea
                  value={partyDraft.address}
                  onChange={(event) => updatePartyDraft("address", event.target.value)}
                  className="min-h-24"
                />
              </Field>

              <Field label="Email">
                <Input
                  type="email"
                  value={partyDraft.email}
                  onChange={(event) => updatePartyDraft("email", event.target.value)}
                />
              </Field>

              <Field label="Notes">
                <Textarea
                  value={partyDraft.notes}
                  onChange={(event) => updatePartyDraft("notes", event.target.value)}
                  className="min-h-20"
                />
              </Field>

              {partyCreateError ? (
                <div className="rounded-xl border border-[var(--danger)]/30 bg-[color-mix(in_oklch,var(--danger)_10%,white)] px-3 py-2 text-sm text-[var(--danger)]">
                  {partyCreateError}
                </div>
              ) : null}
            </div>
          </div>

          <div className="border-t px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" onClick={closePartySheet} disabled={isCreatingParty}>
                Annuler
              </Button>
              <Button type="button" onClick={submitQuickParty} disabled={isCreatingParty}>
                {isCreatingParty ? "Enregistrement..." : "Enregistrer et choisir"}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <div className="grid gap-4">
      <PageHeading
        eyebrow={DOCUMENT_TYPE_LABELS[type]}
        title={
          document
            ? `${compactTypeLabel} #${document.numero}`
            : type === "bl" || type === "bs" || type === "bc"
              ? "Nouveau bon"
              : `Nouveau ${compactTypeLabel.toLowerCase()}`
        }
        description={stepHelp}
        actions={
          document ? (
            <>
              <Link href={`/print/${printSegmentForType(type)}/${document.id}`} target="_blank">
                <Button variant="secondary">Imprimer / PDF</Button>
              </Link>
              {type === "devis" ? (
                <>
                  <form action={convertDocumentAction}>
                    <input type="hidden" name="source_id" value={document.id} />
                    <input type="hidden" name="target_type" value="facture" />
                    <Button type="submit" variant="secondary">
                      Créer la facture
                    </Button>
                  </form>
                  <form action={convertDocumentAction}>
                    <input type="hidden" name="source_id" value={document.id} />
                    <input type="hidden" name="target_type" value="bl" />
                    <Button type="submit" variant="secondary">
                      Créer le bon de livraison
                    </Button>
                  </form>
                </>
              ) : null}
            </>
          ) : (
            <Link href={`/${slug}`}>
              <Button variant="secondary">Retour à la liste</Button>
            </Link>
          )
        }
      />

      {document ? (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-[var(--background-alt)] px-3 py-1 text-xs font-semibold">
              {DOCUMENT_STATUS_LABELS[document.status as keyof typeof DOCUMENT_STATUS_LABELS]}
            </span>
            <span className="text-sm text-[var(--muted)]">
              Créé par {document.created_by_name ?? "—"} le {formatDateLong(document.created_at)}
            </span>
            <span className="text-sm text-[var(--muted)]">
              Modifié par {document.updated_by_name ?? "—"} le {formatDateLong(document.updated_at)}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {document.status === "brouillon" ? (
              <form action={updateDocumentStatusAction}>
                <input type="hidden" name="id" value={document.id} />
                <input type="hidden" name="slug" value={slug} />
                <input type="hidden" name="status" value="valide" />
                <Button type="submit">Finaliser</Button>
              </form>
            ) : null}
            {document.status !== "imprime" ? (
              <form action={updateDocumentStatusAction}>
                <input type="hidden" name="id" value={document.id} />
                <input type="hidden" name="slug" value={slug} />
                <input type="hidden" name="status" value="imprime" />
                <Button type="submit" variant="secondary">
                  Marquer terminé
                </Button>
              </form>
            ) : null}
          </div>
        </Card>
      ) : null}

      <form action={saveDocumentAction} className="grid gap-4">
        <input type="hidden" name="id" value={document?.id ?? ""} />
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="status" value={document?.status ?? "brouillon"} />
        <input type="hidden" name="parent_document_id" value={document?.parent_document_id ?? ""} />
        <input type="hidden" name="lines_json" value={JSON.stringify(lines)} />

        {isWizard ? (
          <>
            <input type="hidden" name="date" value={date} />
            <input type="hidden" name="notes" value={notes} />
            <input type="hidden" name="avance" value={String(advanceValue)} />
            <input type="hidden" name="branch_id" value={branchId} />
            <input type="hidden" name="source_branch_id" value={sourceBranchId} />
            <input type="hidden" name="destination_branch_id" value={destinationBranchId} />
            <input type="hidden" name="client_id" value={clientId} />
            <input type="hidden" name="fournisseur_id" value={fournisseurId} />
          </>
        ) : null}

        {isWizard ? (
          <>
            <Card className="grid gap-4">
              <div className="grid gap-3 md:grid-cols-3">
                {wizardSteps.map((step) => {
                  const active = currentStep === step.id;
                  const complete = currentStep > step.id;

                  return (
                    <div
                      key={step.id}
                      className={cn(
                        "rounded-[20px] border px-4 py-3",
                        active && "border-[var(--accent)] bg-[var(--background-alt)]",
                        complete && "border-[var(--accent)]",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-full border text-sm font-bold",
                            active || complete
                              ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]"
                              : "border-[var(--border)] bg-[var(--background)] text-[var(--muted)]",
                          )}
                        >
                          {step.id}
                        </div>
                        <div>
                          <p className="text-sm font-bold">{step.title}</p>
                          <p className="text-xs text-[var(--muted)]">{step.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {currentStep === 1 ? (
              <Card className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <Field label="Numéro">
                    <Input value="Attribué à l'enregistrement" readOnly />
                  </Field>
                  <Field label="Date">
                    <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
                  </Field>
                  {type === "bs" ? null : (
                    <Field label="Magasin">
                      <Select value={branchId || "none"} onValueChange={(val) => setBranchId(val === "none" ? "" : val)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sélectionner</SelectItem>
                          {branches.map((branch) => (
                            <SelectItem key={branch.id} value={String(branch.id)}>
                              {branch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                </div>

                {type === "bs" ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Magasin de départ">
                      <Select value={sourceBranchId || "none"} onValueChange={(val) => setSourceBranchId(val === "none" ? "" : val)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sélectionner</SelectItem>
                          {branches.map((branch) => (
                            <SelectItem key={branch.id} value={String(branch.id)}>
                              {branch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Magasin d'arrivée">
                      <Select value={destinationBranchId || "none"} onValueChange={(val) => setDestinationBranchId(val === "none" ? "" : val)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sélectionner</SelectItem>
                          {branches.map((branch) => (
                            <SelectItem key={branch.id} value={String(branch.id)}>
                              {branch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                ) : (
                  renderPartyField()
                )}

                <div className="rounded-[20px] border bg-[var(--background-alt)] px-4 py-3 text-sm text-[var(--muted)]">
                  {type === "bs" ? (
                    sourceBranchId && destinationBranchId ? (
                      sourceBranchId === destinationBranchId ? (
                        "Choisissez deux magasins différents pour continuer."
                      ) : (
                        <>
                          Départ: <strong className="text-[var(--foreground)]">{selectedSourceBranch?.name}</strong>, arrivée:{" "}
                          <strong className="text-[var(--foreground)]">{selectedDestinationBranch?.name}</strong>.
                        </>
                      )
                    ) : (
                      "Choisissez le magasin de départ puis le magasin d'arrivée."
                    )
                  ) : branchId && selectedParty ? (
                    <>
                      Document préparé pour <strong className="text-[var(--foreground)]">{selectedParty.name}</strong>, magasin{" "}
                      <strong className="text-[var(--foreground)]">{selectedBranch?.name}</strong>.
                    </>
                  ) : (
                    `Choisissez le magasin puis ${partyLabel.toLowerCase()} pour continuer.`
                  )}
                </div>
              </Card>
            ) : null}

            {currentStep === 2 ? renderLineSection() : null}

            {currentStep === 3 ? (
              <>
                <Card className="grid gap-4">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl border bg-[var(--background-alt)] px-3 py-2.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Numéro</p>
                      <p className="mt-1 text-sm font-bold">Attribué à l'enregistrement</p>
                    </div>
                    <div className="rounded-xl border bg-[var(--background-alt)] px-3 py-2.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Date</p>
                      <p className="mt-1 text-sm font-bold">{date}</p>
                    </div>
                    <div className="rounded-xl border bg-[var(--background-alt)] px-3 py-2.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                        {type === "bs" ? "Départ" : "Magasin"}
                      </p>
                      <p className="mt-1 text-sm font-bold">
                        {type === "bs" ? selectedSourceBranch?.name || "—" : selectedBranch?.name || "—"}
                      </p>
                    </div>
                    <div className="rounded-xl border bg-[var(--background-alt)] px-3 py-2.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                        {type === "bs" ? "Arrivée" : partyLabel}
                      </p>
                      <p className="mt-1 text-sm font-bold">
                        {type === "bs" ? selectedDestinationBranch?.name || "—" : selectedParty?.name || "—"}
                      </p>
                    </div>
                  </div>

                  <Field label="Notes">
                    <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-24" />
                  </Field>
                </Card>

                <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
                  {renderTotalsCard()}
                  {renderPaymentCard("Créer le document")}
                </div>
              </>
            ) : null}

            <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[var(--muted)]">
                {currentStep === 1
                  ? "Commencez par choisir le bon contexte."
                  : currentStep === 2
                    ? "Ajoutez au moins un article avant de continuer."
                    : "Dernière vérification avant l'enregistrement."}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                {currentStep > 1 ? (
                  <Button type="button" variant="secondary" onClick={() => setCurrentStep((current) => (current - 1) as WizardStep)}>
                    Retour
                  </Button>
                ) : null}
                {currentStep < 3 ? (
                  <Button
                    type="button"
                    onClick={goNext}
                    disabled={currentStep === 1 ? !stepOneReady : !hasFilledLine}
                  >
                    Continuer
                  </Button>
                ) : null}
              </div>
            </Card>
          </>
        ) : (
          <>
            <Card className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Numéro">
                  <Input value={document?.numero ? String(document.numero) : "Attribué à l'enregistrement"} readOnly />
                </Field>
                <Field label="Date">
                  <Input
                    name="date"
                    type="date"
                    value={date}
                    disabled={locked}
                    onChange={(event) => setDate(event.target.value)}
                  />
                </Field>
              </div>

              {type === "bs" ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Magasin de départ">
                    <Select
                      name="source_branch_id"
                      value={sourceBranchId || "none"}
                      disabled={locked}
                      onValueChange={(val) => setSourceBranchId(val === "none" ? "" : val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sélectionner</SelectItem>
                        {branches.map((branch) => (
                          <SelectItem key={branch.id} value={String(branch.id)}>
                            {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Magasin d'arrivée">
                    <Select
                      name="destination_branch_id"
                      value={destinationBranchId || "none"}
                      disabled={locked}
                      onValueChange={(val) => setDestinationBranchId(val === "none" ? "" : val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sélectionner</SelectItem>
                        {branches.map((branch) => (
                          <SelectItem key={branch.id} value={String(branch.id)}>
                            {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Magasin">
                    <Select
                      name="branch_id"
                      value={branchId || "none"}
                      disabled={locked}
                      onValueChange={(val) => setBranchId(val === "none" ? "" : val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sélectionner</SelectItem>
                        {branches.map((branch) => (
                          <SelectItem key={branch.id} value={String(branch.id)}>
                            {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  {renderPartyField()}
                </div>
              )}

              <Field label="Notes">
                <Textarea
                  name="notes"
                  value={notes}
                  className="min-h-24"
                  disabled={locked}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </Field>
            </Card>

            {renderLineSection()}

            <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
              {renderTotalsCard()}
              {renderPaymentCard("Mettre à jour")}
            </div>
          </>
        )}
      </form>
      {renderPartySheet()}
      {renderProductPicker()}
    </div>
  );
}

function stringValue(value: number | string | null | undefined) {
  return value == null ? "" : String(value);
}

function getWizardSteps(type: DocumentKind) {
  if (type === "bs") {
    return [
      { id: 1 as const, title: "Départ & arrivée", description: "Choisissez les deux magasins." },
      { id: 2 as const, title: "Articles", description: "Ajoutez les produits à déplacer." },
      { id: 3 as const, title: "Vérifier", description: "Contrôlez puis enregistrez." },
    ];
  }

  if (type === "bc") {
    return [
      { id: 1 as const, title: "Magasin & fournisseur", description: "Choisissez où livrer." },
      { id: 2 as const, title: "Articles", description: "Ajoutez les produits à commander." },
      { id: 3 as const, title: "Vérifier", description: "Contrôlez puis enregistrez." },
    ];
  }

  return [
    { id: 1 as const, title: "Magasin & client", description: "Choisissez à qui le document sert." },
    { id: 2 as const, title: "Articles", description: "Ajoutez les produits à préparer." },
    { id: 3 as const, title: "Vérifier", description: "Contrôlez puis enregistrez." },
  ];
}

function printSegmentForType(type: DocumentKind) {
  if (type === "bl") return "bon-livraison";
  if (type === "bs") return "bon-sortie";
  if (type === "bc") return "bon-commande";
  return type;
}
