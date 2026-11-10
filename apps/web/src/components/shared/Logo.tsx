import { Clock } from 'lucide-react';
import { cn } from 'cn';

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <Clock className="size-5" />
      </span>
      {compact ? null : (
        <div className="leading-tight">
          <p className="text-sm font-semibold">Crewclock</p>
          <p className="text-xs text-muted-foreground">Workspace console</p>
        </div>
      )}
    </div>
  );
}
