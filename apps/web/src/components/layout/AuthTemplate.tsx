import { CheckCircle2, Clock } from 'lucide-react';
import type { ReactNode } from 'react';

import { Card } from '@/components/ui/card';

const FEATURES = [
  'Track time against projects and tasks',
  'Submit and approve weekly timesheets',
  'See where the week went with clear reports',
];

export function AuthTemplate({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-slate-950 p-12 text-slate-100 lg:flex">
        <div className="absolute -top-32 -right-24 size-80 rounded-full bg-primary/30 blur-3xl" />
        <div className="relative flex items-center gap-2.5 text-lg font-semibold">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Clock className="size-5" />
          </span>
          Crewclock
        </div>
        <div className="relative max-w-md space-y-4">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Time tracking built for teams that value clarity.
          </h1>
          <p className="text-slate-400">
            Track hours, review timesheets, and see where the week went — without spreadsheets.
          </p>
          <ul className="space-y-3 pt-2 text-sm text-slate-300">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-400" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-slate-500">Consent-first activity tracking.</p>
      </aside>
      <main className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
        <Card className="w-full max-w-sm p-6">{children}</Card>
      </main>
    </div>
  );
}
