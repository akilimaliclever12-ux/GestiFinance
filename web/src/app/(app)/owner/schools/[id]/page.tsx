import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LetterheadForm } from "./LetterheadForm";
import { getI18n } from "@/i18n/server";

export default async function SchoolSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { t } = await getI18n();
  const tl = t.owner.letterhead;
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
          <h1 className="text-lg font-semibold">{tl.title(school.name)}</h1>
          <p className="text-sm text-neutral-500">{tl.subtitle}</p>
        </div>
        <Link href="/owner/schools" className="text-sm text-brand hover:underline">
          {tl.backToSchools}
        </Link>
      </div>

      <LetterheadForm school={school} />
    </div>
  );
}
