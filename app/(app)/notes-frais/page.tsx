import { getActiveCompanyId } from "@/lib/company";
import { listEmployees } from "@/lib/data";
import { requireFeature } from "@/lib/features";
import { getNotesFrais, getNotesFraisStats } from "@/lib/notes-frais";
import { NotesFraisManager } from "@/components/notes-frais/notes-frais-manager";
import { type EmployeeRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NotesFraisPage() {
  await requireFeature("notes_frais");
  const companyId = await getActiveCompanyId();

  const notes = getNotesFrais(companyId);
  const stats = getNotesFraisStats(companyId);
  const employes = ((listEmployees() as EmployeeRecord[]) || []).map((e) => ({
    id: e.id,
    nom: e.nom,
    prenom: e.prenom,
    numero_employe: String(e.numero_employe || e.numero),
  }));

  return (
    <div className="py-2">
      <NotesFraisManager
        initialNotes={notes}
        employes={employes}
        stats={stats}
      />
    </div>
  );
}
