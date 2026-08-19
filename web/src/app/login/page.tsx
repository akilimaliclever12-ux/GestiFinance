"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login } from "./actions";
import { Logo } from "@/components/Logo";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, null);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-neutral-50 p-4 dark:bg-neutral-950">
      {/* Halo de marque discret */}
      <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-brand/15 blur-3xl dark:bg-brand/10" />

      <div className="relative w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 shadow-lg shadow-neutral-200/60 dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-black/40">
        <div className="mb-7 flex flex-col items-center text-center">
          <Logo size={76} />
          <h1 className="mt-3 text-2xl font-bold tracking-tight">
            <span className="text-brand">Gesti</span>
            <span className="text-neutral-900 dark:text-neutral-100">Finance</span>
          </h1>
          <p className="mt-1 text-sm text-neutral-500">Gestion des finances scolaires</p>
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30 dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >
              Mot de passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30 dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>

          {state?.error && (
            <p
              className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400"
              role="alert"
            >
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-60"
          >
            {pending ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-neutral-500">
          Pas encore d&apos;espace ?{" "}
          <Link href="/signup" className="font-medium text-brand hover:underline">
            Créer un espace
          </Link>
        </p>
      </div>

      <p className="absolute inset-x-0 bottom-4 text-center text-xs text-neutral-400">
        GestiFinance · Offline-First · CDF · USD · BIF
      </p>
    </main>
  );
}
