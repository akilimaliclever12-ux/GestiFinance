"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { computeFees, type FeeInput } from "@/lib/solvency";
import { Logo } from "@/components/Logo";
import { LangSwitch } from "@/components/LangSwitch";
import { FeeCard } from "@/components/FeeCard";
import { useI18n } from "@/i18n/client";
import type { CurrencyCode } from "@/lib/types";

// Espace parent : page publique, sans compte. Le parent saisit le code remis
// par l'école (ou ouvre le lien /parent?code=…). Les codes sont mémorisés sur
// l'appareil (localStorage) pour suivre plusieurs enfants.

type Statement = {
  student: {
    first_name: string;
    last_name: string;
    matricule: string;
    class_name: string | null;
    section: string | null;
  };
  school: { name: string; logo_url: string | null };
  fees: {
    fee_type_id: string;
    name: string;
    currency: CurrencyCode;
    schedules: { amount: number; due_date: string | null }[];
    paid: number;
  }[];
};
type Entry = { status: "ok"; data: Statement } | { status: "invalid" } | { status: "error" };

// ---- Codes mémorisés sur l'appareil (source externe → useSyncExternalStore)
const KEY = "gf-parent-codes";
const EVENT = "gf-parent-codes";
const readRaw = () => {
  try {
    return localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
};
const subscribe = (cb: () => void) => {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
};
function writeCodes(codes: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(codes));
  } catch {
    /* stockage indisponible (navigation privée) : liste non mémorisée */
  }
  window.dispatchEvent(new Event(EVENT));
}
const parseCodes = (raw: string): string[] => {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
};

/** « 7k2qf m9xrb » → « 7K2QF-M9XRB » ; null si ce n'est pas un code à 10 caractères. */
function normalizeCode(input: string): string | null {
  const c = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return c.length === 10 ? `${c.slice(0, 5)}-${c.slice(5)}` : null;
}

async function fetchStatement(code: string): Promise<Entry> {
  const { data, error } = await createClient().rpc("parent_statement", { p_code: code });
  if (error) return { status: "error" };
  return data ? { status: "ok", data: data as Statement } : { status: "invalid" };
}

export default function ParentPage() {
  const { t } = useI18n();
  const tp = t.parent.page;
  const raw = useSyncExternalStore(subscribe, readRaw, () => "[]");
  const codes = useMemo(() => parseCodes(raw), [raw]);
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [input, setInput] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  // Lien reçu (/parent?code=…) : on mémorise le code puis on le retire de l'adresse.
  useEffect(() => {
    const url = new URL(window.location.href);
    const c = normalizeCode(url.searchParams.get("code") ?? "");
    if (url.searchParams.has("code")) {
      url.searchParams.delete("code");
      window.history.replaceState(null, "", url.pathname + url.search);
    }
    if (c) {
      const list = parseCodes(readRaw());
      if (!list.includes(c)) writeCodes([c, ...list]);
    }
  }, []);

  // Chargement de la situation de chaque enfant
  useEffect(() => {
    let alive = true;
    for (const c of codes) {
      fetchStatement(c).then((e) => {
        if (alive) setEntries((prev) => ({ ...prev, [c]: e }));
      });
    }
    return () => {
      alive = false;
    };
  }, [codes]);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const c = normalizeCode(input);
    if (!c) return setFormError(tp.invalid);
    if (codes.includes(c)) return setInput("");
    setChecking(true);
    const res = await fetchStatement(c);
    setChecking(false);
    if (res.status === "invalid") return setFormError(tp.invalid);
    if (res.status === "error") return setFormError(tp.network);
    setEntries((prev) => ({ ...prev, [c]: res }));
    writeCodes([c, ...codes]);
    setInput("");
  }

  function remove(c: string) {
    if (!confirm(tp.removeConfirm)) return;
    writeCodes(codes.filter((x) => x !== c));
  }

  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/90">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <Logo size={36} />
            <div className="leading-tight">
              <p className="font-display text-sm font-bold">
                <span className="text-brand">Gesti</span>Finance
              </p>
              <p className="text-xs text-neutral-500">{tp.title}</p>
            </div>
          </div>
          <LangSwitch tone="light" />
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        {/* Ajout d'un code */}
        <form
          onSubmit={onAdd}
          className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
        >
          <h1 className="text-lg font-semibold">{codes.length ? tp.addChild : tp.title}</h1>
          <p className="mt-1 text-sm text-neutral-500">{tp.intro}</p>
          <label className="mt-4 block text-sm font-medium" htmlFor="code">
            {tp.codeLabel}
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="code"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={tp.codePh}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 font-mono text-base uppercase tracking-widest outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 dark:border-neutral-700 dark:bg-neutral-800"
            />
            <button
              disabled={checking || !input.trim()}
              className="shrink-0 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {checking ? tp.checking : tp.open}
            </button>
          </div>
          {formError && (
            <p role="alert" className="mt-2 text-sm text-red-600">
              {formError}
            </p>
          )}
          <p className="mt-3 text-xs text-neutral-400">{tp.privacy}</p>
        </form>

        {/* Enfants suivis */}
        {codes.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">{tp.myChildren}</h2>
            {codes.map((c) => (
              <ChildCard key={c} entry={entries[c]} onRemove={() => remove(c)} />
            ))}
          </section>
        )}

        <div className="space-y-1 text-center text-xs text-neutral-500">
          <p>{tp.help}</p>
          <Link href="/login" className="text-brand hover:underline">
            {tp.staffLogin}
          </Link>
        </div>
      </div>
    </main>
  );
}

function ChildCard({ entry, onRemove }: { entry: Entry | undefined; onRemove: () => void }) {
  const { t } = useI18n();
  const tp = t.parent.page;
  const fees = useMemo(
    () => (entry?.status === "ok" ? computeFees(entry.data.fees as FeeInput[]) : []),
    [entry],
  );

  const removeBtn = (
    <button type="button" onClick={onRemove} className="text-xs text-neutral-500 hover:text-red-600 hover:underline">
      {tp.remove}
    </button>
  );
  const shell = "rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900";

  if (!entry) return <div className={`${shell} text-sm text-neutral-500`}>{t.common.loading}</div>;
  if (entry.status !== "ok") {
    return (
      <div className={`${shell} flex flex-wrap items-center justify-between gap-2`}>
        <p className="text-sm text-red-600">{entry.status === "invalid" ? tp.revoked : tp.network}</p>
        {removeBtn}
      </div>
    );
  }

  const { student: s, school } = entry.data;
  const inOrder = fees.every((f) => f.is_in_order);

  return (
    <article className={`${shell} space-y-4`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {school.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={school.logo_url} alt="" className="h-10 w-10 rounded object-contain" />
          )}
          <div>
            <p className="text-lg font-semibold leading-tight">
              {s.last_name} {s.first_name}
            </p>
            <p className="text-sm text-neutral-500">
              <span className="font-mono">{s.matricule}</span> · {s.class_name ?? tp.noClass}
              {s.section && ` · ${s.section}`}
            </p>
            <p className="text-xs text-neutral-400">{school.name}</p>
          </div>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-semibold ${
            inOrder
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
              : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"
          }`}
        >
          {inOrder ? tp.inOrder : tp.notInOrder}
        </span>
      </div>

      {fees.length === 0 ? (
        <p className="text-sm text-neutral-500">{tp.noFees}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {fees.map((f) => (
            <FeeCard key={f.fee_type_id} fee={f} />
          ))}
        </div>
      )}

      <div className="text-right">{removeBtn}</div>
    </article>
  );
}
