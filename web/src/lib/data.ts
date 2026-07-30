import { createClient } from "@/lib/supabase/server";

export interface SchoolRef {
  id: string;
  name: string;
}

/** Écoles accessibles à l'utilisateur courant (filtrées par RLS). */
export async function getMySchools(): Promise<SchoolRef[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("schools")
    .select("id, name")
    .is("deleted_at", null)
    .order("name");
  return (data ?? []) as SchoolRef[];
}
