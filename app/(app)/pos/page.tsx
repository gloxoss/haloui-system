import { requireAuth } from "@/lib/auth";
import { getActiveCompanyId } from "@/lib/company";
import { getCompany, listBranches, listEntities } from "@/lib/data";
import { getDb } from "@/lib/db";
import { getSessionActive } from "@/lib/pos";
import { PosTerminal, type PosProductItem } from "@/components/pos/pos-terminal";

export const dynamic = "force-dynamic";

export default async function PosPage() {
  const session = await requireAuth();
  const companyId = await getActiveCompanyId();
  const company = getCompany(companyId);
  const db = getDb();

  const branches = listBranches({ activeOnly: true, companyId });
  const defaultBranchId = (session.user as any).branch_id || branches[0]?.id || 1;

  // Récupérer la session de caisse active
  const activeSession = getSessionActive(companyId, defaultBranchId);

  // Clients avec infos fidélité & tarification
  const clients = db
    .prepare(`
      SELECT id, name, COALESCE(fidelite_points, 0) as fidelite_points,
             COALESCE(fidelite_palier, 'Bronze') as fidelite_palier,
             COALESCE(categorie_tarifaire, 'particulier') as categorie_tarifaire
      FROM clients
      ORDER BY name ASC
    `)
    .all() as Array<{
      id: number;
      name: string;
      fidelite_points: number;
      fidelite_palier: string;
      categorie_tarifaire: string;
    }>;

  // Commerciaux pour attribution des ventes
  const commerciaux = db
    .prepare(`
      SELECT id, full_name as name, COALESCE(code_commercial, '') as code
      FROM users
      WHERE is_commercial = 1 OR role IN ('admin', 'user')
      ORDER BY is_commercial DESC, full_name ASC
    `)
    .all() as Array<{ id: number; name: string; code: string }>;

  // Produits avec stock dans le dépôt de la branche
  const products = db
    .prepare(`
      SELECT
        p.id,
        p.ref,
        p.designation,
        COALESCE(p.code_barre, '') AS code_barre,
        p.prix_ht,
        ROUND(p.prix_ht * (1 + p.tva_rate / 100), 2) AS prix_ttc,
        p.tva_rate,
        COALESCE(p.unite, 'u') AS unite,
        COALESCE(p.categorie, 'Général') AS categorie,
        COALESCE(p.nature_produit, 'simple') AS nature_produit,
        COALESCE(p.image_url, '') AS image_url,
        COALESCE(sd.quantite, 0) AS stock_actuel
      FROM produits p
      LEFT JOIN stock_depots sd ON sd.produit_id = p.id AND sd.branch_id = ?
      WHERE p.company_id = ? AND p.active = 1
      ORDER BY p.designation ASC
    `)
    .all(defaultBranchId, companyId) as PosProductItem[];

  return (
    <PosTerminal
      initialSession={activeSession}
      branches={branches}
      products={products}
      clients={clients}
      commerciaux={commerciaux}
      companyName={company?.name || "HALOUI"}
      currentUserId={session.user.id}
      currentUserName={session.user.name || session.user.username}
    />
  );
}
