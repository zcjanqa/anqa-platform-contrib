// apps/frontend/src/app/page_blueprint.tsx
// Reusable blueprint primitives for Apple-like, modern minimal pages.

import Link from "next/link";
import type { ReactNode } from "react";

// Shared design tokens
export const brandGradientClass =
  "bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-sky-500"; // exact gradient from the homepage

type WithChildren = { children: ReactNode };

// Page-level shell with background, text color and minimum height
export function PageShell({ children }: WithChildren) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white text-slate-800">
      {children}
    </main>
  );
}

// Width-constrained content container with standard horizontal padding
export function Container({ children }: WithChildren) {
  return <div className="mx-auto max-w-5xl px-6">{children}</div>;
}

// Gradient brand text helper
export function GradientText({ children }: WithChildren) {
  return <span className={brandGradientClass}>{children}</span>;
}

type HeroProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  centered?: boolean;
};

// Centered hero with generous spacing; defaults to centered
export function Hero({ title, subtitle, centered = true }: HeroProps) {
  return (
    <div
      className={[
        "relative pt-24 pb-16",
        centered ? "text-center" : "text-left",
      ].join(" ")}
    >
      <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-tight">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

// Two-column responsive grid for primary content blocks/cards
export function ContentGrid({ children }: WithChildren) {
  return <div className="grid gap-8 md:grid-cols-2">{children}</div>;
}

type SectionCardProps = {
  eyebrow?: string;
  title: ReactNode;
  children?: ReactNode;
};

// Soft, elevated card used for feature/status blocks
export function SectionCard({ eyebrow, title, children }: SectionCardProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-md hover:shadow-xl transition-shadow duration-300">
      {eyebrow ? (
        <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide">
          {eyebrow}
        </h2>
      ) : null}
      <p className="mt-4 text-2xl font-semibold text-slate-800">{title}</p>
      {children ? <div className="mt-3 text-base text-slate-600">{children}</div> : null}
    </section>
  );
}

type ButtonLinkProps = {
  href: string;
  children: ReactNode;
};

// Primary pill button styled as a link
export function ButtonLink({ href, children }: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className="mt-6 inline-flex items-center rounded-full border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
    >
      {children}
    </Link>
  );
}

// Minimal, quiet footer for deployment notes or legal
export function Footer({ children }: WithChildren) {
  return (
    <footer className="mt-20 pb-10 text-center text-xs text-slate-400">
      {children}
    </footer>
  );
}

// Example usage mirroring the current homepage. Copy and adapt this for new pages.
export function BlueprintExamplePage() {
  return (
    <PageShell>
      <Container>
        <Hero
          title={
            <>
              <GradientText>ANQA</GradientText> ADHD Screening
            </>
          }
          subtitle={"A minimal frontend & backend check."}
        />

        <ContentGrid>
          <SectionCard eyebrow="Frontend" title="Up & Running">
            <p>This page is served by the Next.js app.</p>
          </SectionCard>

          <SectionCard eyebrow="Backend" title="Health Endpoint">
            <div className="mt-3" />
            <ButtonLink href="/api/health">Open /api/health →</ButtonLink>
            <p className="mt-4 text-sm text-slate-500">
              If this returns <code>{"{ status: 'ok' }"}</code>, the API is
              reachable.
            </p>
          </SectionCard>
        </ContentGrid>

        <Footer>
          <p>Deployed via GitHub Actions → GHCR → Docker → Traefik → LetsEncrypt</p>
        </Footer>
      </Container>
    </PageShell>
  );
}

// Convenience re-exports to allow concise imports elsewhere
export const Blueprint = {
  PageShell,
  Container,
  Hero,
  ContentGrid,
  SectionCard,
  ButtonLink,
  Footer,
  GradientText,
  brandGradientClass,
};


