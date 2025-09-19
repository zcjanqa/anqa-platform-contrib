'use client'

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '../../lib/supabaseClient'
import { fetchWithAuth } from '../../lib/fetchWithAuth'
import { PageShell, Container, Hero, SectionCard, DangerCard, Footer, GradientText } from '../../components/blueprint'

export default function ProfilePage() {
  const [email, setEmail] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState('')
  const [resetting, setResetting] = useState(false)
  const [resetMsg, setResetMsg] = useState('')

  useEffect(() => {
    const load = async () => {
      const supabase = getSupabaseClient()
      const { data } = await supabase.auth.getUser()
      setEmail(data.user?.email ?? null)
    }
    load()
  }, [])

  const deleteAccount = async () => {
    setMessage('')
    if (!confirm('This action will delete your account. This cannot be undone. Proceed?')) return
    setDeleting(true)
    try {
      const res = await fetchWithAuth('/api/account/delete', { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.detail || 'Failed to delete account')
      }
      setMessage('Account deleted. You will be signed out.')
      const supabase = getSupabaseClient()
      await supabase.auth.signOut()
      window.location.href = '/'
    } catch (err: any) {
      setMessage(err?.message || 'Failed to delete account')
    } finally {
      setDeleting(false)
    }
  }

  const sendPasswordReset = async () => {
    setResetMsg('')
    if (!email) {
      setResetMsg('No email on file.')
      return
    }
    setResetting(true)
    try {
      const res = await fetchWithAuth(`/api/account/password-reset?redirectTo=${encodeURIComponent(`${window.location.origin}/auth/set-password`)}`, { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.detail || 'Failed to send reset link')
      }
      setResetMsg('Password reset link sent. Check your inbox.')
    } catch (err: any) {
      setResetMsg(err?.message || 'Failed to send reset link')
    } finally {
      setResetting(false)
    }
  }

  return (
    <PageShell>
      <Container>
        <Hero
          title={
            <>
              <GradientText>ANQA</GradientText> Profile
            </>
          }
          subtitle="Your account overview"
        />

        <div className="mx-auto max-w-md">
          <SectionCard eyebrow="Account" title="Profile details">
            <p className="mt-3 text-sm text-slate-700">Email: {email ?? '—'}</p>
          </SectionCard>
        </div>

        <div className="mx-auto mt-8 max-w-md">
          <SectionCard eyebrow="Security" title="Password">
            <p className="text-sm text-slate-700">Send a password reset link to your email.</p>
            <button
              onClick={sendPasswordReset}
              disabled={resetting || !email}
              className="mt-4 inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resetting ? 'Sending…' : 'Send password reset link'}
            </button>
            {resetMsg ? (
              <p className="mt-3 text-sm text-slate-600">{resetMsg}</p>
            ) : null}
          </SectionCard>
        </div>

        <div className="mx-auto mt-8 max-w-md">
          <DangerCard eyebrow="Danger Zone" title="Delete account">
            <p className="text-sm text-slate-700">This will delete your profile immediately. This action cannot be undone. Historical records remain retained as required by law.</p>
            <button
              onClick={deleteAccount}
              disabled={deleting}
              className="mt-4 inline-flex items-center justify-center rounded-full bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting ? 'Deleting…' : 'Delete my account'}
            </button>
            {message ? (
              <p className="mt-3 text-sm text-slate-600">{message}</p>
            ) : null}
          </DangerCard>
        </div>

        <Footer>
          <p>What a beautiful account you have.</p>
        </Footer>
      </Container>
    </PageShell>
  )
}


