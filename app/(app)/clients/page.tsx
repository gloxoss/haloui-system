import { EntityManager } from "@/components/entity-manager";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  return (
    <EntityManager
      type="clients"
      title="Clients"
      description="Ajoutez les clients de vos documents."
      search={params.q ?? ""}
    />
  );
}
