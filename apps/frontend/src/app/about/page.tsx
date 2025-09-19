import { PageShell, Container, Hero, ContentGrid, SectionCard, ButtonLink, SiteFooter, GradientText } from '../../components/blueprint'

export default function AboutPage() {
  return (
    <PageShell>
      <Container>
        <Hero
          title={
            <>
              About <GradientText>ANQA</GradientText>
            </>
          }
          subtitle={
            'ANQA helps clinicians and teams screen, understand, and act on patient-reported information.'
          }
        />

        <ContentGrid>
          <SectionCard eyebrow="Our mission" title="Clarity that improves care">
            <p>
              We believe great clinical decisions start with clear information. ANQA turns fragmented
              patient inputs into structured insights you can trust. We aim to limit human biases and leverage statistics for data-driven care.
            </p>
          </SectionCard>

          <SectionCard eyebrow="What we do" title="Beautiful workflows, thoughtfully engineered">
            <ul className="mt-3 list-disc pl-5 space-y-2">
              <li>Privacy-first architecture with secure storage and access</li>
              <li>Optimized modern screening flows</li>
              <li>Automatically collect patient biomarkers and seamlessly assess statistical relevance against target populations</li>
              <li>Machine-learning-based analysis</li>
              <li>Clean dashboards that surface what matters</li>
              <li>Fast setup that fits your practice, not the other way around</li>
            </ul>
          </SectionCard>

          <SectionCard eyebrow="Why ANQA" title="Designed with clinicians in mind">
            <p>
              Every interaction is intentionally minimal and calm. Typography, spacing, and motion follow
              a restrained aesthetic so information is immediately legible and comprehension is effortless.
            </p>
          </SectionCard>

          <SectionCard eyebrow="Privacy & security" title="Built to protect patient data">
            <p>
              We take a security-focused approach from authentication and encryption to careful data boundaries.
              Access is transparent and auditable, and you stay in control of your information.
            </p>
          </SectionCard>
        </ContentGrid>

        <div className="mt-6 flex justify-center">
          <ButtonLink href="/screening">Get started</ButtonLink>
        </div>

        <SiteFooter />
      </Container>
    </PageShell>
  )
}


