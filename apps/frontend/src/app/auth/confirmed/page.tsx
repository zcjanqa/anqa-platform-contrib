'use client'

import Link from 'next/link'
import { PageShell, Container, Hero, SectionCard, Footer, GradientText } from '../../../components/blueprint'

export default function AuthConfirmedPage() {
  return (
    <PageShell>
      <Container>
        <Hero
          title={
            <>
              <GradientText>ANQA</GradientText> Email confirmed
            </>
          }
          subtitle="Your email address has been verified successfully. You can now sign in with your password."
        />

        <div className="mx-auto max-w-md">
          <SectionCard eyebrow="Account" title="You're all set">
            <p className="text-sm text-slate-700">
              Welcome to ANQA. Your account is ready to use. Continue to the sign-in page to access your dashboard.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                Go to sign in
              </Link>
              <Link href="/" className="text-sm text-slate-700 underline">
                Back to home
              </Link>
            </div>
          </SectionCard>
        </div>

        <Footer>
          <p>If this wasn’t you, please contact support at support@anqa.cloud.</p>
        </Footer>
      </Container>
    </PageShell>
  )
}


