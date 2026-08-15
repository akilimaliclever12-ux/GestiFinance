"use client";

import { useActionState, useState } from "react";
import { updateSchoolLetterhead } from "@/lib/schools-actions";
import { useToastOnSuccess } from "@/components/Toast";
import { Letterhead, type SchoolLetterhead } from "@/components/Letterhead";

const inputCls =
  "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand dark:border-neutral-700 dark:bg-neutral-800";

type Fields = SchoolLetterhead & { id: string };

export function LetterheadForm({ school }: { school: Fields }) {
  const [state, action, pending] = useActionState(updateSchoolLetterhead, null);
  useToastOnSuccess(state);
  const [f, setF] = useState<Fields>(school);
  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((prev) => ({ ...prev, [k]: e.target.value }));

  return (
    <div className="space-y-4">
      {/* Aperçu en direct */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <p className="mb-3 text-xs font-medium text-neutral-500">Aperçu de l&apos;en-tête</p>
        <Letterhead school={f} />
      </div>

      <form
        action={action}
        className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
      >
        <input type="hidden" name="id" value={school.id} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nom (interne) *">
            <input name="name" value={f.name} onChange={set("name")} className={inputCls} required />
          </Field>
          <Field label="Nom officiel (sur les documents)">
            <input name="official_name" value={f.official_name ?? ""} onChange={set("official_name")} className={inputCls} placeholder="Ex. Complexe Scolaire ECOBU" />
          </Field>
          <Field label="Ligne du haut">
            <input name="header_top" value={f.header_top ?? ""} onChange={set("header_top")} className={inputCls} placeholder="Ex. RÉPUBLIQUE DÉMOCRATIQUE DU CONGO" />
          </Field>
          <Field label="Sous-titre">
            <input name="sub_header" value={f.sub_header ?? ""} onChange={set("sub_header")} className={inputCls} placeholder="Ex. Ministère de l'EPST" />
          </Field>
          <Field label="Adresse">
            <input name="address" value={f.address ?? ""} onChange={set("address")} className={inputCls} />
          </Field>
          <Field label="Boîte postale">
            <input name="bp" value={f.bp ?? ""} onChange={set("bp")} className={inputCls} placeholder="Ex. 1234 Bujumbura" />
          </Field>
          <Field label="Téléphone">
            <input name="phone" value={f.phone ?? ""} onChange={set("phone")} className={inputCls} />
          </Field>
          <Field label="Email">
            <input name="email" value={f.email ?? ""} onChange={set("email")} className={inputCls} />
          </Field>
          <Field label="Devise (motto)">
            <input name="motto" value={f.motto ?? ""} onChange={set("motto")} className={inputCls} placeholder="Ex. Discipline — Travail — Réussite" />
          </Field>
          <Field label="URL du logo">
            <input name="logo_url" value={f.logo_url ?? ""} onChange={set("logo_url")} className={inputCls} placeholder="https://…/logo.png" />
          </Field>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
          >
            {pending ? "Enregistrement…" : "Enregistrer l'en-tête"}
          </button>
          {state?.error && <span className="text-sm text-red-600">{state.error}</span>}
          {state?.success && <span className="text-sm text-emerald-600">{state.success}</span>}
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-neutral-500">{label}</span>
      {children}
    </label>
  );
}
