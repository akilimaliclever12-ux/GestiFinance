"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUpOwner } from "@/lib/signup-actions";
import { Logo } from "@/components/Logo";
import { CURRENCIES } from "@/lib/types";
import { LangSwitch } from "@/components/LangSwitch";
import { useI18n } from "@/i18n/client";

const inputCls =
  "w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30 dark:border-neutral-700 dark:bg-neutral-800";
const labelCls = "mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300";

export default function SignupPage() {
  const [state, action, pending] = useActionState(signUpOwner, null);
  const { t } = useI18n();
  const s = t.auth.signup;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-neutral-50 p-4 dark:bg-neutral-950">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-brand/15 blur-3xl dark:bg-brand/10" />

      <div className="relative w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 shadow-lg shadow-neutral-200/60 dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-black/40">
        <div className="absolute right-4 top-4">
          <LangSwitch tone="light" />
        </div>

        <div className="mb-6 flex flex-col items-center text-center">
          <Logo size={64} />
          <h1 className="mt-3 text-2xl font-bold tracking-tight">{s.title}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {s.subtitle}
          </p>
        </div>

        <form action={action} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="full_name" className={labelCls}>{s.fullName}</label>
              <input id="full_name" name="full_name" required className={inputCls} autoComplete="name" />
            </div>
            <div>
              <label htmlFor="org" className={labelCls}>{s.org}</label>
              <input id="org" name="org" required className={inputCls} placeholder={s.orgPlaceholder} />
            </div>
          </div>

          <div>
            <label htmlFor="email" className={labelCls}>{s.email}</label>
            <input id="email" name="email" type="email" required className={inputCls} autoComplete="email" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="password" className={labelCls}>{s.password}</label>
              <input id="password" name="password" type="password" required minLength={6} className={inputCls} autoComplete="new-password" />
            </div>
            <div>
              <label htmlFor="currency" className={labelCls}>{s.currency}</label>
              <select id="currency" name="currency" defaultValue="CDF" className={inputCls}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {state?.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400" role="alert">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-60"
          >
            {pending ? s.submitting : s.submit}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-neutral-500">
          {s.haveSpace}{" "}
          <Link href="/login" className="font-medium text-brand hover:underline">
            {s.login}
          </Link>
        </p>
      </div>
    </main>
  );
}
