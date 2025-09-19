"use client";

// apps/frontend/src/components/surveys/DynamicSurvey.tsx
// Dynamic survey renderer for JSON definitions stored in Supabase

import { useEffect, useRef, useState, FormEvent } from "react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import {
  Fieldset,
  Checkbox,
  Radio,
  TextArea,
  OtherTextFor,
  otherTextName,
  serializeForm,
  applyAnswersToForm,
  generateClientSessionId,
  type AnswerMap,
  AutoRestoreToggle,
  useAutoRestoreAnswers,
  ProgressBar,
  SubmissionSuccessBanner,
  SurveySubmitBar,
} from "./SurveyKit";

export type SurveyDefinition = {
  id: string;
  title?: string;
  description?: string;
  // A generic structure sufficient for our current surveys
  sections: Array<{
    legend: string;
    description?: string;
    items: Array<
      | { type: "checkbox"; name: string; id: string; label: string; allowOther?: boolean; required?: boolean }
      | { type: "radio"; name: string; id: string; label: string; required?: boolean }
      | { type: "radioGroup"; name: string; options: Array<{ id: string; label: string }>; allowOther?: boolean; required?: boolean }
      | { type: "checkboxGroup"; name: string; options: Array<{ id: string; label: string }>; allowOther?: boolean; maxSelections?: number; minSelections?: number; required?: boolean }
      | { type: "textarea"; name: string; placeholder?: string; required?: boolean; minLength?: number; maxLength?: number }
      | { type: "scale"; name: string; min: number; max: number; labels?: string[]; required?: boolean }
      | { type: "heading"; text: string }
      | { type: "input"; name: string; inputType?: "text" | "email"; placeholder?: string; required?: boolean; pattern?: string }
    >;
  }>;
  // catalog maps field name to question metadata
  catalog: Record<string, { ui_question_id: string; question_text: string; options?: Record<string, string> }>;
};

export function DynamicSurvey({ surveyId, inlineDefinition, autoRestorePlacement = "bottom", showUiQuestionIds = true }: { surveyId: string; inlineDefinition?: SurveyDefinition; autoRestorePlacement?: "top" | "bottom"; showUiQuestionIds?: boolean }) {
  const [definition, setDefinition] = useState<SurveyDefinition | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement | null>(null);
  const clientSessionIdRef = useRef<string>("");
  const autosaveInterval = useRef<number | null>(null);
  const hasChangesRef = useRef<boolean>(false);
  const [progress, setProgress] = useState<{ answered: number; total: number; percent: number }>({ answered: 0, total: 0, percent: 0 });
  // Cache auto-generated UI ids for questions when not provided in the catalog
  const uiIdMapRef = useRef<Record<string, string>>({});

  function getSessionAnswersKey(sessionId: string): string {
    return `survey_${surveyId}_answers_${sessionId}`;
  }

  // Compute total unique questions by ui_question_id using catalog or fallback A1/B2… scheme
  function computeTotalQuestions(def: SurveyDefinition): number {
    const uiSet = new Set<string>();
    def.sections.forEach((section, sIdx) => {
      const letter = String.fromCharCode("A".charCodeAt(0) + sIdx);
      let q = 1;
      (section.items as any[]).forEach((item: any) => {
        if (!item || !item.name) return;
        const provided = def.catalog?.[item.name]?.ui_question_id;
        const ui = provided || `${letter}${q}`;
        uiSet.add(ui);
        q += 1;
      });
    });
    return uiSet.size;
  }

  // Compute progress directly from the live DOM, grouping by ui_question_id so that
  // any tick OR any non-empty other text counts the question as answered exactly once.
  function computeProgressFromFormDom(form: HTMLFormElement): { answered: number; total: number; percent: number } {
    // Build a map from field name -> ui_question_id using definition.catalog or uiIdMapRef
    const nameToUiId: Record<string, string> = {};
    if (definition) {
      definition.sections.forEach((section) => {
        (section.items as any[]).forEach((item: any) => {
          if (!item || !item.name) return;
          const provided = definition.catalog?.[item.name]?.ui_question_id;
          nameToUiId[item.name] = provided || uiIdMapRef.current[item.name] || "";
          // also register the other_text synthetic field under the same ui id
          nameToUiId[otherTextName(item.name)] = nameToUiId[item.name];
        });
      });
    }

    // Collect all input and textarea elements
    const inputs = Array.from(form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input[name], textarea[name]"));
    // Determine the set of unique ui_question_ids present in the form
    const uiIds = new Set<string>();
    inputs.forEach((el) => {
      const nm = el.name;
      const ui = nameToUiId[nm];
      if (ui) uiIds.add(ui);
    });

    const total = uiIds.size;
    if (total === 0) return { answered: 0, total: 0, percent: 0 };

    // For each ui id, check whether any control tied to that id is checked/filled
    let answered = 0;
    uiIds.forEach((ui) => {
      // find all field names that map to this ui id (including __other_text)
      const namesForUi = Object.keys(nameToUiId).filter((n) => nameToUiId[n] === ui);
      let has = false;
      for (const name of namesForUi) {
        const group = Array.from(form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(`[name="${CSS.escape(name)}"]`));
        for (const el of group) {
          const input = el as HTMLInputElement;
          if (input.type === "checkbox" || input.type === "radio") {
            if (input.checked) { has = true; break; }
          } else {
            const val = (el as HTMLInputElement | HTMLTextAreaElement).value || "";
            if (val.trim() !== "") { has = true; break; }
          }
        }
        if (has) break;
      }
      if (has) answered += 1;
    });

    const percent = Math.round((answered / total) * 100);
    return { answered, total, percent };
  }

  // Single helper to recompute progress from current DOM state
  function recomputeProgressFromDom() {
    if (!formRef.current) return;
    setProgress(computeProgressFromFormDom(formRef.current));
  }

  // load definition (prefer inline if provided)
  useEffect(() => {
    if (inlineDefinition) {
      setDefinition(inlineDefinition);
      // Set initial total immediately to avoid 0/0 flash
      try {
        const total = computeTotalQuestions(inlineDefinition);
        setProgress({ answered: 0, total, percent: total > 0 ? 0 : 0 });
      } catch {}
      // Compute initial progress after form mounts (answers could be restored)
      requestAnimationFrame(() => recomputeProgressFromDom());
      return;
    }
    (async () => {
      const res = await fetch(`/api/surveys/definition/${encodeURIComponent(surveyId)}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const def: SurveyDefinition = {
        id: data.id,
        title: data.title,
        description: data.description,
        sections: (data.definition?.sections ?? []) as SurveyDefinition["sections"],
        catalog: (data.definition?.catalog ?? {}) as SurveyDefinition["catalog"],
      };
      setDefinition(def);
      // Set initial total immediately to avoid 0/0 flash
      try {
        const total = computeTotalQuestions(def);
        setProgress({ answered: 0, total, percent: total > 0 ? 0 : 0 });
      } catch {}
      // After definition is set and form is mounted, compute initial progress
      requestAnimationFrame(() => recomputeProgressFromDom());
    })();
  }, [surveyId, inlineDefinition]);

  // Build UI-question-id map once the definition is available
  useEffect(() => {
    if (!definition) return;
    const map: Record<string, string> = {};
    definition.sections.forEach((section, sIdx) => {
      const letter = String.fromCharCode("A".charCodeAt(0) + sIdx);
      let q = 1;
      (section.items as any[]).forEach((item: any) => {
        if (!item || !item.name) return;
        const provided = definition.catalog?.[item.name]?.ui_question_id;
        map[item.name] = provided || `${letter}${q}`;
        q += 1;
      });
    });
    uiIdMapRef.current = map;
  }, [definition]);

  // session id + restore cached
  useEffect(() => {
    const key = `survey_${surveyId}_client_session_id`;
    let id = localStorage.getItem(key) || "";
    if (!id) {
      id = generateClientSessionId();
      localStorage.setItem(key, id);
    }
    clientSessionIdRef.current = id;
    try {
      const cached = sessionStorage.getItem(getSessionAnswersKey(id));
      if (cached && formRef.current) {
        applyAnswersToForm(formRef.current, JSON.parse(cached));
        // Reflect restored session answers in progress immediately
        requestAnimationFrame(() => recomputeProgressFromDom());
      }
    } catch {}
  }, [surveyId]);

  // Unified auto-restore from backend using shared hook
  const { allowRestore, setAllowRestore, restoreStatus, restoreNow } = useAutoRestoreAnswers({
    surveyId,
    formRef,
    clientSessionIdRef,
    storageKey: `${surveyId}_restore_opt_in`,
    onRestored: () => {
      // Recompute once after backend answers are applied
      requestAnimationFrame(() => recomputeProgressFromDom());
    },
  });

  function legendFor(fieldName: string) {
    const meta = definition?.catalog[fieldName];
    const ui = meta?.ui_question_id || uiIdMapRef.current[fieldName];
    const title = meta?.question_text || fieldName;
    if (showUiQuestionIds && ui) return `${ui}. ${title}`;
    return title;
  }

  function sectionLetter(index: number): string {
    return String.fromCharCode("A".charCodeAt(0) + index);
  }

  function normalizedSectionTitle(raw?: string): string | undefined {
    if (!raw) return raw;
    return raw.replace(/^Section\s+[A-Z]:\s*/i, "");
  }

  function buildAnswersText(answers: AnswerMap): Record<string, { ui_question_id: string; question: string; answer: string | string[]; is_other?: boolean; other_text?: string }> {
    const out: Record<string, { ui_question_id: string; question: string; answer: string | string[]; is_other?: boolean; other_text?: string }> = {};
    if (!definition) return out;
    Object.entries(answers).forEach(([fieldName, value]) => {
      if (fieldName.endsWith("__other_text")) return; // handled together with base field
      const meta = definition.catalog[fieldName];
      if (!meta) return;
      const question = meta.question_text;
      const ui = meta.ui_question_id;
      const optionMap = meta.options || {};

      if (Array.isArray(value)) {
        const resolved = value.map((v) => optionMap[v] || v);
        const other = (answers[otherTextName(fieldName)] as string) || undefined;
        out[fieldName] = { ui_question_id: ui, question, answer: resolved, ...(other ? { is_other: true, other_text: other } : {}) };
      } else {
        const resolved = optionMap[value] || value;
        const other = (answers[otherTextName(fieldName)] as string) || undefined;
        out[fieldName] = { ui_question_id: ui, question, answer: resolved, ...(other ? { is_other: true, other_text: other } : {}) };
      }
    });
    // Include orphan other_text if present and no base selection (text-only other)
    Object.keys(answers).forEach((k) => {
      if (!k.endsWith("__other_text")) return;
      const base = k.replace(/__other_text$/, "");
      if (out[base]) return;
      const meta = definition.catalog[base];
      if (!meta) return;
      const text = String(answers[k] || "");
      if (text.trim() === "") return;
      out[base] = { ui_question_id: meta.ui_question_id, question: meta.question_text, answer: text, is_other: true, other_text: text };
    });
    return out;
  }

  async function post(answers: AnswerMap, isAutosave: boolean) {
    const payload = {
      survey_id: surveyId,
      client_session_id: clientSessionIdRef.current,
      answers,
      is_autosave: isAutosave,
      submit: !isAutosave,
      answers_text: buildAnswersText(answers),
    };
    const res = await fetchWithAuth("/api/surveys/responses", { method: "POST", body: JSON.stringify(payload) });
    return res.ok;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const form = e.currentTarget as HTMLFormElement;
      const answers = serializeForm(form);
      const validation = validateAnswers(answers);
      setErrors(validation);
      if (Object.keys(validation).length > 0) {
        setIsSubmitting(false);
        return;
      }
      const ok = await post(answers, false);
      if (ok) {
        setSubmitted(true);
        form.reset();
        try {
          const ssKey = getSessionAnswersKey(clientSessionIdRef.current);
          sessionStorage.removeItem(ssKey);
        } catch {}
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // autosave on input/change and enforce selection constraints
  useEffect(() => {
    function markChanged(ev?: Event) {
      setHasChanges(true);
      hasChangesRef.current = true;
      // Enforce selection rules for checkbox groups
      if (ev && definition && ev.target) {
        const target = ev.target as HTMLInputElement;
        if (target && target.type === "checkbox" && target.name) {
          const itemDef = definition.sections
            .flatMap((s) => s.items)
            .find((it: any) => it.type === "checkboxGroup" && it.name === target.name) as any;
          if (itemDef && typeof itemDef.maxSelections === "number") {
            const nodeList = formRef.current?.querySelectorAll(`input[type="checkbox"][name="${CSS.escape(target.name)}"]`) || [];
            const checkedCount = (formRef.current?.querySelectorAll(`input[type="checkbox"][name="${CSS.escape(target.name)}"]:checked`) || []).length as number;
            if (itemDef.maxSelections === 1) {
              // For single-select checkbox groups: behave like radios. If a new one is checked, uncheck others.
              if (target.checked) {
                nodeList.forEach((node) => {
                  const input = node as HTMLInputElement;
                  if (input !== target) input.checked = false;
                });
              }
            } else if (checkedCount > itemDef.maxSelections) {
              // For multi-select with a cap, prevent exceeding the cap
              target.checked = false;
              return;
            }
          }
        }
      }
      try {
        if (formRef.current) {
          const answers = serializeForm(formRef.current);
          const ssKey = getSessionAnswersKey(clientSessionIdRef.current);
          sessionStorage.setItem(ssKey, JSON.stringify(answers));
          // update progress
          setProgress(computeProgress(answers));
        }
      } catch {}
      // Autosave interval: every 5s if there were changes in the last window
      if (!autosaveInterval.current) {
        autosaveInterval.current = window.setInterval(async () => {
          if (!hasChangesRef.current || !formRef.current) return;
          const answers = serializeForm(formRef.current);
          await post(answers, true);
          setHasChanges(false);
          hasChangesRef.current = false;
        }, 5000) as unknown as number;
      }
    }
    const el = formRef.current;
    if (el) {
      el.addEventListener("input", markChanged);
      el.addEventListener("change", markChanged);
    }
    return () => {
      if (el) {
        el.removeEventListener("input", markChanged);
        el.removeEventListener("change", markChanged);
      }
      if (autosaveInterval.current) {
        window.clearInterval(autosaveInterval.current);
        autosaveInterval.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [definition]);
  function computeProgress(answers: AnswerMap): { answered: number; total: number; percent: number } {
    if (!definition) return { answered: 0, total: 0, percent: 0 };
    // Build name->ui map and ui set
    const nameToUiId: Record<string, string> = {};
    const uiSet = new Set<string>();
    definition.sections.forEach((section) => {
      (section.items as any[]).forEach((item: any) => {
        if (!item || !item.name) return;
        const provided = definition.catalog?.[item.name]?.ui_question_id;
        const ui = provided || uiIdMapRef.current[item.name] || "";
        if (!ui) return;
        nameToUiId[item.name] = ui;
        nameToUiId[otherTextName(item.name)] = ui;
        uiSet.add(ui);
      });
    });

    const total = uiSet.size;
    if (total === 0) return { answered: 0, total: 0, percent: 0 };

    let answered = 0;
    uiSet.forEach((ui) => {
      const namesForUi = Object.keys(nameToUiId).filter((n) => nameToUiId[n] === ui);
      let has = false;
      for (const name of namesForUi) {
        const val = answers[name];
        if (Array.isArray(val)) {
          if (val.length > 0) { has = true; break; }
        } else if (typeof val === "string") {
          if (val.trim() !== "") { has = true; break; }
        }
      }
      if (has) answered += 1;
    });

    const percent = Math.round((answered / total) * 100);
    return { answered, total, percent };
  }

  useEffect(() => {
    // Recompute once after definition changes; other sources (restore, input) call the helper
    if (!definition) return;
    requestAnimationFrame(() => recomputeProgressFromDom());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [definition]);


  // warn on unload if there are unsaved changes and not submitted
  useEffect(() => {
    function beforeUnload(e: BeforeUnloadEvent) {
      if (!submitted && hasChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [hasChanges, submitted]);

  function validateAnswers(answers: AnswerMap): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!definition) return errs;
    for (const section of definition.sections) {
      for (const item of section.items as any[]) {
        if (!("type" in item) || !item.name) continue;
        const val = answers[item.name];
        if (item.type === "checkboxGroup") {
          const arr = Array.isArray(val) ? val : val ? [val] : [];
          if (item.required && arr.length === 0) errs[item.name] = "Please select at least one option.";
          if (item.minSelections && arr.length < item.minSelections) errs[item.name] = `Please select at least ${item.minSelections}.`;
          if (item.maxSelections && arr.length > item.maxSelections) errs[item.name] = `Please select no more than ${item.maxSelections}.`;
        } else if (item.type === "radioGroup" || item.type === "radio" || item.type === "scale" || item.type === "input") {
          if (item.required && (!val || (Array.isArray(val) && val.length === 0))) {
            errs[item.name] = "This field is required.";
          }
        } else if (item.type === "textarea") {
          const s = String(val || "");
          if (item.required && s.trim() === "") errs[item.name] = "This field is required.";
          if (item.minLength && s.length < item.minLength) errs[item.name] = `Please enter at least ${item.minLength} characters.`;
          if (item.maxLength && s.length > item.maxLength) errs[item.name] = `Please enter no more than ${item.maxLength} characters.`;
        }
      }
    }
    return errs;
  }

  if (!definition) return null;

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="mt-6 space-y-8 mx-auto max-w-3xl">
      {autoRestorePlacement === "top" ? (
        <div className="mt-12">
          <AutoRestoreToggle
            enabled={allowRestore}
            storageKey={`${surveyId}_restore_opt_in`}
            status={restoreStatus}
            onChange={(checked) => {
              setAllowRestore(checked);
              if (checked) restoreNow();
            }}
          />
        </div>
      ) : null}

      {submitted ? <SubmissionSuccessBanner subtitle="You may close this page or continue browsing." /> : null}

      {autoRestorePlacement === "top" ? (
        <div className="mx-auto max-w-3xl">
          <ProgressBar percent={progress.percent} label={`Progress (${progress.answered}/${progress.total})`} />
        </div>
      ) : null}
      {definition.sections.map((section, idx) => (
        <section key={idx} className="rounded-3xl border border-slate-200 bg-white p-8 shadow-md">
          <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide">Section {sectionLetter(idx)}</h2>
          {section.legend ? <p className="mt-2 text-xl font-semibold text-slate-800">{normalizedSectionTitle(section.legend)}</p> : null}
          {section.description ? <p className="mt-2 text-sm text-slate-600">{section.description}</p> : null}

          {section.items.map((item, i) => {
            if (item.type === "heading") {
              return (
                <div key={i} className="mt-6">
                  <p className="text-sm font-medium text-slate-700">{item.text}</p>
                </div>
              );
            }

            if (item.type === "textarea") {
              return (
                <Fieldset key={i} legend={legendFor(item.name)} error={errors[item.name]} fieldName={item.name}>
                  <TextArea name={item.name} placeholder={item.placeholder || "Your response"} invalid={!!errors[item.name]} ariaDescribedById={errors[item.name] ? `${item.name}__error` : undefined} />
                </Fieldset>
              );
            }

            if (item.type === "scale") {
              const range = Array.from({ length: item.max - item.min + 1 }, (_, k) => k + item.min);
              const isFivePoint = item.min === 1 && item.max === 5;
              // Determine labels for scale definition line
              let minLabel: string | undefined;
              let maxLabel: string | undefined;
              if (Array.isArray(item.labels) && item.labels.length >= 2) {
                // If labels length matches the number of scale points, take first/last.
                // If only two provided, treat as [minLabel, maxLabel].
                if (item.labels.length === range.length) {
                  minLabel = item.labels[0];
                  maxLabel = item.labels[item.labels.length - 1];
                } else {
                  minLabel = item.labels[0];
                  maxLabel = item.labels[item.labels.length - 1];
                }
              } else if (isFivePoint) {
                // Default definition for 1–5 scales if not specified
                minLabel = "Not important";
                maxLabel = "Essential";
              }
              // Show the definition line only for the first item in a consecutive
              // run of 1–5 scale questions to reduce repetition.
              const prev = (section.items as any[])[i - 1] as any | undefined;
              const prevIsSameFivePointScale = Boolean(prev && prev.type === "scale" && prev.min === 1 && prev.max === 5);
              const showDefinition = Boolean(minLabel && maxLabel && !(isFivePoint && prevIsSameFivePointScale));
              return (
                <Fieldset key={i} legend={legendFor(item.name)} error={errors[item.name]} fieldName={item.name}>
                  {showDefinition ? (
                    <p className="text-xs text-slate-500">{`${item.min} = ${minLabel}, ${item.max} = ${maxLabel}`}</p>
                  ) : null}
                  <div className="mt-3 grid grid-cols-5 gap-3">
                    {range.map((n) => (
                      <label key={n} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        <input type="radio" name={item.name} value={String(n)} aria-invalid={errors[item.name] ? true : undefined} aria-describedby={errors[item.name] ? `${item.name}__error` : undefined} className={`h-4 w-4 text-indigo-600 focus:ring-indigo-600 ${errors[item.name] ? "ring-1 ring-red-400" : ""}`} />
                        {n}
                      </label>
                    ))}
                  </div>
                </Fieldset>
              );
            }

            if (item.type === "radioGroup") {
              return (
                <Fieldset key={i} legend={legendFor(item.name)} error={errors[item.name]} fieldName={item.name}>
                  {item.options.map((opt) => (
                    <Radio key={opt.id} id={opt.id} name={item.name} label={opt.label} invalid={!!errors[item.name]} ariaDescribedById={errors[item.name] ? `${item.name}__error` : undefined} />
                  ))}
                  {item.allowOther ? <OtherTextFor baseName={item.name} placeholder="Please specify" /> : null}
                </Fieldset>
              );
            }

            if (item.type === "checkboxGroup") {
              const isSingleSelect = item.maxSelections === 1;
              return (
                <Fieldset key={i} legend={legendFor(item.name)} error={errors[item.name]} fieldName={item.name}>
                  {item.options.map((opt) => (
                    isSingleSelect ? (
                      <Radio key={opt.id} id={opt.id} name={item.name} label={opt.label} invalid={!!errors[item.name]} ariaDescribedById={errors[item.name] ? `${item.name}__error` : undefined} />
                    ) : (
                      <Checkbox key={opt.id} id={opt.id} name={item.name} label={opt.label} invalid={!!errors[item.name]} ariaDescribedById={errors[item.name] ? `${item.name}__error` : undefined} />
                    )
                  ))}
                  {item.allowOther ? <OtherTextFor baseName={item.name} placeholder="Please specify" /> : null}
                </Fieldset>
              );
            }

            if (item.type === "radio") {
              return (
                <Fieldset key={i} legend={legendFor(item.name)} error={errors[item.name]} fieldName={item.name}>
                  <Radio id={item.id} name={item.name} label={item.label} invalid={!!errors[item.name]} ariaDescribedById={errors[item.name] ? `${item.name}__error` : undefined} />
                </Fieldset>
              );
            }

            if (item.type === "checkbox") {
              return (
                <Fieldset key={i} legend={legendFor(item.name)} error={errors[item.name]} fieldName={item.name}>
                  <Checkbox id={item.id} name={item.name} label={item.label} invalid={!!errors[item.name]} ariaDescribedById={errors[item.name] ? `${item.name}__error` : undefined} />
                </Fieldset>
              );
            }

            if (item.type === "input") {
              return (
                <Fieldset key={i} legend={legendFor(item.name)} error={errors[item.name]} fieldName={item.name}>
                  <input
                    name={item.name}
                    type={item.inputType || "text"}
                    placeholder={item.placeholder || ""}
                    aria-invalid={errors[item.name] ? true : undefined}
                    aria-describedby={errors[item.name] ? `${item.name}__error` : undefined}
                    className={`rounded-xl bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 ${errors[item.name] ? "border-red-400" : "border-slate-300"}`}
                  />
                </Fieldset>
              );
            }

            return null;
          })}
        </section>
      ))}

      {autoRestorePlacement === "bottom" ? (
        <AutoRestoreToggle
          enabled={allowRestore}
          storageKey={`${surveyId}_restore_opt_in`}
          status={restoreStatus}
          onChange={(checked) => {
            setAllowRestore(checked);
            if (checked) restoreNow();
          }}
        />
      ) : null}

      {autoRestorePlacement === "bottom" ? (
        <div className="mx-auto max-w-3xl">
          <ProgressBar percent={progress.percent} label={`Progress (${progress.answered}/${progress.total})`} />
        </div>
      ) : null}

      <SurveySubmitBar
        isSubmitting={isSubmitting}
        submitted={submitted}
        leftTextWhenNotSubmitted="This survey is conducted by ANQA Digital Health."
        thankYouText="Thank you, your survey has been submitted!"
      />
    </form>
  );
}



//{/* original text for button (longer):   This survey is conducted by ANQA Digital Health for research and development purposes. All responses will be kept confidential and are used only for product development.  */}



