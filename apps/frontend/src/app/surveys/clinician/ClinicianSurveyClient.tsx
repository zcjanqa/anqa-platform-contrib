"use client";

// apps/frontend/src/app/surveys/clinician/ClinicianSurveyClient.tsx
// Client component for the clinician survey form

import { useState, useEffect, useRef, FormEvent } from "react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { Footer } from "../../page_blueprint";
import {
  Fieldset,
  Checkbox,
  Radio,
  OtherTextFor,
  TextArea,
  generateClientSessionId,
  serializeForm,
  applyAnswersToForm,
  SurveyIntroCard,
  AutoRestoreToggle,
  ProgressBar,
  useAutoRestoreAnswers,
  otherTextName,
} from "@/components/surveys/SurveyKit";

export default function ClinicianSurveyClient() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const clientSessionIdRef = useRef<string>("");
  const formRef = useRef<HTMLFormElement | null>(null);
  const autosaveInterval = useRef<number | null>(null);
  const hasChangesRef = useRef<boolean>(false);
  const [hasChanges, setHasChanges] = useState(false);
  // Auto-restore state is managed by shared hook
  const [allowRestore, setAllowRestore] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState<"idle" | "restoring" | "restored" | "error">("idle");
  const [progress, setProgress] = useState<{ answered: number; total: number; percent: number }>({ answered: 0, total: 0, percent: 0 });

  const SURVEY_ID = "clinician:v1" as const;

  function getSessionAnswersKey(sessionId: string): string {
    return `clinician_survey_answers_${sessionId}`;
  }

  // Hook: auto-restore from backend and rotate session if backend indicates a finalized submission
  const { allowRestore: hookAllowRestore, setAllowRestore: hookSetAllowRestore, restoreStatus: hookRestoreStatus, restoreNow } = useAutoRestoreAnswers({
    surveyId: SURVEY_ID,
    formRef,
    clientSessionIdRef,
    storageKey: "clinician_restore_opt_in",
    onRestored: () => {
      // Recompute progress once after answers are applied
      requestAnimationFrame(() => setProgress(computeProgressCurrent()));
    },
  });
  useEffect(() => {
    setAllowRestore(hookAllowRestore);
    setRestoreStatus(hookRestoreStatus);
  }, [hookAllowRestore, hookRestoreStatus]);

  function computeProgressCurrent(): { answered: number; total: number; percent: number } {
    const form = formRef.current;
    if (!form) return { answered: 0, total: 0, percent: 0 };

    // Build name -> ui_question_id map using the local catalog
    const catalog = buildQuestionCatalog();
    const nameToUi: Record<string, string> = {};
    Object.keys(catalog).forEach((name) => {
      const ui = (catalog as any)[name]?.ui_question_id as string | undefined;
      if (ui) {
        nameToUi[name] = ui;
        nameToUi[otherTextName(name)] = ui;
      }
    });

    // Collect all relevant UI ids present in the form
    const inputs = Array.from(form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input[name], textarea[name]"));
    const uiIds = new Set<string>();
    inputs.forEach((el) => {
      const nm = el.name;
      const ui = nameToUi[nm];
      if (ui) uiIds.add(ui);
    });

    const total = uiIds.size;
    if (total === 0) return { answered: 0, total: 0, percent: 0 };

    let answered = 0;
    uiIds.forEach((ui) => {
      const namesForUi = Object.keys(nameToUi).filter((n) => nameToUi[n] === ui);
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

  // Survey version and question catalog mapping
  const SURVEY_VERSION = "v1" as const;
  function buildQuestionCatalog(): Record<string, { ui_question_id: string; question_text: string }> {
    const base: Record<string, { ui_question_id: string; question_text: string }> = {
      // Section A
      role: { ui_question_id: "A1", question_text: "Primary professional role" },
      experience: { ui_question_id: "A2", question_text: "Years of clinical experience" },
      practice_setting: { ui_question_id: "A3", question_text: "Practice setting" },
      geo: { ui_question_id: "A4", question_text: "Geographic location" },
      population: { ui_question_id: "A5", question_text: "Patient population (select all that apply)" },
      patients_per_month: { ui_question_id: "A6", question_text: "Approximate number of ADHD patients you see per month" },

      // Section B
      tools: { ui_question_id: "B1", question_text: "Diagnostic tools used (select all that apply)" },
      eval_time: { ui_question_id: "B2", question_text: "Average time spent on complete ADHD diagnostic evaluation" },
      appointments: { ui_question_id: "B3", question_text: "Appointments typically required for ADHD diagnosis" },
      wait_time: { ui_question_id: "B4", question_text: "Current wait time for new ADHD evaluations" },
      bottlenecks: { ui_question_id: "B5", question_text: "Most significant bottlenecks (select up to 3)" },

      // Section C
      doc_time: { ui_question_id: "C1", question_text: "Time spent on documentation per ADHD evaluation" },
      doc_burden: { ui_question_id: "C2", question_text: "Burden of current diagnostic documentation" },
      report_components: { ui_question_id: "C3", question_text: "Components of an ideal ADHD diagnostic report (select all that apply)" },
      report_format: { ui_question_id: "C4", question_text: "Preferred format for AI-generated diagnostic reports" },

      // Section D
      ehr: { ui_question_id: "D1", question_text: "Current Electronic Health Record (EHR) system" },
      ehr_importance: { ui_question_id: "D2", question_text: "Importance of EHR integration for new diagnostic tools" },
      ai_experience: { ui_question_id: "D3", question_text: "Experience with AI/machine learning tools in clinical practice" },
      ai_access: { ui_question_id: "D4", question_text: "Preferred method for accessing AI diagnostic tools" },

      // Section E
      ai_interest: { ui_question_id: "E1", question_text: "Interest level in AI-powered ADHD diagnostic support tools" },
      ai_fpr: { ui_question_id: "E2", question_text: "Acceptable false positive rate for AI ADHD screening tool" },
      ai_fnr: { ui_question_id: "E3", question_text: "Acceptable false negative rate for AI ADHD screening tool" },
      ai_capabilities: { ui_question_id: "E4", question_text: "Most valuable AI capabilities for ADHD diagnosis (select top 3)" },
      ai_concerns: { ui_question_id: "E5", question_text: "Primary concerns about AI-assisted ADHD diagnosis (select all that apply)" },

      // Section F
      ai_data_comfort: { ui_question_id: "F2", question_text: "Comfort level with patients providing video/audio data for AI analysis" },
      ai_populations: { ui_question_id: "F3", question_text: "Patient populations where AI screening might be most beneficial (select all that apply)" },

      // Section G
      ai_present: { ui_question_id: "G1", question_text: "Preferred presentation of AI diagnostic suggestions" },
      ai_transparency: { ui_question_id: "G2", question_text: "Importance of AI transparency/explainability" },
      ai_involvement: { ui_question_id: "G3", question_text: "Preferred level of AI involvement in diagnosis" },
      ai_use: { ui_question_id: "G4", question_text: "Would you use an AI tool that identifies patients who may benefit from ADHD evaluation?" },

      // Section H
      training: { ui_question_id: "H1", question_text: "Training requirements for adopting AI diagnostic tools" },
      facilitators: { ui_question_id: "H2", question_text: "Factors that would facilitate adoption (select all that apply)" },
      barriers: { ui_question_id: "H3", question_text: "Barriers to implementing AI diagnostic tools (select all that apply)" },

      // Section I
      reimbursement: { ui_question_id: "I1", question_text: "Current reimbursement rate for ADHD evaluation (EUR)" },
      willingness_to_pay: { ui_question_id: "I2", question_text: "Willingness to pay for an AI ADHD diagnostic tool" },
      monthly_cost: { ui_question_id: "I3", question_text: "Reasonable monthly cost for AI diagnostic platform (EUR)" },

      // Section J
      outcomes: { ui_question_id: "J1", question_text: "Most important outcome measures for AI diagnostic tools (select top 3)" },
      success_eval: { ui_question_id: "J2", question_text: "How would you evaluate the success of an AI ADHD diagnostic tool?" },
      wanted_features: { ui_question_id: "J3", question_text: "Specific features you would want in an AI ADHD platform?" },

      // Section K
      collaboration: { ui_question_id: "K1", question_text: "Interest in research collaboration with AI diagnostic platform developers" },
      validation_study: { ui_question_id: "K2", question_text: "Willingness to participate in clinical validation studies" },
      beta_interest: { ui_question_id: "K3", question_text: "Interest in early access/beta testing of AI platform" },

      // Section L
      final_thoughts: { ui_question_id: "L1", question_text: "Additional thoughts on AI in ADHD diagnosis?" },
      adoption_factors: { ui_question_id: "L2", question_text: "What would make you most likely to adopt an AI ADHD diagnostic tool?" },
      contact_email: { ui_question_id: "L3", question_text: "Contact information (Email)" },
      preferred_comm: { ui_question_id: "L3", question_text: "Preferred communication" },
    };

    // Section F1 dynamic modalities (multiple radio groups under the same prompt)
    const modalityLabels = [
      "Voice/speech pattern analysis",
      "Eye-tracking and gaze patterns",
      "Facial expression analysis",
      "Motor movement patterns",
      "Cognitive performance testing",
      "Conversational pattern analysis",
    ];
    modalityLabels.forEach((label, idx) => {
      base[`modality_${idx}`] = {
        ui_question_id: "F1",
        question_text: `Value of the following AI assessment modalities (1-5): ${label}`,
      };
    });

    return base;
  }

  function computeTotalQuestions(): number {
    const catalog = buildQuestionCatalog();
    const uiSet = new Set<string>();
    Object.values(catalog).forEach((meta) => {
      if (meta && meta.ui_question_id) uiSet.add(meta.ui_question_id);
    });
    return uiSet.size;
  }

  // Initialize/persist client session id and restore from sessionStorage (backend restore is handled by hook)
  useEffect(() => {
    // Set initial total to avoid 0/0 flash on first render
    try {
      const total = computeTotalQuestions();
      setProgress({ answered: 0, total, percent: total > 0 ? 0 : 0 });
    } catch {}
    const key = `survey_${SURVEY_ID}_client_session_id`;
    let id = localStorage.getItem(key) || "";
    if (!id) {
      id = generateClientSessionId();
      localStorage.setItem(key, id);
    }
    clientSessionIdRef.current = id;
    try {
      const ssKey = getSessionAnswersKey(id);
      const cached = sessionStorage.getItem(ssKey);
      if (cached && formRef.current) {
        const parsed = JSON.parse(cached) as Record<string, string | string[]>;
        applyAnswersToForm(formRef.current, parsed);
      }
    } catch {}
    if (formRef.current) setProgress(computeProgressCurrent());
  }, []);

  // Build answers_text for legacy form using labels from DOM
  function buildAnswersTextFromDom(answers: Record<string, string | string[]>): Record<string, { ui_question_id: string; question: string; answer: string | string[]; is_other?: boolean; other_text?: string }> {
    const out: Record<string, { ui_question_id: string; question: string; answer: string | string[]; is_other?: boolean; other_text?: string }> = {};
    const catalog = buildQuestionCatalog();
    const form = formRef.current;
    if (!form) return out;
    Object.entries(answers).forEach(([name, value]) => {
      if (name.endsWith("__other_text")) return; // handle together with base field
      const meta = (catalog as any)[name];
      if (!meta) return;
      const question = meta.question_text;
      const ui = meta.ui_question_id;
      const resolve = (val: string) => {
        const input = form.querySelector(`input[name="${CSS.escape(name)}"][value="${CSS.escape(val)}"]`);
        if (input) {
          const labelEl = input.closest("label");
          const text = labelEl?.textContent?.trim();
          if (text) return text;
        }
        return val;
      };
      if (Array.isArray(value)) {
        const resolved = value.map((v) => resolve(v));
        const other = (answers as any)[otherTextName(name)] as string | undefined;
        out[name] = { ui_question_id: ui, question, answer: resolved, ...(other && other.trim() !== "" ? { is_other: true, other_text: other } : {}) };
      } else {
        const resolved = resolve(value);
        const other = (answers as any)[otherTextName(name)] as string | undefined;
        out[name] = { ui_question_id: ui, question, answer: resolved, ...(other && other.trim() !== "" ? { is_other: true, other_text: other } : {}) };
      }
    });
    // Include orphan other_text entries if present without a base selection
    Object.keys(answers).forEach((k) => {
      if (!k.endsWith("__other_text")) return;
      const base = k.replace(/__other_text$/, "");
      if (out[base]) return;
      const meta = (catalog as any)[base];
      if (!meta) return;
      const text = String((answers as any)[k] || "");
      if (text.trim() === "") return;
      out[base] = { ui_question_id: meta.ui_question_id, question: meta.question_text, answer: text, is_other: true, other_text: text };
    });
    return out;
  }

  async function postSurvey(answers: Record<string, unknown>, isAutosave: boolean): Promise<boolean> {
    try {
      const res = await fetchWithAuth("/api/surveys/responses", {
        method: "POST",
        body: JSON.stringify({
          survey_id: SURVEY_ID,
          client_session_id: clientSessionIdRef.current,
          answers,
          is_autosave: isAutosave,
          answers_text: buildAnswersTextFromDom(answers as Record<string, string | string[]>),
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        if (!isAutosave) console.error("Survey save failed", res.status, text);
        return false;
      }
      return true;
    } catch (e) {
      if (!isAutosave) console.error("Survey save error", e);
      return false;
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const form = event.currentTarget as HTMLFormElement;
      const payload = serializeForm(form);
      const ok = await postSurvey(payload, false);
      if (ok) {
        setSubmitted(true);
        form.reset();
        setProgress(computeProgressCurrent());
        // Clear sessionStorage cache on successful submit
        try {
          const ssKey = getSessionAnswersKey(clientSessionIdRef.current);
          sessionStorage.removeItem(ssKey);
        } catch {}
        // Rotate session id so subsequent submissions do not overwrite the previous one
        try {
          const key = `survey_${SURVEY_ID}_client_session_id`;
          const newId = generateClientSessionId();
          localStorage.setItem(key, newId);
          clientSessionIdRef.current = newId;
        } catch {}
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // Autosave mechanism: only active after user interactions; posts every 5s if there are unsaved changes
  useEffect(() => {
    function markChanged() {
      setHasChanges(true);
      hasChangesRef.current = true;
      // Persist to sessionStorage for current browser session
      try {
        if (formRef.current) {
          const answers = serializeForm(formRef.current);
          const ssKey = getSessionAnswersKey(clientSessionIdRef.current);
          sessionStorage.setItem(ssKey, JSON.stringify(answers));
          setProgress(computeProgressCurrent());
        }
      } catch {}
      if (!autosaveInterval.current) {
        autosaveInterval.current = window.setInterval(async () => {
          if (!hasChangesRef.current || !formRef.current) return;
          const answers = serializeForm(formRef.current);
          await postSurvey(answers, true);
          setHasChanges(false);
          hasChangesRef.current = false;
        }, 5000) as unknown as number;
      }
    }

    const formEl = formRef.current;
    if (formEl) {
      formEl.addEventListener("input", markChanged);
      formEl.addEventListener("change", markChanged);
    }
    return () => {
      if (formEl) {
        formEl.removeEventListener("input", markChanged);
        formEl.removeEventListener("change", markChanged);
      }
      if (autosaveInterval.current) {
        window.clearInterval(autosaveInterval.current);
        autosaveInterval.current = null;
      }
    };
    // hasChanges intentionally omitted from deps to avoid recreating interval frequently
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save on unload using sendBeacon
  useEffect(() => {
    function onBeforeUnload() {
      if (!formRef.current) return;
      const answers = serializeForm(formRef.current);
      // Persist to sessionStorage on unload
      try {
        const ssKey = getSessionAnswersKey(clientSessionIdRef.current);
        sessionStorage.setItem(ssKey, JSON.stringify(answers));
      } catch {}
      const payload = JSON.stringify({ survey_id: SURVEY_ID, client_session_id: clientSessionIdRef.current, answers, is_autosave: true, answers_text: {} });
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/surveys/responses", blob);
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  return (
    <>
      <div className="mx-auto max-w-3xl">
        {submitted ? (
          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-white">✓</span>
              <div>
                <p className="font-medium">Thank you, your survey has been submitted!</p>
                <p className="mt-1 text-green-700/90">You may close this page or continue browsing.</p>
              </div>
            </div>
          </div>
        ) : null}
        <SurveyIntroCard estimated="10–15 minutes" incentive="Summary of findings and early demo access" />


        <form ref={formRef} onSubmit={handleSubmit} className="mt-6 space-y-8">
          {/* Introduction */}
          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-md">
            <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide">Introduction</h2>
            <p className="mt-4 text-sm leading-6 text-slate-700">
              We are developing an AI-powered platform to support ADHD diagnosis and would value your professional insights. This research will inform the development of clinician-assistive software designed to enhance, not replace, clinical decision-making.
            </p>
          </section>


          {/* Opt-in auto-restore toggle (standalone, below Introduction) */}
          <div className="mt-12">
            <AutoRestoreToggle
              enabled={allowRestore}
              storageKey="clinician_restore_opt_in"
              status={restoreStatus}
              onChange={(checked) => {
                setAllowRestore(checked);
                if (checked) restoreNow();
              }}
            />
          </div>

          <div className="mx-auto max-w-3xl">
            <ProgressBar percent={progress.percent} label={`Progress (${progress.answered}/${progress.total})`} />
          </div>

          {/* Section A */}
          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-md">
            <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide">Section A</h2>
            <p className="mt-2 text-xl font-semibold text-slate-800">Professional Background</p>

            <Fieldset legend="A1. Primary professional role">
              <Checkbox id="role_psychiatrist" name="role" label="Psychiatrist" />
              <Checkbox id="role_psychologist" name="role" label="Psychologist" />
              <Checkbox id="role_pediatrician" name="role" label="Pediatrician" />
              <Checkbox id="role_gp" name="role" label="General Practitioner/Family Physician" />
              <Checkbox id="role_np" name="role" label="Psychiatric Nurse Practitioner" />
              <Checkbox id="role_social" name="role" label="Clinical Social Worker" />
              <Checkbox id="role_neuro" name="role" label="Neurologist" />
              <OtherTextFor baseName="role" placeholder="Please specify" />
            </Fieldset>

            <Fieldset legend="A2. Years of clinical experience">
              <Radio id="exp_lt2" name="experience" label="Less than 2 years" />
              <Radio id="exp_2_5" name="experience" label="2-5 years" />
              <Radio id="exp_6_10" name="experience" label="6-10 years" />
              <Radio id="exp_11_20" name="experience" label="11-20 years" />
              <Radio id="exp_gt20" name="experience" label="More than 20 years" />
            </Fieldset>

            <Fieldset legend="A3. Practice setting">
              <Checkbox id="ps_private" name="practice_setting" label="Private practice" />
              <Checkbox id="ps_hospital" name="practice_setting" label="Hospital/Medical center" />
              <Checkbox id="ps_cmhc" name="practice_setting" label="Community mental health center" />
              <Checkbox id="ps_university" name="practice_setting" label="University/Academic medical center" />
              <Checkbox id="ps_school" name="practice_setting" label="School-based clinic" />
              <Checkbox id="ps_telehealth" name="practice_setting" label="Telehealth platform" />
              <OtherTextFor baseName="practice_setting" placeholder="Please specify" />
            </Fieldset>

            <Fieldset legend="A4. Geographic location">
              <Checkbox id="geo_at" name="geo" label="Austria" />
              <Checkbox id="geo_de" name="geo" label="Germany" />
              <Checkbox id="geo_ch" name="geo" label="Switzerland" />
              <OtherTextFor baseName="geo" placeholder="Other EU country" />
              <OtherTextFor baseName="geo" placeholder="Other" />
            </Fieldset>

            <Fieldset legend="A5. Patient population (select all that apply)">
              <Checkbox id="pop_children" name="population" label="Children (under 12)" />
              <Checkbox id="pop_adolescents" name="population" label="Adolescents (12-17)" />
              <Checkbox id="pop_adults" name="population" label="Adults (18-64)" />
              <Checkbox id="pop_older" name="population" label="Older adults (65+)" />
            </Fieldset>

            <Fieldset legend="A6. Approximate number of ADHD patients you see per month">
              <Radio id="pm_0_5" name="patients_per_month" label="0-5" />
              <Radio id="pm_6_15" name="patients_per_month" label="6-15" />
              <Radio id="pm_16_30" name="patients_per_month" label="16-30" />
              <Radio id="pm_31_50" name="patients_per_month" label="31-50" />
              <Radio id="pm_gt50" name="patients_per_month" label="More than 50" />
            </Fieldset>
          </section>

          {/* Section B */}
          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-md">
            <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide">Section B</h2>
            <p className="mt-2 text-xl font-semibold text-slate-800">Current ADHD Diagnostic Workflow</p>

            <Fieldset legend="B1. Diagnostic tools used (select all that apply)">
              <Checkbox id="tool_interview" name="tools" label="Clinical interview (DSM-5/ICD-11 criteria)" />
              <Checkbox id="tool_conners" name="tools" label="Conners Rating Scales" />
              <Checkbox id="tool_asrs" name="tools" label="Adult ADHD Self-Report Scale (ASRS)" />
              <Checkbox id="tool_wurs" name="tools" label="Wender Utah Rating Scale (WURS)" />
              <Checkbox id="tool_qbtest" name="tools" label="QbTest/QbCheck" />
              <Checkbox id="tool_cpt" name="tools" label="Computerized continuous performance tests" />
              <Checkbox id="tool_battery" name="tools" label="Psychological testing batteries" />
              <Checkbox id="tool_collateral" name="tools" label="Collateral information from family/teachers" />
              <OtherTextFor baseName="tools" placeholder="Other tool" />
            </Fieldset>

            <Fieldset legend="B2. Average time spent on complete ADHD diagnostic evaluation">
              <Radio id="time_30_60" name="eval_time" label="30-60 minutes" />
              <Radio id="time_1_2" name="eval_time" label="1-2 hours" />
              <Radio id="time_2_3" name="eval_time" label="2-3 hours" />
              <Radio id="time_3_4" name="eval_time" label="3-4 hours" />
              <Radio id="time_gt4" name="eval_time" label="More than 4 hours" />
            </Fieldset>

            <Fieldset legend="B3. Appointments typically required for ADHD diagnosis">
              <Radio id="appt_1" name="appointments" label="1 appointment" />
              <Radio id="appt_2" name="appointments" label="2 appointments" />
              <Radio id="appt_3" name="appointments" label="3 appointments" />
              <Radio id="appt_4p" name="appointments" label="4+ appointments" />
            </Fieldset>

            <Fieldset legend="B4. Current wait time for new ADHD evaluations">
              <Radio id="wait_same" name="wait_time" label="Same week" />
              <Radio id="wait_1_2w" name="wait_time" label="1-2 weeks" />
              <Radio id="wait_3_4w" name="wait_time" label="3-4 weeks" />
              <Radio id="wait_1_2m" name="wait_time" label="1-2 months" />
              <Radio id="wait_3_6m" name="wait_time" label="3-6 months" />
              <Radio id="wait_gt6m" name="wait_time" label="More than 6 months" />
            </Fieldset>

            <Fieldset legend="B5. Most significant bottlenecks (select up to 3)">
              <Checkbox id="bottleneck_availability" name="bottlenecks" label="Limited appointment availability" />
              <Checkbox id="bottleneck_time" name="bottlenecks" label="Time-intensive assessment protocols" />
              <Checkbox id="bottleneck_collateral" name="bottlenecks" label="Difficulty obtaining collateral information" />
              <Checkbox id="bottleneck_docs" name="bottlenecks" label="Complex documentation requirements" />
              <Checkbox id="bottleneck_insurance" name="bottlenecks" label="Insurance pre-authorization" />
              <Checkbox id="bottleneck_diffdx" name="bottlenecks" label="Differential diagnosis complexity" />
              <Checkbox id="bottleneck_noshow" name="bottlenecks" label="Patient no-shows/cancellations" />
              <Checkbox id="bottleneck_testing" name="bottlenecks" label="Waiting for psychological testing" />
              <OtherTextFor baseName="bottlenecks" placeholder="Other" />
            </Fieldset>
          </section>

          {/* Section C */}
          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-md">
            <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide">Section C</h2>
            <p className="mt-2 text-xl font-semibold text-slate-800">Documentation & Reporting</p>

            <Fieldset legend="C1. Time spent on documentation per ADHD evaluation">
              <Radio id="doc_15_30" name="doc_time" label="15-30 minutes" />
              <Radio id="doc_31_60" name="doc_time" label="31-60 minutes" />
              <Radio id="doc_1_2" name="doc_time" label="1-2 hours" />
              <Radio id="doc_2_3" name="doc_time" label="2-3 hours" />
              <Radio id="doc_gt3" name="doc_time" label="More than 3 hours" />
            </Fieldset>

            <Fieldset legend="C2. Burden of current diagnostic documentation">
              <p className="text-xs text-slate-500">1 = No burden, 5 = Excessive burden</p>
              <div className="mt-3 grid grid-cols-5 gap-3">
                {[1, 2, 3, 4, 5].map((n) => (
                  <label key={n} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    <input type="radio" name="doc_burden" value={String(n)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-600" />
                    {n}
                  </label>
                ))}
              </div>
            </Fieldset>

            <Fieldset legend="C3. Components of an ideal ADHD diagnostic report (select all that apply)">
              <Checkbox id="r_symptoms" name="report_components" label="Symptom severity scores" />
              <Checkbox id="r_criteria" name="report_components" label="DSM-5/ICD-11 criteria checklist" />
              <Checkbox id="r_function" name="report_components" label="Functional impairment assessment" />
              <Checkbox id="r_diffdx" name="report_components" label="Differential diagnosis considerations" />
              <Checkbox id="r_treatment" name="report_components" label="Treatment recommendations" />
              <Checkbox id="r_comorbidity" name="report_components" label="Comorbidity screening results" />
              <Checkbox id="r_objective" name="report_components" label="Objective test results" />
              <Checkbox id="r_strengths" name="report_components" label="Patient strengths and capabilities" />
              <Checkbox id="r_family" name="report_components" label="Family/collateral perspectives" />
              <Checkbox id="r_risk" name="report_components" label="Risk factors and protective factors" />
            </Fieldset>

            <Fieldset legend="C4. Preferred format for AI-generated diagnostic reports">
              <Checkbox id="f_structured" name="report_format" label="Structured template with scored sections" />
              <Checkbox id="f_narrative" name="report_format" label="Narrative summary with bullet points" />
              <Checkbox id="f_visual" name="report_format" label="Visual dashboard with charts/graphs" />
              <Checkbox id="f_ehr" name="report_format" label="Integration into existing EHR templates" />
              <Checkbox id="f_combo" name="report_format" label="Combination of structured and narrative elements" />
            </Fieldset>
          </section>

          {/* Section D */}
          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-md">
            <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide">Section D</h2>
            <p className="mt-2 text-xl font-semibold text-slate-800">Technology Integration</p>

            <Fieldset legend="D1. Current Electronic Health Record (EHR) system">
              <Checkbox id="ehr_epic" name="ehr" label="Epic" />
              <Checkbox id="ehr_cerner" name="ehr" label="Cerner" />
              <Checkbox id="ehr_allscripts" name="ehr" label="Allscripts" />
              <Checkbox id="ehr_ecw" name="ehr" label="eClinicalWorks" />
              <Checkbox id="ehr_athena" name="ehr" label="athenahealth" />
              <OtherTextFor baseName="ehr" placeholder="Local/regional system" />
              <Checkbox id="ehr_paper" name="ehr" label="Paper-based records" />
              <OtherTextFor baseName="ehr" placeholder="Other" />
            </Fieldset>

            <Fieldset legend="D2. Importance of EHR integration for new diagnostic tools">
              <p className="text-xs text-slate-500">1 = Not important, 5 = Essential</p>
              <div className="mt-3 grid grid-cols-5 gap-3">
                {[1, 2, 3, 4, 5].map((n) => (
                  <label key={n} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    <input type="radio" name="ehr_importance" value={String(n)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-600" />
                    {n}
                  </label>
                ))}
              </div>
            </Fieldset>

            <Fieldset legend="D3. Experience with AI/machine learning tools in clinical practice">
              <Radio id="ai_exp_extensive" name="ai_experience" label="Extensive experience and very comfortable" />
              <Radio id="ai_exp_some" name="ai_experience" label="Some experience and generally comfortable" />
              <Radio id="ai_exp_limited" name="ai_experience" label="Limited experience but open to learning" />
              <Radio id="ai_exp_interested" name="ai_experience" label="No experience but interested" />
              <Radio id="ai_exp_skeptical" name="ai_experience" label="No experience and skeptical" />
            </Fieldset>

            <Fieldset legend="D4. Preferred method for accessing AI diagnostic tools">
              <Radio id="access_ehr" name="ai_access" label="Integrated within EHR" />
              <Radio id="access_web" name="ai_access" label="Standalone web application" />
              <Radio id="access_mobile" name="ai_access" label="Mobile app" />
              <Radio id="access_desktop" name="ai_access" label="Desktop software" />
              <Radio id="access_none" name="ai_access" label="No preference" />
            </Fieldset>
          </section>

          {/* Section E */}
          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-md">
            <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide">Section E</h2>
            <p className="mt-2 text-xl font-semibold text-slate-800">AI-Assisted ADHD Diagnosis</p>

            <Fieldset legend="E1. Interest level in AI-powered ADHD diagnostic support tools">
              <Radio id="interest_very" name="ai_interest" label="Very interested" />
              <Radio id="interest_somewhat" name="ai_interest" label="Somewhat interested" />
              <Radio id="interest_neutral" name="ai_interest" label="Neutral" />
              <Radio id="interest_hesitant" name="ai_interest" label="Somewhat hesitant" />
              <Radio id="interest_not" name="ai_interest" label="Not interested" />
            </Fieldset>

            <Fieldset legend="E2. Acceptable false positive rate for AI ADHD screening tool">
              <Radio id="fpr_lt5" name="ai_fpr" label="Less than 5%" />
              <Radio id="fpr_5_10" name="ai_fpr" label="5-10%" />
              <Radio id="fpr_11_15" name="ai_fpr" label="11-15%" />
              <Radio id="fpr_16_20" name="ai_fpr" label="16-20%" />
              <Radio id="fpr_gt20" name="ai_fpr" label="More than 20%" />
              <Radio id="fpr_unsure" name="ai_fpr" label="Unsure" />
            </Fieldset>

            <Fieldset legend="E3. Acceptable false negative rate for AI ADHD screening tool">
              <Radio id="fnr_lt5" name="ai_fnr" label="Less than 5%" />
              <Radio id="fnr_5_10" name="ai_fnr" label="5-10%" />
              <Radio id="fnr_11_15" name="ai_fnr" label="11-15%" />
              <Radio id="fnr_16_20" name="ai_fnr" label="16-20%" />
              <Radio id="fnr_gt20" name="ai_fnr" label="More than 20%" />
              <Radio id="fnr_unsure" name="ai_fnr" label="Unsure" />
            </Fieldset>

            <Fieldset legend="E4. Most valuable AI capabilities for ADHD diagnosis (select top 3)">
              <Checkbox id="cap_scoring" name="ai_capabilities" label="Automated symptom severity scoring" />
              <Checkbox id="cap_patterns" name="ai_capabilities" label="Pattern recognition in patient responses" />
              <Checkbox id="cap_behavior" name="ai_capabilities" label="Objective behavioral analysis (video/audio)" />
              <Checkbox id="cap_risk" name="ai_capabilities" label="Risk stratification and triage" />
              <Checkbox id="cap_diffdx" name="ai_capabilities" label="Differential diagnosis support" />
              <Checkbox id="cap_treatment" name="ai_capabilities" label="Treatment recommendation algorithms" />
              <Checkbox id="cap_outcomes" name="ai_capabilities" label="Outcome prediction modeling" />
              <Checkbox id="cap_docs" name="ai_capabilities" label="Documentation automation" />
            </Fieldset>

            <Fieldset legend="E5. Primary concerns about AI-assisted ADHD diagnosis (select all that apply)">
              <Checkbox id="concern_accuracy" name="ai_concerns" label="Diagnostic accuracy and reliability" />
              <Checkbox id="concern_liability" name="ai_concerns" label="Legal liability and malpractice concerns" />
              <Checkbox id="concern_trust" name="ai_concerns" label="Patient acceptance and trust" />
              <Checkbox id="concern_intuition" name="ai_concerns" label="Loss of clinical intuition/skills" />
              <Checkbox id="concern_privacy" name="ai_concerns" label="Data privacy and security" />
              <Checkbox id="concern_implementation" name="ai_concerns" label="Implementation complexity" />
              <Checkbox id="concern_cost" name="ai_concerns" label="Cost and reimbursement" />
              <Checkbox id="concern_regulatory" name="ai_concerns" label="Regulatory compliance" />
              <Checkbox id="concern_overreliance" name="ai_concerns" label="Over-reliance on technology" />
              <Checkbox id="concern_none" name="ai_concerns" label="None - generally supportive" />
            </Fieldset>
          </section>

          {/* Section F */}
          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-md">
            <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide">Section F</h2>
            <p className="mt-2 text-xl font-semibold text-slate-800">Multimodal Assessment</p>

            <Fieldset legend="F1. Value of the following AI assessment modalities (1-5)">
              {[
                "Voice/speech pattern analysis",
                "Eye-tracking and gaze patterns",
                "Facial expression analysis",
                "Motor movement patterns",
                "Cognitive performance testing",
                "Conversational pattern analysis",
              ].map((label, idx) => (
                <div key={idx} className="flex flex-col gap-2">
                  <p className="text-sm text-slate-700">{label}</p>
                  <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <label key={n} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        <input type="radio" name={`modality_${idx}`} value={String(n)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-600" />
                        {n}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </Fieldset>

            <Fieldset legend="F2. Comfort level with patients providing video/audio data for AI analysis">
              <Radio id="comfort_very" name="ai_data_comfort" label="Very comfortable" />
              <Radio id="comfort_somewhat" name="ai_data_comfort" label="Somewhat comfortable" />
              <Radio id="comfort_neutral" name="ai_data_comfort" label="Neutral" />
              <Radio id="comfort_uncomfortable" name="ai_data_comfort" label="Somewhat uncomfortable" />
              <Radio id="comfort_very_uncomfortable" name="ai_data_comfort" label="Very uncomfortable" />
            </Fieldset>

            <Fieldset legend="F3. Patient populations where AI screening might be most beneficial (select all that apply)">
              <Checkbox id="pop_women" name="ai_populations" label="Adult women (often underdiagnosed)" />
              <Checkbox id="pop_complex_adolescents" name="ai_populations" label="Adolescents with complex presentations" />
              <Checkbox id="pop_inattentive_adults" name="ai_populations" label="Adults with suspected inattentive type" />
              <Checkbox id="pop_comorbid" name="ai_populations" label="Patients with comorbid conditions" />
              <Checkbox id="pop_non_native" name="ai_populations" label="Non-native speakers" />
              <Checkbox id="pop_rural" name="ai_populations" label="Patients in rural/underserved areas" />
              <Checkbox id="pop_all" name="ai_populations" label="All populations equally" />
              <Checkbox id="pop_none" name="ai_populations" label="None - prefer traditional methods" />
            </Fieldset>
          </section>

          {/* Section G */}
          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-md">
            <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide">Section G</h2>
            <p className="mt-2 text-xl font-semibold text-slate-800">Clinical Decision Support</p>

            <Fieldset legend="G1. Preferred presentation of AI diagnostic suggestions">
              <Checkbox id="present_scores" name="ai_present" label="Probability scores with confidence intervals" />
              <Checkbox id="present_risk" name="ai_present" label="Risk categories (low/medium/high)" />
              <Checkbox id="present_binary" name="ai_present" label="Binary recommendations (positive/negative)" />
              <Checkbox id="present_profiles" name="ai_present" label="Detailed symptom profiles with explanations" />
              <Checkbox id="present_norms" name="ai_present" label="Comparison to normative data" />
              <Checkbox id="present_ranked" name="ai_present" label="Multiple diagnostic hypotheses ranked" />
            </Fieldset>

            <Fieldset legend="G2. Importance of AI transparency/explainability">
              <p className="text-xs text-slate-500">1 = Not important, 5 = Essential</p>
              <div className="mt-3 grid grid-cols-5 gap-3">
                {[1, 2, 3, 4, 5].map((n) => (
                  <label key={n} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    <input type="radio" name="ai_transparency" value={String(n)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-600" />
                    {n}
                  </label>
                ))}
              </div>
            </Fieldset>

            <Fieldset legend="G3. Preferred level of AI involvement in diagnosis">
              <Radio id="involvement_screening" name="ai_involvement" label="Screening tool only - I make all diagnostic decisions" />
              <Radio id="involvement_support" name="ai_involvement" label="Diagnostic support with detailed rationale" />
              <Radio id="involvement_collab" name="ai_involvement" label="Collaborative decision-making with AI" />
              <Radio id="involvement_override" name="ai_involvement" label="AI recommendation with override capability" />
              <Radio id="involvement_minimal" name="ai_involvement" label="Minimal AI involvement" />
            </Fieldset>

            <Fieldset legend="G4. Would you use an AI tool that identifies patients who may benefit from ADHD evaluation?">
              <Radio id="use_definitely_yes" name="ai_use" label="Definitely yes" />
              <Radio id="use_probably_yes" name="ai_use" label="Probably yes" />
              <Radio id="use_maybe" name="ai_use" label="Maybe" />
              <Radio id="use_probably_not" name="ai_use" label="Probably not" />
              <Radio id="use_definitely_not" name="ai_use" label="Definitely not" />
            </Fieldset>
          </section>

          {/* Section H */}
          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-md">
            <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide">Section H</h2>
            <p className="mt-2 text-xl font-semibold text-slate-800">Implementation & Training</p>

            <Fieldset legend="H1. Training requirements for adopting AI diagnostic tools">
              <Radio id="train_self" name="training" label="Self-directed online learning (1-2 hours)" />
              <Radio id="train_half" name="training" label="Half-day hands-on workshop" />
              <Radio id="train_full" name="training" label="Full-day comprehensive training" />
              <Radio id="train_multiple" name="training" label="Multiple sessions over weeks" />
              <Radio id="train_ongoing" name="training" label="Ongoing support and consultation" />
            </Fieldset>

            <Fieldset legend="H2. Factors that would facilitate adoption (select all that apply)">
              <Checkbox id="fac_accuracy" name="facilitators" label="Evidence of improved diagnostic accuracy" />
              <Checkbox id="fac_time" name="facilitators" label="Reduction in assessment time" />
              <Checkbox id="fac_docs" name="facilitators" label="Better documentation efficiency" />
              <Checkbox id="fac_feedback" name="facilitators" label="Positive patient feedback" />
              <Checkbox id="fac_peer" name="facilitators" label="Peer recommendations and testimonials" />
              <Checkbox id="fac_workflow" name="facilitators" label="Integration with existing workflow" />
              <Checkbox id="fac_regulatory" name="facilitators" label="Regulatory approval and guidelines" />
              <Checkbox id="fac_reimbursement" name="facilitators" label="Insurance/reimbursement support" />
              <Checkbox id="fac_training" name="facilitators" label="Comprehensive training program" />
            </Fieldset>

            <Fieldset legend="H3. Barriers to implementing AI diagnostic tools (select all that apply)">
              <Checkbox id="bar_evidence" name="barriers" label="Lack of evidence for clinical utility" />
              <Checkbox id="bar_accuracy" name="barriers" label="Concerns about diagnostic accuracy" />
              <Checkbox id="bar_privacy" name="barriers" label="Patient privacy and data security" />
              <Checkbox id="bar_cost" name="barriers" label="High implementation costs" />
              <Checkbox id="bar_workflow" name="barriers" label="Workflow disruption" />
              <Checkbox id="bar_support" name="barriers" label="Lack of technical support" />
              <Checkbox id="bar_regulatory" name="barriers" label="Regulatory uncertainty" />
              <Checkbox id="bar_resistance" name="barriers" label="Staff resistance to change" />
              <Checkbox id="bar_time" name="barriers" label="Limited time for training" />
            </Fieldset>
          </section>

          {/* Section I */}
          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-md">
            <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide">Section I</h2>
            <p className="mt-2 text-xl font-semibold text-slate-800">Market & Economics</p>

            <Fieldset legend="I1. Current reimbursement rate for ADHD evaluation (EUR)">
              <Radio id="reimb_100_200" name="reimbursement" label="€100-€200" />
              <Radio id="reimb_201_400" name="reimbursement" label="€201-€400" />
              <Radio id="reimb_401_600" name="reimbursement" label="€401-€600" />
              <Radio id="reimb_601_800" name="reimbursement" label="€601-€800" />
              <Radio id="reimb_gt800" name="reimbursement" label="More than €800" />
              <Radio id="reimb_variable" name="reimbursement" label="Not sure/Variable" />
            </Fieldset>

            <Fieldset legend="I2. Willingness to pay for an AI ADHD diagnostic tool">
              <Radio id="pay_subscription" name="willingness_to_pay" label="Yes, as subscription fee" />
              <Radio id="pay_per_use" name="willingness_to_pay" label="Yes, as per-use fee" />
              <Radio id="pay_one_time" name="willingness_to_pay" label="Yes, as one-time purchase" />
              <Radio id="pay_reimbursed" name="willingness_to_pay" label="Only if reimbursed by insurance" />
              <Radio id="pay_no" name="willingness_to_pay" label="No, would not pay" />
            </Fieldset>

            <Fieldset legend="I3. Reasonable monthly cost for AI diagnostic platform (EUR)">
              <Radio id="cost_0_100" name="monthly_cost" label="€0-€100" />
              <Radio id="cost_101_300" name="monthly_cost" label="€101-€300" />
              <Radio id="cost_301_500" name="monthly_cost" label="€301-€500" />
              <Radio id="cost_501_1000" name="monthly_cost" label="€501-€1000" />
              <Radio id="cost_gt1000" name="monthly_cost" label="More than €1000" />
              <Radio id="cost_free_ehr" name="monthly_cost" label="Should be free/included in EHR" />
            </Fieldset>
          </section>

          {/* Section J */}
          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-md">
            <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide">Section J</h2>
            <p className="mt-2 text-xl font-semibold text-slate-800">Quality & Outcomes</p>

            <Fieldset legend="J1. Most important outcome measures for AI diagnostic tools (select top 3)">
              <Checkbox id="outcome_accuracy" name="outcomes" label="Diagnostic accuracy vs. gold standard" />
              <Checkbox id="outcome_time" name="outcomes" label="Time savings in assessment" />
              <Checkbox id="outcome_satisfaction" name="outcomes" label="Improved patient satisfaction" />
              <Checkbox id="outcome_docs" name="outcomes" label="Better documentation quality" />
              <Checkbox id="outcome_missed" name="outcomes" label="Reduced missed diagnoses" />
              <Checkbox id="outcome_planning" name="outcomes" label="Enhanced treatment planning" />
              <Checkbox id="outcome_burden" name="outcomes" label="Decreased clinician burden" />
              <Checkbox id="outcome_cost" name="outcomes" label="Cost-effectiveness" />
            </Fieldset>

            <Fieldset legend="J2. How would you evaluate the success of an AI ADHD diagnostic tool?">
              <TextArea name="success_eval" placeholder="Your response" />
            </Fieldset>

            <Fieldset legend="J3. Specific features you would want in an AI ADHD platform?">
              <TextArea name="wanted_features" placeholder="Your response" />
            </Fieldset>
          </section>

          {/* Section K */}
          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-md">
            <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide">Section K</h2>
            <p className="mt-2 text-xl font-semibold text-slate-800">Professional Development</p>

            <Fieldset legend="K1. Interest in research collaboration with AI diagnostic platform developers">
              <Radio id="collab_very" name="collaboration" label="Very interested" />
              <Radio id="collab_somewhat" name="collaboration" label="Somewhat interested" />
              <Radio id="collab_maybe" name="collaboration" label="Maybe, depending on details" />
              <Radio id="collab_not" name="collaboration" label="Not interested" />
            </Fieldset>

            <Fieldset legend="K2. Willingness to participate in clinical validation studies">
              <Radio id="study_yes" name="validation_study" label="Yes, definitely" />
              <Radio id="study_comp" name="validation_study" label="Yes, with appropriate compensation" />
              <Radio id="study_maybe" name="validation_study" label="Maybe, depending on requirements" />
              <Radio id="study_prob_no" name="validation_study" label="Probably not" />
              <Radio id="study_no" name="validation_study" label="No" />
            </Fieldset>

            <Fieldset legend="K3. Interest in early access/beta testing of AI platform">
              <Radio id="beta_very" name="beta_interest" label="Very interested" />
              <Radio id="beta_some" name="beta_interest" label="Somewhat interested" />
              <Radio id="beta_not" name="beta_interest" label="Not interested" />
            </Fieldset>
          </section>

          {/* Section L */}
          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-md">
            <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide">Section L</h2>
            <p className="mt-2 text-xl font-semibold text-slate-800">Final Comments</p>

            <Fieldset legend="L1. Additional thoughts on AI in ADHD diagnosis?">
              <TextArea name="final_thoughts" placeholder="Your response" />
            </Fieldset>

            <Fieldset legend="L2. What would make you most likely to adopt an AI ADHD diagnostic tool?">
              <TextArea name="adoption_factors" placeholder="Your response" />
            </Fieldset>

            <Fieldset legend="L3. Contact information (optional)">
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  name="contact_email"
                  type="email"
                  placeholder="Email"
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-700">Preferred communication:</span>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="radio" name="preferred_comm" value="email" className="h-4 w-4 text-indigo-600 focus:ring-indigo-600" />
                    Email
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="radio" name="preferred_comm" value="phone" className="h-4 w-4 text-indigo-600 focus:ring-indigo-600" />
                    Phone
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="radio" name="preferred_comm" value="none" className="h-4 w-4 text-indigo-600 focus:ring-indigo-600" />
                    None
                  </label>
                </div>
              </div>
            </Fieldset>
          </section>

          <div className="sticky bottom-6 z-10 mx-auto max-w-3xl">
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 backdrop-blur">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  {submitted
                    ? "Thank you, your survey has been submitted!"
                    : "This survey is conducted by ANQA Digital Health for research and development purposes. All responses will be kept confidential and are used only for product development."}
                </p>
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
        </form>
      </div>

      <Footer>
        <p>Thank you for your professional insights!</p>
      </Footer>
    </>
  );
}


