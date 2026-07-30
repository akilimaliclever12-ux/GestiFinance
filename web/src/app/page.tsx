import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { HOME_BY_ROLE } from "@/lib/types";

export default async function Home() {
  const session = await getSessionProfile();
  if (!session?.profile) redirect("/login");
  redirect(HOME_BY_ROLE[session.profile.role]);
}
