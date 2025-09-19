'use client'
import Link from 'next/link'
import type { ReactNode } from 'react'

export const brandGradientClass = 'bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-sky-500'

type WithChildren = { children: ReactNode }

export function PageShell({ children }: WithChildren) {
  return <main className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white text-slate-800">{children}</main>
}

export function Container({ children }: WithChildren) {
  return <div className="mx-auto max-w-5xl px-6">{children}</div>
}

export function GradientText({ children }: WithChildren) {
  return <span className={brandGradientClass}>{children}</span>
}

type HeroProps = { title: ReactNode; subtitle?: ReactNode; centered?: boolean }
export function Hero({ title, subtitle, centered = true }: HeroProps) {
  return (
    <div className={["relative pt-24 pb-16", centered ? "text-center" : "text-left"].join(" ")}>
      <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-tight">{title}</h1>
      {subtitle ? <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto">{subtitle}</p> : null}
    </div>
  )
}

export function ContentGrid({ children }: WithChildren) {
  return <div className="grid gap-8 md:grid-cols-2">{children}</div>
}

type SectionCardProps = { eyebrow?: string; title: ReactNode; children?: ReactNode }
export function SectionCard({ eyebrow, title, children }: SectionCardProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-md hover:shadow-xl transition-shadow duration-300">
      {eyebrow ? <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide">{eyebrow}</h2> : null}
      <p className="mt-4 text-2xl font-semibold text-slate-800">{title}</p>
      {children ? <div className="mt-3 text-base text-slate-600">{children}</div> : null}
    </section>
  )
}

export function DangerCard({ eyebrow, title, children }: SectionCardProps) {
  return (
    <section className="rounded-3xl border border-red-200 bg-gradient-to-b from-white to-rose-50 p-8 shadow-md shadow-red-100 hover:shadow-2xl hover:shadow-red-200 ring-0 hover:ring-1 hover:ring-red-300 transition-all duration-300">
      {eyebrow ? <h2 className="text-sm font-medium text-red-500 uppercase tracking-wide">{eyebrow}</h2> : null}
      <p className="mt-4 text-2xl font-semibold text-slate-800">{title}</p>
      {children ? <div className="mt-3 text-base text-slate-700">{children}</div> : null}
    </section>
  )
}

type ButtonLinkProps = { href: string; children: ReactNode }
export function ButtonLink({ href, children }: ButtonLinkProps) {
  return (
    <Link href={href} className="mt-6 inline-flex items-center rounded-full border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
      {children}
    </Link>
  )
}

export function Footer({ children }: WithChildren) {
  return <footer className="mt-20 pb-10 text-center text-xs text-slate-400">{children}</footer>
}

export function SiteFooter() {
  return (
    <Footer>
      © {new Date().getFullYear()} ANQA. Thoughtfully built for better care.
    </Footer>
  )
}

export const Blueprint = { PageShell, Container, Hero, ContentGrid, SectionCard, DangerCard, ButtonLink, Footer, SiteFooter, GradientText, brandGradientClass }


