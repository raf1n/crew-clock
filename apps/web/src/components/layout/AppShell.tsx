import { Outlet } from 'react-router-dom';

import { MobileHeader } from '@/components/layout/MobileHeader';
import { RightRail } from '@/components/layout/RightRail';
import { Sidebar } from '@/components/layout/Sidebar';

export function AppShell() {
  return (
    <div className="flex h-dvh overflow-hidden bg-muted/30">
      <Sidebar />
      <div className="flex h-dvh min-w-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileHeader />
          <main className="flex-1 overflow-y-auto">
            <div className="w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
              <Outlet />
            </div>
          </main>
        </div>
        <RightRail />
      </div>
    </div>
  );
}
