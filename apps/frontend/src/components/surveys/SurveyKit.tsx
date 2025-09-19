"use client";

// apps/frontend/src/components/surveys/SurveyKit.tsx
// Reusable survey UI primitives and browser-side helpers

import type React from "react";
import { useCallback, useEffect, useState, type RefObject } from "react";
import { createContext, useContext } from "react";

export type AnswerValue = string | string[];
export type AnswerMap = Record<string, AnswerValue>;

// UI settings to control display across survey components
const SurveyUiSettingsContext = createContext<{ showUiQuestionIds: boolean }>({ showUiQuestionIds: true });
export function SurveyUiSettingsProvider({ children, showUiQuestionIds = true }: { children: React.ReactNode; showUiQuestionIds?: boolean }) {
  return <SurveyUiSettingsContext.Provider value={{ showUiQuestionIds }}>{children}</SurveyUiSettingsContext.Provider>;
}

export function Fieldset({
  legend,
  description,
  children,
  error,
  fieldName,
}: {
  legend: string;
  description?: string;
  children: React.ReactNode;
  error?: string;
  fieldName?: string;
}) {
  const { showUiQuestionIds } = useContext(SurveyUiSettingsContext);
  const errorId = fieldName ? `${fieldName}__error` : undefined;
  // Optionally strip a leading UI question id like "A1. " from the legend
  const displayLegend = !showUiQuestionIds ? legend.replace(/^[A-Z]\d+\.\s+/, "") : legend;
  return (
    <fieldset className={`mt-6 ${error ? "border-l-2 border-red-400 pl-4" : ""}`}
      aria-describedby={error ? errorId : undefined}
    >
      <legend className="text-sm font-semibold text-slate-750">{displayLegend}</legend>
      {description ? <p className="mt-2 text-sm text-slate-500">{description}</p> : null}
      <div className="mt-4 space-y-3">{children}</div>
      {error ? (
        <p id={errorId} className="mt-2 text-xs text-red-600">{error}</p>
      ) : null}
    </fieldset>
  );
}

export function Checkbox({ id, label, name, invalid, ariaDescribedById }: { id: string; label: string; name: string; invalid?: boolean; ariaDescribedById?: string }) {
  return (
    <label htmlFor={id} className="group flex items-start gap-3">
      <input
        id={id}
        name={name}
        type="checkbox"
        value={id}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={ariaDescribedById}
        className={`mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 ${invalid ? "ring-1 ring-red-400" : ""}`}
      />
      <span className="text-sm text-slate-700 group-hover:text-slate-900">{label}</span>
    </label>
  );
}

export function Radio({ id, label, name, invalid, ariaDescribedById }: { id: string; label: string; name: string; invalid?: boolean; ariaDescribedById?: string }) {
  return (
    <label htmlFor={id} className="group flex items-start gap-3">
      <input
        id={id}
        name={name}
        type="radio"
        value={id}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={ariaDescribedById}
        className={`mt-1 h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-600 ${invalid ? "ring-1 ring-red-400" : ""}`}
      />
      <span className="text-sm text-slate-700 group-hover:text-slate-900">{label}</span>
    </label>
  );
}

export function OtherText({ name, placeholder }: { name: string; placeholder: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-slate-700">Other:</span>
      <input
        name={name}
        type="text"
        placeholder={placeholder}
        className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
      />
    </div>
  );
}

export function TextArea({ name, placeholder, invalid, ariaDescribedById }: { name: string; placeholder: string; invalid?: boolean; ariaDescribedById?: string }) {
  return (
    <textarea
      name={name}
      placeholder={placeholder}
      rows={4}
      aria-invalid={invalid ? true : undefined}
      aria-describedby={ariaDescribedById}
      className={`w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 ${invalid ? "border-red-400" : "border-slate-300"}`}
    />
  );
}

// Helpers for robust "Other" text handling
export function otherTextName(baseName: string): string {
  return `${baseName}__other_text`;
}

export function OtherTextFor({ baseName, placeholder }: { baseName: string; placeholder: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-slate-700">Other:</span>
      <input
        name={otherTextName(baseName)}
        type="text"
        placeholder={placeholder}
        className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
      />
    </div>
  );
}

export function generateClientSessionId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export function serializeForm(form: HTMLFormElement): AnswerMap {
  const data = new FormData(form);
  const out: AnswerMap = {};
  for (const [key, value] of data.entries()) {
    const strVal = String(value);
    if (strVal.trim() === "") continue;
    // Do not mix other_text fields into their base name selections
    if (key.endsWith("__other_text")) {
      out[key] = strVal;
      continue;
    }
    if (out[key] !== undefined) {
      const prev = out[key];
      out[key] = Array.isArray(prev) ? [...prev, strVal] : [prev as string, strVal];
    } else {
      out[key] = strVal;
    }
  }
  return out;
}

export function applyAnswersToForm(form: HTMLFormElement, answers: AnswerMap): void {
  Object.entries(answers).forEach(([name, value]) => {
    const elements = form.elements.namedItem(name);
    if (!elements) return;
    if (Array.isArray(value)) {
      const nodeList = form.querySelectorAll(`[name="${CSS.escape(name)}"]`);
      nodeList.forEach((node) => {
        const input = node as HTMLInputElement;
        if (input.type === "checkbox" || input.type === "radio") {
          input.checked = value.includes(input.value);
        }
      });
    } else {
      const nodeList = form.querySelectorAll(`[name="${CSS.escape(name)}"]`);
      nodeList.forEach((node) => {
        const el = node as HTMLInputElement | HTMLTextAreaElement;
        if ((el as HTMLInputElement).type === "checkbox" || (el as HTMLInputElement).type === "radio") {
          const input = el as HTMLInputElement;
          input.checked = input.value === value;
        } else {
          (el as HTMLInputElement | HTMLTextAreaElement).value = value;
        }
      });
    }
  });
}

export function SurveyIntroCard({ estimated, incentive }: { estimated?: string; incentive?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/60 p-4 text-sm text-slate-600">
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        {estimated ? (
          <p>
            <span className="font-medium text-slate-800">Estimated time:</span> {estimated}
          </p>
        ) : null}
        {incentive ? (
          <p>
            <span className="font-medium text-slate-800">Incentive:</span> {incentive}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function AutoRestoreToggle({
  enabled,
  onChange,
  status,
  storageKey,
}: {
  enabled: boolean;
  onChange: (next: boolean) => void;
  status?: "idle" | "restoring" | "restored" | "error";
  storageKey: string;
}) {
  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-white/60 p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-slate-900">Auto-restore answers</span>
          <span className="text-xs text-slate-500">Enable to automatically restore half-finished surveys on this device.</span>
        </div>
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={enabled}
            onChange={(e) => {
              const next = e.currentTarget.checked;
              try {
                localStorage.setItem(storageKey, next ? "1" : "0");
              } catch {}
              onChange(next);
            }}
          />
          <div className="peer h-6 w-11 rounded-full bg-slate-300 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-indigo-600 peer-checked:after:translate-x-5"></div>
        </label>
      </div>
      {enabled && (
        <div className="mt-2 text-xs text-slate-500">
          {status === "restoring" && <span>Restoring saved answers…</span>}
          {status === "restored" && <span>Answers restored.</span>}
          {status === "error" && <span>Could not restore answers.</span>}
        </div>
      )}
    </div>
  );
}

export type RestoreStatus = "idle" | "restoring" | "restored" | "error";

export function useAutoRestoreAnswers({
  surveyId,
  formRef,
  clientSessionIdRef,
  storageKey,
  onRestored,
}: {
  surveyId: string;
  formRef: RefObject<HTMLFormElement | null>;
  clientSessionIdRef: RefObject<string>;
  storageKey: string;
  onRestored?: () => void;
}) {
  const [allowRestore, setAllowRestore] = useState<boolean>(false);
  const [restoreStatus, setRestoreStatus] = useState<RestoreStatus>("idle");

  async function getSessionIdWithRetry(maxRetries = 20, delayMs = 50): Promise<string | null> {
    const key = `survey_${surveyId}_client_session_id`;
    for (let i = 0; i <= maxRetries; i++) {
      const current = clientSessionIdRef.current;
      if (current) return current;
      try {
        const fromStorage = localStorage.getItem(key);
        if (fromStorage) return fromStorage;
      } catch {}
      if (i === maxRetries) break;
      await new Promise((r) => setTimeout(r, delayMs));
    }
    return null;
  }

  const restoreNow = useCallback(async () => {
    const sessionId = await getSessionIdWithRetry();
    if (!sessionId) {
      setRestoreStatus("idle");
      return;
    }
    try {
      setRestoreStatus("restoring");
      const res = await fetch(`/api/surveys/responses?survey_id=${encodeURIComponent(surveyId)}&client_session_id=${encodeURIComponent(sessionId)}`, { cache: "no-store" });
      const data = await res.json();
      if (data && (data.submitted || data.finalized || data.submitted_at)) {
        // Session already submitted; signal caller to rotate the session id by clearing stored id
        try {
          const key = `survey_${surveyId}_client_session_id`;
          localStorage.removeItem(key);
        } catch {}
        setRestoreStatus("idle");
        return;
      }
      const answers = (data && data.answers) || {};
      // Apply immediately if the form is ready, otherwise retry briefly until ref is set
      const tryApply = (remaining: number) => {
        const el = formRef.current;
        if (el && answers && typeof answers === "object") {
          applyAnswersToForm(el, answers as AnswerMap);
          setRestoreStatus("restored");
          try { onRestored && onRestored(); } catch {}
          return;
        }
        if (remaining > 0) {
          // Retry shortly to allow ref assignment after initial mount
          setTimeout(() => tryApply(remaining - 1), 50);
        } else {
          setRestoreStatus("idle");
        }
      };
      tryApply(20);
    } catch {
      setRestoreStatus("error");
    }
  }, [surveyId, formRef, clientSessionIdRef]);

  useEffect(() => {
    try {
      const opted = localStorage.getItem(storageKey) === "1";
      if (opted) {
        setAllowRestore(true);
        void restoreNow();
      }
    } catch {}
  }, [storageKey, restoreNow]);

  return { allowRestore, setAllowRestore, restoreStatus, restoreNow } as const;
}

export function ProgressBar({ percent, label }: { percent: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
        <span>{label || "Progress"}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-200">
        <div className="h-2 rounded-full bg-indigo-600 transition-[width]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function InfoCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl border border-slate-200 bg-white p-8 shadow-md ${className || ""}`}>
      <p className="text-sm font-medium uppercase tracking-wide text-slate-600">{title}</p>
      <div className="mt-3 text-sm leading-relaxed text-slate-700">{children}</div>
    </div>
  );
}


export function SubmissionSuccessBanner({ subtitle }: { subtitle?: string }) {
  return (
    <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-white">✓</span>
        <div>
          <p className="font-medium">Thank you, your survey has been submitted!</p>
          {subtitle ? <p className="mt-1 text-green-700/90">{subtitle}</p> : null}
        </div>
      </div>
    </div>
  );
}

export function SurveySubmitBar({
  isSubmitting,
  submitted,
  leftTextWhenNotSubmitted = "This survey is conducted by ANQA Digital Health for research and development purposes. All responses will be kept confidential and are used only for product development.",
  thankYouText = "Thank you, your survey has been submitted!",
}: {
  isSubmitting: boolean;
  submitted: boolean;
  leftTextWhenNotSubmitted?: string;
  thankYouText?: string;
}) {
  return (
    <div className="sticky bottom-6 z-10 mx-auto max-w-3xl">
      <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">{submitted ? thankYouText : leftTextWhenNotSubmitted}</p>
          <button
            type="submit"
            disabled={isSubmitting || submitted}
            className="ml-6 inline-flex items-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitted ? "Submitted" : isSubmitting ? "Submitting…" : "Submit responses"}
          </button>
        </div>
      </div>
    </div>
  );
}

