import { deleteEmployeeAction } from "@/app/actions";
import { EmployeeForm } from "@/components/forms/employee-form";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { getEmployeeById } from "@/lib/data";
import { requireFeature } from "@/lib/features";

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireFeature("personnel");
  const { id } = await params;
  const employee = getEmployeeById(Number(id));

  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <form action={deleteEmployeeAction}>
          <input type="hidden" name="id" value={id} />
          <ConfirmSubmitButton
            type="submit"
            variant="danger"
            message={`Supprimer le dossier de ${employee?.prenom ?? ""} ${employee?.nom ?? ""} ? Cette action est définitive.`.trim()}
          >
            Supprimer le dossier
          </ConfirmSubmitButton>
        </form>
      </div>
      <EmployeeForm employee={employee} />
    </div>
  );
}
