import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AmbientGraph } from '@/components/landing/ambient-graph';

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden px-6 pb-28 pt-24 text-center md:pb-36 md:pt-32">
      <AmbientGraph variant="hero" />

      <div className="pointer-events-none absolute inset-0 -z-20 overflow-hidden" aria-hidden="true">
        <div
          className="absolute -left-12 top-12 h-56 w-56 rounded-full blur-3xl"
          style={{
            background: 'hsl(var(--hero-graph-node) / 0.2)',
            animation: 'heroBlobDriftA 18s ease-in-out infinite',
          }}
        />
        <div
          className="absolute right-4 top-1/3 h-64 w-64 rounded-full blur-3xl"
          style={{
            background: 'hsl(var(--hero-graph-edge) / 0.17)',
            animation: 'heroBlobDriftB 22s ease-in-out infinite',
          }}
        />
        <div
          className="absolute left-1/2 bottom-2 h-60 w-60 -translate-x-1/2 rounded-full blur-3xl"
          style={{
            background: 'hsl(var(--hero-accent) / 0.14)',
            animation: 'heroBlobDriftC 20s ease-in-out infinite',
          }}
        />
        <div
          className="absolute left-[14%] top-[48%] h-48 w-48 rounded-full blur-[120px]"
          style={{
            background: 'hsl(var(--hero-particle-highlight) / 0.14)',
            animation: 'heroBlobDriftD 24s ease-in-out infinite',
          }}
        />
      </div>

      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(42% 34% at 18% 18%, hsl(var(--hero-glow-a) / 0.28), transparent 76%), radial-gradient(50% 38% at 84% 70%, hsl(var(--hero-glow-b) / 0.22), transparent 80%), radial-gradient(26% 22% at 50% 66%, hsl(var(--hero-particle-base) / 0.14), transparent 82%), linear-gradient(180deg, transparent 0%, hsl(var(--hero-fade) / 0.22) 100%)',
        }}
      />

      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-30"
        aria-hidden="true"
        style={{
          backgroundImage:
            'linear-gradient(hsl(var(--hero-grid) / 0.22) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--hero-grid) / 0.22) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          maskImage:
            'radial-gradient(circle at 50% 30%, black 0%, black 58%, transparent 88%)',
        }}
      />

      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="mx-auto mb-8 inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/72 px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-[0_8px_30px_hsl(var(--hero-fade)/0.16)] backdrop-blur-md">
          <span className="inline-block size-1.5 rounded-full bg-[hsl(var(--hero-graph-node))]" />
          Structural code collaboration
        </div>

        <h1
          className="mx-auto max-w-4xl text-balance font-semibold leading-[1.08] tracking-tight"
          style={{ fontSize: 'clamp(2.4rem, 6vw, 4.8rem)' }}
        >
          <span className="text-foreground">Code hosting that</span>{' '}
          <span
            style={{
              background:
                'linear-gradient(130deg, hsl(var(--hero-graph-node)) 0%, hsl(var(--hero-graph-edge)) 46%, hsl(var(--hero-accent)) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            understands
          </span>{' '}
          <span className="text-foreground">your code</span>
        </h1>

        <p
          className="mx-auto mt-6 max-w-2xl text-balance text-muted-foreground"
          style={{ fontSize: 'clamp(1rem, 2vw, 1.2rem)', lineHeight: '1.68' }}
        >
          Entity-aware version control, structural diffs, and intelligent merge decisions in one
          calm, fast workspace.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Button size="lg" asChild className="rounded-full px-8 text-base font-semibold shadow-md">
            <Link href="/signup">Get Started</Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            asChild
            className="rounded-full border-border/80 bg-background/65 px-8 text-base font-semibold backdrop-blur-sm hover:bg-accent/60"
          >
            <Link href="/explore">Explore Repos</Link>
          </Button>
        </div>

        <div className="mx-auto mt-12 grid max-w-3xl gap-3 sm:grid-cols-3">
          {[
            { label: 'Graph Mesh', value: 'Entity links in motion' },
            { label: 'Depth Cloud', value: 'Layered particle field' },
            { label: 'Theme Aware', value: 'Readable in light and dark' },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-border/70 bg-background/58 px-4 py-3 text-left backdrop-blur-md"
            >
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {item.label}
              </div>
              <div className="mt-1 text-sm font-medium text-foreground">{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes heroBlobDriftA {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.7; }
          50% { transform: translate3d(42px, 22px, 0) scale(1.12); opacity: 0.95; }
        }
        @keyframes heroBlobDriftB {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.6; }
          50% { transform: translate3d(-34px, -18px, 0) scale(1.1); opacity: 0.88; }
        }
        @keyframes heroBlobDriftC {
          0%, 100% { transform: translate3d(-50%, 0, 0) scale(1); opacity: 0.52; }
          50% { transform: translate3d(calc(-50% + 16px), -24px, 0) scale(1.08); opacity: 0.78; }
        }
        @keyframes heroBlobDriftD {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.44; }
          50% { transform: translate3d(28px, -18px, 0) scale(1.12); opacity: 0.62; }
        }
      `}</style>
    </section>
  );
}
