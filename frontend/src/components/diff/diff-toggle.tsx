'use client';

import { cn } from '@/lib/utils';

interface DiffToggleProps {
  mode: 'entity' | 'lines';
  onChange: (mode: 'entity' | 'lines') => void;
}

export function DiffToggle({ mode, onChange }: DiffToggleProps) {
  return (
    <div className="inline-flex items-center rounded-full border border-border/50 bg-muted/30 p-0.5">
      <button
        onClick={() => onChange('entity')}
        className={cn(
          'rounded-full px-3 py-1 text-xs font-medium transition-colors',
          mode === 'entity'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        Entity
      </button>
      <button
        onClick={() => onChange('lines')}
        className={cn(
          'rounded-full px-3 py-1 text-xs font-medium transition-colors',
          mode === 'lines'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        Lines
      </button>
    </div>
  );
}
