'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { getSupabaseClient } from '../lib/supabaseClient'
import { fetchWithAuth } from '../lib/fetchWithAuth'

type User = { email?: string }

export default function NavBar() {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const pathname = usePathname()

  useEffect(() => {
    const load = async () => {
      const supabase = getSupabaseClient()
      const { data } = await supabase.auth.getUser()
      setUser(data.user ? { email: data.user.email ?? undefined } : null)
      try {
        if (data.user) {
          const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'https://anqa.cloud/api'
          const resp = await fetchWithAuth(`${backendBase.replace(/\/$/, '')}/account/me`)
          if (resp.ok) {
            const me = await resp.json()
            setIsAdmin(String(me?.role || '').toLowerCase() === 'admin')
          } else {
            setIsAdmin(false)
          }
        } else {
          setIsAdmin(false)
        }
      } catch {
        setIsAdmin(false)
      }
    }
    load()
    const supabase = getSupabaseClient()
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ? { email: session.user.email ?? undefined } : null)
      // Re-check admin role on auth change
      ;(async () => {
        try {
          if (session?.user) {
            const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'https://anqa.cloud/api'
            const resp = await fetchWithAuth(`${backendBase.replace(/\/$/, '')}/account/me`)
            if (resp.ok) {
              const me = await resp.json()
              setIsAdmin(String(me?.role || '').toLowerCase() === 'admin')
            } else {
              setIsAdmin(false)
            }
          } else {
            setIsAdmin(false)
          }
        } catch {
          setIsAdmin(false)
        }
      })()
    })
    return () => { sub.subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    if (!menuRef.current) return
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    if (menuOpen) document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [menuOpen])

  useEffect(() => { setMenuOpen(false) }, [pathname])

  const signOut = async () => {
    const supabase = getSupabaseClient()
    await supabase.auth.signOut()
    setMenuOpen(false)
    window.location.href = '/'
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/60 bg-white/80 backdrop-blur">
      <div className="mx-auto max-w-5xl px-6">
        <div className="flex h-14 items-center justify-between">
          <nav className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/Anqa_Logo_01.png" alt="Anqa" width={28} height={28} priority />
            </Link>
            <Link href="/" className="text-sm font-semibold text-slate-800 hover:text-slate-900 -ml-[5px]">Home</Link>
            <Link href="/screening" className="text-sm text-slate-600 hover:text-slate-900">Screening</Link>
            <Link href="/surveys" className="text-sm text-slate-600 hover:text-slate-900">Surveys</Link>
            <Link href="/about" className="text-sm text-slate-600 hover:text-slate-900">About Us</Link>
          </nav>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link href="/admin" className="text-sm text-slate-600 hover:text-slate-900">Admin</Link>
            )}
            <div className="relative" ref={menuRef}>
              <button aria-label="User menu" onClick={() => setMenuOpen((v) => !v)} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M12 2a5 5 0 100 10 5 5 0 000-10zM4 20a8 8 0 1116 0H4z" /></svg>
              </button>
              {menuOpen ? (
                <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                <div className="px-4 py-3 text-sm">
                  {user ? <p className="truncate text-slate-700">{user.email}</p> : <p className="text-slate-600">Welcome</p>}
                </div>
                <div className="h-px w-full bg-slate-200" />
                {user ? (
                  <div className="py-2">
                    <Link href="/profile" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Profile</Link>
                    <button onClick={signOut} className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">Sign out</button>
                  </div>
                ) : (
                  <div className="py-2">
                    <Link href="/login" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Sign in</Link>
                    <Link href="/signup" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Sign up</Link>
                  </div>
                )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}


