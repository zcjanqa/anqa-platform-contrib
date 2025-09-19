// apps/frontend/src/app/surveys/clinician/page.tsx
// Server component wrapper for the clinician survey client form

import { PageShell, Container, Hero, GradientText } from "../../page_blueprint";
import ClinicianSurveyClient from "./ClinicianSurveyClient";
import { SurveyUiSettingsProvider } from "@/components/surveys/SurveyKit";
import { DynamicSurvey, type SurveyDefinition } from "@/components/surveys/DynamicSurvey";

export const metadata = {
  title: "ANQA | Clinician Survey",
  description: "AI-powered ADHD diagnostics — clinician perspectives survey.",
};

export default async function ClinicianSurveyRoutePage() {
  // Attempt to load the canonical survey definition server-side.
  // If unavailable (e.g., 404 or backend offline), fall back to legacy client component.
  let inlineDefinition: SurveyDefinition | null = null;
  try {
    const res = await fetch(`/api/surveys/definition/${encodeURIComponent("clinician:v1")}`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      inlineDefinition = {
        id: data.id,
        title: data.title,
        description: data.description,
        sections: (data.definition?.sections ?? []) as SurveyDefinition["sections"],
        catalog: (data.definition?.catalog ?? {}) as SurveyDefinition["catalog"],
      };
    }
  } catch {}

  return (
    <PageShell>
      <Container>
        <Hero
          title={
            <>
              <GradientText>ANQA</GradientText> Clinician Survey
            </>
          }
          subtitle="AI-Powered ADHD Diagnostics: Healthcare Provider Perspectives"
        />
        <SurveyUiSettingsProvider showUiQuestionIds={true}>
          {inlineDefinition ? (
            <DynamicSurvey surveyId="clinician:v1" inlineDefinition={inlineDefinition} autoRestorePlacement="top" />
          ) : (
            <ClinicianSurveyClient />
          )}
        </SurveyUiSettingsProvider>
      </Container>
    </PageShell>
  );
}


