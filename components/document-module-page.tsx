import Link from "next/link";

import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TD, TH, THead } from "@/components/ui/table";
import { Eye, MoreHorizontal, Printer } from "lucide-react";
import {
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_TYPE_COMPACT_LABELS,
} from "@/lib/constants";
import { listBranches, listDocuments, listEntities } from "@/lib/data";
import { requireDocumentFeature } from "@/lib/features";
import { formatCurrency, formatDate } from "@/lib/utils";
import { type DocumentType } from "@/lib/types";

export async function DocumentModulePage({
  slug,
  type,
  filters,
}: {
  slug: string;
  type: DocumentType;
  filters: { from?: string; to?: string; branchId?: string; status?: string; partyId?: string };
}) {
  await requireDocumentFeature(type);
  const branches = listBranches({ activeOnly: true });
  const parties = listEntities(type === "bc" ? "fournisseurs" : "clients");
  const documents = listDocuments(type, {
    from: filters.from,
    to: filters.to,
    branchId: filters.branchId ? Number(filters.branchId) : null,
    status: filters.status,
    partyId: filters.partyId ? Number(filters.partyId) : null,
  });

  return (
    <div className="grid gap-4">
      <PageHeading
        eyebrow={type === "bl" || type === "bs" || type === "bc" ? "Bons" : "Documents"}
        title={DOCUMENT_TYPE_COMPACT_LABELS[type]}
        description="Retrouvez, filtrez et ouvrez vos documents."
        actions={
          <Link href={`/${slug}/new`}>
            <Button>Nouveau</Button>
          </Link>
        }
      />

      <Card>
        <form className="grid gap-4 md:grid-cols-5" action="">
          <DatePicker name="from" defaultValue={filters.from} placeholder="Date de début" />
          <DatePicker name="to" defaultValue={filters.to} placeholder="Date de fin" />
          <Select name="branchId" defaultValue={filters.branchId ?? "all"}>
            <SelectTrigger>
              <SelectValue placeholder="Tous les magasins" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les magasins</SelectItem>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={String(branch.id)}>{branch.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select name="partyId" defaultValue={filters.partyId ?? "all"}>
            <SelectTrigger>
              <SelectValue placeholder={type === "bc" ? "Tous les fournisseurs" : "Tous les clients"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{type === "bc" ? "Tous les fournisseurs" : "Tous les clients"}</SelectItem>
              {parties.map((party) => (
                <SelectItem key={party.id} value={String(party.id)}>{party.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Select name="status" defaultValue={filters.status ?? "all"}>
              <SelectTrigger>
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="brouillon">À finaliser</SelectItem>
                <SelectItem value="valide">Prêt à imprimer</SelectItem>
                <SelectItem value="imprime">Terminé</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" variant="secondary">Filtrer</Button>
          </div>
        </form>
      </Card>

      <Card>
        <Table>
          <THead>
            <tr>
              <TH>N°</TH>
              <TH>Date</TH>
              <TH>Magasin</TH>
              <TH>Client / fournisseur</TH>
              <TH>Total TTC</TH>
              <TH>Statut</TH>
              <TH className="text-right">Actions</TH>
            </tr>
          </THead>
          <tbody>
            {documents.length === 0 ? (
              <tr>
                <TD colSpan={6} className="py-8 text-center text-[var(--muted)]">
                  Aucun document pour l&apos;instant.{" "}
                  <Link href={`/${slug}/new`} className="font-semibold text-[var(--accent)] hover:underline">
                    Créer le premier
                  </Link>
                </TD>
              </tr>
            ) : (
              documents.map((document: any) => (
                <tr key={document.id}>
                  <TD className="font-semibold">
                    <Link href={`/${slug}/${document.id}/edit`} className="hover:underline">
                      {document.numero}
                    </Link>
                  </TD>
                  <TD>{formatDate(document.date)}</TD>
                  <TD>{String(document.branch_name ?? document.source_branch_name ?? "—")}</TD>
                  <TD>{String(document.party_name ?? "—")}</TD>
                  <TD>{formatCurrency(document.total_ttc)}</TD>
                  <TD>{DOCUMENT_STATUS_LABELS[document.status as keyof typeof DOCUMENT_STATUS_LABELS]}</TD>
                  <TD className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-[var(--background-alt)]">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild className="cursor-pointer">
                          <Link href={`/${slug}/${document.id}/edit`}>
                            <Eye className="mr-2 h-4 w-4" />
                            {document.status === "brouillon" ? "Modifier" : "Consulter"}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="cursor-pointer">
                          <Link href={`/print/${type === "devis" ? "devis" : type === "facture" ? "factures" : type === "bl" ? "bons-livraison" : type === "bc" ? "bons-commande" : "bons-sortie"}/${document.id}`} target="_blank">
                            <Printer className="mr-2 h-4 w-4" />
                            Imprimer / PDF
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TD>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
