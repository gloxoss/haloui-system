import { EmployeeForm } from "@/components/forms/employee-form";
import { requireFeature } from "@/lib/features";

export default async function NewEmployeePage() {
  await requireFeature("personnel");
  return <EmployeeForm />;
}
