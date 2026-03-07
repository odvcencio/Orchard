import { Hero } from '@/components/landing/hero';
import { EntityDiffDemo } from '@/components/landing/entity-diff-demo';
import { FeatureSection } from '@/components/landing/feature-section';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="relative flex flex-col overflow-hidden bg-background">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] opacity-90"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(44% 40% at 18% 18%, hsl(var(--hero-glow-a) / 0.16), transparent 72%), radial-gradient(56% 42% at 82% 24%, hsl(var(--hero-glow-b) / 0.16), transparent 76%), linear-gradient(180deg, hsl(var(--hero-fade) / 0.12), transparent 72%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-[34rem] h-[56rem] opacity-75"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(52% 34% at 22% 16%, hsl(var(--hero-graph-node) / 0.1), transparent 76%), radial-gradient(46% 38% at 78% 22%, hsl(var(--hero-accent) / 0.12), transparent 80%), linear-gradient(180deg, transparent 0%, hsl(var(--hero-fade) / 0.08) 100%)',
        }}
      />
      <Hero />

      <Separator className="opacity-40" />

      <EntityDiffDemo />

      <Separator className="opacity-40" />

      <FeatureSection />

      {/* Footer */}
      <footer className="border-t border-border px-6 py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
          <span>
            Built with{' '}
            <Link
              href="/"
              className="font-medium text-foreground transition-colors hover:text-[hsl(var(--hero-accent))]"
            >
              Orchard
            </Link>
          </span>
          <div className="flex items-center gap-6">
            <Link href="/explore" className="hover:text-foreground transition-colors">
              Explore
            </Link>
            <Link href="/docs" className="hover:text-foreground transition-colors">
              Docs
            </Link>
            <Link href="/signup" className="hover:text-foreground transition-colors">
              Sign up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
