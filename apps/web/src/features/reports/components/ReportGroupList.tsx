import type { TimeReportGroup } from '@crewclock/shared';

import { formatDuration } from '@/lib/format';

export function ReportGroupList({
  groups,
  totalSeconds,
}: {
  groups: TimeReportGroup[];
  totalSeconds: number;
}) {
  const total = Math.max(totalSeconds, 1);

  return (
    <ul className="space-y-4">
      {groups.map((group) => {
        const percent = Math.round((group.seconds / total) * 100);
        return (
          <li key={group.key ?? group.label}>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <div className="min-w-0">
                <span className="font-medium">{group.label}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {group.entryCount} {group.entryCount === 1 ? 'entry' : 'entries'}
                </span>
              </div>
              <span className="tabular-nums text-muted-foreground">
                {formatDuration(group.seconds)}
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
