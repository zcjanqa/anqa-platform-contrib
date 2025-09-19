"use client";

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Video, ShieldCheck, Cloud, Server, Database, Brain, KeyRound, Activity, MonitorSmartphone, Waves, HardDrive, GitCompare, Sun, Moon, Lock } from "lucide-react";
// import Link from "next/link";
import StartDemoWMailButton from "../../components/start_demo_w_mail_button";



type FlowKind = "media" | "metadata" | "results" | "control";

const KIND_STYLE: Record<FlowKind, string> = {
  media: "stroke-rose-500",
  metadata: "stroke-slate-500",
  results: "stroke-emerald-500",
  control: "stroke-indigo-500",
};

const KIND_DASH: Record<FlowKind, string> = {
  media: "",
  metadata: "stroke-[3] [stroke-dasharray:8_6]",
  results: "stroke-[3] [stroke-dasharray:2_8]",
  control: "stroke-[3] [stroke-dasharray:12_6_3_6]",
};

const KIND_BADGE: Record<FlowKind, string> = {
  media: "bg-rose-100 text-rose-700 ring-rose-300 dark:bg-rose-900/30 dark:text-rose-300 dark:ring-rose-700",
  metadata: "bg-slate-100 text-slate-700 ring-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
  results: "bg-emerald-100 text-emerald-700 ring-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-700",
  control: "bg-indigo-100 text-indigo-700 ring-indigo-300 dark:bg-indigo-900/30 dark:text-indigo-300 dark:ring-indigo-700",
};

function useResizeObserver(target: React.RefObject<HTMLElement>, callback: () => void) {
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

type NodeProps = {
  id: string;
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  setRef: (id: string, el: HTMLDivElement | null) => void;
  tone?: string;
  children?: React.ReactNode;
};

function Node({ id, title, subtitle, icon: Icon, setRef, tone = "", children }: NodeProps) {
  const refCallback = React.useCallback((el: HTMLDivElement | null) => setRef(id, el), [id, setRef]);
  return (
    <motion.div
      layout
      ref={refCallback}
      className={`relative rounded-2xl border bg-white/80 backdrop-blur p-5 flex flex-col gap-3 ring-1 ring-black/[0.04] shadow-sm dark:bg-slate-900/70 dark:border-slate-700 dark:ring-white/5 ${tone}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      aria-label={title}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-slate-50 border dark:bg-slate-800 dark:border-slate-700" aria-hidden>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="font-semibold leading-tight text-slate-900 dark:text-slate-100 truncate">{title}</div>
          {subtitle && <div className="text-xs text-slate-500 leading-tight dark:text-slate-400">{subtitle}</div>}
        </div>
      </div>
      {children && <div className="text-xs text-slate-700 dark:text-slate-300">{children}</div>}
    </motion.div>
  );
}

function LegendPill({ kind, label, active = true, onClick, badgeClass }: { kind: FlowKind; label: string; active?: boolean; onClick?: () => void; badgeClass?: string }) {
  const base = `text-xs px-2 py-1 rounded-full ring-1 ${badgeClass ?? KIND_BADGE[kind]} whitespace-nowrap`;
  const state = active ? "opacity-100" : "opacity-40";
  const clickable = onClick ? "cursor-pointer select-none" : "";
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onClick) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };
  return (
    <div
      className={`${base} ${state} ${clickable}`}
      role={onClick ? "button" : undefined}
      aria-pressed={onClick ? active : undefined}
      tabIndex={onClick ? 0 : -1}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      {label}
    </div>
  );
}

type ColumnId = "client" | "edge" | "media" | "compute" | "data";

function Column({ label, children, sectionId: _sectionId, expanded, onToggle: _onToggle }: { label: string; children: React.ReactNode; sectionId: ColumnId; expanded: boolean; onToggle: () => void }) {
  return (
    <section aria-label={label} className="flex flex-col">
      {expanded && (
        <>
          <div className="text-[11px] uppercase tracking-wide text-slate-500/90 dark:text-slate-400 text-center mb-[6px]">{label}</div>
          <div className="flex flex-col gap-4 md:gap-6">{children}</div>
        </>
      )}
    </section>
  );
}

type Connector = {
  from: string;
  to: string;
  kind: FlowKind;
  label: string;
};

type SizedConnector = Connector & { d: string; mid: { x: number; y: number }; p0: { x: number; y: number }; p1: { x: number; y: number }; c0: { x: number; y: number }; c1: { x: number; y: number } };

export default function Page() {
  // const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [filters, setFilters] = useState<Record<FlowKind, boolean>>({ media: false, metadata: false, results: false, control: false });
  const [expandedCols, setExpandedCols] = useState<Record<ColumnId, boolean>>({ client: false, edge: false, media: false, compute: false, data: false });
  const toggleColumn = useCallback((col: ColumnId) => setExpandedCols((prev) => ({ ...prev, [col]: !prev[col] })), []);
  const [allExpanded, setAllExpanded] = useState<boolean>(false);
  const toggleAllColumns = useCallback(() => {
    setExpandedCols({ client: !allExpanded, edge: !allExpanded, media: !allExpanded, compute: !allExpanded, data: !allExpanded });
    setAllExpanded((v) => !v);
  }, [allExpanded]);
  // Keep the "Expand all" pill in sync with manual per-column toggles
  useEffect(() => {
    const allOn = Object.values(expandedCols).every(Boolean);
    setAllExpanded((prev) => (prev !== allOn ? allOn : prev));
  }, [expandedCols]);
  // Force a connector reflow after expansion/collapse commits and refs/layout are ready
  const [layoutTick, setLayoutTick] = useState<number>(0);
  useEffect(() => {
    let raf1: number | null = null;
    let raf2: number | null = null;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setLayoutTick((t) => t + 1);
      });
    });
    return () => {
      if (raf1) cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [expandedCols]);
  const iconIds = useMemo(() => ["col-client", "col-edge", "col-media", "col-compute", "col-data"], []);
  const iconsReadyRef = useRef<boolean>(false);
  const [iconsReady, setIconsReady] = useState<boolean>(false);
  const [iconsTick, setIconsTick] = useState<number>(0);
  const setNodeRef = useCallback((id: string, el: HTMLDivElement | null) => {
    // Only update if the element reference actually changed
    if (nodeRefs.current[id] !== el) {
      nodeRefs.current[id] = el;
      // When all column icon refs are attached the first time, flip iconsReady once
      if (!iconsReadyRef.current && iconIds.includes(id) && el) {
        const allPresent = iconIds.every((key) => !!nodeRefs.current[key]);
        if (allPresent) {
          iconsReadyRef.current = true;
          setIconsReady(true);
        }
      }
    }
  }, [iconIds]);

  

  // Form/login state handled inside StartDemoWMailButton

  const [size, setSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const recompute = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setSize({ width: rect.width, height: rect.height });
  };
  useResizeObserver(containerRef as React.RefObject<HTMLElement>, recompute);
  useEffect(() => { recompute(); }, []);

  // Login checks removed from this page; handled in StartDemoWMailButton

  // Safety: ensure we flip iconsReady once all top icon refs are present,
  // accounting for layout/visibility changes (e.g., md:grid metrics).
  useEffect(() => {
    if (!iconsReadyRef.current) {
      const allPresent = iconIds.every((key) => !!nodeRefs.current[key]);
      if (allPresent) {
        iconsReadyRef.current = true;
        setIconsReady(true);
      }
    }
  }, [iconIds, size.width, size.height]);

  // Observe top icon wrappers directly so column connectors re-render whenever their layout shifts
  useEffect(() => {
    if (!iconsReady) return;
    const observers: ResizeObserver[] = [];
    const schedule = () => setIconsTick((t) => t + 1);
    iconIds.forEach((id) => {
      const el = nodeRefs.current[id];
      if (!el) return;
      const ro = new ResizeObserver(() => {
        // two RAFs to ensure styles committed
        requestAnimationFrame(() => requestAnimationFrame(schedule));
      });
      ro.observe(el);
      observers.push(ro);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [iconsReady, iconIds]);

  // Initialize theme from localStorage/system preference
  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("anqa-theme") : null;
    const prefersDark = typeof window !== "undefined" ? window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches : false;
    const next = (stored === "dark" || (!stored && prefersDark)) ? "dark" : "light";
    setTheme(next);
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", next === "dark");
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", next === "dark");
    }
    if (typeof window !== "undefined") {
      window.localStorage.setItem("anqa-theme", next);
    }
  };

  const getCenter = (id: string) => {
    const el = nodeRefs.current[id];
    const parent = containerRef.current;
    if (!el || !parent) return { x: 0, y: 0 };
    const a = el.getBoundingClientRect();
    const b = parent.getBoundingClientRect();
    return { x: a.left - b.left + a.width / 2, y: a.top - b.top + a.height / 2 };
  };

  // Precise rects relative to container for side-anchored connectors
  const getRect = (id: string) => {
    const el = nodeRefs.current[id];
    const parent = containerRef.current;
    if (!el || !parent) return { x: 0, y: 0, w: 0, h: 0 };
    const a = el.getBoundingClientRect();
    const b = parent.getBoundingClientRect();
    return { x: a.left - b.left, y: a.top - b.top, w: a.width, h: a.height };
  };

  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

  type Anchored = { p0: { x: number; y: number }; p1: { x: number; y: number }; c0: { x: number; y: number }; c1: { x: number; y: number } };

  // Choose side anchors and smooth control points between two nodes
  const getAnchoredCurve = (from: string, to: string): Anchored => {
    const r1 = getRect(from);
    const r2 = getRect(to);
    const c1 = { x: r1.x + r1.w / 2, y: r1.y + r1.h / 2 };
    const c2 = { x: r2.x + r2.w / 2, y: r2.y + r2.h / 2 };

    const dx = c2.x - c1.x;
    const dy = c2.y - c1.y;
    const horizontal = Math.abs(dx) >= Math.abs(dy);

    if (horizontal) {
      const start = dx >= 0 ? { x: r1.x + r1.w, y: c1.y } : { x: r1.x, y: c1.y };
      const end = dx >= 0 ? { x: r2.x, y: c2.y } : { x: r2.x + r2.w, y: c2.y };
      const k = clamp(Math.abs(end.x - start.x) * 0.5, 40, 160);
      const tiny = 0.5; // ensure non-zero vertical extent for robust gradient/bbox
      const c0 = { x: start.x + (dx >= 0 ? k : -k), y: start.y + tiny };
      const c1p = { x: end.x - (dx >= 0 ? k : -k), y: end.y - tiny };
      return { p0: start, p1: end, c0, c1: c1p };
    } else {
      const start = dy >= 0 ? { x: c1.x, y: r1.y + r1.h } : { x: c1.x, y: r1.y };
      const end = dy >= 0 ? { x: c2.x, y: r2.y } : { x: c2.x, y: r2.y + r2.h };
      const k = clamp(Math.abs(end.y - start.y) * 0.5, 40, 160);
      const tiny = 0.5;
      const c0 = { x: start.x, y: start.y + (dy >= 0 ? k : -k) + (dy === 0 ? tiny : 0) };
      const c1p = { x: end.x, y: end.y - (dy >= 0 ? k : -k) - (dy === 0 ? tiny : 0) };
      return { p0: start, p1: end, c0, c1: c1p };
    }
  };

  const connectors: Connector[] = useMemo(() => ([
    // Client → Edge / Network
    { from: "patient", to: "traefik", kind: "control", label: "HTTPS (magic link, WHIP endpoint)" },
    { from: "patient", to: "turn", kind: "control", label: "STUN/TURNS (NAT traversal)" },

    // Edge → Media
    { from: "traefik", to: "livekit", kind: "media", label: "WHIP (WebRTC over HTTPS) + DTLS-SRTP" },
    { from: "turn", to: "livekit", kind: "control", label: "Relay (when direct path fails)" },

    // Media → Storage + Worker
    { from: "livekit", to: "egress", kind: "control", label: "Start Egress job" },
    { from: "egress", to: "storage", kind: "media", label: "Recording (MP4) → Encrypted stream (HLSe)" },
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

  const paths: SizedConnector[] = useMemo(() => {
    return connectors
      .filter((c) => nodeRefs.current[c.from] && nodeRefs.current[c.to])
      .map((c) => {
        const { p0, p1, c0, c1 } = getAnchoredCurve(c.from, c.to);
        const d = `M ${p0.x},${p0.y} C ${c0.x},${c0.y} ${c1.x},${c1.y} ${p1.x},${p1.y}`;

        // Evaluate cubic Bezier at t=0.5 for accurate label position, offset along normal
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
        return { ...c, d, mid: { x: midX, y: midY }, p0, p1, c0, c1 } as SizedConnector;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.width, size.height, filters, expandedCols, layoutTick]);

  // Top-row column icon connectors (brand gradient)
  const columnIconConnectors: Connector[] = useMemo(
    () => [
      { from: "col-client", to: "col-edge", kind: "control", label: "" },
      { from: "col-edge", to: "col-media", kind: "control", label: "" },
      { from: "col-media", to: "col-compute", kind: "control", label: "" },
      { from: "col-compute", to: "col-data", kind: "control", label: "" },
    ],
    []
  );

  const columnIconPaths: SizedConnector[] = useMemo(() => {
    if (!iconsReady) return [];
    return columnIconConnectors.map((c) => {
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
      return { ...c, d, mid: { x: midX, y: midY }, p0, p1, c0, c1 } as SizedConnector;
    });
  }, [size.width, size.height, iconsReady, iconsTick]);

  const Toggle = ({ id, label, color }: { id: FlowKind; label: string; color: string }) => (
    <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
      <input
        type="checkbox"
        className="accent-black dark:accent-white"
        checked={filters[id]}
        onChange={() => setFilters((f) => ({ ...f, [id]: !f[id] }))}
        aria-label={`Toggle ${label}`}
      />
      <span className={`inline-flex items-center gap-2 px-2 py-1 rounded-full ring-1 ${KIND_BADGE[id]}`}>
        <span className={`w-2 h-2 rounded-full ${color}`}></span>{label}
      </span>
    </label>
  );

  // Hover detection over edges independent of z-index stacking
  const rafRef = useRef<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Distance from point to cubic Bezier via coarse sampling
  const distanceToCubic = (
    x: number,
    y: number,
    p0: { x: number; y: number },
    c0: { x: number; y: number },
    c1: { x: number; y: number },
    p1: { x: number; y: number }
  ) => {
    let minD2 = Infinity;
    const samples = 36;
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const it = 1 - t;
      const bx = it * it * it * p0.x + 3 * it * it * t * c0.x + 3 * it * t * t * c1.x + t * t * t * p1.x;
      const by = it * it * it * p0.y + 3 * it * it * t * c0.y + 3 * it * t * t * c1.y + t * t * t * p1.y;
      const dx = x - bx;
      const dy = y - by;
      const d2 = dx * dx + dy * dy;
      if (d2 < minD2) minD2 = d2;
    }
    return Math.sqrt(minD2);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const containerRect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - containerRect.left;
    const mouseY = e.clientY - containerRect.top;

    rafRef.current = requestAnimationFrame(() => {
      let bestIdx: number | null = null;
      let bestDist = Infinity;
      paths.forEach((p, idx) => {
        if (!filters[p.kind]) return; // respect toggles
        const { p0, p1, c0, c1 } = getAnchoredCurve(p.from, p.to);
        const d = distanceToCubic(mouseX, mouseY, p0, c0, c1, p1);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = idx;
        }
      });
      const threshold = 16; // px
      setHoveredIndex(bestDist <= threshold ? bestIdx : null);
      rafRef.current = null;
    });
  };

  const handleMouseLeave = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setHoveredIndex(null);
  };

  return (
    <div className="w-full min-h-[900px] bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-black p-6">
      <div className="max-w-[1400px] mx-auto flex flex-col gap-4">
        {/* Header OLD STYLE
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight dark:text-slate-100">Anqa ADHD Screening – Data Privacy & Security: MVP User & Data Flow</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">Browser-native ingest with WHIP → LiveKit → parallel record & real-time biomarker analysis → Dashboard</p>
          </div>
        */}
        {/* Header (Blueprint style) */}
        <div className="pt-24 pb-8 text-center">
          <h1 className="text-3xl md:text-6xl font-semibold tracking-tight leading-tight">
            Anqa ADHD — <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-sky-500">Prototype</span>
          </h1>
          <p className="mt-4 md:mt-6 text-[12px] md:text-[12px] lg:text-[14px] text-slate-600 max-w-3xl mx-auto">
            Private by default. Secure by design.
          </p>
        </div>
        

        {/* Toggles moved below headline */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <LegendPill
            kind="media"
            label="Media (A/V)"
            active={filters.media}
            onClick={() => setFilters((f) => ({ ...f, media: !f.media }))}
          />
          <LegendPill
            kind="metadata"
            label="Metadata"
            active={filters.metadata}
            onClick={() => setFilters((f) => ({ ...f, metadata: !f.metadata }))}
          />
          <LegendPill
            kind="results"
            label="Results"
            active={filters.results}
            onClick={() => setFilters((f) => ({ ...f, results: !f.results }))}
          />
          <LegendPill
            kind="control"
            label="Control/Auth"
            active={filters.control}
            onClick={() => setFilters((f) => ({ ...f, control: !f.control }))}
          />
          <LegendPill
            kind="control"
            label={allExpanded ? "Collapse all" : "Expand all"}
            active={allExpanded}
            onClick={toggleAllColumns}
            badgeClass="bg-sky-100 text-sky-700 ring-sky-300 dark:bg-sky-900/30 dark:text-sky-300 dark:ring-sky-700"
          />
          {/* Dark mode toggle - removed for now
          <button
            type="button"
            onClick={toggleTheme}
            className="ml-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs ring-1 ring-black/[0.04] hover:bg-white dark:bg-slate-900/60 dark:border-slate-700 dark:ring-white/5 dark:hover:bg-slate-900"
            aria-label="Toggle dark mode"
            title="Toggle dark mode"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span className="hidden sm:inline">{theme === "dark" ? "Light" : "Dark"} mode</span>
          </button>
          */}
        </div>

        {/* Diagram Grid */}
        <div className="relative" ref={containerRef} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
          {/* SVG connector layer */}
          <svg ref={svgRef} className="absolute inset-0 w-full h-full z-0 pointer-events-none" aria-hidden>
            <defs>
              <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto" markerUnits="userSpaceOnUse">
                <path d="M0,0 L8,4 L0,8 Z" style={{ fill: "context-stroke", stroke: "context-stroke" }} />
              </marker>
            </defs>
            {paths.map((p, i) => (
              <g key={i} className={`group ${!filters[p.kind] ? "opacity-10" : "opacity-100"}`}>

                {/* <path d={p.d} fill="none" vectorEffect="non-scaling-stroke" markerEnd="url(#arrow)" className={`stroke-[2.5] ${KIND_STYLE[p.kind]} ${KIND_DASH[p.kind]}`} />   FULL OPACITY */}
                {/* opacity-40 makes connectors transparent */}
                <path d={p.d} fill="none" vectorEffect="non-scaling-stroke" markerEnd="url(#arrow)" className={`stroke-[2.5] opacity-100 ${KIND_STYLE[p.kind]} ${KIND_DASH[p.kind]}`} />
                <foreignObject x={p.mid.x - 120} y={p.mid.y - 10} width={240} height={24} className="overflow-visible">
                  <div className={`pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 inline-flex items-center justify-center px-2 py-0.5 rounded-full ring-1 mx-auto ${KIND_BADGE[p.kind]} text-[11px] leading-none whitespace-nowrap`}>
                    {p.label}
                  </div>
                </foreignObject>
              </g>
            ))}
          </svg>

          {/* Top row: column icons (always visible, responsive spacing) */}
          {/*<div className="grid grid-cols-5 gap-4 sm:gap-6 md: gap-8 mb-2 relative z-10 place-items-center py-4 md:py-6">  THIS LINE MAKES CONNECTORS CURVY AND HEIGHT DIFF*/}
          <div className="grid grid-cols-5 gap-4 sm:gap-6 md:gap-8 mb-2 relative z-10 items-start justify-items-center py-4 md:py-6">
            {/* Client Apps */}
            <div className="flex flex-col items-center justify-start cursor-pointer select-none min-w-0 group" role="button" tabIndex={0} aria-expanded={expandedCols.client} onClick={() => toggleColumn("client")} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleColumn("client"); } }}>
              <div ref={(el) => setNodeRef("col-client", el)} className="flex items-center justify-center h-16 md:h-16 xl:h-20 2xl:h-24">
                <div className="h-11 w-11 lg:h-12 lg:w-12 xl:h-14 xl:w-14 2xl:h-16 2xl:w-16 rounded-2xl bg-gradient-to-r from-indigo-600 to-sky-500 shadow-md ring-1 ring-black/5 flex items-center justify-center transition-transform duration-200 ease-out group-hover:scale-110 group-hover:shadow-lg will-change-transform">
                  <MonitorSmartphone className="h-5 w-5 lg:h-6 lg:w-6 xl:h-7 xl:w-7 2xl:h-8 2xl:w-8 text-white" />
                </div>
              </div>
              <div className="mt-2 text-center">
                <div className="text-[11px] xl:text-[14px] 2xl:text-[15px] font-medium text-slate-700 dark:text-slate-200">Client Apps</div>
                <div className="text-[10px] xl:text-[12px] 2xl:text-[13px] text-slate-500 dark:text-slate-400">(via anqa.cloud)</div>
              </div>
            </div>
            {/* Edge & Network */}
            <div className="flex flex-col items-center justify-start cursor-pointer select-none min-w-0 group" role="button" tabIndex={0} aria-expanded={expandedCols.edge} onClick={() => toggleColumn("edge")} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleColumn("edge"); } }}>
              <div ref={(el) => setNodeRef("col-edge", el)} className="flex items-center justify-center h-16 md:h-16 xl:h-20 2xl:h-24">
                <div className="h-11 w-11 lg:h-12 lg:w-12 xl:h-14 xl:w-14 2xl:h-16 2xl:w-16 rounded-2xl bg-gradient-to-r from-indigo-600 to-sky-500 shadow-md ring-1 ring-black/5 flex items-center justify-center transition-transform duration-200 ease-out group-hover:scale-110 group-hover:shadow-lg will-change-transform">
                  <Lock className="h-5 w-5 lg:h-6 lg:w-6 xl:h-7 xl:w-7 2xl:h-8 2xl:w-8 text-white" />
                </div>
              </div>
              <div className="mt-2 text-center">
                <div className="text-[11px] xl:text-[14px] 2xl:text-[15px] font-medium text-slate-700 dark:text-slate-200">Edge &amp; Network</div>
                <div className="text-[10px] xl:text-[12px] 2xl:text-[13px] text-slate-500 dark:text-slate-400">(encrypted stream)</div>
              </div>
            </div>
            {/* Media Plane */}
            <div className="flex flex-col items-center justify-start cursor-pointer select-none min-w-0 group" role="button" tabIndex={0} aria-expanded={expandedCols.media} onClick={() => toggleColumn("media")} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleColumn("media"); } }}>
              <div ref={(el) => setNodeRef("col-media", el)} className="flex items-center justify-center h-16 md:h-16 xl:h-20 2xl:h-24">
                <div className="h-11 w-11 lg:h-12 lg:w-12 xl:h-14 xl:w-14 2xl:h-16 2xl:w-16 rounded-2xl bg-gradient-to-r from-indigo-600 to-sky-500 shadow-md ring-1 ring-black/5 flex items-center justify-center transition-transform duration-200 ease-out group-hover:scale-110 group-hover:shadow-lg will-change-transform">
                  <Video className="h-5 w-5 lg:h-6 lg:w-6 xl:h-7 xl:w-7 2xl:h-8 2xl:w-8 text-white" />
                </div>
              </div>
              <div className="mt-2 text-center">
                <div className="text-[11px] xl:text-[14px] 2xl:text-[15px] font-medium text-slate-700 dark:text-slate-200">Media Plane</div>
                <div className="text-[10px] xl:text-[12px] 2xl:text-[13px] text-slate-500 dark:text-slate-400">(stream → python worker)</div>
              </div>
            </div>
            {/* Compute / Workers */}
            <div className="flex flex-col items-center justify-start cursor-pointer select-none min-w-0 group" role="button" tabIndex={0} aria-expanded={expandedCols.compute} onClick={() => toggleColumn("compute")} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleColumn("compute"); } }}>
              <div ref={(el) => setNodeRef("col-compute", el)} className="flex items-center justify-center h-16 md:h-16 xl:h-20 2xl:h-24">
                <div className="h-11 w-11 lg:h-12 lg:w-12 xl:h-14 xl:w-14 2xl:h-16 2xl:w-16 rounded-2xl bg-gradient-to-r from-indigo-600 to-sky-500 shadow-md ring-1 ring-black/5 flex items-center justify-center transition-transform duration-200 ease-out group-hover:scale-110 group-hover:shadow-lg will-change-transform">
                  <Brain className="h-5 w-5 lg:h-6 lg:w-6 xl:h-7 xl:w-7 2xl:h-8 2xl:w-8 text-white" />
                </div>
              </div>
              <div className="mt-2 text-center">
                <div className="text-[11px] xl:text-[14px] 2xl:text-[15px] font-medium text-slate-700 dark:text-slate-200">Compute / Workers</div>
                <div className="text-[10px] xl:text-[12px] 2xl:text-[13px] text-slate-500 dark:text-slate-400">(ai analysis &amp; token minting / security)</div>
              </div>
            </div>
            {/* Data Plane */}
            <div className="flex flex-col items-center justify-start cursor-pointer select-none min-w-0 group" role="button" tabIndex={0} aria-expanded={expandedCols.data} onClick={() => toggleColumn("data")} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleColumn("data"); } }}>
              <div ref={(el) => setNodeRef("col-data", el)} className="flex items-center justify-center h-16 md:h-16 xl:h-20 2xl:h-24">
                <div className="h-11 w-11 lg:h-12 lg:w-12 xl:h-14 xl:w-14 2xl:h-16 2xl:w-16 rounded-2xl bg-gradient-to-r from-indigo-600 to-sky-500 shadow-md ring-1 ring-black/5 flex items-center justify-center transition-transform duration-200 ease-out group-hover:scale-110 group-hover:shadow-lg will-change-transform">
                  <Activity className="h-5 w-5 lg:h-6 lg:w-6 xl:h-7 xl:w-7 2xl:h-8 2xl:w-8 text-white" />
                </div>
              </div>
              <div className="mt-2 text-center">
                <div className="text-[11px] xl:text-[14px] 2xl:text-[15px] font-medium text-slate-700 dark:text-slate-200">Data Plane</div>
                <div className="text-[10px] xl:text-[12px] 2xl:text-[13px] text-slate-500 dark:text-slate-400">(evaluation on dashboard)</div>
              </div>
            </div>
          </div>

          {/* Always-on-top, non-interactive overlay for top icon connectors and hover highlight */}
          <div className="pointer-events-none absolute inset-0 z-30">
            <svg className="absolute inset-0 w-full h-full" aria-hidden>
              <defs>
                {/* Brand gradient stroke for top-row arrows (front-most) */}
                <linearGradient id="brand-stroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#4f46e5" />
                  <stop offset="100%" stopColor="#0ea5e9" />
                </linearGradient>
                <marker id="brand-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto" markerUnits="userSpaceOnUse">
                  <path d="M0,0 L8,4 L0,8 Z" fill="url(#brand-stroke)" />
                </marker>
                <marker id="arrow-overlay" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto" markerUnits="userSpaceOnUse">
                  <path d="M0,0 L8,4 L0,8 Z" style={{ fill: "context-stroke", stroke: "context-stroke" }} />
                </marker>
              </defs>
              {/* Column icon connectors (always visible, front-most) */}
              {columnIconPaths.map((p, i) => (
                <path key={`col-top-${i}`} d={p.d} fill="none" vectorEffect="non-scaling-stroke" markerEnd="url(#brand-arrow)" strokeWidth={3.5} stroke="url(#brand-stroke)" opacity={0.4} />
              ))}
              {/* Hover highlight rendered above all when active */}
              {hoveredIndex !== null && filters[paths[hoveredIndex].kind] && (
                <>
                  <path
                    d={paths[hoveredIndex].d}
                    fill="none"
                    vectorEffect="non-scaling-stroke"
                    className="stroke-[8] stroke-white dark:stroke-slate-900 opacity-60"
                  />
                  <path
                    d={paths[hoveredIndex].d}
                    fill="none"
                    vectorEffect="non-scaling-stroke"
                    markerEnd="url(#arrow-overlay)"
                    className={`stroke-[3.5] ${KIND_STYLE[paths[hoveredIndex].kind]} ${KIND_DASH[paths[hoveredIndex].kind]}`}
                  />
                </>
              )}
            </svg>
            {/* Hover label above all when active */}
            {hoveredIndex !== null && filters[paths[hoveredIndex].kind] && (
              <div
                className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full ring-1 text-[11px] leading-none whitespace-nowrap ${KIND_BADGE[paths[hoveredIndex].kind]}`}
                style={{
                  position: "absolute",
                  left: `${paths[hoveredIndex].mid.x}px`,
                  top: `${paths[hoveredIndex].mid.y}px`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                {paths[hoveredIndex].label}
              </div>
            )}
          </div>

          {/* Nodes layer */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 relative z-10">
            {/* Col 1: Client Apps */}
            <Column label="Client Apps" sectionId="client" expanded={expandedCols.client} onToggle={() => toggleColumn("client")}>
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
            </Column>

            {/* Col 2: Edge */}
            <Column label="Edge & Network" sectionId="edge" expanded={expandedCols.edge} onToggle={() => toggleColumn("edge")}>
              <Node id="traefik" setRef={setNodeRef} title="Traefik + Let's Encrypt" subtitle="HTTPS/2 + HTTP/3" icon={ShieldCheck}>
                <div className="text-xs">Routes WHIP ingest; TLS via ACME; zero-trust headers.</div>
              </Node>
              <Node id="turn" setRef={setNodeRef} title="STUN/TURN (coturn)" subtitle="TURNS for restrictive NATs" icon={Waves}>
                <div className="text-xs">Optional TURN relay (in-house) with LE certificates for unstable networks.</div>
              </Node>
            </Column>

            {/* Col 3: Media Plane */}
            <Column label="Media Plane" sectionId="media" expanded={expandedCols.media} onToggle={() => toggleColumn("media")}>
              <Node id="livekit" setRef={setNodeRef} title="LiveKit Media Server" subtitle="WHIP ingest • DTLS-SRTP" icon={Server}>
                <ul className="text-xs list-disc pl-4">
                  <li>Terminates WebRTC</li>
                  <li>Fans out tracks</li>
                  <li>Controls Egress</li>
                </ul>
              </Node>
              <Node id="egress" setRef={setNodeRef} title="Egress" subtitle="MP4 / HLSe - encrypted" icon={HardDrive}>
                <div className="text-xs">Uniform server-side recording, no client quirks.</div>
              </Node>
            </Column>

            {/* Col 4: Compute/Workers */}
            <Column label="Compute / Workers" sectionId="compute" expanded={expandedCols.compute} onToggle={() => toggleColumn("compute")}>
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
            </Column>

            {/* Col 5: Data Plane */}
            <Column label="Data Plane" sectionId="data" expanded={expandedCols.data} onToggle={() => toggleColumn("data")}>
              <Node id="storage" setRef={setNodeRef} title="Object Storage" subtitle="(at rest encrypted)" icon={Cloud}>
                <div className="text-xs">Session artifacts: MP4/HLSe, optional WAV.</div>
              </Node>
              <Node id="postgres" setRef={setNodeRef} title="Postgres DB" subtitle="Sessions • Features • RLS" icon={Database}>
                <div className="text-xs">JSONB metrics; audit & provenance.</div>
              </Node>
              <Node id="realtime" setRef={setNodeRef} title="Realtime / Changefeed" subtitle="CDC → UI subscriptions" icon={GitCompare}>
                <div className="text-xs">Streams updates to patient & clinician UIs.</div>
              </Node>
            </Column>
          </div>
        </div>

        
        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-slate-700" />

        {/* Footnotes / Legend */}
        <div className="grid md:grid-cols-3 gap-4 text-[12px] md:text-[12.5px] lg:text-[13.5px] text-slate-700 dark:text-slate-300">
          <div className="space-y-2">
            <div className="font-semibold dark:text-slate-100">Transport & Protocols</div>
            <ul className="list-disc pl-5 space-y-1">
              <li><span className="font-medium">WHIP</span> for zero-install, browser publishing.</li>
              <li><span className="font-medium">DTLS-SRTP</span> for end-to-end media encryption in transit.</li>
              <li><span className="font-medium">TURNS</span> for resilient, TLS-protected relays behind restrictive NATs.</li>
            </ul>
          </div>
          <div className="space-y-2">
            <div className="font-semibold dark:text-slate-100">What We Store</div>
            <ul className="list-disc pl-5 space-y-1">
              <li><span className="text-rose-600 font-medium">Media</span>: live A/V for inference; persisted via Egress (MP4/HLSe).</li>
              <li><span className="text-emerald-600 font-medium">Results</span>: streaming biomarkers & timestamped timelines to the UI.</li>
              <li><span className="text-slate-600 font-medium">Metadata</span>: session context, quality stats, and provenance for auditability.</li>
            </ul>
          </div>
          <div className="space-y-2">
            <div className="font-semibold dark:text-slate-100">Trust & Safety</div>
            <ul className="list-disc pl-5 space-y-1">

              <li><span className="font-medium">HTTPS</span> across the stack (Traefik + Let’s Encrypt).</li>
              <li><span className="font-medium">Short-lived JWTs</span>, role-based RLS, and comprehensive audit logs.</li>
              <li><span className="font-medium">Storage encrypted at rest</span>; PII separated from media.</li>
            </ul>
          </div>
        </div>

        {/* Start / Confirm Button and Conditional Form */}
        <StartDemoWMailButton />

      </div>
    </div>
  );
}


