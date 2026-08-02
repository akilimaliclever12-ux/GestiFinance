export interface SchoolLetterhead {
  name: string;
  official_name: string | null;
  header_top: string | null;
  sub_header: string | null;
  motto: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  bp: string | null;
  logo_url: string | null;
}

/** En-tête officiel d'une école, pour coiffer un rapport imprimable. */
export function Letterhead({ school }: { school: SchoolLetterhead }) {
  const contact = [
    school.address,
    school.bp ? `B.P. ${school.bp}` : null,
    school.phone ? `Tél : ${school.phone}` : null,
    school.email,
  ]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <div className="border-b-2 border-neutral-800 pb-3 text-center text-neutral-900">
      {school.header_top && (
        <p className="text-[11px] font-semibold uppercase tracking-wide">{school.header_top}</p>
      )}
      {school.sub_header && <p className="text-[11px]">{school.sub_header}</p>}

      <div className="mt-1 flex items-center justify-center gap-3">
        {school.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={school.logo_url} alt="" className="h-14 w-14 object-contain" />
        )}
        <div>
          <p className="text-lg font-bold uppercase">{school.official_name || school.name}</p>
          {contact && <p className="text-[11px] text-neutral-600">{contact}</p>}
        </div>
      </div>

      {school.motto && <p className="mt-1 text-[11px] italic text-neutral-600">« {school.motto} »</p>}
    </div>
  );
}
