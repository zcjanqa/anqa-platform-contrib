"use client";

export default function TermsPage() {
  return (
    <div className="w-full min-h-[70vh] bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-black p-6">
      <div className="max-w-[900px] mx-auto flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight dark:text-slate-100">Demo Screening Terms & Conditions</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">This page contains placeholder content for the Terms & Conditions related to the demo screening experience.</p>
        </div>

        <div className="rounded-2xl border bg-white/80 backdrop-blur p-6 ring-1 ring-black/[0.04] shadow-sm dark:bg-slate-900/70 dark:border-slate-700 dark:ring-white/5">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Placeholder Terms</h2>
          <div className="mt-3 space-y-3 text-sm text-slate-700 dark:text-slate-300">
            <p>
              By participating in the demo screening, you acknowledge and agree that this is a prototype experience provided for evaluation and demonstration purposes only. No medical diagnosis or treatment recommendations are made.
            </p>
            <p>
              We may collect limited information you provide (e.g., name and email) for the purposes of enabling the demo experience. Any media or analytics generated during the demo are handled according to our privacy approach for prototypes and may be deleted after evaluation.
            </p>
            <p>
              Please do not share sensitive personal health information in free-text fields. Use of this demo is voluntary and at your discretion.
            </p>
            <p>
              Full terms and privacy details will be published here. This placeholder will be replaced with finalized legal text.
            </p>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={() => {
              try { window.close(); } catch {}
            }}
            className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-black dark:bg-white dark:text-slate-900 shadow-sm ring-1 ring-black/5 dark:ring-white/20 transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-900 dark:focus-visible:ring-white"
          >
            Back to screening
          </button>
        </div>
      </div>
    </div>
  );
}


