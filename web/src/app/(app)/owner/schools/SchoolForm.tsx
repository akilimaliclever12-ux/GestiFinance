"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSchool } from "@/lib/schools-actions";
import { LOGO_MAX_BYTES, LOGO_TYPES, uploadSchoolLogo } from "@/lib/logo-upload";
import { useToast } from "@/components/Toast";
import { useI18n } from "@/i18n/client";

const inputCls =
  "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand dark:border-neutral-700 dark:bg-neutral-800";

export function SchoolForm() {
  const { t } = useI18n();
  const tf = t.owner.schools.form;
  const tl = t.owner.letterhead;
  const toast = useToast();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok?: string; err?: string; logoErr?: string }>({});
  // Logo facultatif : envoyé juste après la création (il faut l'identifiant de l'école)
  const [logo, setLogo] = useState<File | null>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setMsg((m) => ({ ...m, logoErr: undefined }));
    const bad = file && !LOGO_TYPES.includes(file.type) ? tl.logoBadType : file && file.size > LOGO_MAX_BYTES ? tl.logoTooBig : null;
    if (bad) {
      e.target.value = "";
      setLogo(null);
      return setMsg((m) => ({ ...m, logoErr: bad }));
    }
    setLogo(file);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      setMsg({});
      const r = await createSchool(null, fd);
      if (!r || r.error) return setMsg({ err: r?.error });
      let logoErr: string | undefined;
      if (logo && r.schoolId) {
        const up = await uploadSchoolLogo(r.schoolId, logo);
        if ("error" in up) logoErr = tl.logoError;
      }
      formRef.current?.reset();
      setLogo(null);
      setMsg({ ok: r.success, logoErr });
      if (r.success) toast.show(r.success);
      router.refresh();
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <h2 className="mb-3 text-sm font-semibold">{tf.title}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="name" className={inputCls} placeholder={tf.namePlaceholder} required />
        <input name="address" className={inputCls} placeholder={tf.addressPlaceholder} />
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs text-neutral-500">{tf.logoLabel}</span>
          <input
            type="file"
            accept={LOGO_TYPES.join(",")}
            onChange={onFile}
            className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-light file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand hover:file:bg-brand/15"
          />
          <span className="mt-1 block text-[11px] text-neutral-400">{tl.logoHint}</span>
        </label>
      </div>
      {msg.logoErr && <p className="mt-1 text-xs text-red-600">{msg.logoErr}</p>}
      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
        >
          {pending ? tf.adding : tf.submit}
        </button>
        {msg.err && <span className="text-sm text-red-600">{msg.err}</span>}
        {msg.ok && <span className="text-sm text-emerald-600">{msg.ok}</span>}
      </div>
      <p className="mt-2 text-xs text-neutral-400">{tf.hint}</p>
    </form>
  );
}
