'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '../../../lib/supabaseClient'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const run = async () => {
      const supabase = getSupabaseClient()
      const hash = window.location.hash || ''
      const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash)
      const access_token = params.get('access_token')
      const refresh_token = params.get('refresh_token')
      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token })
        if (error) {
          router.replace('/login')
          return
        }
        const cleanUrl = window.location.origin + window.location.pathname + window.location.search
        window.history.replaceState({}, '', cleanUrl)
      } else {
        const url = new URL(window.location.href)
        if (url.searchParams.get('code')) {
          const { error } = await supabase.auth.exchangeCodeForSession(window.location.href)
          if (error) {
            router.replace('/login')
            return
          }
        } else {
          router.replace('/login')
          return
        }
      }
      router.replace('/auth/confirmed')
    }
    run()
  }, [router])

  return <p>Signing you in…</p>
}


