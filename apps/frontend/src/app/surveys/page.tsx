// apps/frontend/src/app/surveys/page.tsx
// Surveys index page — bespoke design with an Apple-like, welcoming aesthetic

import Link from "next/link";
import type { Metadata } from "next";
import { PageShell, Container, Footer, GradientText, brandGradientClass, ButtonLink } from "../page_blueprint";
import SurveyCard, { SurveyCardComingSoon } from "@/components/surveys/SurveyCard";

export const metadata: Metadata = {
  title: "ANQA | Surveys",
  description: "Explore available surveys.",
};


export default function SurveysHomePage() {
  return (
    <PageShell>
      {/* Removed blurred decorative background for cleaner cards layout */}

      <Container>
        {/* Hero */}
        <div className="pt-24 pb-12 text-center">
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight">
            <span className={brandGradientClass}>ANQA</span> Surveys
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
            A warm, simple place to share your perspective and help us build better ADHD diagnostics.
          </p>
          <div className="mt-2">
            <ButtonLink href="/surveys/user">Start User Survey →</ButtonLink>
          </div>
        </div>

        {/* Survey cards: User first */}
        <div className="mx-auto max-w-5xl grid gap-6 md:grid-cols-2">
          <SurveyCard
            label="User"
            title="User Survey"
            description="Tell us about your ADHD diagnostic experience and preferences."
            href="/surveys/user"
          />

          <SurveyCard
            label="Clinician"
            title="Clinician Survey"
            description="Share your perspective on AI-powered ADHD diagnostics."
            href="/surveys/clinician"
          />

          <div className="md:col-span-2">
            <SurveyCardComingSoon label="Coming soon" title="More surveys" description="" />
          </div>
        </div>

        <Footer>
          <p>Thank you for contributing to better ADHD diagnostics.</p>
        </Footer>
      </Container>
    </PageShell>
  );
}