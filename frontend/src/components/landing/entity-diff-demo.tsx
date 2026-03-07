'use client';

import { useState } from 'react';
import { AmbientGraph } from '@/components/landing/ambient-graph';
import { EntityKindBadge } from '@/components/shared/entity-kind-badge';

const LINE_DIFF = [
  { type: 'removed', text: 'func oldName(x int) int {' },
  { type: 'removed', text: '  return x * 2' },
  { type: 'removed', text: '}' },
  { type: 'added',   text: 'func newName(x int) int {' },
  { type: 'added',   text: '  return x * 3' },
  { type: 'added',   text: '}' },
];

export function EntityDiffDemo() {
  const [active, setActive] = useState<'line' | 'entity'>('line');

  return (
    <section className="relative isolate overflow-hidden px-6 py-24">
      <AmbientGraph variant="showcase" />
      <div
        className="pointer-events-none absolute inset-0 -z-20"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(44% 42% at 18% 26%, hsl(var(--hero-graph-edge) / 0.12), transparent 76%), radial-gradient(38% 36% at 78% 18%, hsl(var(--hero-particle-base) / 0.12), transparent 80%), linear-gradient(180deg, transparent 0%, hsl(var(--hero-fade) / 0.12) 100%)',
        }}
      />

      {/* Section header */}
      <div className="relative z-10 mx-auto mb-12 max-w-2xl text-center">
        <h2
          className="font-semibold text-foreground"
          style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)' }}
        >
          Two ways to see the same change
        </h2>
        <p className="mt-3 text-muted-foreground" style={{ fontSize: 'clamp(0.9rem, 1.5vw, 1.1rem)' }}>
          Traditional line diffs show you characters. Entity diffs show you meaning.
        </p>
      </div>

      {/* Toggle */}
      <div className="relative z-10 mx-auto mb-8 flex max-w-xs items-center rounded-full border border-border bg-background/60 p-1 shadow-[0_12px_36px_hsl(var(--hero-fade)/0.12)] backdrop-blur-md">
        <button
          onClick={() => setActive('line')}
          className={`flex-1 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
            active === 'line'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Line diff
        </button>
        <button
          onClick={() => setActive('entity')}
          className={`flex-1 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
            active === 'entity'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Entity diff
        </button>
      </div>

      {/* Side-by-side panels (always visible on md+, toggle on mobile) */}
      <div className="relative z-10 mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
        {/* Line diff panel */}
        <div
          className={`rounded-xl border border-border bg-card/88 shadow-[0_24px_80px_hsl(var(--hero-fade)/0.16)] backdrop-blur-sm transition-all duration-300 md:block ${
            active === 'line' ? 'block' : 'hidden md:block'
          } ${active === 'line' ? 'ring-1 ring-border/80' : 'opacity-60 md:opacity-100'}`}
        >
          {/* Panel header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="font-mono text-xs text-muted-foreground">math.go — line diff</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              Traditional
            </span>
          </div>
          {/* Diff content */}
          <div className="overflow-x-auto p-4">
            <div className="font-mono text-sm leading-6">
              {LINE_DIFF.map((line, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 rounded px-2 py-0.5 ${
                    line.type === 'removed'
                      ? 'bg-[hsl(0,72%,51%)]/10 text-[hsl(0,72%,65%)]'
                      : 'bg-[hsl(142,71%,45%)]/10 text-[hsl(142,71%,55%)]'
                  }`}
                >
                  <span className="shrink-0 select-none font-bold w-3">
                    {line.type === 'removed' ? '−' : '+'}
                  </span>
                  <span className="whitespace-pre">{line.text}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Stats bar */}
          <div className="border-t border-border px-4 py-2.5 flex items-center gap-4">
            <span className="text-xs text-[hsl(0,72%,65%)]">−3 lines</span>
            <span className="text-xs text-[hsl(142,71%,55%)]">+3 lines</span>
            <span className="ml-auto text-xs text-muted-foreground">6 hunks</span>
          </div>
        </div>

        {/* Entity diff panel */}
        <div
          className={`rounded-xl border bg-card/88 shadow-[0_24px_80px_hsl(var(--hero-fade)/0.16)] backdrop-blur-sm transition-all duration-300 md:block ${
            active === 'entity' ? 'block' : 'hidden md:block'
          } ${
            active === 'entity'
              ? 'border-[hsl(180,70%,50%)]/40 bg-card ring-1 ring-[hsl(180,70%,50%)]/25 shadow-[0_0_24px_hsla(180,70%,50%,0.08)]'
              : 'border-border bg-card opacity-60 md:opacity-100'
          }`}
        >
          {/* Panel header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="font-mono text-xs text-muted-foreground">math.go — entity diff</span>
            <span className="rounded-full bg-[hsl(180,70%,50%)]/12 px-2 py-0.5 text-xs text-[hsl(180,70%,50%)]">
              Structural
            </span>
          </div>
          {/* Entity diff content */}
          <div className="p-4 space-y-3">
            {/* File path row */}
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">File:</span>
              <span className="font-mono text-xs text-foreground">math.go</span>
            </div>

            {/* Deleted entity */}
            <div className="flex items-center gap-3 rounded-lg border border-[hsl(0,72%,51%)]/20 bg-[hsl(0,72%,51%)]/8 px-3 py-2.5">
              <span className="text-sm font-bold text-[hsl(0,72%,65%)]" aria-label="Deleted">✕</span>
              <div className="flex flex-1 items-center gap-2 min-w-0">
                <span className="text-xs text-muted-foreground shrink-0">Deleted:</span>
                <EntityKindBadge kind="function" label="func" />
                <span className="font-mono text-sm text-[hsl(0,72%,65%)] truncate">oldName</span>
              </div>
            </div>

            {/* Added entity */}
            <div className="flex items-center gap-3 rounded-lg border border-[hsl(142,71%,45%)]/20 bg-[hsl(142,71%,45%)]/8 px-3 py-2.5">
              <span className="text-sm font-bold text-[hsl(142,71%,55%)]" aria-label="Added">✚</span>
              <div className="flex flex-1 items-center gap-2 min-w-0">
                <span className="text-xs text-muted-foreground shrink-0">Added:</span>
                <EntityKindBadge kind="function" label="func" />
                <span className="font-mono text-sm text-[hsl(142,71%,55%)] truncate">newName</span>
              </div>
              <span className="shrink-0 rounded-full bg-[hsl(142,71%,45%)]/15 px-2 py-0.5 font-mono text-xs text-[hsl(142,71%,55%)]">
                +1 line
              </span>
            </div>
          </div>

          {/* Stats bar */}
          <div className="border-t border-border px-4 py-2.5 flex items-center gap-4">
            <span className="text-xs text-[hsl(0,72%,65%)]">1 deleted</span>
            <span className="text-xs text-[hsl(142,71%,55%)]">1 added</span>
            <span className="ml-auto text-xs text-[hsl(180,70%,50%)]">2 entities</span>
          </div>
        </div>
      </div>

      {/* Caption */}
      <p className="relative z-10 mx-auto mt-8 max-w-lg text-center text-sm text-muted-foreground">
        Entity diffs survive renames, reformatting, and moves. The same intelligence
        powers Orchard&apos;s merge engine.
      </p>
    </section>
  );
}
