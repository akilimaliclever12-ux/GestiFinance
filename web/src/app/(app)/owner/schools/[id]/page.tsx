import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LetterheadForm } from "./LetterheadForm";

export default async function SchoolSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: school } = await supabase
    .from("schools")
    .select(
      "id, name, official_name, header_top, sub_header, motto, address, phone, email, bp, logo_url",
    )
    .eq("id", id)
    .single();

  if (!school) notFound();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">En-tête — {school.name}</h1>
          <p className="text-sm text-neutral-500">
            Ces informations coiffent les rapports imprimés de cette école.
          </p>
        </div>
        <Link href="/owner/schools" className="text-sm text-brand hover:underline">
          ← Écoles
        </Link>
      </div>

      <LetterheadForm school={school} />
    </div>
  );
}
