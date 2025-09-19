'use client'

import { useState } from 'react'
import { fetchWithAuth } from '../../lib/fetchWithAuth'
import { PageShell, Container, Hero, SectionCard, Footer, GradientText } from '../../components/blueprint'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      if (password.length < 8) throw new Error('Password must be at least 8 characters')
      if (password !== confirm) throw new Error('Passwords do not match')
      const res = await fetchWithAuth('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, redirectTo: `${window.location.origin}/auth/callback` }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.detail || body?.error || 'Failed to send confirmation email')
      }
      setMessage('Check your email to confirm your account. You can then sign in with your password.')
    } catch (err: any) {
      setMessage(err?.message || 'Failed to send magic link')
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
              <GradientText>ANQA</GradientText> Sign up
            </>
          }
          subtitle="Create your account."
        />

        <div className="mx-auto max-w-md">
          <SectionCard eyebrow="Email" title="Create your account">
            <form onSubmit={handleSignup} className="mt-4 space-y-3">
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
                placeholder="Create a password"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
                minLength={8}
              />
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm password"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
                minLength={8}
              />
              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Sending…' : 'Create account'}
              </button>
            </form>
            {message ? (
              <p className="mt-3 text-sm text-slate-600">{message}</p>
            ) : null}
          </SectionCard>
        </div>

        <Footer>
          <p>We’ll never share your email.</p>
        </Footer>
      </Container>
    </PageShell>
  )
}


