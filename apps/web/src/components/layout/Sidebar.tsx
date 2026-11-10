import { roleAtLeast } from '@crewclock/shared';
import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  CalendarClock,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  MonitorSmartphone,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useLogoutMutation } from '@/api/authApi';
import { Logo } from '@/components/shared/Logo';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { NavItem } from '@/components/layout/NavItem';
import { WorkspaceSwitcher } from '@/features/workspaces/components/WorkspaceSwitcher';
import { Button } from '@/components/ui/button';
import { useAppSelector } from '@/hooks';
import { useSelectedWorkspace } from '@/hooks/useSelectedWorkspace';

export interface NavItemConfig {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  adminOnly?: boolean;
}

export const NAV_ITEMS: NavItemConfig[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/timesheets', label: 'Timesheets', icon: CalendarClock },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/devices', label: 'Devices', icon: MonitorSmartphone },
  { to: '/members', label: 'Members', icon: Users, adminOnly: true },
];

export function Sidebar() {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const { workspace } = useSelectedWorkspace();
  const [logout] = useLogoutMutation();

  const navItems = NAV_ITEMS.filter(
    (item) => !item.adminOnly || (workspace ? roleAtLeast(workspace.role, 'manager') : false),
  );

  const handleLogout = async (): Promise<void> => {
    await logout()
      .unwrap()
      .catch(() => undefined);
    navigate('/login');
  };

  return (
    <aside className="hidden h-dvh w-64 shrink-0 flex-col border-r bg-card lg:flex">
      <div className="shrink-0 px-5 py-5">
        <Logo />
      </div>
      <div className="shrink-0 px-4">
        <WorkspaceSwitcher />
      </div>
      <nav className="mt-6 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 pb-4">
        {navItems.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>
      <div className="shrink-0 border-t p-4">
        <div className="flex items-center gap-3">
          <UserAvatar name={user?.name ?? 'Member'} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user?.name ?? 'Member'}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Sign out"
            className="text-muted-foreground"
            onClick={handleLogout}
          >
            <LogOut />
          </Button>
        </div>
      </div>
    </aside>
  );
}
