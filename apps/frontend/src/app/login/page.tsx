'use client'

import { useState } from 'react'
import Link from 'next/link'
import { getSupabaseClient } from '../../lib/supabaseClient'
import { fetchWithAuth } from '../../lib/fetchWithAuth'
import { PageShell, Container, Hero, SectionCard, Footer, GradientText } from '../../components/blueprint'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [needsConfirm, setNeedsConfirm] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetLabel, setResetLabel] = useState('Forgot password?')
  const [failedAttempts, setFailedAttempts] = useState(0)

  const sendPasswordResetFromLogin = async () => {
    if (!email) {
      setMessage('Enter your email above first')
      return
    }
    try {
      setResetting(true)
      setResetLabel('Sending…')
      const res = await fetchWithAuth('/api/auth/password-reset', {
        method: 'POST',
        body: JSON.stringify({ email, redirectTo: `${window.location.origin}/auth/set-password` })
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.detail || 'Failed to send reset link')
      }
      setResetLabel('Sent password reset email')
    } catch (err: any) {
      setResetLabel(err?.message || 'Failed to send reset link')
    } finally {
      setResetting(false)
    }
  }

  const signInWithPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      window.location.href = '/'
    } catch (err: any) {
      const msg = String(err?.message || '')
      const normalized = msg.toLowerCase()
      const requiresConfirm = normalized.includes('confirm') || normalized.includes('not confirmed')
      setNeedsConfirm(requiresConfirm)
      setMessage(requiresConfirm ? 'Please confirm your email first.' : (msg || 'Invalid email or password'))
      const nextFailedAttempts = failedAttempts + 1
      setFailedAttempts(nextFailedAttempts)
      setShowForgotPassword(!requiresConfirm && nextFailedAttempts >= 2)
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageShell>
      <Container>
        <Hero
          title={
            <>
              <GradientText>ANQA</GradientText> Sign in
            </>
          }
          subtitle="Access your ADHD screening dashboard with a secure magic link."
        />

        <div className="mx-auto max-w-md">
          <SectionCard eyebrow="Sign in" title="Use your password">
            <form onSubmit={signInWithPassword} className="mt-4 space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
            <p className="mt-6 text-center text-sm text-slate-600">
              Don’t have an account?{' '}
              <Link href="/signup" className="underline">Sign up</Link>
            </p>
            {message ? (
              <p className="mt-3 text-center text-sm text-slate-600">{message}</p>
            ) : null}
            {message && showForgotPassword ? (
              <p className="mt-2 text-center text-sm text-slate-600">
                <button
                  type="button"
                  onClick={sendPasswordResetFromLogin}
                  disabled={resetting}
                  className="underline disabled:opacity-60"
                >
                  {resetLabel}
                </button>
              </p>
            ) : null}
          </SectionCard>

          <p className="mt-6 text-center text-xs text-slate-400">
            Wrong page? <Link href="/" className="underline">Go back home</Link>
          </p>
        </div>

        <Footer>
          <p>
            By continuing you agree to our terms of service.
          </p>
        </Footer>
      </Container>
    </PageShell>
  )
}


