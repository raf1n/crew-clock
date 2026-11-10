import type { LucideIcon } from 'lucide-react';
import { cn } from 'cn';

import { Card } from '@/components/ui/card';

const TONES = {
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300',
  green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300',
  slate: 'bg-muted text-muted-foreground',
} as const;

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'slate',
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: keyof typeof TONES;
  className?: string;
}) {
  return (
    <Card className={cn('gap-0 p-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <span className={cn('grid size-9 shrink-0 place-items-center rounded-lg', TONES[tone])}>
          <Icon className="size-4" />
        </span>
      </div>
    </Card>
  );
}
