"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LOGO_TYPES, removeSchoolLogo, uploadSchoolLogo, type LogoError } from "@/lib/logo-upload";
import { useToast } from "@/components/Toast";
import { useI18n } from "@/i18n/client";

/** Logo d'une école existante : envoi et retrait enregistrés immédiatement. */
export function LogoField({
  schoolId,
  url,
  onChange,
}: {
  schoolId: string;
  url: string | null;
  /** Appelé après un envoi / retrait réussi (ex. aperçu de l'en-tête). */
  onChange?: (url: string | null) => void;
}) {
  const { t } = useI18n();
  const tl = t.owner.letterhead;
  const toast = useToast();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [current, setCurrent] = useState(url);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const message = (e: LogoError) => (e === "badType" ? tl.logoBadType : e === "tooBig" ? tl.logoTooBig : tl.logoError);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permet de renvoyer le même fichier
    if (!file) return;
    setBusy(true);
    setErr(null);
    const r = await uploadSchoolLogo(schoolId, file);
    setBusy(false);
    if ("error" in r) return setErr(message(r.error));
    setCurrent(r.url);
    onChange?.(r.url);
    toast.show(tl.logoSaved);
    router.refresh();
  }

  async function onRemove() {
    setBusy(true);
    setErr(null);
    const r = await removeSchoolLogo(schoolId);
    setBusy(false);
    if (r.error) return setErr(message(r.error));
    setCurrent(null);
    onChange?.(null);
    toast.show(tl.logoRemoved);
    router.refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-white">
          {current ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current} alt="" className="h-full w-full object-contain" />
          ) : (
            <span className="text-[10px] text-neutral-400">{t.common.none}</span>
          )}
        </span>
        <input ref={input} type="file" accept={LOGO_TYPES.join(",")} onChange={onFile} className="hidden" />
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          className="rounded-lg border border-brand px-3 py-1.5 text-sm font-medium text-brand hover:bg-brand-light disabled:opacity-50"
        >
          {busy ? tl.uploading : current ? tl.change : tl.choose}
        </button>
        {current && !busy && (
          <button type="button" onClick={onRemove} className="text-xs text-red-600 hover:underline">
            {tl.remove}
          </button>
        )}
      </div>
      {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
      <p className="mt-1 text-[11px] text-neutral-400">{tl.logoHint}</p>
    </div>
  );
}
