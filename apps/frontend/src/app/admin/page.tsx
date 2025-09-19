"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { brandGradientClass } from "@/components/blueprint";

type AdminUser = {
  id: string;
  email: string;
  role?: string | null;
  prototype_enabled?: boolean | null;
};

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          router.replace("/login?next=/admin");
          return;
        }
        // Check caller permissions
        const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "https://anqa.cloud/api";
        const meResp = await fetchWithAuth(`${backendBase.replace(/\/$/, "")}/account/me`);
        if (!meResp.ok) {
          router.replace("/login?next=/admin");
          return;
        }
        const me = await meResp.json();
        const role = String(me?.role || "").toLowerCase();
        if (role !== "admin" && role !== "moderator") {
          router.replace("/");
          return;
        }
        // Load users
        const resp = await fetchWithAuth(`${backendBase.replace(/\/$/, "")}/account/admin/users`);
        if (!resp.ok) {
          throw new Error("Failed to load users");
        }
        const body = await resp.json();
        setUsers(Array.isArray(body?.users) ? body.users : []);
      } catch (e: any) {
        setError(e?.message || "Failed to load admin data");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [router]);

  const sorted = useMemo(() => {
    return [...users].sort((a, b) => String(a.email || "").localeCompare(String(b.email || "")));
  }, [users]);

  const togglePrototype = async (targetId: string, current?: boolean | null) => {
    try {
      const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "https://anqa.cloud/api";
      const resp = await fetchWithAuth(`${backendBase.replace(/\/$/, "")}/account/admin/prototype-enabled`, {
        method: "POST",
        body: JSON.stringify({ user_id: targetId, enabled: !Boolean(current) }),
      });
      if (!resp.ok) throw new Error("Failed to update prototype access");
      const body = await resp.json();
      setUsers((prev) => prev.map((u) => (u.id === targetId ? { ...u, prototype_enabled: Boolean(body?.prototype_enabled) } : u)));
    } catch (e: any) {
      setError(e?.message || "Failed to update prototype access");
    }
  };

  if (loading) return <div className="px-6 pt-24">Loading…</div>;
  if (error) return <div className="px-6 pt-24 text-red-600">{error}</div>;

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white text-slate-800">
      <div className="mx-auto max-w-5xl px-6">
        <div className="relative pt-24 pb-10 text-center">
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-tight">
            Admin <span className={brandGradientClass}>Dashboard</span>
          </h1>
          <p className="mt-4 text-slate-600">Manage access to the prototype experience.</p>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white/90 backdrop-blur p-6 md:p-8 shadow-md ring-1 ring-black/[0.04]">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="text-xs uppercase text-slate-500">
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Role</th>
                  <th className="py-2 pr-4">Prototype</th>
                  <th className="py-2 pr-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((u) => (
                  <tr key={u.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="py-3 pr-4 text-slate-800">{u.email}</td>
                    <td className="py-3 pr-4 text-slate-700">{u.role || "—"}</td>
                    <td className="py-3 pr-4">
                      <span className={["inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ring-1", u.prototype_enabled ? "bg-green-50 text-green-700 ring-green-200" : "bg-slate-50 text-slate-600 ring-slate-200"].join(" ")}>{u.prototype_enabled ? "Enabled" : "Disabled"}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <button
                        onClick={() => togglePrototype(u.id, u.prototype_enabled)}
                        className={[
                          "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold shadow-sm ring-1 transition-all",
                          u.prototype_enabled ? "bg-slate-900 text-white ring-black/5 hover:bg-black" : "bg-white text-slate-900 ring-black/5 hover:bg-slate-100",
                        ].join(" ")}
                      >
                        {u.prototype_enabled ? "Disable" : "Enable"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="mt-12 pb-10 text-center text-xs text-slate-400">© {new Date().getFullYear()} ANQA</footer>
      </div>
    </main>
  );
}


