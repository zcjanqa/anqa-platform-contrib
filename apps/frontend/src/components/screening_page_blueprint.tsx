"use client";

// apps/frontend/src/components/screening_page_blueprint.tsx
// Purpose: Reusable blueprint primitives for building ANQA-style screening pages
// with the same modern, minimal aesthetic used on the screening diagram and homepage.

import React, { useCallback, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";

// --- Design tokens ---------------------------------------------------------

export const brandGradientClass = "bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-sky-500";

export type FlowKind = "media" | "metadata" | "results" | "control";

export const KIND_BADGE: Record<FlowKind, string> = {
  media: "bg-rose-100 text-rose-700 ring-rose-300 dark:bg-rose-900/30 dark:text-rose-300 dark:ring-rose-700",
  metadata: "bg-slate-100 text-slate-700 ring-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
  results: "bg-emerald-100 text-emerald-700 ring-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-700",
  control: "bg-indigo-100 text-indigo-700 ring-indigo-300 dark:bg-indigo-900/30 dark:text-indigo-300 dark:ring-indigo-700",
};

// --- Primitives ------------------------------------------------------------

export function GradientIcon({ icon: Icon, className = "" }: { icon: LucideIcon; className?: string }) {
  return (
    <div
      className={[
        "h-11 w-11 lg:h-12 lg:w-12 rounded-2xl bg-gradient-to-r from-indigo-600 to-sky-500",
        "shadow-md ring-1 ring-black/5 flex items-center justify-center",
        "transition-transform duration-200 ease-out group-hover:scale-110 group-hover:shadow-lg",
        className,
      ].join(" ")}
    >
      <Icon className="h-5 w-5 text-white" />
    </div>
  );
}

export function LegendPill({
  kind,
  label,
  active = true,
  onClick,
  badgeClass,
}: {
  kind: FlowKind;
  label: string;
  active?: boolean;
  onClick?: () => void;
  badgeClass?: string;
}) {
  const base = `text-xs px-2 py-1 rounded-full ring-1 ${badgeClass ?? KIND_BADGE[kind]} whitespace-nowrap`;
  const state = active ? "opacity-100" : "opacity-40";
  const clickable = onClick ? "cursor-pointer select-none" : "";
  const onKey = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!onClick) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick();
      }
    },
    [onClick]
  );
  return (
    <div
      className={[base, state, clickable].join(" ")}
      role={onClick ? "button" : undefined}
      aria-pressed={onClick ? active : undefined}
      tabIndex={onClick ? 0 : -1}
      onClick={onClick}
      onKeyDown={onKey}
    >
      {label}
    </div>
  );
}

export function BlueprintHero({
  title,
  subtitle,
  centered = true,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  centered?: boolean;
}) {
  return (
    <div className={["pt-24 pb-8", centered ? "text-center" : "text-left"].join(" ")}> 
      <h1 className="text-3xl md:text-5xl font-semibold tracking-tight leading-tight">{title}</h1>
      {subtitle ? (
        <p className="mt-4 md:mt-6 text-[12px] md:text-[14px] text-slate-600 max-w-3xl mx-auto">{subtitle}</p>
      ) : null}
    </div>
  );
}

// --- Top icon rail ---------------------------------------------------------

export type RailItem = {
  id: string;
  icon: LucideIcon;
  title: string;
  subtitle?: string;
};

export function TopIconRail({
  items,
  onClick,
}: {
  items: RailItem[];
  onClick?: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-5 gap-4 sm:gap-6 md:gap-8 mb-2 items-start justify-items-center py-4 md:py-6">
      {items.map((it) => (
        <div
          key={it.id}
          className="flex flex-col items-center justify-start cursor-pointer select-none min-w-0 group"
          tabIndex={0}
          role={onClick ? "button" : undefined}
          onClick={() => onClick?.(it.id)}
          onKeyDown={(e) => {
            if (!onClick) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onClick(it.id);
            }
          }}
        >
          <div className="flex items-center justify-center h-16 md:h-16 xl:h-20">
            <GradientIcon icon={it.icon} />
          </div>
          <div className="mt-2 text-center">
            <div className="text-[11px] xl:text-[14px] font-medium text-slate-700 dark:text-slate-200">{it.title}</div>
            {it.subtitle ? (
              <div className="text-[10px] xl:text-[12px] text-slate-500 dark:text-slate-400">{it.subtitle}</div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Collapsible columns ---------------------------------------------------

export function Column({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section aria-label={label} className="flex flex-col">
      <div className="text-[11px] uppercase tracking-wide text-slate-500/90 dark:text-slate-400 text-center mb-[6px]">{label}</div>
      <div className="flex flex-col gap-4 md:gap-6">{children}</div>
    </section>
  );
}

export function CollapsibleColumn({
  label,
  expanded,
  onToggle,
  children,
}: {
  label: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={label} className="flex flex-col">
      <div
        className="text-[11px] uppercase tracking-wide text-slate-500/90 dark:text-slate-400 text-center mb-[6px] cursor-pointer select-none"
        role="button"
        aria-expanded={expanded}
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        {label}
      </div>
      {expanded ? <div className="flex flex-col gap-4 md:gap-6">{children}</div> : null}
    </section>
  );
}

// --- Full-page scaffold ----------------------------------------------------

export type BlueprintFlowToggles = Partial<Record<FlowKind, boolean>>;

export function FlowLegend({
  toggles,
  setToggles,
  showExpandAll,
  onToggleAll,
  allExpanded,
}: {
  toggles: BlueprintFlowToggles;
  setToggles: (next: BlueprintFlowToggles) => void;
  showExpandAll?: boolean;
  onToggleAll?: () => void;
  allExpanded?: boolean;
}) {
  const get = (k: FlowKind) => !!toggles[k];
  const set = (k: FlowKind) => setToggles({ ...toggles, [k]: !get(k) });
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <LegendPill kind="media" label="Media (A/V)" active={get("media")} onClick={() => set("media")} />
      <LegendPill kind="metadata" label="Metadata" active={get("metadata")} onClick={() => set("metadata")} />
      <LegendPill kind="results" label="Results" active={get("results")} onClick={() => set("results")} />
      <LegendPill kind="control" label="Control/Auth" active={get("control")} onClick={() => set("control")} />
      {showExpandAll && onToggleAll ? (
        <LegendPill
          kind="control"
          label={allExpanded ? "Collapse all" : "Expand all"}
          active={!!allExpanded}
          onClick={onToggleAll}
          badgeClass="bg-sky-100 text-sky-700 ring-sky-300 dark:bg-sky-900/30 dark:text-sky-300 dark:ring-sky-700"
        />
      ) : null}
    </div>
  );
}

// One-stop scaffold to jumpstart a screening layout. Pass your own content
// for columns and wire your connectors separately if needed.
export function ScreeningPageScaffold({
  hero,
  rail,
  columns,
}: {
  hero: { title: React.ReactNode; subtitle?: React.ReactNode };
  rail: { items: RailItem[]; onClick?: (id: string) => void };
  columns: Array<{ label: string; content: React.ReactNode }>;
}) {
  const [expanded, setExpanded] = useState<boolean>(false);
  const [toggles, setToggles] = useState<BlueprintFlowToggles>({ media: true, metadata: true, results: true, control: true });

  const toggleAll = useCallback(() => setExpanded((v) => !v), []);

  return (
    <div className="w-full bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-black">
      <div className="max-w-[1400px] mx-auto flex flex-col gap-4 p-6">
        <BlueprintHero title={hero.title} subtitle={hero.subtitle} />

        <FlowLegend toggles={toggles} setToggles={setToggles} showExpandAll onToggleAll={toggleAll} allExpanded={expanded} />

        <TopIconRail items={rail.items} onClick={rail.onClick} />

        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {columns.map((c, i) => (
            <Column key={i} label={c.label}>{expanded ? c.content : null}</Column>
          ))}
        </div>
      </div>
    </div>
  );
}


