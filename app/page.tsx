import { redirect } from "next/navigation";

import { getAuthSession } from "@/lib/auth";

export default async function HomePage() {
  const session = await getAuthSession();
  redirect(session?.user ? "/dashboard" : "/login");
}
