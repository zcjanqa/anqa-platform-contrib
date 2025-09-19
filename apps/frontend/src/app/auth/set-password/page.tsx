'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '../../../lib/supabaseClient'
import { PageShell, Container, Hero, SectionCard, Footer, GradientText } from '../../../components/blueprint'

export default function SetPasswordPage() {
  const router = useRouter()
  const params = new URLSearchParams((typeof window !== 'undefined' ? window.location.search : ''))
  const first = params.get('first') === '1'

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    const init = async () => {
      try {
        const supabase = getSupabaseClient()
        const hash = window.location.hash || ''
        const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash)
        const access_token = params.get('access_token')
        const refresh_token = params.get('refresh_token')
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token })
          if (!error) {
            setSessionReady(true)
            const cleanUrl = window.location.origin + window.location.pathname + window.location.search
            window.history.replaceState({}, '', cleanUrl)
            return
          }
        }
        const url = new URL(window.location.href)
        if (url.searchParams.get('code')) {
          const { error } = await getSupabaseClient().auth.exchangeCodeForSession(window.location.href)
          if (!error) {
            setSessionReady(true)
            return
          }
        }
      } catch (e) {
      }
      setMessage('Auth session missing! Please use the password reset link from your email again.')
    }
    init()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    if (password.length < 8) {
      setMessage('Password must be at least 8 characters')
      return
    }
    if (password !== confirm) {
      setMessage('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      const supabase = getSupabaseClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError

      await supabase.auth.updateUser({ data: { password_set: true } })

      setMessage('Password saved. Redirecting…')
      router.replace('/')
    } catch (err: any) {
      setMessage(err?.message || 'Failed to set password')
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
              <GradientText>ANQA</GradientText> {first ? 'Welcome' : 'Update password'}
            </>
          }
          subtitle={first ? 'Set a password to use for future sign-ins.' : 'Choose a strong password.'}
        />

        <div className="mx-auto max-w-md">
          <SectionCard eyebrow="Security" title="Set your password">
            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password"
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
                disabled={loading || !sessionReady}
                className="inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Saving…' : (sessionReady ? 'Save password' : 'Waiting for session…')}
              </button>
            </form>

            {message ? (
              <p className="mt-3 text-sm text-slate-600">{message}</p>
            ) : null}
          </SectionCard>
        </div>

        <Footer>
          <p>Use at least 8 characters. Avoid common words.</p>
        </Footer>
      </Container>
    </PageShell>
  )
}


