// apps/frontend/src/app/page.tsx
import Link from "next/link";
import { MonitorSmartphone, Braces, FileChartColumn } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ANQA | ADHD Screening (MVP)",
  description: "Frontend shell with link to backend health endpoint.",
};

export default function Page() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white text-slate-800">
      {/* Hero Section */}
      <div className="relative mx-auto max-w-5xl px-6 pt-24 pb-16 text-center">
        <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-tight">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-sky-500">
            ANQA
          </span>{" "}
          ADHD Screening
        </h1>
        <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto">
          A minimal frontend & backend check.
        </p>
      </div>

      {/* Status Cards */}
      <div className="mx-auto max-w-5xl px-6 grid gap-8 md:grid-cols-3">
        <section className="group rounded-3xl border border-slate-200 bg-white p-8 shadow-md hover:shadow-xl transition-shadow duration-300">
          <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide">
            Frontend
          </h2>
          <Link href="/screening" className="mt-4 mb-2 flex items-center gap-3 group">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-r from-indigo-600 to-sky-500 shadow-md ring-1 ring-black/5 flex items-center justify-center transition-transform duration-200 ease-out group-hover:scale-105 group-hover:shadow-md">
              <MonitorSmartphone className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-semibold text-slate-800 m-0">Up &amp; Running</span>
          </Link>
          <p className="mt-3 text-base text-slate-600">
            Check out our screening prototype.
          </p>
          <Link
            href="/screening"
            className="mt-5 inline-flex items-center rounded-full border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Open /screening →
          </Link>
        </section>

        <section className="group rounded-3xl border border-slate-200 bg-white p-8 shadow-md hover:shadow-xl transition-shadow duration-300">
          <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide">
            Backend
          </h2>
          <Link href="/api/health" className="mt-4 mb-2 flex items-center gap-3 group">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-r from-indigo-600 to-sky-500 shadow-md ring-1 ring-black/5 flex items-center justify-center transition-transform duration-200 ease-out group-hover:scale-105 group-hover:shadow-md">
              <Braces className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-semibold text-slate-800 m-0">Health Endpoint</span>
          </Link>
          <Link
            href="/api/health"
            className="mt-6 inline-flex items-center rounded-full border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Open /api/health →
          </Link>
          <p className="mt-4 text-sm text-slate-500">
            If this returns <code>{"{ status: 'ok' }"}</code>, the API is
            reachable.
          </p>
        </section>

        <section className="group rounded-3xl border border-slate-200 bg-white p-8 shadow-md hover:shadow-xl transition-shadow duration-300">
          <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide">
            Surveys
          </h2>
          <Link href="/surveys" className="mt-4 mb-2 flex items-center gap-3 group">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-r from-indigo-600 to-sky-500 shadow-md ring-1 ring-black/5 flex items-center justify-center transition-transform duration-200 ease-out group-hover:scale-105 group-hover:shadow-md">
              <FileChartColumn className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-semibold text-slate-800 m-0">Start a Survey</span>
          </Link>
          <p className="mt-3 text-base text-slate-600">
            Browse available surveys.
          </p>
          <Link
            href="/surveys"
            className="mt-6 inline-flex items-center rounded-full border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Open surveys →
          </Link>
        </section>
      </div>

      {/* Footer */}
      <footer className="mt-20 pb-10 text-center text-xs text-slate-400">
        <p>Deployed via GitHub Actions → GHCR → Docker → Traefik → LetsEncrypt</p>
      </footer>
    </main>
  );
}
