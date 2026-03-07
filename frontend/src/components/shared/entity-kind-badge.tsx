'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium',
  {
    variants: {
      kind: {
        function: 'bg-[hsl(180,70%,50%)]/15 text-[hsl(180,70%,50%)]',
        type: 'bg-[hsl(265,85%,60%)]/15 text-[hsl(265,85%,60%)]',
        method: 'bg-[hsl(217,91%,60%)]/15 text-[hsl(217,91%,60%)]',
        interface: 'bg-[hsl(38,92%,50%)]/15 text-[hsl(38,92%,50%)]',
        variable: 'bg-muted text-muted-foreground',
        preamble: 'bg-muted text-muted-foreground',
      },
    },
    defaultVariants: {
      kind: 'function',
    },
  }
);

interface EntityKindBadgeProps extends VariantProps<typeof badgeVariants> {
  label?: string;
  className?: string;
}

export function EntityKindBadge({ kind, label, className }: EntityKindBadgeProps) {
  const displayLabel = label ?? (kind ? kind.charAt(0).toUpperCase() + kind.slice(1) : '');
  return (
    <span className={cn(badgeVariants({ kind }), className)}>
      {displayLabel}
    </span>
  );
}
