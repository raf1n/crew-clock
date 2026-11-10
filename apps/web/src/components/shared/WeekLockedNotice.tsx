import type { TimesheetStatus } from '@crewclock/shared';
import { LockKeyhole } from 'lucide-react';
import { Link } from 'react-router-dom';

export function WeekLockedNotice({ status }: { status?: TimesheetStatus | null }) {
  const approved = status === 'approved';

  return (
    <div className="flex flex-wrap items-start gap-3 rounded-xl border border-dashed bg-muted/40 p-4 text-sm">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-background ring-1 ring-border">
        <LockKeyhole className="size-4 text-muted-foreground" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{approved ? 'This week is final' : 'This week is locked'}</p>
        <p className="mt-0.5 text-muted-foreground">
          {approved ? (
            <>
              The timesheet for this week has been approved. Contact an owner or manager if a
              correction is needed.
            </>
          ) : (
            <>
              A timesheet for this week has been submitted.{' '}
              <Link className="font-medium text-primary hover:underline" to="/timesheets">
                Open Timesheets
              </Link>{' '}
              to withdraw it before tracking more time.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
