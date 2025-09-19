// Original screening page simple informative.

import {
    PageShell,
    Container,
    Hero,
    ContentGrid,
    SectionCard,
    ButtonLink,
    Footer,
    GradientText,
  } from '../src/components/blueprint'
  
  export default function ScreeningLandingPage() {
    return (
      <PageShell>
        <Container>
          <Hero
            title={
              <>
                <GradientText>ANQA</GradientText> ADHD Screening
              </>
            }
            subtitle={
              <>
                This page will host our AI-powered ADHD screening prototype. We’re actively
                building it and will make it available here soon.
              </>
            }
          />
  
          <ContentGrid>
            <SectionCard eyebrow="What to expect" title="AI-assisted, clinician-aligned">
              <p>
                Our goal is to streamline early identification with a privacy-first,
                evidence-informed experience. The prototype will combine structured
                questionnaires with AI assistance to help surface relevant insights faster.
              </p>
            </SectionCard>
  
            <SectionCard eyebrow="Status" title="In active development">
              <p>
                We’re iterating quickly. Check back soon. In the meantime, you can explore our surveys:
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <ButtonLink href="/surveys">Explore surveys →</ButtonLink>
              </div>
            </SectionCard>
          </ContentGrid>
  
          <Footer>
            <p>
              Questions? Reach out to info@anqa.cloud
            </p>
          </Footer>
        </Container>
      </PageShell>
    );
  }
  
  
  