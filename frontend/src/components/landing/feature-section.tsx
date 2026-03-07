import { GitMerge, Eye, BrainCircuit, Tag } from 'lucide-react';
import { AmbientGraph } from '@/components/landing/ambient-graph';
import { Card, CardContent } from '@/components/ui/card';

const FEATURES = [
  {
    icon: GitMerge,
    title: 'Structural Merge',
    description:
      'Merge at the entity level, not the line level. Fewer conflicts, smarter resolution.',
    iconColor: 'hsl(var(--hero-accent))',
    glowColor: 'hsl(var(--hero-accent) / 0.14)',
    borderHover: 'hsl(var(--hero-accent) / 0.52)',
  },
  {
    icon: Eye,
    title: 'Entity-Aware Diffs',
    description:
      'See what functions, types, and methods changed — not just which lines moved.',
    iconColor: 'hsl(var(--hero-graph-edge))',
    glowColor: 'hsl(var(--hero-graph-edge) / 0.14)',
    borderHover: 'hsl(var(--hero-graph-edge) / 0.52)',
  },
  {
    icon: BrainCircuit,
    title: 'Code Intelligence',
    description:
      'Definitions, references, and call graphs built into your repository. Navigate code like your IDE.',
    iconColor: 'hsl(var(--hero-graph-node))',
    glowColor: 'hsl(var(--hero-graph-node) / 0.14)',
    borderHover: 'hsl(var(--hero-graph-node) / 0.52)',
  },
  {
    icon: Tag,
    title: 'Semantic Versioning',
    description:
      'Automatic version bump recommendations based on what actually changed in your public API.',
    iconColor: 'hsl(var(--hero-accent))',
    glowColor: 'hsl(var(--hero-accent) / 0.14)',
    borderHover: 'hsl(var(--hero-accent) / 0.52)',
  },
] as const;

export function FeatureSection() {
  return (
    <section className="relative isolate overflow-hidden px-6 py-24">
      <AmbientGraph variant="feature" />
      <div
        className="pointer-events-none absolute inset-0 -z-20"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(48% 34% at 20% 18%, hsl(var(--hero-graph-node) / 0.1), transparent 76%), radial-gradient(44% 36% at 82% 24%, hsl(var(--hero-particle-highlight) / 0.1), transparent 78%), linear-gradient(180deg, transparent 0%, hsl(var(--hero-fade) / 0.1) 100%)',
        }}
      />
      {/* Section header */}
      <div className="relative z-10 mx-auto mb-14 max-w-2xl text-center">
        <h2
          className="font-semibold text-foreground"
          style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)' }}
        >
          Built for how code actually works
        </h2>
        <p className="mt-3 text-muted-foreground" style={{ fontSize: 'clamp(0.9rem, 1.5vw, 1.1rem)' }}>
          Every feature is grounded in the structure of your code, not just its text.
        </p>
      </div>

      {/* Feature grid */}
      <div className="relative z-10 mx-auto grid max-w-5xl gap-5 sm:grid-cols-2">
        {FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <Card
              key={feature.title}
              className="group relative overflow-hidden border-border/80 bg-card/72 shadow-[0_20px_60px_hsl(var(--hero-fade)/0.14)] backdrop-blur-md transition-all duration-300 hover:border-[var(--hover-border)] hover:shadow-[0_0_24px_var(--glow)]"
              style={{
                '--hover-border': feature.borderHover,
                '--glow': feature.glowColor,
              } as React.CSSProperties}
            >
              <CardContent className="pt-6">
                {/* Icon */}
                <div
                  className="mb-5 inline-flex rounded-xl p-2.5"
                  style={{
                    background: feature.glowColor,
                    border: `1px solid ${feature.iconColor}`,
                  }}
                >
                  <Icon
                    className="size-5"
                    style={{ color: feature.iconColor }}
                    strokeWidth={1.75}
                  />
                </div>

                {/* Title */}
                <h3 className="mb-2 font-semibold text-foreground text-base leading-snug">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>

              {/* Subtle gradient overlay on hover */}
              <div
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                  background: `radial-gradient(ellipse 70% 60% at 18% 18%, ${feature.glowColor}, transparent 80%)`,
                }}
                aria-hidden="true"
              />
            </Card>
          );
        })}
      </div>
    </section>
  );
}
