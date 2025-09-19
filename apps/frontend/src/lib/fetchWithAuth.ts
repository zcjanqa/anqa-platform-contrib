import { getSupabaseClient } from './supabaseClient'

export async function fetchWithAuth(input: RequestInfo | URL, init: RequestInit = {}) {
  let token: string | undefined
  if (typeof window !== 'undefined') {
    const supabase = getSupabaseClient()
    const { data } = await supabase.auth.getSession()
    token = data.session?.access_token
  }

  const headers = new Headers(init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json')

  return fetch(input, { ...init, headers })
}


