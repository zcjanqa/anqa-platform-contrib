import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Video, ShieldCheck, Cloud, Server, Database, Brain, Lock, KeyRound, Activity, MonitorSmartphone, Workflow, Waves, HardDrive, GitCompare } from "lucide-react";

/**
 * Anqa ADHD Screening – MVP User & Data-Flow (Interactive)
 *
 * Columns:
 *  1) Client Apps       – Patient Browser & Clinician Dashboard
 *  2) Edge & Network    – Traefik + Let's Encrypt, STUN/TURN (coturn)
 *  3) Media Plane       – LiveKit (WHIP Ingest, DTLS-SRTP), Egress
 *  4) Compute/Workers   – FastAPI Python analysis workers, Token/Auth service
 *  5) Data Plane        – Supabase Storage (MP4/HLS), Postgres (sessions, features), Realtime
 *
 * Lines:
 *  • Media      — solid (rose)        → raw/live audio-video flows
 *  • Metadata   — dashed (slate)      → session/DB writes, non-media payloads
 *  • Results    — dotted (emerald)    → realtime biomarkers → UI
 *  • Control    — dash-dot (indigo)   → auth, tokens, signaling
 */

const KIND_STYLE = {
  media: "stroke-rose-500",
  metadata: "stroke-slate-500",
  results: "stroke-emerald-500",
  control: "stroke-indigo-500",
};

const KIND_DASH = {
  media: "",
  metadata: "stroke-[3] [stroke-dasharray:8_6]",
  results: "stroke-[3] [stroke-dasharray:2_8]",
  control: "stroke-[3] [stroke-dasharray:12_6_3_6]",
};

const KIND_BADGE = {
  media: "bg-rose-100 text-rose-700 ring-rose-300",
  metadata: "bg-slate-100 text-slate-700 ring-slate-300",
  results: "bg-emerald-100 text-emerald-700 ring-emerald-300",
  control: "bg-indigo-100 text-indigo-700 ring-indigo-300",
};

function useResizeObserver(target, callback) {
  useLayoutEffect(() => {
    if (!target?.current) return;
    const ro = new ResizeObserver(() => callback());
    ro.observe(target.current);
    const handler = () => callback();
    window.addEventListener("resize", handler);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", handler);
    };
  }, [target, callback]);
}

function Node({ id, title, subtitle, icon: Icon, setRef, tone = "", children }) {
  return (
    <motion.div
      layout
      ref={(el) => setRef(id, el)}
      className={`relative rounded-2xl border bg-white/70 backdrop-blur shadow-sm p-4 flex flex-col gap-2 ring-1 ring-black/[0.04] ${tone}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-xl bg-slate-50 border"><Icon className="h-5 w-5" /></div>
        <div>
          <div className="font-semibold leading-tight">{title}</div>
          {subtitle && <div className="text-xs text-slate-500 leading-tight">{subtitle}</div>}
        </div>
      </div>
      {children && <div className="text-xs text-slate-600">{children}</div>}
    </motion.div>
  );
}

function LegendPill({ kind, label }) {
  return (
    <div className={`text-xs px-2 py-1 rounded-full ring-1 ${KIND_BADGE[kind]} whitespace-nowrap`}>{label}</div>
  );
}

export default function AnqaMVPFlow() {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const nodeRefs = useRef({});

  const [filters, setFilters] = useState({ media: true, metadata: true, results: true, control: true });
  const setNodeRef = (id, el) => {
    if (el) nodeRefs.current[id] = el;
  };

  const [size, setSize] = useState({ width: 0, height: 0 });
  const recompute = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setSize({ width: rect.width, height: rect.height });
  };
  useResizeObserver(containerRef, recompute);
  useEffect(() => { recompute(); }, []);

  const getCenter = (id) => {
    const el = nodeRefs.current[id];
    const parent = containerRef.current;
    if (!el || !parent) return { x: 0, y: 0 };
    const a = el.getBoundingClientRect();
    const b = parent.getBoundingClientRect();
    return { x: a.left - b.left + a.width / 2, y: a.top - b.top + a.height / 2 };
  };

  // Rect relative to container for side-anchored connectors
  const getRect = (id) => {
    const el = nodeRefs.current[id];
    const parent = containerRef.current;
    if (!el || !parent) return { x: 0, y: 0, w: 0, h: 0 };
    const a = el.getBoundingClientRect();
    const b = parent.getBoundingClientRect();
    return { x: a.left - b.left, y: a.top - b.top, w: a.width, h: a.height };
  };

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const getAnchoredCurve = (from, to) => {
    const r1 = getRect(from);
    const r2 = getRect(to);
    const c1 = { x: r1.x + r1.w / 2, y: r1.y + r1.h / 2 };
    const c2 = { x: r2.x + r2.w / 2, y: r2.y + r2.h / 2 };
    const dx = c2.x - c1.x;
    const dy = c2.y - c1.y;
    const horizontal = Math.abs(dx) >= Math.abs(dy);
    const pad = 6;
    if (horizontal) {
      const start = dx >= 0 ? { x: r1.x + r1.w + pad, y: c1.y } : { x: r1.x - pad, y: c1.y };
      const end = dx >= 0 ? { x: r2.x - pad, y: c2.y } : { x: r2.x + r2.w + pad, y: c2.y };
      const distX = Math.abs(end.x - start.x);
      const midY = (start.y + end.y) / 2;
      const k = clamp(distX * 0.35 + Math.abs(dy) * 0.15, 40, 200);
      const bendRatio = clamp(0.4 + 0.4 * (Math.abs(dy) / (distX + 1)), 0.45, 0.9);
      const c0 = { x: start.x + (dx >= 0 ? k : -k), y: start.y + (midY - start.y) * bendRatio };
      const c1p = { x: end.x - (dx >= 0 ? k : -k), y: end.y + (midY - end.y) * bendRatio };
      return { p0: start, p1: end, c0, c1: c1p };
    } else {
      const start = dy >= 0 ? { x: c1.x, y: r1.y + r1.h + pad } : { x: c1.x, y: r1.y - pad };
      const end = dy >= 0 ? { x: c2.x, y: r2.y - pad } : { x: c2.x, y: r2.y + r2.h + pad };
      const distY = Math.abs(end.y - start.y);
      const midX = (start.x + end.x) / 2;
      const k = clamp(distY * 0.35 + Math.abs(dx) * 0.15, 40, 200);
      const bendRatio = clamp(0.4 + 0.4 * (Math.abs(dx) / (distY + 1)), 0.45, 0.9);
      const c0 = { x: start.x + (midX - start.x) * bendRatio, y: start.y + (dy >= 0 ? k : -k) };
      const c1p = { x: end.x + (midX - end.x) * bendRatio, y: end.y - (dy >= 0 ? k : -k) };
      return { p0: start, p1: end, c0, c1: c1p };
    }
  };

  const connectors = useMemo(() => ([
    // Client → Edge / Network
    { from: "patient", to: "traefik", kind: "control", label: "HTTPS (magic link, WHIP endpoint)" },
    { from: "patient", to: "turn", kind: "control", label: "STUN/TURNS (NAT traversal)" },

    // Edge → Media
    { from: "traefik", to: "livekit", kind: "media", label: "WHIP (WebRTC over HTTPS) + DTLS-SRTP" },
    { from: "turn", to: "livekit", kind: "control", label: "Relay (when direct path fails)" },

    // Media → Storage + Worker
    { from: "livekit", to: "egress", kind: "control", label: "Start Egress job" },
    { from: "egress", to: "storage", kind: "media", label: "Recording → MP4/HLS (Supabase)" },
    { from: "livekit", to: "worker", kind: "media", label: "Live tracks → analysis subscriber" },

    // Worker → Data + UI
    { from: "worker", to: "postgres", kind: "metadata", label: "Features/metrics (JSONB)" },
    { from: "postgres", to: "realtime", kind: "results", label: "Changefeeds (CDC)" },
    { from: "realtime", to: "patient", kind: "results", label: "WebSocket/SSE updates" },
    { from: "realtime", to: "clinician", kind: "results", label: "Live clinician dashboard" },

    // AuthN/Z control surfaces
    { from: "auth", to: "patient", kind: "control", label: "JWT + LiveKit token (short-lived)" },
    { from: "auth", to: "livekit", kind: "control", label: "Token validation (ingress)" },
    { from: "auth", to: "storage", kind: "control", label: "Signed URLs / RLS" },
  ]), []);

  const paths = useMemo(() => {
    return connectors.map((c) => {
      const { p0, p1, c0, c1 } = getAnchoredCurve(c.from, c.to);
      const d = `M ${p0.x},${p0.y} C ${c0.x},${c0.y} ${c1.x},${c1.y} ${p1.x},${p1.y}`;

      const t = 0.5;
      const it = 1 - t;
      const bx = it * it * it * p0.x + 3 * it * it * t * c0.x + 3 * it * t * t * c1.x + t * t * t * p1.x;
      const by = it * it * it * p0.y + 3 * it * it * t * c0.y + 3 * it * t * t * c1.y + t * t * t * p1.y;
      const dxdt = 3 * it * it * (c0.x - p0.x) + 6 * it * t * (c1.x - c0.x) + 3 * t * t * (p1.x - c1.x);
      const dydt = 3 * it * it * (c0.y - p0.y) + 6 * it * t * (c1.y - c0.y) + 3 * t * t * (p1.y - c1.y);
      const len = Math.hypot(dxdt, dydt) || 1;
      const nx = -dydt / len;
      const ny = dxdt / len;
      const midX = bx + nx * 10;
      const midY = by + ny * 10;
      return { ...c, d, mid: { x: midX, y: midY } };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.width, size.height, filters]);

  const Toggle = ({ id, label, color }) => (
    <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
      <input type="checkbox" className="accent-black" checked={filters[id]} onChange={() => setFilters((f) => ({ ...f, [id]: !f[id] }))} />
      <span className={`inline-flex items-center gap-2 px-2 py-1 rounded-full ring-1 ${KIND_BADGE[id]}`}>
        <span className={`w-2 h-2 rounded-full ${color}`}></span>{label}
      </span>
    </label>
  );

  return (
    <div className="w-full min-h-[900px] bg-gradient-to-b from-slate-50 to-white p-6" ref={containerRef}>
      <div className="max-w-[1400px] mx-auto flex flex-col gap-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Anqa ADHD Screening – MVP User & Data Flow</h1>
            <p className="text-sm text-slate-600">Browser-native ingest with WHIP → LiveKit → parallel record & real-time biomarker analysis → Supabase (Storage + Postgres + Realtime)</p>
          </div>
          <div className="flex items-center gap-2">
            <LegendPill kind="media" label="Media (A/V)" />
            <LegendPill kind="metadata" label="Metadata" />
            <LegendPill kind="results" label="Results" />
            <LegendPill kind="control" label="Control/Auth" />
          </div>
        </div>

        {/* Toggles */}
        <div className="flex flex-wrap gap-4 items-center">
          <Toggle id="media" label="Media path" color="bg-rose-500" />
          <Toggle id="metadata" label="Metadata path" color="bg-slate-500" />
          <Toggle id="results" label="Results path" color="bg-emerald-500" />
          <Toggle id="control" label="Control & auth" color="bg-indigo-500" />
        </div>

        {/* Diagram Grid */}
        <div className="relative">
          {/* SVG connector layer */}
          <svg ref={svgRef} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden>
            <defs>
              <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto" markerUnits="userSpaceOnUse">
                <path d="M0,0 L8,4 L0,8 Z" style={{ fill: "context-stroke", stroke: "context-stroke" }} />
              </marker>
            </defs>
            {paths.map((p, i) => (
              <g key={i} className={!filters[p.kind] ? "opacity-10" : "opacity-100"}>
                <path d={p.d} fill="none" vectorEffect="non-scaling-stroke" markerEnd="url(#arrow)" className={`stroke-[2.5] ${KIND_STYLE[p.kind]} ${KIND_DASH[p.kind]}`} strokeLinecap="round" strokeLinejoin="round" />
                <foreignObject x={p.mid.x - 120} y={p.mid.y - 10} width={240} height={24} className="overflow-visible">
                  <div className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full ring-1 mx-auto ${KIND_BADGE[p.kind]} text-[10px] leading-none whitespace-nowrap`}>
                    {p.label}
                  </div>
                </foreignObject>
              </g>
            ))}
          </svg>

          {/* Nodes layer */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative">
            {/* Col 1: Client Apps */}
            <div className="flex flex-col gap-6">
              <Node id="patient" setRef={setNodeRef} title="Patient Browser" subtitle="Next.js + getUserMedia()" icon={MonitorSmartphone} tone="">
                <div className="flex flex-wrap gap-1">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100">WHIP Publisher</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100">Opus + H.264</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100">WebSocket UI updates</span>
                </div>
              </Node>
              <Node id="clinician" setRef={setNodeRef} title="Clinician Dashboard" subtitle="Insights & playback" icon={Activity}>
                <div className="text-xs">Live biomarkers, session review, audit trail.</div>
              </Node>
            </div>

            {/* Col 2: Edge */}
            <div className="flex flex-col gap-6">
              <Node id="traefik" setRef={setNodeRef} title="Traefik + Let's Encrypt" subtitle="HTTPS/2 + HTTP/3" icon={ShieldCheck}>
                <div className="text-xs">Routes WHIP ingest; TLS via ACME; zero-trust headers.</div>
              </Node>
              <Node id="turn" setRef={setNodeRef} title="STUN/TURN (coturn)" subtitle="TURNS for restrictive NATs" icon={Waves}>
                <div className="text-xs">Optional relay with your LE certs.</div>
              </Node>
            </div>

            {/* Col 3: Media Plane */}
            <div className="flex flex-col gap-6">
              <Node id="livekit" setRef={setNodeRef} title="LiveKit Media Server" subtitle="WHIP ingest • DTLS-SRTP" icon={Server}>
                <ul className="text-xs list-disc pl-4">
                  <li>Terminates WebRTC</li>
                  <li>Fans out tracks</li>
                  <li>Controls Egress</li>
                </ul>
              </Node>
              <Node id="egress" setRef={setNodeRef} title="Egress" subtitle="MP4 / HLS" icon={HardDrive}>
                <div className="text-xs">Uniform server-side recording, no client quirks.</div>
              </Node>
            </div>

            {/* Col 4: Compute/Workers */}
            <div className="flex flex-col gap-6">
              <Node id="worker" setRef={setNodeRef} title="Python Analysis Worker" subtitle="FastAPI • PyAV • Torch" icon={Brain}>
                <ul className="text-xs list-disc pl-4">
                  <li>Frame/audio inference</li>
                  <li>Emit incremental biomarkers</li>
                  <li>Timestamps preserved</li>
                </ul>
              </Node>
              <Node id="auth" setRef={setNodeRef} title="Auth / Token Service" subtitle="Supabase Auth + JWT" icon={KeyRound}>
                <div className="text-xs">Mints short-lived LiveKit & storage tokens.</div>
              </Node>
            </div>

            {/* Col 5: Data Plane */}
            <div className="flex flex-col gap-6">
              <Node id="storage" setRef={setNodeRef} title="Supabase Storage" subtitle="Object store (at rest encrypted)" icon={Cloud}>
                <div className="text-xs">Session artifacts: MP4/HLS, optional WAV.</div>
              </Node>
              <Node id="postgres" setRef={setNodeRef} title="Supabase Postgres" subtitle="Sessions • Features • RLS" icon={Database}>
                <div className="text-xs">JSONB metrics; audit & provenance.</div>
              </Node>
              <Node id="realtime" setRef={setNodeRef} title="Realtime / Changefeed" subtitle="CDC → UI subscriptions" icon={GitCompare}>
                <div className="text-xs">Streams updates to patient & clinician UIs.</div>
              </Node>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

        {/* Footnotes / Legend */}
        <div className="grid md:grid-cols-3 gap-4 text-sm text-slate-700">
          <div className="space-y-2">
            <div className="font-semibold">Protocol Notes</div>
            <ul className="list-disc pl-5 space-y-1">
              <li><span className="font-medium">WHIP</span> = WebRTC-HTTP Ingest (browser-native publishing).</li>
              <li><span className="font-medium">DTLS-SRTP</span> provides end-to-end media encryption in transit.</li>
              <li><span className="font-medium">TURNS</span> gives TLS-protected relays for tough networks.</li>
            </ul>
          </div>
          <div className="space-y-2">
            <div className="font-semibold">Data Classes</div>
            <ul className="list-disc pl-5 space-y-1">
              <li><span className="text-rose-600 font-medium">Media</span>: raw A/V packets (ephemeral for analytics, persisted via Egress).</li>
              <li><span className="text-emerald-600 font-medium">Results</span>: biomarkers & timelines (low-latency to UI).</li>
              <li><span className="text-slate-600 font-medium">Metadata</span>: sessions, quality stats, provenance.</li>
            </ul>
          </div>
          <div className="space-y-2">
            <div className="font-semibold">Security & Privacy</div>
            <ul className="list-disc pl-5 space-y-1">
              <li>HTTPS everywhere (Traefik + Let’s Encrypt).</li>
              <li>Short-lived JWTs; role-based RLS; audit logs.</li>
              <li>Encryption at rest for Storage; PII separated from media.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}