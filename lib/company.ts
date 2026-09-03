import { cookies } from "next/headers";
import { getCompany, listCompanies } from "@/lib/data";
import { type CompanyRecord } from "@/lib/types";

export const ACTIVE_COMPANY_COOKIE = "active_company_id";

export async function getActiveCompanyId(): Promise<number> {
  const cookieStore = await cookies();
  const idStr = cookieStore.get(ACTIVE_COMPANY_COOKIE)?.value;
  const id = idStr ? Number(idStr) : 1;
  return id > 0 ? id : 1;
}

export async function getActiveCompany(): Promise<CompanyRecord> {
  const activeId = await getActiveCompanyId();
  return getCompany(activeId);
}

export function getAllCompanies(): CompanyRecord[] {
  return listCompanies();
}
