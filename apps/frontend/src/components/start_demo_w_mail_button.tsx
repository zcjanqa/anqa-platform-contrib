"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "../lib/supabaseClient";
import { fetchWithAuth } from "../lib/fetchWithAuth";

export default function StartDemoWMailButton() {
  const router = useRouter();

  const [showForm, setShowForm] = useState<boolean>(false);
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [acceptedTerms, setAcceptedTerms] = useState<boolean>(false);
  const [createAccount, setCreateAccount] = useState<boolean>(false);
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [guardError, setGuardError] = useState<string>("");

  // Determine if the user is already logged in
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = getSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!cancelled) {
          setIsLoggedIn(Boolean(session?.user));
          const loggedInEmail = session?.user?.email || "";
          if (loggedInEmail) {
            setEmail(loggedInEmail);
          }
        }
      } catch {
        if (!cancelled) setIsLoggedIn(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // If logged in, ensure account creation UI is reset/hidden
  useEffect(() => {
    if (isLoggedIn) {
      setCreateAccount(false);
      setPassword("");
      setConfirmPassword("");
    }
  }, [isLoggedIn]);

  return (
    <>
      {!showForm && (
        <div className="mt-6 pt-2 flex justify-center">
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center justify-center rounded-full px-6 py-3 text-base font-semibold text-white bg-gradient-to-r from-indigo-600 to-sky-500 hover:from-indigo-500 hover:to-sky-400 shadow-sm ring-1 ring-black/5 transition-all hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-600"
          >
            Start demo screening
          </button>
        </div>
      )}

      {showForm && (
        <div className="mt-6 pt-2">
          <form
            onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              setGuardError("");
              const isValidEmail = /^\S+@\S+\.\S+$/.test(email);
              const baseOk = firstName.trim() && isValidEmail && acceptedTerms;
              const requirePwd = isLoggedIn === false && createAccount;
              const pwdOk = !requirePwd || (password.length > 0 && confirmPassword.length > 0 && password === confirmPassword);
              const canProceed = Boolean(baseOk && pwdOk);
              if (!canProceed) return;
              (async () => {
                try {
                  // Permission guard: must be logged in and prototype_enabled=true
                  const supabase = getSupabaseClient();
                  const { data } = await supabase.auth.getSession();
                  const session = data.session;
                  if (!session) {
                    setGuardError("Anqa has not yet granted you access to the prototype. If you think a mistake has been made contact support@anqa.cloud");
                    return;
                  }
                  const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "https://anqa.cloud/api";
                  const meResp = await fetchWithAuth(`${backendBase.replace(/\/$/, "")}/account/me`);
                  if (!meResp.ok) {
                    setGuardError("Anqa has not yet granted you access to the prototype. If you think a mistake has been made contact support@anqa.cloud");
                    return;
                  }
                  const me = await meResp.json();
                  if (!me?.prototype_enabled) {
                    setGuardError("Anqa has not yet granted you access to the prototype. If you think a mistake has been made contact support@anqa.cloud");
                    return;
                  }

                const screeningId = (typeof crypto !== "undefined" && (crypto as any).randomUUID) ? (crypto as any).randomUUID() : Math.random().toString(36).slice(2);
                const payload = {
                  firstName: firstName.trim(),
                  lastName: lastName.trim(),
                  email: email.trim(),
                  acceptedTerms: true,
                  createAccount: isLoggedIn === false && createAccount === true,
                  ts: Date.now(),
                  screening_id: screeningId,
                } as const;
                if (typeof window !== "undefined") {
                  window.localStorage.setItem("anqa-screening-user", JSON.stringify(payload));
                  window.localStorage.setItem("anqa-screening-session", JSON.stringify({ screening_id: screeningId, autostart: true, ts: Date.now() }));
                }
                // Pass autostart and screening_id to prototype for automatic secure stream start
                const url = new URL("/screening/prototype", window.location.origin);
                url.searchParams.set("autostart", "1");
                url.searchParams.set("session_id", screeningId);
                router.push(url.pathname + url.search);
                } catch {
                  // As a fallback, navigate without params only if guard passed (should not reach here without guard)
                  router.push("/screening/prototype");
                }
              })();
            }}
            className="mx-auto w-full max-w-[800px] rounded-2xl border bg-white/80 backdrop-blur p-6 ring-1 ring-black/[0.04] shadow-sm dark:bg-slate-900/70 dark:border-slate-700 dark:ring-white/5"
          >
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Before you begin</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Please accept the terms and enter your e-mail to proceed.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 dark:text-slate-200">First name</label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-slate-900 placeholder-slate-400 shadow-sm ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:bg-slate-900/60 dark:text-slate-100 dark:border-slate-700 dark:ring-white/10 dark:placeholder-slate-500"
                  placeholder="Jane"
                  autoComplete="given-name"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-slate-700 dark:text-slate-200">Last name</label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-slate-900 placeholder-slate-400 shadow-sm ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:bg-slate-900/60 dark:text-slate-100 dark:border-slate-700 dark:ring-white/10 dark:placeholder-slate-500"
                  placeholder="Doe"
                  autoComplete="family-name"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-200">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-slate-900 placeholder-slate-400 shadow-sm ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:bg-slate-900/60 dark:text-slate-100 dark:border-slate-700 dark:ring-white/10 dark:placeholder-slate-500"
                  placeholder="jane.doe@example.com"
                  autoComplete="email"
                />
              </div>
            </div>
            <div className="mt-4 flex items-start gap-2">
              <input
                id="accept"
                name="accept"
                type="checkbox"
                className="mt-1 h-4 w-4 accent-black dark:accent-white"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                required
              />
              <label htmlFor="accept" className="text-sm text-slate-700 dark:text-slate-300">
                I agree to the <a href="/screening/prototype/terms" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 decoration-slate-300 hover:decoration-slate-500 dark:decoration-slate-600 dark:hover:decoration-slate-400">Terms & Conditions</a> and consent to proceed with the demo screening.
              </label>
            </div>
            {isLoggedIn === false && (
              <div className="mt-3 flex items-start gap-2">
                <input
                  id="createAccount"
                  name="createAccount"
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-black dark:accent-white"
                  checked={createAccount}
                  onChange={(e) => setCreateAccount(e.target.checked)}
                />
                <label htmlFor="createAccount" className="text-sm text-slate-700 dark:text-slate-300">
                  Create an account for me
                </label>
              </div>
            )}

            {isLoggedIn === false && createAccount && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-200">Password</label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required={createAccount}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 block w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-slate-900 placeholder-slate-400 shadow-sm ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:bg-slate-900/60 dark:text-slate-100 dark:border-slate-700 dark:ring-white/10 dark:placeholder-slate-500"
                    placeholder="Enter password"
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-200">Repeat password</label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required={createAccount}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="mt-1 block w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-slate-900 placeholder-slate-400 shadow-sm ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:bg-slate-900/60 dark:text-slate-100 dark:border-slate-700 dark:ring-white/10 dark:placeholder-slate-500"
                    placeholder="Repeat password"
                    autoComplete="new-password"
                  />
                </div>
              </div>
            )}
            <div className="mt-6 flex justify-center">
              {(() => {
                const isValidEmail = /^\S+@\S+\.\S+$/.test(email);
                const baseOk = firstName.trim() && isValidEmail && acceptedTerms;
                const requirePwd = isLoggedIn === false && createAccount;
                const pwdOk = !requirePwd || (password.length > 0 && confirmPassword.length > 0 && password === confirmPassword);
                const canProceed = Boolean(baseOk && pwdOk);
                return (
                  <button
                    type="submit"
                    disabled={!canProceed}
                    className={`inline-flex items-center justify-center rounded-full px-6 py-3 text-base font-semibold text-white shadow-sm ring-1 ring-black/5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-600 ${canProceed ? "bg-gradient-to-r from-indigo-600 to-sky-500 hover:from-indigo-500 hover:to-sky-400 hover:shadow-md hover:-translate-y-0.5" : "bg-slate-300 cursor-not-allowed dark:bg-slate-700"}`}
                    aria-disabled={!canProceed}
                  >
                    Confirm
                  </button>
                );
              })()}
            </div>
            {guardError && (
              <p className="mt-3 text-center text-sm text-red-600 dark:text-red-400">{guardError}</p>
            )}
          </form>
        </div>
      )}
    </>
  );
}


